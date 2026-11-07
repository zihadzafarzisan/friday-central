import { isConfigured } from "@/lib/env";
export function GET() {
  return Response.json(
    { status: "ok", service: "friday-web", backendConfigured: isConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
