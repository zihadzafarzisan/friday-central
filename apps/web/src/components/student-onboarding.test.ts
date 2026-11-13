import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { sampleData } from "@friday/db";
vi.mock("@/server/actions", () => ({ mutate: vi.fn(), signOut: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/onboarding",
  useSearchParams: () => new URLSearchParams(),
}));
import { StudentPage } from "./student-page";
describe("fresh-project academic onboarding", () => {
  it("offers Connect imports and disables academic submission until catalog choices exist", () => {
    const data = sampleData();
    if (!data.profile) throw new Error("Missing fixture profile");
    data.profile = {
      ...data.profile,
      student_id: null,
      program_id: null,
      semester_id: null,
      onboarding_completed_at: null,
    };
    data.programs = [];
    data.semesters = [];
    data.courses = [];
    data.sections = [];
    const html = renderToStaticMarkup(
      createElement(StudentPage, { initial: data, name: "onboarding" }),
    );
    expect(html).toContain('href="/app/connect"');
    expect(html).toContain('href="/app/schedule"');
    expect(html).toContain("Academic setup is being prepared.");
    expect(html).toMatch(/disabled=""[^>]*>Continue to dashboard/);
  });
});
