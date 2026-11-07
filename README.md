# FRIDAY — Student OS

FRIDAY now runs as a Next.js application with student and administrator portals.
The original HTML prototype is preserved in `frontend/index.html`.

## Run locally

Requires Node.js 22+ and pnpm 12.18.0.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:3000`.

Dependencies are already installed in this workspace. On Windows, you can also
start the app with `npm.cmd run dev` without installing pnpm globally.

- `/preview` — every student page, with clearly labeled sample data.
- `/preview/admin` — admin pages and temporary catalog/notice interactions.
- `/schedules` and `/exams` — public Connect data through a validated server route.
- `/app` and `/admin` — real protected portals. These require Supabase setup.

Preview changes stay in memory and reset on reload. Preview routes never create
an authenticated session or write to the live database. Missing Supabase settings
disable real sign-in rather than falling back to demo authentication.

## Supabase setup

The selected stack is Supabase PostgreSQL + Supabase Auth. Install and connect
the Supabase integration to let Codex work against the selected project, or set
up the project directly in Supabase.

1. Copy `apps/web/.env.example` to `apps/web/.env.local` and set the project URL,
   publishable key, and `APP_URL`. No elevated database/auth key is needed by the
   application. Never put an elevated key in a `NEXT_PUBLIC_` variable.
2. Apply the SQL files in `packages/db/migrations` in filename order. The SQL
   creates tenant/owner policies, the Auth profile trigger, validated save/import
   functions, append-only audit logging, and notice notifications.
3. For development only, run `packages/db/seed.sql`. It is repeatable and contains
   a BRACU tenant and a **sample** program/course/section catalog. Replace sample
   requirements and sections with verified university records before a pilot.
4. Enable email confirmation, configure production email delivery, and allow
   `${APP_URL}/auth/callback` as an Auth redirect. The callback handles signup
   verification and recovery links. Test those flows against the actual project.
5. Register the first operator using a supported student email. From a trusted
   SQL session, promote that specific account in `public.users` to `super_admin`.
   Staff accounts can instead be provisioned by trusted Supabase administration
   with `app_metadata.role` and `app_metadata.university_id` set at creation.
   Ordinary signup metadata cannot grant administrator access.

For a local Supabase CLI setup, `pnpm db:prepare` copies the canonical migrations
into the ignored `supabase/migrations` folder. `supabase/config.toml` points at
the development seed and enables email confirmation. Supabase CLI/Docker startup
has not been verified in this workspace because the Docker daemon is unavailable.

## Current functionality

- Shared React shell, original logo/watermark, mobile navigation, themes, reduced
  motion, focus states, loading/error/empty pages, and normal URL navigation.
- Signup, verification callback, student/admin login, recovery, sign-out,
  onboarding guards, and service-layer role checks implemented for Supabase.
- Personal deadline creation/editing/completion/deletion; university deadlines
  remain protected and have an admin editor.
- Notice search, categories, read states, detail pages, publication/archive flows,
  and transactional preference-aware in-app notifications.
- Managed enrollments, completed-course profiles, computed credit totals and
  prerequisite eligibility, self-reported attendance, and saved preferences.
- Semester plans and conflict-free registration plans. The server/database
  recheck tenant membership, credit limits, seats, prerequisites, and conflicts
  before saving. FRIDAY never submits official registration.
- Administrator program/course/section forms, course CSV validation/import,
  notice/deadline editing, existing account roles/status, reports, and audit views.
- A guided assistant answers from the authenticated student's loaded records and
  links to its sources. LLM answers are not enabled yet.

The section editor currently supports one weekly meeting. The CSV importer
accepts up to 200 courses in plain `code,title,credits` format, without embedded
commas or quotes, and applies the reviewed batch atomically.

## Verification

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm test` runs domain/schema tests and actual PostgreSQL migration/RLS tests
using PGlite, without Docker or hosted credentials. Browser tests use the
production build, exercise the public/preview routes and authentication redirects,
and mock the external schedule response. `BROWSER_EXECUTABLE` can select an
existing Chromium installation. To test a server already running on port 3100,
set `FRIDAY_E2E_EXTERNAL_SERVER=1`; the test runner will leave that server alone.
The CI workflow performs installation, checks, build, and browser tests.

## Remaining before a real pilot

Connect and verify the hosted Supabase project, replace the sample catalog and
program rules, and test real student/admin/verification/recovery flows. Complete
provider/session/lockout and admin MFA configuration, full requirement-group
matching, targeted notices, scheduled email/reminder jobs, account export/deletion,
monitoring/backups, and the accessibility/security release review. AI provider
selection remains open. Hosted CI and deployment have not been run from this task.

`buildplan.md` tracks progress; `docs/production-status.md` records the implemented
scope and verification limits. The original prototype still opens directly or
with `python -m http.server 8080 --bind 127.0.0.1 --directory frontend`.
