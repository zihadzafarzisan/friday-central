import { headers, cookies } from "next/headers";
import { Shell } from "@/components/shell";
import { requireIdentity } from "@/server/auth";
import { canImportBeforeOnboarding } from "@friday/schemas";
export const dynamic = "force-dynamic";
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-friday-path") || "/app";
  await requireIdentity("student", path, !canImportBeforeOnboarding(path));
  return <Shell initialTheme={(await cookies()).get("friday-theme")?.value}>{children}</Shell>;
}
