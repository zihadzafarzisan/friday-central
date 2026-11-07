import { describe, it, expect } from "vitest";
import { overlaps, eligible, generatePlans, attendanceSummary, degreeCredits } from "./index";
describe("academic calculations", () => {
  it("allows adjacent meetings and rejects real overlaps", () => {
    const a = { day_of_week: 0, start_minute: 600, end_minute: 680 };
    expect(overlaps(a, { ...a, start_minute: 680, end_minute: 750 })).toBe(false);
    expect(overlaps(a, { ...a, start_minute: 670, end_minute: 750 })).toBe(true);
    expect(overlaps(a, { ...a, day_of_week: 1 })).toBe(false);
  });
  it("requires every prerequisite group and one alternative within a group", () => {
    expect(eligible([["a"], ["b", "c"]], new Set(["a", "c"]))).toBe(true);
    expect(eligible([["a"], ["b", "c"]], new Set(["a"]))).toBe(false);
  });
  it("ignores cancelled attendance and does not invent percentages for empty records", () => {
    expect(attendanceSummary([]).percent).toBeNull();
    expect(
      attendanceSummary([{ status: "attended" }, { status: "cancelled" }, { status: "missed" }]),
    ).toMatchObject({ total: 2, attended: 1, percent: 50, canMiss: 0 });
    expect(
      attendanceSummary(Array.from({ length: 9 }, () => ({ status: "attended" }))),
    ).toMatchObject({ canMiss: 3 });
  });
  it("counts completed credits once and excludes failed records", () => {
    expect(
      degreeCredits(
        [
          { id: "a", credits: 3 },
          { id: "b", credits: 4 },
        ],
        [
          { course_id: "a", status: "completed" },
          { course_id: "a", status: "completed" },
          { course_id: "b", status: "failed" },
        ],
      ),
    ).toBe(3);
  });
  it("finds conflict-free alternatives, excludes full sections, and respects credit limits", () => {
    const base = { credits: 3, seats_available: 10 };
    const section = (id: string, course_id: string, start: number) => ({
      ...base,
      id,
      course_id,
      meetings: [{ day_of_week: 0, start_minute: start, end_minute: start + 60 }],
    });
    const rows = [
      section("a1", "a", 600),
      section("b1", "b", 630),
      section("b2", "b", 700),
      { ...section("b3", "b", 800), seats_available: 0 },
    ];
    expect(generatePlans(["a", "b"], rows)[0].sections.map((row) => row.id)).toEqual(["a1", "b2"]);
    expect(generatePlans(["a", "b"], rows, { maxCredits: 5 })).toEqual([]);
    expect(generatePlans(["a", "a"], rows)).toEqual([]);
    expect(generatePlans(["missing"], rows)).toEqual([]);
  });
});
