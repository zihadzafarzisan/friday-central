import { describe, it, expect } from "vitest";
import { isStudentGoogleUser, studentDestination } from "./google-auth";
const user = () => ({
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
describe("student Google Workspace boundary", () => {
  it("accepts a verified provider identity, including an existing linked email account", () => {
    expect(isStudentGoogleUser(user())).toBe(true);
    expect(
      isStudentGoogleUser({
        ...user(),
        identities: [{ provider: "email", identity_data: {} }, ...user().identities],
      }),
    ).toBe(true);
  });
  it("rejects personal/staff/lookalike domains, unverified email and missing Workspace claims", () => {
    for (const email of [
      "student@gmail.com",
      "student@bracu.ac.bd",
      "student@g.bracu.ac.bd.evil.invalid",
    ]) {
      const raw = user();
      raw.email = email;
      raw.identities[0].identity_data.email = email;
      expect(isStudentGoogleUser(raw)).toBe(false);
    }
    const unverified = user();
    unverified.identities[0].identity_data.email_verified = false;
    expect(isStudentGoogleUser(unverified)).toBe(false);
    const wrongDomain = user();
    wrongDomain.identities[0].identity_data.custom_claims.hd = "elsewhere.invalid";
    expect(isStudentGoogleUser(wrongDomain)).toBe(false);
    expect(
      isStudentGoogleUser({
        ...user(),
        identities: [
          { provider: "google", identity_data: { email: user().email, email_verified: true } },
        ],
      }),
    ).toBe(false);
  });
  it("ignores forged user metadata and rejects identity/account email mismatches", () => {
    expect(
      isStudentGoogleUser({
        ...user(),
        identities: [],
        user_metadata: { provider: "google", hd: "g.bracu.ac.bd", email_verified: true },
      }),
    ).toBe(false);
    const raw = user();
    raw.identities[0].identity_data.email = "other@g.bracu.ac.bd";
    expect(isStudentGoogleUser(raw)).toBe(false);
  });
  it("keeps Google student destinations inside the student portal", () => {
    for (const path of [
      "//evil.invalid",
      "/admin",
      "/application",
      "https://evil.invalid",
      "/app\\evil",
      "/app\r\nLocation: elsewhere",
    ])
      expect(studentDestination(path)).toBe("/app");
    expect(studentDestination("/app/schedule?connectImport=1")).toBe(
      "/app/schedule?connectImport=1",
    );
  });
});
