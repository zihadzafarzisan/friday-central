import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ role: "student", verified: true }));
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  supabase: async () => {
    const id = "22222222-2222-4222-8222-222222222222";
    const university_id = "11111111-1111-4111-8111-111111111111";
    const email = "student@g.bracu.ac.bd";
    return {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id,
              email,
              email_confirmed_at: "2026-11-14T00:00:00Z",
              identities: state.verified
                ? [
                    {
                      provider: "google",
                      identity_data: {
                        email,
                        email_verified: true,
                        custom_claims: { hd: "g.bracu.ac.bd" },
                      },
                    },
                  ]
                : [],
            },
          },
          error: null,
        }),
      },
      from: () => {
        const query = {
          select: () => query,
          eq: () => query,
          single: async () => ({
            data: {
              id,
              university_id,
              full_name: "Test student",
              email,
              role: state.role,
              status: "active",
            },
          }),
          maybeSingle: async () => ({
            data: {
              user_id: id,
              university_id,
              student_id: null,
              program_id: null,
              semester_id: null,
              onboarding_completed_at: null,
            },
          }),
        };
        return query;
      },
    };
  },
}));
import { requireIdentity } from "./auth";
import { canImportBeforeOnboarding } from "@friday/schemas";
beforeEach(() => {
  state.role = "student";
  state.verified = true;
});
describe("Connect access before academic onboarding", () => {
  it("permits a verified student on import pages while still guarding academic pages", async () => {
    for (const path of ["/app/connect", "/app/schedule?connectImport=1"]) {
      const account = await requireIdentity("student", path, !canImportBeforeOnboarding(path));
      expect(account.profile?.onboarding_completed_at).toBeNull();
    }
    await expect(requireIdentity("student", "/app/degree")).rejects.toThrow(
      "REDIRECT:/app/onboarding",
    );
  });
  it("still rejects a student without the provider-owned Google identity", async () => {
    state.verified = false;
    await expect(requireIdentity("student", "/app/connect", false)).rejects.toThrow(
      "REDIRECT:/login?next=",
    );
  });
  it("keeps administrative accounts outside student import pages", async () => {
    state.role = "admin";
    await expect(requireIdentity("student", "/app/connect", false)).rejects.toThrow(
      "REDIRECT:/forbidden",
    );
  });
});
