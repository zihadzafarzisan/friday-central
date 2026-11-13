import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => {
  const single = vi.fn();
  const query = { select: vi.fn(), eq: vi.fn(), single };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const client = {
    auth: {
      signInWithOAuth: vi.fn(),
      exchangeCodeForSession: vi.fn(),
      getUser: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue(query),
  };
  return { client, single, configured: true };
});
vi.mock("@/lib/supabase/server", () => ({
  supabase: async () => (mocks.configured ? mocks.client : null),
}));
vi.mock("@/lib/env", () => ({ environment: () => ({ appUrl: "https://friday.example" }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
import { signInWithStudentGoogle } from "./google-auth";
import { GET } from "../app/auth/callback/route";
const validUser = () => ({
  id: "student",
  email: "student@g.bracu.ac.bd",
  email_confirmed_at: "2026-11-12T00:00:00Z",
  identities: [
    {
      provider: "google",
      identity_data: {
        email: "student@g.bracu.ac.bd",
        email_verified: true,
        custom_claims: { hd: "g.bracu.ac.bd" },
      },
    },
  ],
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.configured = true;
  mocks.client.auth.signInWithOAuth.mockResolvedValue({
    data: { url: "https://provider.example/authorize" },
    error: null,
  });
  mocks.client.auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
  mocks.client.auth.getUser.mockResolvedValue({ data: { user: validUser() }, error: null });
  mocks.client.auth.signOut.mockResolvedValue({ error: null });
  mocks.single.mockResolvedValue({ data: { role: "student", status: "active" }, error: null });
});
describe("Google student OAuth flow", () => {
  it("starts PKCE with minimal scopes, a domain hint and a safe student destination", async () => {
    const form = new FormData();
    form.set("next", "/admin/users");
    await expect(signInWithStudentGoogle({ ok: false, message: "" }, form)).rejects.toThrow(
      "REDIRECT:https://provider.example/authorize",
    );
    const input = mocks.client.auth.signInWithOAuth.mock.calls[0][0];
    expect(input.provider).toBe("google");
    expect(input.options.scopes).toBe("openid email profile");
    expect(input.options.queryParams).toEqual({ hd: "g.bracu.ac.bd", prompt: "select_account" });
    expect(new URL(input.options.redirectTo).searchParams.get("next")).toBe("/app");
  });
  it("fails clearly when Supabase or Google is unavailable", async () => {
    mocks.configured = false;
    expect((await signInWithStudentGoogle({ ok: false, message: "" }, new FormData())).ok).toBe(
      false,
    );
    mocks.configured = true;
    mocks.client.auth.signInWithOAuth.mockResolvedValue({
      data: {},
      error: { message: "disabled" },
    });
    expect((await signInWithStudentGoogle({ ok: false, message: "" }, new FormData())).ok).toBe(
      false,
    );
  });
  it("validates the returned Google identity and preserves the student's destination", async () => {
    const response = await GET(
      new NextRequest(
        "https://friday.example/auth/callback?flow=student-google&code=test&next=%2Fapp%2Fschedule%3FconnectImport%3D1",
      ),
    );
    expect(response.headers.get("location")).toBe(
      "https://friday.example/app/schedule?connectImport=1",
    );
    expect(mocks.client.auth.getUser).toHaveBeenCalled();
  });
  it("signs out identities without Google's verified Workspace claim, even with forged metadata", async () => {
    mocks.client.auth.getUser.mockResolvedValue({
      data: {
        user: {
          ...validUser(),
          identities: [],
          user_metadata: { hd: "g.bracu.ac.bd", provider: "google" },
        },
      },
      error: null,
    });
    const response = await GET(
      new NextRequest("https://friday.example/auth/callback?flow=student-google&code=test"),
    );
    expect(response.headers.get("location")).toBe("https://friday.example/login?error=workspace");
    expect(mocks.client.auth.signOut).toHaveBeenCalled();
  });
  it("rejects inactive/admin accounts and handles provider cancellation", async () => {
    mocks.single.mockResolvedValue({ data: { role: "admin", status: "active" } });
    const response = await GET(
      new NextRequest("https://friday.example/auth/callback?flow=student-google&code=test"),
    );
    expect(response.headers.get("location")).toBe("https://friday.example/login?error=account");
    const canceled = await GET(
      new NextRequest(
        "https://friday.example/auth/callback?flow=student-google&error=access_denied",
      ),
    );
    expect(canceled.headers.get("location")).toBe("https://friday.example/login?error=google");
  });
});
