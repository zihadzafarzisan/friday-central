/* Optional archive capture. The worker independently checks the tab's opt-in. */
(() => {
  const { dataEndpoint, sanitizeDataEntry, MAX_BYTES } = globalThis.FridayConnect;
  let enabled = false;
  window.addEventListener("message", (event) => {
    if (
      event.source === window &&
      event.origin === location.origin &&
      event.data?.type === "FRIDAY_CONNECT_CAPTURE_SETTINGS_V1"
    )
      enabled = event.data.enabled === true;
  });
  function candidate(url, method) {
    if (!enabled || String(method || "GET").toUpperCase() !== "GET") return false;
    try {
      dataEndpoint(url);
      return true;
    } catch {
      return false;
    }
  }
  function publish(url, raw) {
    try {
      const entry = sanitizeDataEntry({
        endpoint: url,
        method: "GET",
        captured_at: new Date().toISOString(),
        data: raw,
      });
      window.postMessage({ type: "FRIDAY_CONNECT_DATA_CAPTURE_V1", entry }, location.origin);
    } catch {
      window.postMessage({ type: "FRIDAY_CONNECT_DATA_SKIPPED_V1" }, location.origin);
    }
  }
  const fetchOriginal = window.fetch;
  window.fetch = function (...args) {
    const result = fetchOriginal.apply(this, args);
    const input = args[0];
    const url = typeof input === "string" || input instanceof URL ? String(input) : input?.url;
    const method = args[1]?.method || (typeof input === "object" ? input?.method : "GET");
    if (candidate(url, method))
      result
        .then(async (response) => {
          if (
            !response.ok ||
            !/application\/(?:[^;]+\+)?json/i.test(response.headers.get("content-type") || "")
          )
            return;
          const reader = response.clone().body?.getReader();
          if (!reader) return;
          const chunks = [];
          let total = 0;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > MAX_BYTES) {
              void reader.cancel().catch(() => {});
              window.postMessage({ type: "FRIDAY_CONNECT_DATA_SKIPPED_V1" }, location.origin);
              return;
            }
            chunks.push(value);
          }
          const body = new Uint8Array(total);
          let offset = 0;
          for (const chunk of chunks) {
            body.set(chunk, offset);
            offset += chunk.byteLength;
          }
          publish(url, JSON.parse(new TextDecoder().decode(body)));
        })
        .catch(() => {});
    return result;
  };
  const openOriginal = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (...args) {
    if (this.__fridayDataListener) this.removeEventListener("load", this.__fridayDataListener);
    const url = String(args[1]);
    const method = args[0];
    // Decide at response time so capture settings can change during navigation.
    this.__fridayDataListener = () => {
      if (!candidate(url, method) || this.status < 200 || this.status >= 300) return;
      if (!/application\/(?:[^;]+\+)?json/i.test(this.getResponseHeader("content-type") || ""))
        return;
      try {
        if (this.responseType === "json") publish(url, this.response);
        else if (!this.responseType || this.responseType === "text") {
          if (new TextEncoder().encode(this.responseText).byteLength > MAX_BYTES) {
            window.postMessage({ type: "FRIDAY_CONNECT_DATA_SKIPPED_V1" }, location.origin);
            return;
          }
          publish(url, JSON.parse(this.responseText));
        }
      } catch {
        /* Keep Connect's requests unchanged. */
      }
    };
    this.addEventListener("load", this.__fridayDataListener);
    return openOriginal.apply(this, args);
  };
})();
