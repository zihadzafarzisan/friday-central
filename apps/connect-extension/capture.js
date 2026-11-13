/* Observe only successful schedule responses. Never inspect request headers. */
(() => {
  const { sanitizeCourses, scheduleUrl, MAX_BYTES } = globalThis.FridayConnect;
  function publish(raw) {
    try {
      const courses = sanitizeCourses(raw);
      window.postMessage({ type: "FRIDAY_CONNECT_SCHEDULE_CAPTURE_V1", courses }, location.origin);
    } catch {
      /* Malformed responses remain untouched; manual JSON import is available. */
    }
  }
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const result = originalFetch.apply(this, args);
    const input = args[0];
    const url = typeof input === "string" || input instanceof URL ? String(input) : input?.url;
    if (scheduleUrl(url))
      result
        .then(async (response) => {
          if (!response.ok) return;
          const body = await response.clone().text();
          if (new TextEncoder().encode(body).byteLength <= MAX_BYTES) publish(JSON.parse(body));
        })
        .catch(() => {});
    return result;
  };
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (...args) {
    // Remove the previous listener when a page reuses an XHR instance.
    if (this.__fridayScheduleListener)
      this.removeEventListener("load", this.__fridayScheduleListener);
    this.__fridayScheduleListener = null;
    if (scheduleUrl(String(args[1]))) {
      this.__fridayScheduleListener = () => {
        if (this.status < 200 || this.status >= 300) return;
        try {
          if (this.responseType === "json") publish(this.response);
          else if (!this.responseType || this.responseType === "text") {
            if (new TextEncoder().encode(this.responseText).byteLength <= MAX_BYTES)
              publish(JSON.parse(this.responseText));
          }
        } catch {
          /* Never affect Connect's own request handling. */
        }
      };
      this.addEventListener("load", this.__fridayScheduleListener);
    }
    return open.apply(this, args);
  };
})();
