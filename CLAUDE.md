# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repository contains a pnpm/Turborepo Next.js application in `apps/web`, shared schemas/domain logic, Supabase SQL migrations, and the preserved HTML prototype in `frontend/index.html`. Every student/admin page has a React route and an explicit public preview. Supabase-backed services and auth flows are implemented but have not been applied or verified against a hosted project. The primary product and engineering references are:

- `prd.md` — product vision, MVP scope, functional requirements, roles, security, and release boundaries.
- `techstack.md` — intended TypeScript/Next.js architecture, provider choices under consideration, service boundaries, AI approach, testing, and deployment direction.
- `app-flow.md` — public, student, and admin routes plus user journeys and UI states.
- `database.md` — PostgreSQL/Prisma-oriented domain model, relationships, constraints, tenant boundaries, and retention rules.
- `design-guide.md` — glassmorphism design system, accessibility, responsive behavior, and performance constraints.
- `buildplan.md` — implementation sequence, task status, verification criteria, open decisions, and progress tracking. Keep this file current as work advances.

`README.md` documents installation, preview, database setup, and verification. `docs/decisions/2026-11-08-production-implementation.md` records the selected Supabase architecture and overrides older Prisma/Auth.js assumptions. Do not mark hosted authentication or database deployment complete based only on local checks.

## Commands

For the buildless prototype, open `frontend/index.html` directly or serve it with `python -m http.server 8080 --bind 127.0.0.1 --directory frontend`. The browser smoke suite runs with `node frontend/tests/smoke.cjs` when Playwright and Chromium are available. `PLAYWRIGHT_MODULE` may identify an existing Playwright installation. The suite owns its temporary server and mocks the schedule feed. See `README.md` for details.

Configured workspace commands: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, and `pnpm db:prepare`. Node.js 22+ and pnpm 12.18.0 are required. Browser tests use the production build, so run `pnpm build` first. `BROWSER_EXECUTABLE` can select an installed Chromium. Unit/database tests use PGlite and do not need Docker. `pnpm db:prepare` stages versioned SQL files for the Supabase CLI; it does not apply them to any database.

The planned implementation is a pnpm + Turborepo TypeScript monorepo. Once P0-T03 is complete, update this section with the actual scripts from the root and package manifests, including:

- local development server
- production build and start
- lint and formatting
- typecheck
- unit/component tests and a single-test invocation
- Playwright end-to-end tests and a single-test invocation
- database migration, seed, and reset commands

The build plan requires the initial scaffold to verify that the local server starts and that lint, typecheck, tests, and production build pass before moving on.

## Architecture

### Product boundary

FRIDAY is a responsive student and administrator portal for consolidating university academic and administrative information. The MVP prioritizes authentication, onboarding, catalog data, dashboard/schedule, deadlines, notices with reviewed AI extraction, degree progress, notifications, and admin management. It does not replace official registration or payment systems, host an LMS, or provide social features.

### Application shape

The intended architecture is one Next.js App Router codebase with two protected route areas:

- `/app` — student portal.
- `/admin` — administrator and super-administrator portal.
- Public routes include `/`, `/login`, `/signup`, verification/password recovery routes, and `/admin/login`.

Role checks must exist both at route/middleware boundaries and in the service layer. Students and administrators have separate login entry points; cross-portal access must produce the documented redirect or 403 behavior. Incomplete student onboarding redirects to `/app/onboarding`.

The intended repository boundaries are:

- `apps/web` — Next.js UI, route groups, layouts, route handlers/server actions, and server composition.
- `packages/db` — Supabase SQL migrations, repeatable sample seed, preview fixtures, and PostgreSQL policy tests. Supabase migrations own the schema; do not add a competing ORM migration system.
- `packages/schemas` — shared Zod schemas used at client and server boundaries.
- `packages/solver` — pure TypeScript registration/prerequisite logic, independently testable.
- `services/solver-py` — optional Phase 2 Python/OR-Tools service only if TypeScript solving no longer meets requirements.

### Server organization

The MVP should keep HTTP concerns thin and place business rules in services under `apps/web/src/server/services` (or the equivalent package boundary chosen during scaffolding). The planned service responsibilities are:

- `AuthService` — signup, verification, sessions, roles, password flows.
- `CatalogService` — programs, courses, prerequisites, semesters, sections.
- `ScheduleService` — enrolled sections, exams, schedule changes.
- `DeadlineService` — personal/university deadlines and reminders.
- `NoticeService` — notice lifecycle, targeting, classification, extraction.
- `DegreeService` — requirement matching, prerequisite checks, progress calculations.
- `RegistrationService` — plan generation, conflicts, and scoring.
- `AttendanceService` — attendance and allowable absences.
- `AssistantService` — grounded, read-only student-data Q&A.
- `NotificationService` — preferences, audience resolution, deduplication, and delivery.

