# FRIDAY Build Plan

> **Project tracker:** Update this file whenever a task starts, finishes, is blocked, or changes scope. The task status, dates, and **Last Task** section are the source of truth for project progress.

**Project:** FRIDAY — Student OS
**Plan created:** October 21, 2026
**Current release target:** MVP / Release 1
**Current phase:** Phase 0 — Foundation
**Overall status:** Planning complete; implementation not started
**Primary specification:** `prd.md`
**Supporting documents:** `techstack.md`, `app-flow.md`, `database.md`, `design-guide.md`

---

## Last Task

| Field | Value |
|---|---|
| Last task completed | Made schedule views live-refreshing and alphabetically ordered |
| Completed date | October 23, 2026 |
| Current next task | Scaffold the application and move schedule ingestion behind a validated server-side service |
| Current owner | Project team |
| Status | In progress |
| Notes | The prototype removes semester filtering and fetches the public Connect dataset with cache bypass whenever Class or Exam is opened; production should add server-side validation, caching, attribution, and scheduled refresh. |

### Task update format

When completing a task, update the task row and add an entry to the progress log:

```markdown
| Task | Status | Started | Completed | Notes |
|---|---|---|---|---|
| P0-T01 | Done | YYYY-MM-DD | YYYY-MM-DD | Short result or link |
```

Use these statuses:

- `Not started`
- `Ready`
- `In progress`
- `Blocked`
- `Done`
- `Deferred`

---

## Project Goals

1. Provide a single student dashboard for classes, deadlines, notices, attendance warnings, and degree progress.
2. Reduce registration friction with conflict detection and generated schedule plans.
3. Convert university notices into categorized, actionable deadlines and notifications.
4. Give administrators tools to manage catalog data, users, notices, deadlines, and audit history.
5. Keep student data private, tenant-aware, accessible, responsive, and grounded when AI is used.

## MVP Scope

### Must-have

- Student and admin authentication
- Student onboarding and profile
- Programs, courses, prerequisites, semesters, sections, and instructors
- Student dashboard and schedule
- Unified personal and university deadline manager
- Notice board with classification and deadline extraction
- Degree progress tracking
- Admin catalog, users, notices, and deadlines management
- In-app and email notifications
- Audit logging

### Should-have after the core MVP is stable

- Registration Copilot
- Attendance tracker
- Read-only AI University Assistant

### Explicitly deferred

- Real tuition payment processing
- Registration submission to the official university portal
- Full LMS hosting
- Social feed or peer-to-peer chat
- Career hub and document vault
- Marketplace, commute, carpool, and native mobile apps

---

## Schedule and Milestones

Dates are initial working targets beginning October 21, 2026. Adjust them in this table when the team size, pilot university, or data access changes.

| Milestone | Planned dates | Status | Exit criteria |
|---|---:|---|---|
| Phase 0: Decisions and foundation | Oct 21–Oct 27, 2026 | In progress | Architecture decisions recorded, repository runs locally, CI and database migration work |
| Phase 0: Authentication and catalog | Oct 28–Nov 10, 2026 | Not started | Student/admin login, onboarding, roles, catalog CRUD, seed data |
| Phase 1: Core student MVP | Nov 11–Dec 8, 2026 | Not started | Dashboard, schedule, deadlines, notices, degree progress work end-to-end |
| Phase 1: Notifications and admin completion | Dec 9–Dec 22, 2026 | Not started | Reminder jobs, email delivery, admin workflows, audit logs, error states |
| MVP hardening and pilot readiness | Dec 23, 2026–Jan 12, 2027 | Not started | Security, accessibility, performance, E2E tests, pilot deployment, documentation |
| Phase 2: Registration and assistant | Jan 13–Feb 9, 2027 | Deferred | Registration plans, attendance, grounded assistant, and supporting tests |
| Phase 3: Career and documents | After Phase 2 | Deferred | Career hub, CV/portfolio, and document vault |
| Phase 4: Ecosystem | After Phase 3 | Deferred | Payments, commute, marketplace, multi-university rollout, mobile apps |

