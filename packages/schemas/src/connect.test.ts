import { describe, it, expect } from "vitest";
import { connectScheduleSchema, parseConnectSchedule } from "./connect";
import { connectFixture } from "./connect.fixture";

describe("Connect schedule import", () => {
  it("imports seven sections, preserves zero-credit linked labs and oversubscribed counts", () => {
    const courses = parseConnectSchedule(JSON.stringify(connectFixture()));
    expect(courses).toHaveLength(7);
    expect(courses.filter((row) => row.courseType === "THEORY")).toHaveLength(4);
    expect(courses.filter((row) => row.courseType === "LAB")).toHaveLength(3);
    expect(courses.reduce((sum, row) => sum + row.courseCredit, 0)).toBe(12);
    expect(courses[4].parentSectionId).toBe(courses[0].sectionId);
    expect(courses[2].consumedSeat).toBe(41);
    expect(courses[2].capacity).toBe(40);
    expect(courses[0].sectionSchedule.classSchedules[1].day).toBe("WEDNESDAY");
    expect(courses[0].sectionSchedule.finalExamDate).toBe("2027-01-11");
    // A normalized payload can be validated again on the server and after storage.
    expect(connectScheduleSchema.parse(courses)).toEqual(courses);
  });
  it("strips identifiers, personal details, credentials, and unknown nested fields", () => {
    const raw = connectFixture().map((row) => ({
      ...row,
      studentId: "00000000",
      fullName: "Synthetic student",
      authorization: "test-only",
      cookie: "test-only",
      sectionSchedule: JSON.stringify({
        ...JSON.parse(row.sectionSchedule),
        token: "test-only",
        classSchedules: [
          {
            day: "MONDAY",
            startTime: "08:00:00",
            endTime: "09:00:00",
            email: "sample@example.invalid",
          },
        ],
      }),
    }));
    const serialized = JSON.stringify(parseConnectSchedule(JSON.stringify(raw)));
    for (const key of [
      "studentPortfolioId",
      "studentId",
      "fullName",
      "authorization",
      "cookie",
      "token",
      "email",
    ])
      expect(serialized).not.toContain(key);
  });
  it("rejects mixed semesters and duplicate sections", () => {
    const mixed = connectFixture();
    mixed[1].semesterSessionId = 20271;
    expect(() => parseConnectSchedule(JSON.stringify(mixed))).toThrow("one semester");
    const rows = connectFixture();
    expect(() => parseConnectSchedule(JSON.stringify([rows[0], rows[0]]))).toThrow(
      "Duplicate section",
    );
  });
  it("rejects invalid JSON, empty input, oversized files, and malformed nested JSON", () => {
    for (const raw of ["not json", "[]", "{}", " ".repeat(262145)])
      expect(() => parseConnectSchedule(raw)).toThrow();
    const rows = connectFixture();
    rows[0].sectionSchedule = "broken";
    expect(() => parseConnectSchedule(JSON.stringify(rows))).toThrow();
  });
  it("rejects invalid calendar dates and reversed class or exam times", () => {
    for (const patch of [
      { midExamDate: "2026-02-30" },
      { classSchedules: [{ day: "MONDAY", startTime: "10:00:00", endTime: "09:00:00" }] },
      { finalExamStartTime: "14:00:00", finalExamEndTime: "13:00:00" },
    ]) {
      const rows = connectFixture();
      rows[0].sectionSchedule = JSON.stringify({
        ...JSON.parse(rows[0].sectionSchedule),
        ...patch,
      });
      expect(() => parseConnectSchedule(JSON.stringify(rows))).toThrow();
    }
  });
});
