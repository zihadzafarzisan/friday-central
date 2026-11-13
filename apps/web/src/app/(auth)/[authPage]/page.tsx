import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { PageHeader } from "@/components/ui";
import { isConfigured } from "@/lib/env";
const pages = {
  login: ["Welcome back", "login"],
  signup: ["Your FRIDAY account", "signup"],
  "forgot-password": ["Reset your password", "forgot"],
  "reset-password": ["Choose a new password", "reset"],
  verify: ["Verify your email", "resend"],
} as const;
export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ authPage: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { authPage } = await params;
  const search = await searchParams;
  if (!Object.hasOwn(pages, authPage)) notFound();
  const [title, mode] = pages[authPage as keyof typeof pages];
  return (
    <div className="portal-shell">
      <main className="public-workspace">
        <PageHeader
          title={title}
          eyebrow="FRIDAY · BRAC University"
          home="/"
          description={
            authPage === "verify"
              ? search.error
                ? "That link is invalid or expired. Request a fresh verification email."
                : "Check your student inbox for your verification link. You can request another below."
              : search.error === "workspace"
                ? "Use your verified BRACU Google Workspace account (@g.bracu.ac.bd)."
                : search.error === "google" || search.error === "account"
                  ? "Google sign-in could not finish. Try again with your active BRACU student account."
                  : "Your university life, a little more organised."
          }
        />
        <AuthForm mode={mode} configured={isConfigured()} next={search.next} />
        <p className="muted">
          <Link href="/">Back to FRIDAY</Link>
        </p>
      </main>
    </div>
  );
}
