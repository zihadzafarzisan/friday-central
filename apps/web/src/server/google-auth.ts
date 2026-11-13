"use server";
import { redirect } from "next/navigation";
import { STUDENT_GOOGLE_DOMAIN, studentDestination, type ActionResult } from "@friday/schemas";
import { supabase } from "@/lib/supabase/server";
import { environment } from "@/lib/env";

export async function signInWithStudentGoogle(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const client = await supabase();
  if (!client)
    return {
      ok: false,
      message: "Google sign-in needs the configured Supabase project and Google provider.",
    };
  const callback = new URL("/auth/callback", environment().appUrl);
  callback.searchParams.set("flow", "student-google");
  callback.searchParams.set("next", studentDestination(form.get("next")));
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      scopes: "openid email profile",
      queryParams: { hd: STUDENT_GOOGLE_DOMAIN, prompt: "select_account" },
    },
  });
  if (error || !data.url)
    return {
      ok: false,
      message: "Google sign-in could not start. Check the provider configuration or try again.",
    };
  redirect(data.url);
}
