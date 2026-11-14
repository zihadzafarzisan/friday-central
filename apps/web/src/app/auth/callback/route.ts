import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { environment } from "@/lib/env";
import { safeNext, studentDestination, isStudentGoogleUser } from "@friday/schemas";
export async function GET(request: NextRequest) {
  // The request origin can be rewritten by Next.js or a reverse proxy.
  const appUrl = environment().appUrl;
  const client = await supabase();
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const google = request.nextUrl.searchParams.get("flow") === "student-google";
  if (client && code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error && google) {
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();
      if (userError || !user || !isStudentGoogleUser(user)) {
        await client.auth.signOut({ scope: "local" });
        return NextResponse.redirect(new URL("/login?error=workspace", appUrl));
      }
      const { data: account } = await client
        .from("users")
        .select("role,status")
        .eq("id", user.id)
        .single();
      if (account?.role !== "student" || account?.status !== "active") {
        await client.auth.signOut({ scope: "local" });
        return NextResponse.redirect(new URL("/login?error=account", appUrl));
      }
      return NextResponse.redirect(new URL(studentDestination(next), appUrl));
    }
    if (!error)
      return NextResponse.redirect(
        new URL(next === "/reset-password" ? next : safeNext(next), appUrl),
      );
  }
  if (google) return NextResponse.redirect(new URL("/login?error=google", appUrl));
  return NextResponse.redirect(new URL("/verify?error=expired", appUrl));
}
