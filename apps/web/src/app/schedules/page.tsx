import { Suspense } from "react";
import { PublicSchedule } from "@/components/public-schedule";
import { PageHeader } from "@/components/ui";
export default function Page() {
  return (
    <div className="portal-shell">
      <main className="public-workspace wide">
        <PageHeader
          title="Class schedules"
          home="/"
          description="Browse public BRACU classes, labs, faculty, rooms, and seats."
        />
        <Suspense fallback={<p role="status">Loading schedule filters…</p>}>
          <PublicSchedule />
        </Suspense>
      </main>
    </div>
  );
}
