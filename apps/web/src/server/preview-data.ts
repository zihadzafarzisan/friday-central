import "server-only";
import { emptyPreviewData, sampleData } from "@friday/db";

export function previewData(admin = false) {
  // Populated fixtures are opt-in for the isolated browser-test server only.
  return process.env.FRIDAY_E2E_FIXTURES === "1" ? sampleData(admin) : emptyPreviewData(admin);
}
