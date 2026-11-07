import { z } from "zod";
import { connectRowSchema } from "@friday/schemas";
export async function GET() {
  try {
    const response = await fetch("https://usis-cdn.eniamza.com/connect-migrate.json", {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Unavailable");
    const payload = z
      .object({ courses: z.array(z.unknown()).max(20000) })
      .parse(await response.json());
    const rows = payload.courses.flatMap((row) => {
      const result = connectRowSchema.safeParse(row);
      return result.success ? [result.data] : [];
    });
    return Response.json(
      {
        rows,
        fetchedAt: new Date().toISOString(),
        source: "Public Connect dataset",
        skipped: payload.courses.length - rows.length,
      },
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch {
    return Response.json(
      { message: "Public schedules are unavailable. Try again shortly." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
