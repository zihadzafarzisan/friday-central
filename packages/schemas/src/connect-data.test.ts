import { describe, it, expect } from "vitest";
import { connectDataBatchSchema, connectDataEndpoint, redactConnectJson } from "./connect-data";
describe("private Connect data archive", () => {
  it("preserves student records while redacting credentials recursively", () => {
    const raw = {
      semesterSessionId: 20263,
      fullName: "Synthetic student",
      grades: [{ courseCode: "CSE101", grade: "A", access_token: "private" }],
      nested: { sessionId: "private", details: "Bearer private-value", password: "private" },
    };
    const result = redactConnectJson(raw) as Record<string, unknown>;
    expect(result.fullName).toBe("Synthetic student");
    expect(result.semesterSessionId).toBe(20263);
    expect(JSON.stringify(result)).toContain('"grade":"A"');
    expect(JSON.stringify(result)).not.toContain("private");
    expect(JSON.stringify(result)).toContain("[redacted]");
  });
  it("canonicalizes endpoints, removes credential parameters and rejects auth/external endpoints", () => {
    expect(connectDataEndpoint("/api/student/grades?token=private&semester=20263")).toBe(
      "/api/student/grades?semester=20263",
    );
    expect(
      connectDataEndpoint("/api/student/grades?semesterSessionId=20263&sessionId=private"),
    ).toBe("/api/student/grades?semesterSessionId=20263");
    for (const value of [
      "https://evil.invalid/api/student",
      "/token",
      "/api/auth/token",
      "/api/user/login",
      "/api/../token",
    ])
      expect(() => connectDataEndpoint(value)).toThrow();
  });
  it("bounds response count/size, forbids mutation records and strips extra metadata", () => {
    const entry = {
      endpoint: "/api/student/grades",
      method: "GET",
      captured_at: "2026-11-12T00:00:00Z",
      data: { grade: "A" },
      headers: { authorization: "private" },
    };
    const rows = connectDataBatchSchema.parse([entry]);
    expect(rows[0]).not.toHaveProperty("headers");
    for (const batch of [
      [],
      [entry, entry],
      [{ ...entry, method: "POST" }],
      [{ ...entry, data: "x".repeat(262145) }],
    ])
      expect(connectDataBatchSchema.safeParse(batch).success).toBe(false);
  });
});
