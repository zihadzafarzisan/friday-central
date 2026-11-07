import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { safeNext } from "@friday/schemas";
export async function GET(request: NextRequest) {
  const client = await supabase();
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  if (client && code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(next === "/reset-password" ? next : safeNext(next), request.url),
      );
  }
  return NextResponse.redirect(new URL("/verify?error=expired", request.url));
}
