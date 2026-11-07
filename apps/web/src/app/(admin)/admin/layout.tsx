import { cookies, headers } from "next/headers";
import { Shell } from "@/components/shell";
import { requireIdentity } from "@/server/auth";
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireIdentity("admin", (await headers()).get("x-friday-path") || "/admin");
  return (
    <Shell admin initialTheme={(await cookies()).get("friday-theme")?.value}>
      {children}
    </Shell>
  );
}
