import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, it, expect } from "vitest";
import { connectFixture } from "../../packages/schemas/src/connect.fixture";
import { connectDataEntrySchema } from "../../packages/schemas/src/connect-data";
const shared = readFileSync(new URL("shared.js", import.meta.url), "utf8");
type ExtensionApi = {
  sanitizeDataEntry: (raw: unknown) => unknown;
  sanitizeCourses: (raw: unknown) => Record<string, unknown>[];
  scheduleUrl: (url: string) => boolean;
  fridayOrigin: (url: string) => string;
};
function api() {
  const sandbox = vm.createContext({ URL, TextEncoder });
  vm.runInContext(shared, sandbox);
  return sandbox.FridayConnect as ExtensionApi;
}
describe("Connect extension data boundary", () => {
  it("redacts broad captures consistently with the server and excludes authentication endpoints", () => {
    const raw = {
      endpoint: "/api/student/grades?access_token=private&semester=20263",
      method: "GET",
      captured_at: "2026-11-12T00:00:00Z",
      data: { grade: "A", nested: { refreshToken: "private", text: "Bearer private" } },
    };
    expect(api().sanitizeDataEntry(raw)).toEqual(connectDataEntrySchema.parse(raw));
    expect(JSON.stringify(api().sanitizeDataEntry(raw))).not.toContain("private");
    expect(() => api().sanitizeDataEntry({ ...raw, endpoint: "/api/auth/token" })).toThrow();
    expect(() => api().sanitizeDataEntry({ ...raw, method: "POST" })).toThrow();
  });
  it("only recognizes the exact Connect schedule endpoint", () => {
    const { scheduleUrl } = api();
    expect(
      scheduleUrl(
        "https://connect.bracu.ac.bd/api/adv/v1/student-courses/schedules?studentPortfolioId=99999",
      ),
    ).toBe(true);
    for (const url of [
      "https://example.invalid/api/adv/v1/student-courses/schedules",
      "https://connect.bracu.ac.bd/token",
      "https://connect.bracu.ac.bd/api/adv/v1/student-courses/schedules/extra",
    ])
      expect(scheduleUrl(url)).toBe(false);
  });
  it("allowlists courses, meetings and exams before any page message or storage", () => {
    const rows = connectFixture().map((row) => ({
      ...row,
      fullName: "Synthetic student",
      email: "sample@example.invalid",
      token: "test-only",
      cookie: "test-only",
    }));
    const result = api().sanitizeCourses(rows);
    expect(result).toHaveLength(7);
    const serialized = JSON.stringify(result);
    for (const key of ["studentPortfolioId", "fullName", "email", "token", "cookie"])
      expect(serialized).not.toContain(key);
    expect(result[4].parentSectionId).toBe(101);
    expect(result[4].courseCredit).toBe(0);
  });
  it("rejects malformed captures and unsafe destination URLs", () => {
    const { sanitizeCourses, fridayOrigin } = api();
    for (const raw of [[], {}, Array(101).fill({}), [{ sectionSchedule: "broken" }]])
      expect(() => sanitizeCourses(raw)).toThrow();
    expect(fridayOrigin("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    expect(fridayOrigin("https://friday.example/")).toBe("https://friday.example");
    for (const url of [
      "javascript:alert(1)",
      "http://example.invalid",
      "https://user:password@example.invalid",
      "https://example.invalid/path",
      "https://connect.bracu.ac.bd",
      "https://example.invalid?token=test",
    ])
      expect(() => fridayOrigin(url)).toThrow();
  });
  it("captures a successful fetch without changing the response or observing other responses", async () => {
    const published: unknown[] = [];
    let jsonReads = 0;
    const response = {
      ok: true,
      clone: () => ({
        text: async () => {
          jsonReads++;
          return JSON.stringify(connectFixture());
        },
      }),
    };
    function Xhr() {}
    Xhr.prototype.open = () => {};
    const sandbox = vm.createContext({
      URL,
      TextEncoder,
      XMLHttpRequest: Xhr,
      location: { origin: "https://connect.bracu.ac.bd" },
      window: { fetch: async () => response, postMessage: (data: unknown) => published.push(data) },
    });
    vm.runInContext(shared, sandbox);
    vm.runInContext(readFileSync(new URL("capture.js", import.meta.url), "utf8"), sandbox);
    expect(await sandbox.window.fetch("/token")).toBe(response);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(jsonReads).toBe(0);
    expect(
      await sandbox.window.fetch("/api/adv/v1/student-courses/schedules?studentPortfolioId=99999"),
    ).toBe(response);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(jsonReads).toBe(1);
    expect(published).toHaveLength(1);
    expect(JSON.stringify(published)).not.toContain("studentPortfolioId");
  });
});
