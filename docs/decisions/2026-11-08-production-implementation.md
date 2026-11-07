# Production implementation decisions

The user approved migration of all pages and incremental connection of student,
admin, and academic tools on November 8, 2026.

- Use Next.js App Router, TypeScript, pnpm/Turborepo, Supabase Postgres and Auth.
- Supabase SQL migrations own the database schema. Use the Supabase client with
  the authenticated user's token; do not introduce a second ORM migration system.
- Supabase owns passwords, verification tokens, and refresh sessions. Public
  application users reference `auth.users`; no application password table.
- Initial tenant: BRAC University, exact student domain `g.bracu.ac.bd`, timezone
  `Asia/Dhaka`. Keep tenant/domain configuration in database records.
- Completed courses and enrollments are manually selected from the managed
  catalog. Grades are optional; degree credit totals count completed courses.
- Admin accounts cannot self-register. Promote the first operator through a
  trusted SQL session; role/status changes require a super-admin thereafter.
- Migrate all existing pages into reusable React components. Public preview
  routes use explicit sample data, never a bypass on authenticated routes.
- Keep the existing Connect JSON source behind a validated server route.
- No live Supabase account is connected yet. Prepare and locally test migrations,
  policies, and application code; do not claim hosted migrations or real email
  delivery succeeded until the project is connected and verified.
- AI provider and scheduled email jobs remain external configuration decisions.
  The assistant must provide grounded record links without claiming LLM output
  until an AI provider is configured. No registration/payment submission.

The seed catalog is clearly labeled sample data and must be replaced with an
authoritative BRACU catalog/degree structure before a real student pilot.
