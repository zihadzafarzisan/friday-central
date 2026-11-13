import { z } from "zod";
const schema = z
  .object({
    url: z.url().optional(),
    key: z.string().min(10).optional(),
    appUrl: z.url().default("http://127.0.0.1:3000"),
  })
  .refine(
    (env) => Boolean(env.url) === Boolean(env.key),
    "Configure both Supabase URL and publishable key.",
  );
export function environment() {
  return schema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
    appUrl: process.env.APP_URL || undefined,
  });
}
export function isConfigured() {
  const env = environment();
  return Boolean(env.url && env.key);
}
