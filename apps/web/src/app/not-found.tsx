import Link from "next/link";
export default function NotFound() {
  return (
    <main className="public-workspace">
      <h1>That page isn’t here</h1>
      <p className="muted">Return to FRIDAY to find your next step.</p>
      <Link className="action-button" href="/">
        Back to portal
      </Link>
    </main>
  );
}
