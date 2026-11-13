importScripts("shared.js");
const {
  sanitizeCourses,
  fridayOrigin,
  CAPTURE_TTL,
  TRANSFER_TTL,
  STORAGE_KEY,
  DATA_STORAGE_KEY,
  DATA_MAX_BYTES,
  sanitizeDataEntry,
  sanitizeDataBatch,
} = globalThis.FridayConnect;
const transfersInFlight = new Set();
const captureKey = (id) => `capture:${id}`;
const transferKey = (id) => `transfer:${id}`;
const dataKey = (id) => `data:${id}`;
const enabledKey = (id) => `archive:${id}`;
const dataQueues = new Map();
const generations = new Map();
async function captureData(tabId, raw) {
  const generation = generations.get(tabId) || 0;
  const previous = dataQueues.get(tabId) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(async () => {
      const key = dataKey(tabId);
      const stored = await chrome.storage.session.get([key, enabledKey(tabId)]);
      if (!stored[enabledKey(tabId)] || (generations.get(tabId) || 0) !== generation) return;
      const archive = stored[key] || { entries: [], skipped: 0 };
      if (!raw) {
        archive.skipped++;
        await chrome.storage.session.set({ [key]: archive });
        return;
      }
      const entry = sanitizeDataEntry({ ...raw, captured_at: new Date().toISOString() });
      const rows = [
        ...archive.entries.filter(
          (row) =>
            row.endpoint !== entry.endpoint &&
            Date.now() - Date.parse(row.captured_at) < CAPTURE_TTL,
        ),
        entry,
      ];
      if (
        rows.length > 100 ||
        new TextEncoder().encode(JSON.stringify(rows)).byteLength > DATA_MAX_BYTES
      )
        archive.skipped++;
      else {
        archive.entries = rows;
        archive.capturedAt = Date.now();
      }
      await chrome.storage.session.set({ [key]: archive });
    });
  dataQueues.set(tabId, next);
  try {
    await next;
  } finally {
    if (dataQueues.get(tabId) === next) dataQueues.delete(tabId);
  }
}

