# Production migration status — November 14, 2026

The Next.js migration is implemented locally. All existing pages are represented
in React, with separate student/admin layouts, server actions, and explicit
sample-data previews. The original HTML prototype is preserved.

November 14 setup update: both official Supabase skills are installed for Codex,
and the saved public publishable key is active in ignored `apps/web/.env.local`.
The live Supabase Auth settings endpoint accepted it with HTTP 200. The running
FRIDAY app's `/api/health` returns `backendConfigured: true`. No key was displayed.
Live Auth settings now show Google enabled. A test OAuth authorization request
redirected to Google, and an immediate simulated cancellation returned to
FRIDAY's configured app callback with its flow parameter intact. No student
account was signed in during that routing check. After the user's SQL setup,
zero-row Data API probes for all 21 expected FRIDAY tables return HTTP 401 /
`42501`, confirming table availability and denied anonymous access. Administrative
SQL access is not configured, so hosted migration-history and policy inspection
remain unavailable; real student sign-in and persistence acceptance are pending.
`npm run db:prepare` now generates a transaction-safe `supabase/setup-friday.sql`
with all six migrations, a BRACU tenant and existing-account profile backfill.
It stops if app tables already exist and excludes the sample academic catalog.
See [the SQL Editor setup steps](supabase-first-setup.md).

Verified Workspace students can open and save private imports on `/app/connect`
and `/app/schedule` before completing the academic profile. Other academic routes
and actions still require onboarding. The onboarding page offers import links
and disables academic submission when program/semester choices are unavailable.

| Area | Implemented locally | Remaining |
| --- | --- | --- |
| Foundation | pnpm/Turborepo, Next.js, TypeScript, ESLint, formatting, shared schemas/domain packages, health endpoint, CI definition | Deployment and monitoring; current CI run status is available in GitHub Actions |
| Authentication | Supabase SSR, Google-only BRACU student login, exact-domain and provider-owned Workspace claim checks in callback/RLS, nullable pre-onboarding student ID, separate invited-admin password login, recovery and role guards; live Google provider/routing verified | Real Workspace sign-in and account-linking acceptance, release lockout/session/MFA policy |
| Student pages | Dashboard, manual enrollment schedule, private Connect schedule/exam import, opt-in generic Connect data archive with redaction/review/export/removal, downloadable browser extension, public class/exam browser, deadlines, notices/details, profile, settings, notifications | Authoritative catalog, semantic integration of additional Connect records, real Connect acceptance and hosted persistence verification |
| Academic tools | Completed-credit totals, AND/OR prerequisite checks, attendance logs, saved semester/registration plans, bounded conflict-free solver | Official requirement-group audit, confirmed attendance/credit rules, richer optimization |
| Admin pages | Program creation, course create/edit/import, section create/edit, notice draft/review/publish/archive, university deadline create/edit, existing user roles/status, reports/audit views | Complete program/requirement/prerequisite editors, staff invitation UI, richer analytics |
| Assistant | Read-only guided answers from current records, with source links | LLM/provider integration and assistant history |
| Database | SQL migrations, repeatable sample seed, tenant/owner RLS, composite tenant FKs, trusted role changes, transactional plan/import validation, append-only admin audit; all 21 hosted tables available and anonymous access denied | Hosted owner-policy inspection and real authenticated persistence acceptance |
| Notifications | Transactional in-app delivery on notice publication, preferences, emergency override, deduplication, read states | Targeted audiences, scheduled reminders, email/digests |

The public preview lives at `/preview` and `/preview/admin`. Its mutable example
records reset on reload. `/app` and `/admin` never use demo authentication as a
fallback. Missing Supabase settings disable account actions and preserve login
redirects.

## Verification

- CI navigation repair: planner and history tests now assert the destination URL
  and heading before interacting. The original planner failure was reproduced
  with a held navigation response, and the history failure reproduced locally.
  Both corrected tests passed five consecutive runs each, followed by all 16
  browser tests passing together. Failed CI runs retain screenshots/traces for
  seven days. The preceding hosted run passed install, typecheck, lint, all 63
  unit/database tests and production build before those two browser failures.
- Typecheck passes for all four workspace packages; lint, formatting, and production build pass. The development server starts and its health endpoint responds successfully.
- 63 unit/schema/PostgreSQL/extension/OAuth tests pass, including actual migration application,
  repeatable seed, tenant filtering, signup role forgery, privilege escalation,
  cross-tenant foreign keys, private deadlines/drafts, account deactivation,
  audit immutability, plan validation, atomic import, notification preferences,
  emergency deduplication, provider email synchronization, Connect parsing/privacy
  boundaries, private snapshots, catalog isolation, Google claim validation, OAuth
  callback failures and Workspace eligibility in direct database queries. Setup
  tests additionally exercise the combined SQL, legacy default grants, backfill
  without metadata role escalation and refusal to overwrite an existing schema.
  New authorization tests keep pre-onboarding exceptions limited to setup/private
  imports, still reject invalid Google identities and admin accounts on student
  routes, and verify the empty-catalog onboarding UI.
- 16 browser tests pass. Coverage checks every student/admin route at 1440px and 360px in both
  themes, public pages/404s, login redirects, preview mutations, notice details,
  saved plans, imports, section/deadline edits, external text escaping, schedule
  failure/retry, history, reduced motion, and keyboard skip navigation. Connect
  coverage includes paste/upload, semester replacement/preservation/removal,
  expired handoffs, package download and an actual unpacked extension capturing
  mocked fetch/XHR responses, including streamed sign-in redirects. Broader capture
  tests verify opt-in, concurrent responses, auth exclusion, recursive redaction,
  private archive review, replacement, export and removal. Student entry points
  show Google-only login while the invited-admin form remains separate.
- Desktop/mobile screenshots of the landing, notices, admin catalog, and login
  pages were captured and reviewed locally.
- Local browser tests use an already running owned test server when the Windows
  sandbox prevents Playwright from terminating its own server process. The
  application assertions are unchanged; the owned process is stopped separately.

## Limits and next step

The Supabase client connection and Google provider routing are verified, but
administrative schema access remains unavailable. The user's schema setup is
verified through API availability/anonymous-denial checks. No real account
sign-in, authenticated production writes by the agent, deployment or hosted CI
run are claimed. PostgreSQL tests use PGlite with a minimal Auth fixture;
browser tests mock the external schedule feed. These checks do not replace
hosted acceptance testing, a full accessibility/security audit, or device testing.

Connect integration is a reviewed snapshot import while the student uses Connect.
It does not provide unattended polling, verified official enrollment, or live
university-wide seats. The extension never reads request headers or cookies;
broader JSON capture excludes authentication endpoints and redacts known credential fields.
See [Connect setup and limits](connect-schedule-import.md). The new migration is
staged by `npm run db:prepare`; the matching hosted tables are now available.
Google sign-in does not authorize Connect requests. Students sign into Connect
separately. Only successful JSON GET data observed while browsing can be captured,
within the documented per-response/batch bounds; unvisited APIs and streams are not imported.
See [Workspace setup](google-workspace-auth.md) for provider configuration and rollout.

Use an authenticated Supabase administrative connection or SQL Editor to inspect
the hosted schema and apply the prepared migrations as needed, then configure the
Google provider and test Google sign-in →
onboarding → Connect sync with real student accounts and the separate invited-admin flow. Replace the sample
catalog before a student pilot and complete the release items listed above.
