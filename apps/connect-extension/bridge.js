(() => {
  function settings(enabled) {
    window.postMessage(
      { type: "FRIDAY_CONNECT_CAPTURE_SETTINGS_V1", enabled: enabled === true },
      location.origin,
    );
  }
  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === "capture-settings") {
      settings(message.enabled);
      reply({ ok: true });
    }
  });
  chrome.runtime
    .sendMessage({ type: "get-capture-settings" })
    .then((result) => settings(result?.enabled))
    .catch(() => {});
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== "https://connect.bracu.ac.bd") return;
    if (event.data?.type === "FRIDAY_CONNECT_DATA_SKIPPED_V1") {
      chrome.runtime.sendMessage({ type: "data-skipped" }).catch(() => {});
      return;
    }
    if (event.data?.type !== "FRIDAY_CONNECT_DATA_CAPTURE_V1") return;
    try {
      if (new TextEncoder().encode(JSON.stringify(event.data.entry)).byteLength > 263168) return;
      chrome.runtime.sendMessage({ type: "capture-data", entry: event.data.entry }).catch(() => {});
    } catch {
      /* Untrusted page message. */
    }
  });
  window.addEventListener("message", (event) => {
    if (
      event.source !== window ||
      event.origin !== "https://connect.bracu.ac.bd" ||
      event.data?.type !== "FRIDAY_CONNECT_SCHEDULE_CAPTURE_V1"
    )
      return;
    try {
      const courses = event.data.courses;
      if (
        !Array.isArray(courses) ||
        courses.length < 1 ||
        courses.length > 100 ||
        new TextEncoder().encode(JSON.stringify(courses)).byteLength > 262144
      )
        return;
      // The MAIN-world observer already allowlists response fields. The service
      // worker independently allowlists again before putting anything in storage.
      chrome.runtime.sendMessage({ type: "capture-schedule", courses }).catch(() => {});
    } catch {
      /* Page messages are untrusted and validated again by FRIDAY. */
    }
  });
})();