---

## Phase 0 — Decisions and Foundation

### P0-T01: Confirm product decisions

**Status:** Ready
**Planned dates:** October 21–22, 2026
**Dependencies:** None

- [ ] Confirm pilot university, email domain, timezone, and expected student scale.
- [ ] Decide whether completed courses are manually entered for MVP.
- [ ] Decide whether enrollment data is manually entered or imported.
- [ ] Decide whether grades are required for MVP or only completion status.
- [ ] Decide whether admin 2FA is required at launch.
- [ ] Decide the official university portal URL used by Registration Copilot handoff.
- [ ] Update the open questions in `prd.md`, `app-flow.md`, and `database.md` with decisions.

**Deliverable:** Approved decision record and no unresolved blocker for foundation implementation.

### P0-T02: Lock initial technology providers

**Status:** Ready
**Planned dates:** October 21–22, 2026
**Dependencies:** P0-T01

- [ ] Choose Neon or Supabase for PostgreSQL hosting.
- [ ] Choose Prisma or Drizzle for the ORM; the current plan assumes Prisma.
- [ ] Choose Auth.js or Supabase Auth; the current plan assumes Auth.js.
- [ ] Choose Inngest or BullMQ; the current plan assumes Inngest for the MVP.
- [ ] Choose email provider; the current plan assumes Resend.
- [ ] Choose the AI provider and model only after security, data handling, cost, and structured-output requirements are reviewed. `techstack.md` currently leaves this decision open.
- [ ] Record provider decisions and rejected alternatives in `techstack.md`.

**Deliverable:** Locked MVP provider matrix and environment-variable list.

### P0-T03: Scaffold the monorepo and web application

**Status:** In progress
**Planned dates:** October 23–24, 2026
**Dependencies:** P0-T02

**Expected structure:**

```text
apps/web/
packages/db/
packages/schemas/
packages/solver/
services/solver-py/
.github/workflows/
docs/
```

- [ ] Create a pnpm + Turborepo workspace.
- [ ] Create the Next.js App Router application in `apps/web`.
- [ ] Configure TypeScript, ESLint, Prettier, Husky, and lint-staged.
- [ ] Add `/app` and `/admin` route groups with placeholder layouts.
- [ ] Add shared package boundaries for database, schemas, and solver logic.
- [ ] Add environment validation with typed Zod schemas.
- [ ] Add a health endpoint and a minimal landing page.

**Verification:** Local development server starts; typecheck, lint, test, and production build pass.

### P0-T04: Establish CI and deployment environments

**Status:** Not started
**Planned dates:** October 25–27, 2026
**Dependencies:** P0-T03

- [ ] Add GitHub Actions for install, lint, typecheck, tests, and build.
- [ ] Configure `local`, `preview`, `staging`, and `production` environment conventions.
- [ ] Connect the web application to Vercel or the selected hosting provider.
- [ ] Configure secrets only through environment variables.
- [ ] Add Sentry and basic structured logging.
- [ ] Add a deployment health check.

**Verification:** A pull request produces a preview deployment and CI blocks failures.

### P0-T05: Implement database foundation and migrations

**Status:** Not started
**Planned dates:** October 28–November 3, 2026
**Dependencies:** P0-T02, P0-T03

**Primary tables:**

- `universities`
- `users`
- `sessions`
- `verification_tokens`
- `programs`
- `requirement_groups`
- `requirement_group_courses`
- `courses`
- `prerequisite_groups`
- `prerequisite_items`
- `semesters`
- `instructors`
- `sections`
- `section_meetings`
- `exams`
- `student_profiles`

