import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { previewData } from "./preview-data";

afterEach(() => vi.unstubAllEnvs());
describe("preview data", () => {
  it("starts empty without creating demo catalog, accounts or personal records", () => {
    vi.stubEnv("FRIDAY_E2E_FIXTURES", "");
    const data = previewData();
    expect(data.profile).toBeNull();
    for (const value of Object.values(data)) if (Array.isArray(value)) expect(value).toEqual([]);
    expect(data.user.full_name).toBe("");
    expect(data.user.email).toBe("");
    expect(previewData(true).users).toEqual([]);
  });
  it("isolates populated fixtures to the explicitly configured test server", () => {
    vi.stubEnv("FRIDAY_E2E_FIXTURES", "1");
    const populated = previewData();
    expect(populated.courses).toHaveLength(4);
    vi.stubEnv("FRIDAY_E2E_FIXTURES", "");
    expect(previewData().courses).toEqual([]);
    expect(previewData().connectImports).toEqual([]);
  });
});
