const { fridayOrigin, CAPTURE_TTL } = globalThis.FridayConnect;
const byId = (id) => document.getElementById(id);
let tabId;
let captured = false;
let dataCaptured = false;
let busy = false;
function update() {
  byId("sync").disabled = busy || !captured || !byId("consent").checked;
  byId("sync-data").disabled = busy || !dataCaptured || !byId("consent").checked;
}
async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id;
  const key = `capture:${tabId}`;
  const capture = (await chrome.storage.session.get(key))[key];
  const stored = await chrome.storage.session.get([`data:${tabId}`, `archive:${tabId}`]);
  const archive = stored[`data:${tabId}`];
  const onConnect = tab.url?.startsWith("https://connect.bracu.ac.bd/");
  byId("capture-other").checked = Boolean(stored[`archive:${tabId}`]);
  byId("capture-other").disabled = !onConnect;
  dataCaptured = Boolean(
    onConnect && archive?.entries?.length && Date.now() - archive.capturedAt < CAPTURE_TTL,
  );
  byId("data-capture").textContent =
    `${archive?.entries?.length || 0} other responses captured · ${archive?.skipped || 0} skipped by size/complexity limits (256 KB per response, 768 KB per batch).`;
  captured = Boolean(
    capture &&
    Date.now() - capture.capturedAt < CAPTURE_TTL &&
    tab.url?.startsWith("https://connect.bracu.ac.bd/"),
  );
  byId("capture").textContent = captured
    ? `${capture.courses.length} schedule entries captured at ${new Date(capture.capturedAt).toLocaleTimeString()}.`
    : "No recent schedule captured. Reload Connect after installing, then open your class schedule.";
  update();
}
chrome.storage.local.get("fridayOrigin").then((result) => {
  if (result.fridayOrigin) byId("origin").value = result.fridayOrigin;
});
refresh().catch(() => {
  byId("capture").textContent = "Open your Connect tab and try again.";
});
chrome.storage.onChanged.addListener(() => {
  refresh().catch(() => {});
});
byId("consent").addEventListener("change", update);
byId("origin").addEventListener("input", () => {
  byId("consent").checked = false;
  update();
});
byId("capture-other").addEventListener("change", async () => {
  const result = await chrome.runtime.sendMessage({
    type: "set-data-capture",
    tabId,
    enabled: byId("capture-other").checked,
  });
  if (!result?.ok)
    byId("message").textContent = result?.message || "Could not change capture settings.";
});
async function transfer(kind) {
  if (!(kind === "data" ? dataCaptured : captured) || !byId("consent").checked || busy) return;
  try {
    const origin = fridayOrigin(byId("origin").value.trim());
    // Request permission directly in the click handler to retain the user gesture.
    const permission = chrome.permissions.request({ origins: [`${origin}/*`] });
    busy = true;
    update();
    if (!(await permission))
      throw new Error("Site access was declined. Your schedule has not been sent.");
    await chrome.storage.local.set({ fridayOrigin: origin });
    const result = await chrome.runtime.sendMessage({
      type: kind === "data" ? "transfer-data" : "transfer-schedule",
      tabId,
      origin,
      preview: byId("preview").checked,
    });
    if (!result?.ok) throw new Error(result?.message || "Could not open FRIDAY.");
    byId("message").textContent = "Opened FRIDAY. Review and confirm your import there.";
  } catch (error) {
    byId("message").textContent = error.message || "Could not transfer schedule.";
  } finally {
    busy = false;
    update();
  }
}
byId("sync").addEventListener("click", () => transfer("schedule"));
byId("sync-data").addEventListener("click", () => transfer("data"));
byId("forget").addEventListener("click", async () => {
  await chrome.storage.session.remove([`capture:${tabId}`, `data:${tabId}`]);
  byId("consent").checked = false;
  await refresh();
});