- [ ] Implement the Prisma schema from `database.md`.
- [ ] Add UUID identifiers, timestamps, tenant keys, relations, indexes, and delete behavior.
- [ ] Add constraints for credits, capacity, seats, time ordering, and personal deadline ownership where applicable.
- [ ] Add initial migrations and a repeatable seed script.
- [ ] Seed one university, program, courses, prerequisites, semester, instructors, sections, and super-admin placeholder.

**Verification:** Migration applies to an empty database; seed is repeatable; relational integrity tests pass.

---

## Phase 0 — Authentication, Authorization, and Catalog

### P0-T06: Build authentication and session controls

**Status:** Not started
**Planned dates:** November 4–7, 2026
**Dependencies:** P0-T05

- [ ] Implement student signup with university-domain validation.
- [ ] Enforce password minimum of 8 characters with mixed case and a number.
- [ ] Store passwords with argon2id or the selected approved password-hashing library.
- [ ] Implement email verification with single-use expiring tokens.
- [ ] Implement password reset with an expiring link.
- [ ] Implement separate student and admin login entry points.
- [ ] Rate-limit login attempts and lock accounts for 15 minutes after 5 failures.
- [ ] Implement session expiry: 30 minutes of inactivity for admins and 7 days for student “remember me”.
- [ ] Add generic login errors to avoid account enumeration.

**Verification:** Unit, integration, and Playwright tests cover successful login, invalid credentials, verification, reset, lockout, expiry, and redirect preservation.

### P0-T07: Add route guards and role-based policies

**Status:** Not started
**Planned dates:** November 7–8, 2026
**Dependencies:** P0-T06

- [ ] Protect `/app/*` for students and `/admin/*` for admins/super-admins.
- [ ] Redirect unauthenticated users with the original `next` path.
- [ ] Return the correct 403 experience for cross-portal access.
- [ ] Redirect incomplete students to `/app/onboarding`.
- [ ] Add service-layer policy helpers such as `canViewStudent` and `canEditCourse`.
- [ ] Enforce authorization at both route and service layers.

**Verification:** Every route-guard case in `app-flow.md` has an automated test.

### P0-T08: Build onboarding and student profile

**Status:** Not started
**Planned dates:** November 8–10, 2026
**Dependencies:** P0-T05, P0-T07

- [ ] Implement program, current semester, and intake selection.
- [ ] Implement searchable completed-course multi-select with optional grades.
- [ ] Allow “I’ll do this later” while showing an incomplete-data warning.
- [ ] Implement notification preference defaults.
- [ ] Mark onboarding complete only after required steps pass validation.
- [ ] Add profile editing for program, semester, student ID, and completed courses.

**Verification:** Onboarding persists data, resumes after interruption, and redirects to the dashboard when complete.

### P0-T09: Build admin catalog management

**Status:** Not started
**Planned dates:** November 11–17, 2026
**Dependencies:** P0-T05, P0-T07

- [ ] Add CRUD for programs and degree requirement groups.
- [ ] Add CRUD for courses and AND/OR prerequisites.
- [ ] Add CRUD for semesters and instructors.
- [ ] Add CRUD for sections, meeting times, rooms, capacity, and seat availability.
- [ ] Validate positive capacity, valid time ranges, prerequisite references, and circular prerequisite prevention.
- [ ] Add CSV import for courses and sections with validation reports.
- [ ] Write an audit log entry for every admin mutation.

**Verification:** Admin can create a valid catalog, invalid rows are rejected with actionable errors, and all mutations are auditable.

---

## Phase 1 — Core Student MVP

### P1-T01: Build the application shell and design system

**Status:** Not started
**Planned dates:** November 11–14, 2026
**Dependencies:** P0-T03

- [ ] Implement the glassmorphism tokens, light/dark themes, and solid fallbacks from `design-guide.md`.
- [ ] Add `GlassCard` levels G1, G2, G3, and G-Solid.
- [ ] Build desktop sidebar, top bar, mobile bottom navigation, breadcrumbs, and global search entry point.
- [ ] Add Inter typography, spacing, radius, status colors, and notice category colors.
- [ ] Add loading, empty, success, error, permission-denied, and stale-data primitives.
- [ ] Support 360px width, 200% zoom, keyboard navigation, reduced motion, reduced transparency, and high contrast.

