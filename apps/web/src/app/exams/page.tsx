import { Suspense } from "react";
import { PublicSchedule } from "@/components/public-schedule";
import { PageHeader } from "@/components/ui";
export default function Page() {
  return (
    <div className="portal-shell">
      <main className="public-workspace wide">
        <PageHeader
          title="Exam schedules"
          home="/"
          description="Public midterm and final exam dates from Connect."
        />
        <Suspense fallback={<p role="status">Loading exam filters…</p>}>
          <PublicSchedule exam />
        </Suspense>
      </main>
    </div>
  );
}
