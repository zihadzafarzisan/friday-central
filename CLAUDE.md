# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repository is currently specification-only. The implementation has not been scaffolded yet. The primary product and engineering references are:

- `prd.md` — product vision, MVP scope, functional requirements, roles, security, and release boundaries.
- `techstack.md` — intended TypeScript/Next.js architecture, provider choices under consideration, service boundaries, AI approach, testing, and deployment direction.
- `app-flow.md` — public, student, and admin routes plus user journeys and UI states.
- `database.md` — PostgreSQL/Prisma-oriented domain model, relationships, constraints, tenant boundaries, and retention rules.
- `design-guide.md` — glassmorphism design system, accessibility, responsive behavior, and performance constraints.
- `buildplan.md` — implementation sequence, task status, verification criteria, open decisions, and progress tracking. Keep this file current as work advances.

There is currently no `README.md`, package manifest, source tree, test suite, CI configuration, Cursor rule, or Copilot instruction file. Do not assume development commands exist until the monorepo is created.

## Commands

No verified build, development, lint, typecheck, or test commands are available yet because the project has not been scaffolded. Do not run guessed `npm`, `pnpm`, Next.js, Prisma, or test commands as if they were configured.

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
- `packages/db` — Prisma schema, migrations, seed data, and database access types.
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

PostgreSQL is the intended database, accessed through Prisma unless the provider decision changes. University-shared data includes programs, courses, prerequisites, semesters, sections, notices, and university deadlines. Student-private data includes profiles, completed courses, enrollments, personal deadlines, attendance, saved plans, and preferences. System data includes notifications, AI extraction records, reminders, assistant records, imports, sessions, and audit logs.

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

The intended frontend uses Tailwind CSS, shadcn/ui, Radix primitives, React Hook Form, Zod, and TanStack Query. Use the design system in `design-guide.md` rather than introducing ad hoc visual styles:

- Glass levels G1/G2/G3/G-Solid establish elevation and opacity.
- Text-heavy surfaces use solid/high-opacity treatment for readability.
- Primary actions remain solid and high contrast; status uses icon plus text, not color alone.
- Desktop uses a floating sidebar and top bar; mobile uses a bottom navigation bar at widths down to 360px.
- Support dark mode, reduced motion/transparency, keyboard navigation, visible focus, 44px touch targets, and WCAG 2.1 AA contrast.
- Every major screen needs loading, empty, error, success, and permission/stale-data states where applicable.

### Testing direction

The written plan calls for Vitest unit tests around pure domain logic (solver, prerequisites, degree progress, attendance, deadline status), Testing Library component tests for forms and UI states, and Playwright critical-path tests. Accessibility checks should use axe, and CI should eventually run install, lint, typecheck, tests, and build. These tools are planned, not installed or configured yet.

## Current implementation sequence

Follow `buildplan.md` as the source of truth for sequencing and status. The next foundation work is:

1. Resolve product decisions: pilot university/domain, data access, completed-course and enrollment sources, grades, admin 2FA, and official portal handoff.
2. Lock providers: database host, ORM, auth, queue, email, and AI model/provider.
3. Scaffold the pnpm/Turborepo monorepo and minimal Next.js app.
4. Establish CI/deployment conventions and then implement database migrations/seeds.

When starting or completing meaningful work, update the task status, Last Task section, progress log, open blockers, and change log in `buildplan.md` according to its maintenance rules.

## Important unresolved decisions

Do not silently treat these as settled product requirements: pilot university and email domain, available university data source, AI provider/model, Neon versus Supabase, Prisma versus Drizzle, Auth.js versus Supabase Auth, Inngest versus BullMQ, manual versus imported completed courses/enrollments, admin 2FA, and whether grades are required in MVP. If implementation depends on one, record the decision and its rationale in the appropriate specification before proceeding.