**Verification:** Storybook or component tests cover light/dark/reduced-effects variants; axe checks pass for shared components.

### P1-T02: Build dashboard and schedule

**Status:** Not started
**Planned dates:** November 15–21, 2026
**Dependencies:** P0-T08, P0-T09, P1-T01

- [ ] Display greeting/date, today’s classes, next three deadlines, important notices, attendance alerts, degree snapshot, and quick actions.
- [ ] Implement weekly grid and list views.
- [ ] Display rooms, instructors, exams, and university holidays.
- [ ] Add class detail drawer and attendance quick-log entry point.
- [ ] Reflect section/room changes automatically from the database.
- [ ] Show changed badges and last-synced timestamps where relevant.

**Verification:** Dashboard and schedule E2E tests pass with populated, empty, loading, and error states.

### P1-T03: Build the unified deadline manager

**Status:** Not started
**Planned dates:** November 22–27, 2026
**Dependencies:** P0-T05, P1-T01

- [ ] Add personal deadline creation, editing, completion, and deletion.
- [ ] Display university and personal deadlines in one view.
- [ ] Enforce that students cannot edit university deadlines.
- [ ] Implement source, status, course, due-window, priority filters, and URL-persisted sorting/filtering.
- [ ] Group deadlines as overdue, this week, later, and done.
- [ ] Implement urgent, upcoming, later, and done labels with both icon and text.
- [ ] Create reminder records for 3 days, 1 day, and 2 hours before due time.

**Verification:** Form validation, permissions, date boundary, filtering, and reminder scheduling tests pass.

### P1-T04: Build notice board and notice detail

**Status:** Not started
**Planned dates:** November 28–December 4, 2026
**Dependencies:** P0-T09, P1-T01

- [ ] Build notice list, detail, search, category filters, date range, unread filter, and importance sorting.
- [ ] Support audience targeting by all students, program, semester, course, or section.
- [ ] Add notice read state and unread counts.
- [ ] Add emergency notice banner and immediate-delivery flag.
- [ ] Add admin draft, review, publish, archive, and correction flows.

**Verification:** Targeting, unread state, emergency behavior, filters, pagination, and UI states are covered.

### P1-T05: Add notice classification and deadline extraction

**Status:** Not started
**Planned dates:** December 5–8, 2026
**Dependencies:** P0-T02, P1-T04

- [ ] Define a provider-neutral AI adapter interface.
- [ ] Send notice text as data with a strict structured-output schema.
- [ ] Validate all model output with Zod before persistence.
- [ ] Store extraction confidence, model name, status, reviewer, and timestamps.
- [ ] Route low-confidence results to admin review.
- [ ] Create linked university deadlines only after approval or configured high-confidence publishing rules.
- [ ] Treat notice content as untrusted data, never as instructions.

**Verification:** Mock-provider tests cover valid output, malformed output, low confidence, no extracted date, prompt-injection text, retry, and provider failure.

### P1-T06: Build degree progress tracking

**Status:** Not started
**Planned dates:** December 9–12, 2026
**Dependencies:** P0-T08, P0-T09

- [ ] Compute completed, in-progress, and remaining credits.
- [ ] Render core, major, elective, and other requirement groups.
- [ ] Show blocked courses and missing prerequisites.
- [ ] Show the incomplete-data CTA when completed courses are missing.
- [ ] Keep progress computed from source data rather than duplicating stale totals.
- [ ] Leave full what-if graduation planning for Phase 2.

**Verification:** Unit tests cover completed, failed, withdrawn, in-progress, duplicate, and unmet-prerequisite cases.

---

## Phase 1 — Notifications, Admin Completion, and Hardening

### P1-T07: Implement notification pipeline

