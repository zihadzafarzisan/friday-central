import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
const pages = {
  about: [
    "About FRIDAY",
    "A calmer university day",
    "FRIDAY brings schedules, deadlines, notices, and academic planning into one place. BRAC University is the first pilot, with other universities planned later.",
  ],
  privacy: [
    "Privacy",
    "Your data and this preview",
    "Preview records are fictional and edits reset on reload. Connected accounts store their own academic records in Supabase. Theme choice is stored in a preference cookie. The public schedule browser requests the Connect dataset through FRIDAY. A full privacy policy and account export/deletion controls are required before a public pilot.",
  ],
  terms: [
    "Terms",
    "Confirm official information",
    "FRIDAY is under development. Preview records are examples, and public section listings can become outdated. Confirm enrollment, exams, and tuition dates in your official university portal. FRIDAY does not submit registration or process payments.",
  ],
  support: [
    "Support FRIDAY",
    "Help shape the student experience",
    "Explore the preview and keep a note of what would help your university day. An official support channel has not been announced. This page does not collect donations or send support requests.",
  ],
  community: [
    "Community",
    "Build it together",
    "The official FRIDAY community channel has not been announced yet. Explore the student and admin previews to see what is being built.",
  ],
} as const;
export function PublicPage({ name }: { name: keyof typeof pages }) {
  const [title, heading, body] = pages[name];
  return (
    <div className="portal-shell">
      <main className="public-workspace">
        <PageHeader title={title} home="/" />
        <Card title={heading}>
          <p className="muted">{body}</p>
          <Link className="action-button" href="/preview">
            Explore FRIDAY
          </Link>
        </Card>
      </main>
    </div>
  );
}
