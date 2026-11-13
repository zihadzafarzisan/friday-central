import { notFound } from "next/navigation";
import { StudentPage } from "@/components/student-page";
import { studentTitles } from "@/lib/routes";
import { portalData } from "@/server/data";
import { canImportBeforeOnboarding } from "@friday/schemas";
export default async function StudentRoute({ params }: { params: Promise<{ page?: string[] }> }) {
  const { page = [] } = await params;
  const name = page[0] || "";
  const detailId =
    page[0] === "registration" && page[1] === "plans"
      ? page[2]
      : page[0] === "notices"
        ? page[1]
        : undefined;
  if (
    !Object.hasOwn(studentTitles, name) ||
    (page.length > 1 && !detailId) ||
    (name === "notices" && page.length > 2) ||
    page.length > 3
  )
    notFound();
  const data = await portalData(false, !canImportBeforeOnboarding(`/app/${name}`));
  if (
    detailId &&
    !(name === "notices" ? data.notices : data.plans).some((row) => row.id === detailId)
  )
    notFound();
  return <StudentPage name={name} initial={data} detailId={detailId} />;
}