**Status:** Not started
**Planned dates:** December 13–17, 2026
**Dependencies:** P1-T03, P1-T04, P1-T05, P0-T02

- [ ] Add in-app notification records and notification center.
- [ ] Add email delivery adapter and verification/reset/reminder templates.
- [ ] Implement deadline, notice, schedule-change, attendance, and registration notification types.
- [ ] Resolve audiences before applying preferences.
- [ ] Bypass preferences for emergency notices.
- [ ] De-duplicate using a stable notification key.
- [ ] Support mark read, mark all read, deep links, and optional digest batching.
- [ ] Add retries and failure logging to background jobs.

**Verification:** Job tests cover duplicate delivery, preference changes, emergency delivery, retries, and deep links.

### P1-T08: Complete admin user, deadline, reports, and audit screens

**Status:** Not started
**Planned dates:** December 18–22, 2026
**Dependencies:** P0-T07, P1-T07

- [ ] Build user search, filters, detail, deactivate/reactivate, and password-reset actions.
- [ ] Restrict role changes and admin account creation to super-admins.
- [ ] Build university deadline and academic calendar management.
- [ ] Build reports for active users, plans generated, notice reach, and reminder engagement.
- [ ] Build read-only audit log filters by admin, action, entity, and date.

**Verification:** Admin authorization and destructive-action confirmation tests pass.

### P1-T09: Security, privacy, and account controls

**Status:** Not started
**Planned dates:** December 23–29, 2026
**Dependencies:** P0-T06, P1-T07

- [ ] Add secure HTTP-only same-site cookies, CSRF protection, CSP, output escaping, and parameterized ORM access.
- [ ] Add data export and account deletion flows with confirmation.
- [ ] Enforce tenant filtering on every university-scoped query.
- [ ] Ensure audit logs are append-only and admin records are deactivated rather than deleted.
- [ ] Verify no plain passwords, card data, bank data, or government ID numbers are stored.
- [ ] Add dependency scanning and secret handling checks.

**Verification:** Security checklist, authorization tests, tenant-isolation tests, and data-deletion tests pass.

### P1-T10: MVP quality, accessibility, and performance pass

**Status:** Not started
**Planned dates:** December 30, 2026–January 7, 2027
**Dependencies:** P1-T01 through P1-T09

- [ ] Add Playwright flows for signup → onboarding → dashboard.
- [ ] Add Playwright flows for deadline creation and reminder navigation.
- [ ] Add admin notice publishing → student notification coverage.
- [ ] Add accessibility checks with axe and keyboard-only navigation tests.
- [ ] Test Chrome, Edge, Safari, and Firefox latest two versions where available.
- [ ] Test at 360px width and 200% zoom.
- [ ] Load-test dashboard and registration-related reads.
- [ ] Confirm dashboard median load target under 2 seconds and document exceptions.
- [ ] Test glassmorphism fallback and scrolling on a mid-range Android device.

**Verification:** CI is green, critical E2E flows pass, accessibility violations are resolved or documented, and performance results are recorded.

### P1-T11: Pilot deployment and release review

**Status:** Not started
**Planned dates:** January 8–12, 2027
**Dependencies:** P1-T10

- [ ] Deploy staging with sanitized seed data.
- [ ] Run migration and rollback rehearsal.
- [ ] Verify backups, monitoring, alerts, and error reporting.
- [ ] Import pilot catalog data and validate the import report.
- [ ] Run a role-based acceptance test with student and admin users.
- [ ] Record known limitations and support procedures.
- [ ] Approve or reject MVP release using the exit checklist below.

**Deliverable:** Pilot-ready MVP release candidate.

---

## Phase 2 — Registration, Attendance, and Assistant

### P2-T01: Registration Copilot MVP

**Status:** Deferred
**Planned dates:** January 13–23, 2027
**Dependencies:** P0-T09, P1-T10

