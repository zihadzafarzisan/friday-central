import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin-page";
import { adminTitles } from "@/lib/routes";
import { portalData } from "@/server/data";
export default async function AdminRoute({ params }: { params: Promise<{ page?: string[] }> }) {
  const { page = [] } = await params;
  const name = page.join("/");
  if (!Object.hasOwn(adminTitles, name)) notFound();
  return <AdminPage name={name} initial={await portalData(true)} />;
}
