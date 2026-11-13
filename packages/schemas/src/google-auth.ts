import { z } from "zod";

export const STUDENT_GOOGLE_DOMAIN = "g.bracu.ac.bd";
export function studentDestination(value: unknown) {
  return typeof value === "string" && /^\/app(\/|\?|$)/.test(value) && !/[\\\r\n]/.test(value)
    ? value
    : "/app";
}
const googleUser = z.object({
  email: z.email(),
  email_confirmed_at: z.string().min(1),
  identities: z.array(
    z.object({
      provider: z.string(),
      identity_data: z.unknown().optional(),
    }),
  ),
});
// Use provider-owned identity_data returned by Auth, never editable user_metadata.
export function isStudentGoogleUser(value: unknown): boolean {
  const parsed = googleUser.safeParse(value);
  if (!parsed.success) return false;
  const user = parsed.data;
  if (user.email.toLowerCase().split("@")[1] !== STUDENT_GOOGLE_DOMAIN) return false;
  return user.identities.some((identity) => {
    if (identity.provider !== "google") return false;
    const data = z
      .object({
        email: z.email(),
        email_verified: z.literal(true),
        custom_claims: z.object({ hd: z.string() }),
      })
      .safeParse(identity.identity_data);
    return (
      data.success &&
      data.data.email.toLowerCase() === user.email.toLowerCase() &&
      data.data.custom_claims.hd.toLowerCase() === STUDENT_GOOGLE_DOMAIN
    );
  });
}
