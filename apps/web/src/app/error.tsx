"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="public-workspace">
      <h1>We couldn’t load this page</h1>
      <p className="muted">
        Check your connection and try again. If you’re setting up FRIDAY, verify the database
        migration and environment settings.
      </p>
      <div className="actions">
        <button className="action-button primary" onClick={reset}>
          Try again
        </button>
        <Link className="action-button" href="/">
          Back to FRIDAY
        </Link>
      </div>
    </main>
  );
}
