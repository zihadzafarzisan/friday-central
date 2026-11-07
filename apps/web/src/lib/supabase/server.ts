import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { environment } from "@/lib/env";
export async function supabase() {
  const env = environment();
  if (!env.url || !env.key) return null;
  const store = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* The proxy refreshes cookies during Server Component rendering. */
        }
      },
    },
  });
}
