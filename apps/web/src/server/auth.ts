import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { userSchema, profileSchema, safeNext, isStudentGoogleUser } from "@friday/schemas";
import { supabase } from "@/lib/supabase/server";
export const identity = cache(async () => {
  const client = await supabase();
  if (!client) return null;
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user || !user.email_confirmed_at) return null;
  const result = await client.from("users").select("*").eq("id", user.id).single();
  if (result.error || !result.data) return null;
  const account = userSchema.parse(result.data);
  if (account.role === "student" && !isStudentGoogleUser(user)) return null;
  if (account.status !== "active") return null;
  const profileResult = await client
    .from("student_profiles")
    .select("*")
    .eq("user_id", account.id)
    .eq("university_id", account.university_id)
    .maybeSingle();
  if (profileResult.error) throw new Error("Your profile could not be loaded. Please try again.");
  return {
    client,
    user: account,
    profile: profileResult.data ? profileSchema.parse(profileResult.data) : null,
  };
});
export async function requireIdentity(
  portal: "student" | "admin",
  path = portal === "student" ? "/app" : "/admin",
  onboarding = true,
) {
  const account = await identity();
  if (!account)
    redirect(
      `${portal === "admin" ? "/admin/login" : "/login"}?next=${encodeURIComponent(safeNext(path, portal === "admin" ? "/admin" : "/app"))}`,
    );
  if ((portal === "student") !== (account.user.role === "student")) redirect("/forbidden");
  if (portal === "student" && onboarding && !account.profile?.onboarding_completed_at)
    redirect("/app/onboarding");
  return account;
}