- [ ] Implement prerequisite eligibility checks.
- [ ] Implement TypeScript backtracking over candidate sections.
- [ ] Reject overlapping meeting times and invalid credit totals.
- [ ] Return up to three plans with total credits and conflict count.
- [ ] Return a minimal-conflict option when no conflict-free plan exists.
- [ ] Display `seats_updated_at` / last-updated timestamps.
- [ ] Save, compare, and export plans.
- [ ] Show the official-portal disclaimer.

### P2-T02: Attendance tracker

**Status:** Deferred
**Planned dates:** January 24–30, 2027
**Dependencies:** P1-T02, P0-T05

- [ ] Log attended, missed, and cancelled sessions.
- [ ] Calculate attendance percentage and minimum threshold.
- [ ] Calculate approximately how many more classes can be missed.
- [ ] Warn before projected threshold breaches.
- [ ] Send attendance notifications.

### P2-T03: Grounded AI University Assistant

**Status:** Deferred
**Planned dates:** January 31–February 9, 2027
**Dependencies:** P1-T02, P1-T03, P1-T06, P2-T01, P2-T02, P0-T02

- [ ] Define read-only tools: `get_schedule`, `get_deadlines`, `get_degree_progress`, `get_attendance`, and `search_notices`.
- [ ] Scope every tool query to the authenticated student.
- [ ] Store conversations and redacted tool-call metadata.
- [ ] Include source links in answers.
- [ ] Return “I don’t have that information” when data is unavailable.
- [ ] Add input limits, rate limits, retries, and provider-failure handling.

---

## Phase 3 — Career and Documents

**Status:** Deferred until MVP and Phase 2 are stable.

- [ ] Career opportunities, internships, jobs, scholarships, hackathons, and research.
- [ ] Match scoring and skill-gap explanations.
- [ ] Student skills and saved opportunities.
- [ ] CV builder and portfolio.
- [ ] Encrypted document vault with signed URLs and scholarship checklists.
- [ ] OCR/parsing only after privacy and retention rules are approved.

## Phase 4 — Ecosystem

**Status:** Deferred until Phase 3 is stable.

- [ ] Hosted payment gateway with transaction references only.
- [ ] Commute and traffic integrations.
- [ ] Carpool matching.
- [ ] Verified marketplace and student services marketplace.
- [ ] Multi-university administration improvements.
- [ ] Native mobile applications and push notifications.
- [ ] Calendar, Messenger, WhatsApp, and other external integrations.

---

## Cross-Cutting Requirements Checklist

### Security and privacy

- [ ] HTTPS everywhere
- [ ] Argon2id password hashing
- [ ] RBAC enforced in middleware and services
- [ ] Tenant-aware query filtering
- [ ] CSRF/XSS protections and secure cookies
- [ ] Rate limiting and lockout behavior
- [ ] Audit log for admin actions
- [ ] Data export and account deletion
- [ ] No card, bank-account, government-ID, or plain-password storage

### Accessibility

- [ ] WCAG 2.1 AA contrast
- [ ] Keyboard navigation and visible focus rings
- [ ] Screen-reader labels and semantic landmarks
- [ ] Status conveyed by icon and text, not color alone
- [ ] 44×44px minimum touch targets
- [ ] Reduced motion and transparency support
- [ ] 360px width and 200% zoom support

### UI and design

- [ ] Glass levels used consistently
- [ ] Text-heavy surfaces use G-Solid or higher opacity
- [ ] Primary CTAs remain solid and high contrast
- [ ] Emergency notices use a solid red banner
- [ ] Loading, empty, error, success, permission, and stale states exist
- [ ] Dark mode and “Reduce effects” setting work
- [ ] Glass performance tested on mid-range Android hardware

### Quality and operations

- [ ] Unit tests for solver, prerequisites, degree progress, attendance, and deadline status
- [ ] Component tests for forms and UI states
- [ ] Playwright critical-path tests
- [ ] Accessibility checks in CI
- [ ] Load tests for registration peak scenarios
- [ ] Sentry and structured logging
- [ ] Backups and point-in-time recovery
- [ ] CI blocks lint, typecheck, test, or build failures

