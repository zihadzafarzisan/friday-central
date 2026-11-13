/* Used by the service worker and MAIN-world observer. No credentials. */
(() => {
  const MAX_BYTES = 262144;
  const CAPTURE_TTL = 15 * 60 * 1000;
  const TRANSFER_TTL = 10 * 60 * 1000;
  const STORAGE_KEY = "friday.connect.schedule.v1";
  const DATA_STORAGE_KEY = "friday.connect.data.v1";
  const DATA_MAX_BYTES = 786432;
  const secretKey = (key) => {
    const normalized = key.replace(/[^a-z0-9]/gi, "");
    return (
      /token|password|passwd|secret|credential|authorization|cookie|csrf|privatekey|apikey|assertion|signature|codeverifier|codechallenge/i.test(
        normalized,
      ) || /^(sessionid|sessionkey|publickey|sid)$/i.test(normalized)
    );
  };
  function dataEndpoint(value) {
    const url = new URL(value, "https://connect.bracu.ac.bd");
    if (
      url.origin !== "https://connect.bracu.ac.bd" ||
      !url.pathname.startsWith("/api/") ||
      /(?:^|\/)(?:auth|oauth|sso|token|login|logout|password|credentials|refresh)(?:\/|$)/i.test(
        url.pathname,
      )
    )
      throw new Error("Unsupported Connect data endpoint.");
    for (const key of [...url.searchParams.keys()])
      if (secretKey(key) || key === "code") url.searchParams.delete(key);
    url.searchParams.sort();
    const result = url.pathname + url.search;
    if (result.length > 1024 || /eyJ[A-Za-z0-9_-]+\./.test(result))
      throw new Error("Unsupported endpoint.");
    return result;
  }
  function redactData(raw) {
    let nodes = 0;
    function visit(value, depth) {
      if (++nodes > 25000 || depth > 20) throw new Error("Response too complex.");
      if (value === null || typeof value === "boolean") return value;
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string")
        return value
          .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted]")
          .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "[redacted]");
      if (Array.isArray(value)) return value.map((item) => visit(item, depth + 1));
      if (value && typeof value === "object") {
        const result = Object.create(null);
        for (const [key, item] of Object.entries(value)) {
          if (["__proto__", "constructor", "prototype"].includes(key)) continue;
          result[key] = secretKey(key) ? "[redacted]" : visit(item, depth + 1);
        }
        return result;
      }
      throw new Error("Invalid JSON.");
    }
    return visit(raw, 0);
  }
  function sanitizeDataEntry(raw) {
    if (raw.method !== "GET" || !Number.isFinite(Date.parse(raw.captured_at)))
      throw new Error("Invalid response metadata.");
    const entry = {
      endpoint: dataEndpoint(raw.endpoint),
      method: "GET",
      captured_at: raw.captured_at,
      data: redactData(raw.data),
    };
    if (new TextEncoder().encode(JSON.stringify(entry.data)).byteLength > MAX_BYTES)
      throw new Error("Response exceeds 256 KB.");
    return entry;
  }
  function sanitizeDataBatch(entries) {
    if (!Array.isArray(entries) || !entries.length || entries.length > 100)
      throw new Error("Sync 1–100 responses at a time.");
    const rows = entries.map(sanitizeDataEntry);
    if (
      new Set(rows.map((row) => row.endpoint)).size !== rows.length ||
      new TextEncoder().encode(JSON.stringify(rows)).byteLength > DATA_MAX_BYTES
    )
      throw new Error("Response batch is too large.");
    return rows;
  }
  const courseKeys = [
    "courseId",
    "courseCode",
    "courseCredit",
    "courseType",
    "sectionId",
    "sectionName",
    "parentSectionId",
    "faculties",
    "roomName",
    "capacity",
    "consumedSeat",
    "semesterSessionId",
  ];
  const scheduleKeys = [
    "classStartDate",
    "classEndDate",
    "midExamDate",
    "midExamStartTime",
    "midExamEndTime",
    "finalExamDate",
    "finalExamStartTime",
    "finalExamEndTime",
  ];
  function pick(object, keys) {
    const result = {};
    for (const key of keys) {
      const value = object[key];
      if (value === null || typeof value === "string" || typeof value === "number")
        result[key] = value;
    }
    return result;
  }
  function sanitizeCourses(raw) {
    if (!Array.isArray(raw) || !raw.length || raw.length > 100)
      throw new Error("No supported schedule found. Open your class schedule in Connect.");
    const courses = raw.map((row) => {
      if (!row || typeof row !== "object") throw new Error("Invalid schedule response.");
      const schedule =
        typeof row.sectionSchedule === "string"
          ? JSON.parse(row.sectionSchedule)
          : row.sectionSchedule;
      if (!schedule || typeof schedule !== "object" || Array.isArray(schedule))
        throw new Error("Invalid class schedule.");
      if (
        !Number.isInteger(row.sectionId) ||
        !Number.isInteger(row.semesterSessionId) ||
        typeof row.courseCode !== "string"
      )
        throw new Error("Missing section or semester identifiers.");
      const meetings = schedule.classSchedules ?? [];
      if (!Array.isArray(meetings) || meetings.length > 14)
        throw new Error("Invalid class meetings.");
      return {
        ...pick(row, courseKeys),
        sectionSchedule: {
          ...pick(schedule, scheduleKeys),
          classSchedules: meetings.map((meeting) => pick(meeting, ["day", "startTime", "endTime"])),
        },
      };
    });
    if (new TextEncoder().encode(JSON.stringify(courses)).byteLength > MAX_BYTES)
      throw new Error("Schedule exceeds 256 KB.");
    return courses;
  }
  function scheduleUrl(value) {
    try {
      const url = new URL(value, "https://connect.bracu.ac.bd");
      return (
        url.origin === "https://connect.bracu.ac.bd" &&
        url.pathname === "/api/adv/v1/student-courses/schedules"
      );
    } catch {
      return false;
    }
  }
  function fridayOrigin(value) {
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== "/" && url.pathname !== "")
    )
      throw new Error("Enter only your FRIDAY site origin, for example http://127.0.0.1:3000.");
    if (
      url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
    )
      throw new Error("Use HTTPS, or HTTP on localhost for development.");
    if (url.hostname === "connect.bracu.ac.bd")
      throw new Error("Enter the FRIDAY address, not Connect.");
    return url.origin;
  }
  globalThis.FridayConnect = Object.freeze({
    MAX_BYTES,
    CAPTURE_TTL,
    TRANSFER_TTL,
    STORAGE_KEY,
    DATA_STORAGE_KEY,
    DATA_MAX_BYTES,
    dataEndpoint,
    sanitizeDataEntry,
    sanitizeDataBatch,
    sanitizeCourses,
    scheduleUrl,
    fridayOrigin,
  });
})();
