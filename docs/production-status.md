# Production migration status — November 8, 2026

The Next.js migration is implemented locally. All existing pages are represented
in React, with separate student/admin layouts, server actions, and explicit
sample-data previews. The original HTML prototype is preserved.

| Area | Implemented locally | Remaining |
| --- | --- | --- |
| Foundation | pnpm/Turborepo, Next.js, TypeScript, ESLint, formatting, shared schemas/domain packages, health endpoint, CI definition | Hosted CI/deployment and monitoring |
| Authentication | Supabase SSR sessions, signup, verification callback, recovery, separate logins, role/onboarding guards, sign-out | Connected project, actual email/session tests, release lockout/session/MFA policy |
| Student pages | Dashboard, personal enrollment schedule, public class/exam browser, deadlines, notices/details, profile, settings, notifications | Authoritative catalog and personalized exam ingestion |
| Academic tools | Completed-credit totals, AND/OR prerequisite checks, attendance logs, saved semester/registration plans, bounded conflict-free solver | Official requirement-group audit, confirmed attendance/credit rules, richer optimization |
| Admin pages | Program creation, course create/edit/import, section create/edit, notice draft/review/publish/archive, university deadline create/edit, existing user roles/status, reports/audit views | Complete program/requirement/prerequisite editors, staff invitation UI, richer analytics |
| Assistant | Read-only guided answers from current records, with source links | LLM/provider integration and assistant history |
| Database | SQL migrations, repeatable sample seed, tenant/owner RLS, composite tenant FKs, trusted role changes, transactional plan/import validation, append-only admin audit | Apply and verify against the selected Supabase project |
| Notifications | Transactional in-app delivery on notice publication, preferences, emergency override, deduplication, read states | Targeted audiences, scheduled reminders, email/digests |

The public preview lives at `/preview` and `/preview/admin`. Its mutable example
records reset on reload. `/app` and `/admin` never use demo authentication as a
fallback. Missing Supabase settings disable account actions and preserve login
redirects.

## Verification

- Typecheck passes for all four workspace packages; lint, formatting, and production build pass. The development server starts and its health endpoint responds successfully.
- 29 unit/schema/PostgreSQL tests pass, including actual migration application,
  repeatable seed, tenant filtering, signup role forgery, privilege escalation,
  cross-tenant foreign keys, private deadlines/drafts, account deactivation,
  audit immutability, plan validation, atomic import, notification preferences,
  emergency deduplication, and provider email synchronization.
- 10 browser tests pass. Coverage checks every student/admin route at 1440px and 360px in both
  themes, public pages/404s, login redirects, preview mutations, notice details,
  saved plans, imports, section/deadline edits, external text escaping, schedule
  failure/retry, history, reduced motion, and keyboard skip navigation.
- Desktop/mobile screenshots of the landing, notices, admin catalog, and login
  pages were captured and reviewed locally.
- Local browser tests use an already running owned test server when the Windows
  sandbox prevents Playwright from terminating its own server process. The
  application assertions are unchanged; the owned process is stopped separately.

## Limits and next step

Supabase is not connected in this session. No hosted migrations, real account
creation, verification emails, production database writes, deployment, or hosted
CI run are claimed. PostgreSQL tests use PGlite with a minimal Auth fixture;
browser tests mock the external schedule feed. These checks do not replace
hosted acceptance testing, a full accessibility/security audit, or device testing.

Install and connect the Supabase integration or configure the selected project
locally, then apply the migrations and test signup → verification → onboarding →
dashboard → saved deadline with real student/admin accounts. Replace the sample
catalog before a student pilot and complete the release items listed above.