Use Zod at request, form, import, and AI-output boundaries. Server validation is authoritative. Keep filters and search parameters in the URL so views survive refresh and can be shared.

### Data model and tenancy

PostgreSQL is hosted by Supabase and accessed with the authenticated user's Supabase client. Supabase Auth owns credentials and provider sessions. University-shared data includes programs, courses, prerequisites, semesters, sections, notices, and university deadlines. Student-private data includes profiles, completed courses, enrollments, personal deadlines, attendance, saved plans, and preferences. The implemented subset and remaining pipelines are recorded in `buildplan.md`; the older database document also describes future tables.

University-scoped tables must carry `university_id`, and every query must enforce tenant filtering. The core relationships are:

- University → programs, courses, semesters, users, notices.
- Courses → prerequisite groups/items and sections.
- Sections → meetings and exams.
- Student profiles → completed courses, enrolled sections, attendance, deadlines, and registration plans.
- Notices → audience targets, extraction results, reads, and linked deadlines.
- Admin mutations → append-only audit logs.

Prefer computing degree progress from requirement groups and source academic records rather than storing duplicated totals. Preserve the delete behavior and constraints in `database.md`: deactivate/restrict shared catalog and admin records, cascade personal data on account deletion, and keep notice-linked deadlines when notices are removed by setting the notice reference null.

### AI and background work

AI is provider-neutral at the application boundary. Notice classification and date extraction must use structured output validated by Zod, store confidence/model/review metadata, and route uncertain results to admin review. Notice text is untrusted data and must never be treated as instructions. The university assistant is read-only in the MVP, must query only the authenticated student’s data through explicit tools, cite source records, and state when data is unavailable.

The planned background jobs cover deadline reminders, notice processing, schedule-change propagation, digests, and consistency checks. Inngest is the current MVP assumption, but the queue provider remains an open decision. Email is also provider-configurable, with Resend as the current assumption.

### UI and interaction system

The current frontend preserves the prototype CSS in `globals.css` with shared React components and Lucide icons. Native React forms and server actions use shared Zod schemas. Tailwind, shadcn, React Hook Form, and TanStack Query were considered in the original plan but are not installed; do not assume their utilities exist. Follow `design-guide.md` and preserve the approved visual identity:

- Glass levels G1/G2/G3/G-Solid establish elevation and opacity.
- Text-heavy surfaces use solid/high-opacity treatment for readability.
- Primary actions remain solid and high contrast; status uses icon plus text, not color alone.
- Desktop uses a floating sidebar and top bar; mobile uses a bottom navigation bar at widths down to 360px.
- Support dark mode, reduced motion/transparency, keyboard navigation, visible focus, 44px touch targets, and WCAG 2.1 AA contrast.
- Every major screen needs loading, empty, error, success, and permission/stale-data states where applicable.

### Testing direction

Vitest domain/schema tests, PGlite PostgreSQL migration/policy tests, Playwright browser flows, and a CI definition are configured. Testing Library, axe, and Storybook remain planned rather than installed. Do not claim a full accessibility audit, hosted CI run, or real Supabase acceptance test from these local checks.

## Current implementation sequence

Follow `buildplan.md` as the source of truth for sequencing and status. The next foundation work is:

1. Connect the selected Supabase project and apply/verify the prepared SQL migrations.
2. Verify real signup, email confirmation, recovery, role/onboarding redirects, and saved student/admin records.
3. Replace sample catalog/degree data with authoritative university data and confirm launch policies.
4. Complete reminder/email/AI pipelines, monitoring, deployment, and the remaining release checks.

When starting or completing meaningful work, update the task status, Last Task section, progress log, open blockers, and change log in `buildplan.md` according to its maintenance rules.

## Important unresolved decisions

BRAC University is the initial pilot; other universities come later. The approved implementation uses Supabase PostgreSQL/Auth, student domain `g.bracu.ac.bd`, and timezone `Asia/Dhaka`. Domain/tenant settings are stored in the database. See `docs/decisions/2026-11-08-production-implementation.md`. Launch cohort size, authoritative catalog/degree rules, and hosted Supabase setup remain open.

Unresolved release decisions include authoritative university data access, AI provider/model, scheduled job/email providers, production admin 2FA/session/lockout configuration, and pilot scale. Completed courses/enrollments use manual entry initially; grades are optional. Preserve route and service authorization plus database RLS. Never use user-editable metadata for roles or grant browser code an elevated Supabase key. Preview routes must remain separate from authenticated routes.
