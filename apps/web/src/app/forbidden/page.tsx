import Link from "next/link";
import { Empty } from "@/components/ui";
export default function Forbidden() {
  return (
    <main className="public-workspace">
      <Empty title="This portal isn’t available to your account">
        <p>Use the portal assigned to your role.</p>
        <div className="actions">
          <Link className="action-button" href="/app">
            Student portal
          </Link>
          <Link className="action-button" href="/admin">
            Admin portal
          </Link>
        </div>
      </Empty>
    </main>
  );
}