---

## MVP Exit Checklist

The MVP can be released to a pilot only when all of the following are true:

- [ ] Student can sign up, verify email, log in, complete onboarding, and reach `/app`.
- [ ] Admin can log in separately and cannot be created through student signup.
- [ ] Role guards prevent cross-portal access.
- [ ] Admin can manage programs, courses, prerequisites, semesters, sections, notices, users, and university deadlines.
- [ ] Student can view schedule, dashboard, notices, degree progress, and deadlines.
- [ ] Student can create and manage personal deadlines but cannot edit university deadlines.
- [ ] Notice classification and date extraction are reviewable before creating linked deadlines.
- [ ] Notifications are preference-aware, deduplicated, deep-linked, and immediate for emergencies.
- [ ] All admin mutations are auditable.
- [ ] Critical data is tenant-isolated and personal account deletion works.
- [ ] Loading, empty, success, error, and permission-denied states are implemented.
- [ ] WCAG, responsive, browser, and performance checks are recorded.
- [ ] CI, monitoring, backups, and staging deployment are operational.

---

## Open Decisions and Blockers

| Decision | Current state | Required before | Owner | Status |
|---|---|---|---|---|
| Pilot university and email domain | Unknown | Authentication and seed data | Project team | Blocked |
| University data access | Unknown | Catalog import and schedule | Project team | Blocked |
| AI provider and model | `techstack.md` says “LLM (Will decide later) API” | Notice intelligence and assistant | Project team | Blocked |
| Database host | Neon or Supabase | Database deployment | Project team | Ready to decide |
| ORM | Prisma or Drizzle; plan assumes Prisma | Schema implementation | Project team | Ready to decide |
| Auth provider | Auth.js or Supabase Auth; plan assumes Auth.js | Authentication | Project team | Ready to decide |
| Queue provider | Inngest or BullMQ; plan assumes Inngest | Reminders and notification jobs | Project team | Ready to decide |
| Completed-course entry | Manual entry assumed for MVP | Onboarding | Project team | Ready to decide |
| Enrollment source | Manual or official sync | Dashboard and schedule | Project team | Ready to decide |
| Admin 2FA | Open question | Pilot security review | Project team | Open |
| Grades in MVP | Open question | Degree and CGPA scope | Project team | Open |

---

## Progress Log

| Date | Task | Result | Next action |
|---|---|---|---|
| October 21, 2026 | Read `prd.md`, `techstack.md`, `app-flow.md`, `database.md`, and `design-guide.md` | Requirements, routes, data model, stack, design, security, and release phases mapped | Confirm decisions in P0-T01 and P0-T02 |
| October 21, 2026 | Created `buildplan.md` | Full project plan and tracking structure created | Start P0-T01 |
| October 23, 2026 | Schedule prototype integration | Added Class and Exam views with course/faculty/semester filters backed by the public Connect JSON dataset | Scaffold the server-side application integration |

---

## Change Log

| Date | Change | Reason |
|---|---|---|
| October 21, 2026 | Initial build plan created | Consolidated the current PRD, tech stack, app flow, database, and design documents |
| October 23, 2026 | Added public schedule data prototype | Class and exam navigation now display Connect course, timetable, faculty, room, seat, and exam data |

---

## Document Maintenance Rules

1. Update **Last Task** immediately after each meaningful task finishes.
2. Record actual start and completion dates; do not replace actual dates with planned dates.
3. If a task is blocked, set its status to `Blocked` and document the blocker in **Open Decisions and Blockers**.
4. If scope changes, update the relevant phase, milestone, exit criteria, and change log in the same change.
5. Keep implementation details in the appropriate source document or code; keep this file focused on sequencing, ownership, dates, status, and verification.
