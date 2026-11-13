import { z } from "zod";
export const CONNECT_DATA_MAX_BYTES = 786432;
export const CONNECT_DATA_STORAGE_KEY = "friday.connect.data.v1";
const secretKey = (key: string) => {
  const normalized = key.replace(/[^a-z0-9]/gi, "");
  return (
    /token|password|passwd|secret|credential|authorization|cookie|csrf|privatekey|apikey|assertion|signature|codeverifier|codechallenge/i.test(
      normalized,
    ) || /^(sessionid|sessionkey|publickey|sid)$/i.test(normalized)
  );
};
const jwt = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
export type ConnectJson =
  null | boolean | number | string | ConnectJson[] | { [key: string]: ConnectJson };
export function redactConnectJson(raw: unknown): ConnectJson {
  let nodes = 0;
  function visit(value: unknown, depth: number): ConnectJson {
    if (++nodes > 25000 || depth > 20) throw new Error("Connect response is too complex.");
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string")
      return value
        .replace(jwt, "[redacted]")
        .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "[redacted]");
    if (Array.isArray(value)) return value.map((item) => visit(item, depth + 1));
    if (typeof value === "object" && value) {
      const result: Record<string, ConnectJson> = Object.create(null);
      for (const [key, item] of Object.entries(value)) {
        if (["__proto__", "constructor", "prototype"].includes(key)) continue;
        result[key] = secretKey(key) ? "[redacted]" : visit(item, depth + 1);
      }
      return result;
    }
    throw new Error("Connect data must be JSON.");
  }
  return visit(raw, 0);
}
export function connectDataEndpoint(value: string): string {
  const url = new URL(value, "https://connect.bracu.ac.bd");
  if (
    url.origin !== "https://connect.bracu.ac.bd" ||
    !url.pathname.startsWith("/api/") ||
    /(?:^|\/)(?:auth|oauth|sso|token|login|logout|password|credentials|refresh)(?:\/|$)/i.test(
      url.pathname,
    )
  )
    throw new Error("Only Connect data endpoints are supported.");
  for (const key of [...url.searchParams.keys()])
    if (secretKey(key) || key === "code") url.searchParams.delete(key);
  url.searchParams.sort();
  const endpoint = url.pathname + (url.search ? url.search : "");
  if (endpoint.length > 1024 || /eyJ[A-Za-z0-9_-]+\./.test(endpoint))
    throw new Error("Unsupported endpoint.");
  return endpoint;
}
export const connectDataEntrySchema = z.object({
  endpoint: z
    .string()
    .max(2048)
    .transform((value, ctx) => {
      try {
        return connectDataEndpoint(value);
      } catch {
        ctx.addIssue({ code: "custom", message: "Unsupported Connect data endpoint." });
        return z.NEVER;
      }
    }),
  method: z.literal("GET"),
  captured_at: z.iso.datetime({ offset: true }),
  data: z.unknown().transform((value, ctx) => {
    try {
      const data = redactConnectJson(value);
      if (new TextEncoder().encode(JSON.stringify(data)).byteLength > 262144)
        throw new Error("A response exceeds 256 KB.");
      return data;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid or oversized Connect JSON data." });
      return z.NEVER;
    }
  }),
});
export const connectDataBatchSchema = z
  .array(connectDataEntrySchema)
  .min(1)
  .max(100)
  .superRefine((rows, ctx) => {
    if (new TextEncoder().encode(JSON.stringify(rows)).byteLength > CONNECT_DATA_MAX_BYTES)
      ctx.addIssue({ code: "custom", message: "Sync up to 768 KB at a time." });
    if (new Set(rows.map((row) => row.endpoint)).size !== rows.length)
      ctx.addIssue({ code: "custom", message: "Duplicate Connect endpoints." });
  });
export type ConnectDataEntry = z.infer<typeof connectDataEntrySchema>;
export const connectDataRecordSchema = connectDataEntrySchema.extend({
  imported_at: z.iso.datetime({ offset: true }),
});
export type ConnectDataRecord = z.infer<typeof connectDataRecordSchema>;
