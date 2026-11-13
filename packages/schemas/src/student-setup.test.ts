import { describe, expect, it } from "vitest";
import { canImportBeforeOnboarding, canMutateBeforeOnboarding } from "./student-setup";
describe("academic onboarding exceptions", () => {
  it("allows only the exact setup/import pages and preserves query-based handoffs", () => {
    for (const path of ["/app/onboarding", "/app/connect", "/app/schedule?connectImport=1"])
      expect(canImportBeforeOnboarding(path)).toBe(true);
    for (const path of [
      "/app",
      "/app/degree",
      "/app/registration",
      "/admin",
      "/app/onboarding-evil",
      "/app/connect/other",
      "https://example.invalid/app/connect",
    ])
      expect(canImportBeforeOnboarding(path)).toBe(false);
  });
  it("allows only private import and profile actions, keeping shared/academic actions guarded", () => {
    for (const kind of [
      "profile_save",
      "connect_data_import",
      "connect_data_delete",
      "connect_schedule_import",
      "connect_schedule_delete",
    ])
      expect(canMutateBeforeOnboarding(kind)).toBe(true);
    for (const kind of [
      "enrollment_add",
      "completed_add",
      "plan_save",
      "course_save",
      "user_role",
      "connect_data_import_extra",
      "toString",
    ])
      expect(canMutateBeforeOnboarding(kind)).toBe(false);
  });
});