async function deliver(tabId, tab) {
  if (transfersInFlight.has(tabId)) return;
  transfersInFlight.add(tabId);
  try {
    const key = transferKey(tabId);
    const pending = (await chrome.storage.session.get(key))[key];
    if (!pending) return;
    if (pending.expiresAt < Date.now()) {
      await chrome.storage.session.remove(key);
      return;
    }
    const url = new URL(tab.url || "about:blank");
    if (url.origin !== pending.origin || url.pathname !== pending.path) return;
    await chrome.scripting
      .executeScript({
        target: { tabId },
        func: (storageKey, envelope, expectedOrigin, expectedPath, marker, eventName) =>
          new Promise((resolve) => {
            // Next can stream a redirect while the URL still names the protected
            // page. Wait for its actual importer, including on client navigation.
            const observer = new MutationObserver(attempt);
            const timer = setTimeout(
              () => finish(false),
              Math.max(0, Math.min(10000, envelope.expiresAt - Date.now())),
            );
            function finish(delivered) {
              clearTimeout(timer);
              observer.disconnect();
              resolve(delivered);
            }
            function attempt() {
              if (
                location.origin !== expectedOrigin ||
                location.pathname !== expectedPath ||
                Date.now() > envelope.expiresAt
              ) {
                finish(false);
                return;
              }
              if (!document.querySelector(`[${marker}="v1"]`)) return;
              sessionStorage.setItem(storageKey, JSON.stringify(envelope));
              window.dispatchEvent(new Event(eventName));
              finish(true);
            }
            observer.observe(document.documentElement || document, {
              childList: true,
              subtree: true,
            });
            attempt();
          }),
        args: [
          pending.kind === "data" ? DATA_STORAGE_KEY : STORAGE_KEY,
          {
            version: 1,
            expiresAt: pending.expiresAt,
            ...(pending.kind === "data"
              ? { entries: pending.entries }
              : { courses: pending.courses }),
          },
          pending.origin,
          pending.path,
          pending.kind === "data" ? "data-friday-connect-data" : "data-friday-connect-import",
          pending.kind === "data" ? "friday-connect-data" : "friday-connect-import",
        ],
      })
      .then(async (results) => {
        if (results.some((result) => result.result === true))
          await chrome.storage.session.remove(key);
      });
  } catch {
    /* Permission/navigation failures leave transfer available until expiry. */
  } finally {
    transfersInFlight.delete(tabId);
  }
}

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status === "loading") {
    generations.set(tabId, (generations.get(tabId) || 0) + 1);
    chrome.storage.session.remove([captureKey(tabId), dataKey(tabId)]).catch(() => {});
  }
  if (change.status === "complete" || change.url) void deliver(tabId, tab);
});
chrome.tabs.onRemoved.addListener((tabId) => {
  generations.set(tabId, (generations.get(tabId) || 0) + 1);
  chrome.storage.session
    .remove([captureKey(tabId), transferKey(tabId), dataKey(tabId), enabledKey(tabId)])
    .catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  async function handle() {
    if (["get-capture-settings", "capture-data", "data-skipped"].includes(message?.type)) {
      if (
        !sender.tab?.id ||
        sender.frameId !== 0 ||
        new URL(sender.url).origin !== "https://connect.bracu.ac.bd"
      )
        throw new Error("Invalid source.");
      if (message.type === "get-capture-settings")
        return {
          enabled: Boolean(
            (await chrome.storage.session.get(enabledKey(sender.tab.id)))[
              enabledKey(sender.tab.id)
            ],
          ),
        };
      await captureData(sender.tab.id, message.type === "data-skipped" ? null : message.entry);
      return { ok: true };
    }
    if (message?.type === "capture-schedule") {
      if (
        !sender.tab?.id ||
        sender.frameId !== 0 ||
        new URL(sender.url).origin !== "https://connect.bracu.ac.bd"
      )
        throw new Error("Invalid source.");
      await chrome.storage.session.set({
        [captureKey(sender.tab.id)]: {
          courses: sanitizeCourses(message.courses),
          capturedAt: Date.now(),
        },
      });
      return { ok: true };
    }
    // Popup-only operations cannot be invoked by a page content script.
    if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL("popup.html"))
      throw new Error("Invalid extension request.");
    if (message?.type === "set-data-capture") {
      const tab = await chrome.tabs.get(message.tabId);
      if (new URL(tab.url).origin !== "https://connect.bracu.ac.bd")
        throw new Error("Select Connect first.");
      const enabled = message.enabled === true;
      await chrome.storage.session.set({ [enabledKey(tab.id)]: enabled });
      await chrome.tabs.sendMessage(tab.id, { type: "capture-settings", enabled });
      return { ok: true };
    }
    if (message?.type === "transfer-schedule" || message?.type === "transfer-data") {
      const archiveMode = message.type === "transfer-data";
      const origin = fridayOrigin(message.origin);
      const sourceTab = await chrome.tabs.get(message.tabId);
      if (new URL(sourceTab.url).origin !== "https://connect.bracu.ac.bd")
        throw new Error("Select your Connect tab first.");
      const key = archiveMode ? dataKey(message.tabId) : captureKey(message.tabId);
      const capture = (await chrome.storage.session.get(key))[key];
      if (!capture || Date.now() - capture.capturedAt > CAPTURE_TTL)
        throw new Error("Open your class schedule in Connect again to capture fresh data.");
      const payload = archiveMode
        ? {
            entries: sanitizeDataBatch(
              capture.entries.filter(
                (row) => Date.now() - Date.parse(row.captured_at) < CAPTURE_TTL,
              ),
            ),
            kind: "data",
          }
        : { courses: sanitizeCourses(capture.courses), kind: "schedule" };
      const allowed = await chrome.permissions.contains({ origins: [`${origin}/*`] });
      if (!allowed) throw new Error("Allow access to your selected FRIDAY site first.");
      const path =
        (message.preview === true ? "/preview/" : "/app/") + (archiveMode ? "connect" : "schedule");
      const tab = await chrome.tabs.create({
        url: `${origin}${path}?connectImport=1`,
        active: false,
      });
      await chrome.storage.session.set({
        [transferKey(tab.id)]: { origin, path, ...payload, expiresAt: Date.now() + TRANSFER_TTL },
      });
      await chrome.tabs.update(tab.id, { active: true });
      // Handles a cached page completing before the transfer was stored.
      const current = await chrome.tabs.get(tab.id);
      if (current.status === "complete") await deliver(tab.id, current);
      return { ok: true };
    }
    throw new Error("Unknown extension request.");
  }
  handle().then(reply, () =>
    reply({
      ok: false,
      message:
        "Could not transfer. Reopen your Connect schedule and check the FRIDAY address and site permission.",
    }),
  );
  return true;
});
