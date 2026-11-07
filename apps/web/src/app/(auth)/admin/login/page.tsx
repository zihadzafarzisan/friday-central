import { AuthForm } from "@/components/auth-form";
import { PageHeader } from "@/components/ui";
import { isConfigured } from "@/lib/env";
export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const search = await searchParams;
  return (
    <div className="portal-shell">
      <main className="public-workspace">
        <PageHeader
          title="Admin sign-in"
          eyebrow="FRIDAY administration"
          home="/"
          description="Manage the university catalog, notices, and student access."
        />
        <AuthForm mode="login" configured={isConfigured()} next={search.next ?? "/admin"} admin />
      </main>
    </div>
  );
}
