import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { sampleData } from "@friday/db";
import { StudentPage } from "@/components/student-page";
import { AdminPage } from "@/components/admin-page";
import { studentTitles, adminTitles } from "@/lib/routes";
import { Shell } from "@/components/shell";
export default async function Preview({ params }: { params: Promise<{ page?: string[] }> }) {
  const { page = [] } = await params;
  const admin = page[0] === "admin";
  const parts = admin ? page.slice(1) : page;
  const name = admin ? parts.join("/") : (parts[0] ?? "");
  if (!Object.hasOwn(admin ? adminTitles : studentTitles, name)) notFound();
  const data = sampleData(admin);
  const detailId =
    parts[0] === "registration" && parts[1] === "plans"
      ? parts[2]
      : parts[0] === "notices"
        ? parts[1]
        : undefined;
  return (
    <Shell admin={admin} preview initialTheme={(await cookies()).get("friday-theme")?.value}>
      {admin ? (
        <AdminPage name={name} initial={data} preview />
      ) : (
        <StudentPage name={name} initial={data} detailId={detailId} preview />
      )}
    </Shell>
  );
}
