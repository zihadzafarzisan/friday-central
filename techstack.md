# FRIDAY: Tech Stack

**Companion to:** `prd.md`
**Date:** October 21, 2026
**Guiding principles:** ship the MVP fast with a small team, keep one language (TypeScript) where possible, use managed services to avoid ops work, and stay tenant-aware so multi-university support is possible later.

---

## 1. Summary

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (everywhere), Python only for the schedule solver if needed | One language across frontend, backend, and shared validation |
| Frontend | Next.js (App Router) + React | SSR/SPA hybrid, file-based routing, great DX, easy deploy |
| UI | Tailwind CSS + shadcn/ui + Radix | Accessible components (WCAG AA), fast to build, fully customizable |
| Forms/validation | React Hook Form + Zod | Same Zod schemas on client and server (PRD FR-3.1) |
| Data fetching | TanStack Query | Caching, loading/error states, filter-in-URL patterns |
| Backend | Next.js Route Handlers / Server Actions for MVP; NestJS service when logic outgrows it | Fewer moving parts at launch, clean path to a separate API |
| Database | PostgreSQL (Neon or Supabase) | Relational data (courses, prerequisites, sections) fits perfectly; built-in full-text search |
| ORM | Prisma (or Drizzle) | Type-safe queries, migrations |
| Auth | Auth.js (NextAuth) or Supabase Auth | Email verification, sessions, RBAC; separate student/admin roles |
| Background jobs | Inngest (or BullMQ + Redis) | Reminder scheduling, notice processing, retries |
| Email | Resend (or Amazon SES) | Verification, reset, reminders, digests |
| AI | LLM(Will decide later) API (structured outputs / tool use) | Notice classification, date extraction, grounded assistant |
| Schedule solver | TypeScript backtracking for MVP; Google OR-Tools CP-SAT (Python microservice) for optimization | Conflict-free plans first, optimization later |
| File storage | S3-compatible (Supabase Storage / Cloudflare R2) | CSV imports, future document vault |
| Hosting | Vercel (app) + Neon/Supabase (DB) | Zero-ops, preview deploys per PR |
| Monitoring | Sentry + Vercel Analytics + PostHog | Errors, performance, product metrics |
| Testing | Vitest, Testing Library, Playwright | Unit, component, end-to-end |
| CI/CD | GitHub Actions | Lint, typecheck, test, deploy on merge |

---

## 2. Architecture

```
                      ┌──────────────────────────────┐
                      │   Browser (Student / Admin)  │
                      └──────────────┬───────────────┘
                                     │ HTTPS
                      ┌──────────────▼───────────────┐
                      │ Next.js app (Vercel)         │
                      │  • Student portal (/app)     │
                      │  • Admin portal  (/admin)    │
                      │  • API routes / Server Actions│
                      └───┬────────┬─────────┬───────┘
                          │        │         │
         ┌────────────────▼─┐  ┌───▼──────┐ ┌▼────────────────┐
         │ PostgreSQL       │  │ Job queue│ │ Claude API      │
         │ (Neon/Supabase)  │  │ (Inngest)│ │ notices + chat  │
         └────────▲─────────┘  └───┬──────┘ └─────────────────┘
                  │                │
                  │         ┌──────▼──────┐   ┌─────────────────┐
                  └─────────┤ Workers     ├───► Resend (email)  │
                            │ reminders,  │   └─────────────────┘
                            │ notice jobs │
                            └──────┬──────┘
                                   │ (Phase 2)
                            ┌──────▼──────────┐
                            │ Solver service  │
                            │ Python + OR-Tools│
                            └─────────────────┘
```

**Portals:** one codebase, two route groups (`/app` for students, `/admin` for administrators), each protected by role-based middleware. Separate login pages and credentials, as required by the PRD. If admin needs stronger isolation later, it can be split into its own deployment without changing the data layer.

---

## 3. Frontend

- **Framework:** Next.js with the App Router, React Server Components for data-heavy pages (dashboard, schedule), client components for interactive parts (registration planner, chat).
- **Styling/UI:** Tailwind CSS with shadcn/ui components built on Radix primitives for keyboard and screen-reader accessibility.
- **State:** server state via TanStack Query; local UI state via React state/Zustand only where needed. Filters and search live in URL query params (PRD FR-4.2).
- **Forms:** React Hook Form with Zod resolvers. The same Zod schemas are imported by server handlers so validation is authoritative on the server (FR-3.1).
- **Calendar/schedule views:** a custom weekly grid, or FullCalendar if time is short.
- **Charts (degree progress, attendance):** Recharts.
- **PWA (stretch):** service worker for offline-readable schedule and deadlines, and a path to web push.
- **i18n:** `next-intl`, English first, Bangla later.

---

## 4. Backend

- **MVP:** Next.js Route Handlers and Server Actions with a thin service layer (`/src/server/services`) so business logic is not coupled to HTTP.
- **Validation and errors:** Zod at every boundary; a consistent error shape that maps to the PRD's error states.
- **Authorization:** central policy helpers (`canViewStudent`, `canEditCourse`) used by every handler; row-level security in Supabase if chosen.
- **Rate limiting:** Upstash Ratelimit (login attempts, assistant requests, per the 5-failure lockout in FR-1.5).
- **Audit log:** every admin mutation writes to `AuditLog` via a shared wrapper.
- **Growth path:** extract the service layer into a NestJS API only if team size or load demands it.

### Key services
| Service | Responsibility |
|---|---|
| `AuthService` | Signup, verification, sessions, roles |
| `CatalogService` | Programs, courses, prerequisites, sections |
| `ScheduleService` | Student schedule, exam overlays, change propagation |
| `DeadlineService` | University + personal deadlines, statuses, reminders |
| `NoticeService` | Publish, classify, extract dates, target audiences |
| `DegreeService` | Requirement matching, prerequisite checks, graduation estimate |
| `RegistrationService` | Plan generation, conflict detection, scoring |
| `AttendanceService` | Tracking and "classes you can miss" math |
| `AssistantService` | Grounded Q&A over a student's data |
| `NotificationService` | Preferences, de-duplication, channel delivery |

---

## 5. Database

**PostgreSQL** is the right fit: courses, prerequisites, sections, and enrollments are strongly relational, and the registration/degree logic benefits from joins and constraints.

- **Hosting:** Neon (serverless Postgres with branching for previews) or Supabase (Postgres + auth + storage in one).
- **ORM:** Prisma for migrations and types; Drizzle is a lighter alternative.
- **Multi-tenancy:** every university-scoped table carries `university_id`; queries always filter by it (or use RLS).
- **Search:** Postgres full-text search (`tsvector` + GIN indexes) for notices and courses; add `pg_trgm` for fuzzy course-code matching. Move to Meilisearch/Typesense only if needed.
- **Prerequisites:** modeled as a graph table (`course_prerequisites`) with support for AND/OR groups.
- **Indexes to plan for:** `(university_id, semester)` on sections, `(user_id, due_at)` on deadlines, `(user_id, read_at)` on notifications.
- **Backups:** daily automated backups with point-in-time recovery enabled.
- **Caching:** Upstash Redis for hot reads (section availability during registration) and rate limits.

---

## 6. Authentication and Security

- **Auth:** Auth.js with credentials + email verification (student), and a separate credentials flow for admins. Supabase Auth is a viable all-in-one alternative.
- **Passwords:** argon2id hashing.
- **Sessions:** HTTP-only, secure, same-site cookies; different expiry for admin and student sessions (PRD FR-1.6).
- **Roles:** `student`, `admin`, `super_admin`, enforced in middleware and again in service-layer policies.
- **Protections:** CSRF tokens, output escaping, CSP headers, parameterized queries (via ORM), dependency scanning (Dependabot), secrets in environment variables managed by the host.
- **Data protection:** TLS in transit, encryption at rest (managed DB), signed URLs for stored files.
- **Privacy:** data export and account deletion endpoints.

---

## 7. AI Layer

**Provider:** Claude API.

### Notice intelligence
1. Notice text is sent with a strict JSON schema (category, extracted dates, affected programs/courses, confidence).
2. Output is validated with Zod; low-confidence results are flagged for admin review (PRD FR-5.2).
3. Extracted deadlines are created as `Deadline` rows linked to the notice.

### University Assistant
- **Grounded, not free-form:** the assistant uses **tool calls** (`get_schedule`, `get_deadlines`, `get_degree_progress`, `get_attendance`, `search_notices`) that query the database for the authenticated student only.
- **Read-only** in the MVP (PRD FR-5.10).
- Responses include references to the underlying records (FR-5.9) and say "I don't have that data" when a tool returns nothing (FR-5.11).
- **Controls:** per-user rate limits, input length caps, prompt-injection hygiene (notice text is treated as data, never as instructions), logging of prompts/tool calls for debugging with sensitive fields redacted.
- **Cost control:** use a smaller model for classification and a stronger one for the assistant; cache repeated extractions per notice.

---

## 8. Registration Copilot (Solver)

| Phase | Approach |
|---|---|
| **MVP** | Backtracking search in TypeScript over candidate sections per course; reject any time overlap; check prerequisites and credit limits; return the top three plans. Fast enough for ~8 courses. |
| **Phase 2** | Scoring function (gaps, campus days, early/late classes, preferred instructors, free days) over the feasible plans. |
| **If scale demands** | Python microservice using **Google OR-Tools CP-SAT** to optimize weighted objectives, called from the app over HTTP. |

Section data carries a `last_updated` timestamp that the UI always displays (FR-5.8).

---

## 9. Notifications and Background Jobs

- **Scheduler/queue:** Inngest (event-driven, built-in retries, easy on Vercel) or BullMQ + Redis if self-hosting.
- **Jobs:**
  - Deadline reminders (3 days, 1 day, 2 hours, per user settings).
  - Notice processing pipeline (classify, extract, notify).
  - Schedule-change propagation to affected students.
  - Daily digest email.
  - Nightly data consistency checks.
- **Channels:** in-app notification center (DB-backed, polled or via Supabase Realtime/SSE) and email via Resend. Web Push in Phase 2; WhatsApp/SMS later via a provider such as Twilio.
- **De-duplication:** unique key on `(user_id, type, entity_id, window)` to prevent double sends (FR-6.2).

---

## 10. Payments (Future)

- Release 1 handles reminders only.
- When added: use a hosted provider/gateway (bKash, SSLCommerz, or Stripe where available) with redirect/hosted checkout, so FRIDAY never touches card data. Webhooks update payment status; idempotency keys on all payment operations.

---

## 11. Infrastructure and DevOps

| Concern | Choice |
|---|---|
| App hosting | Vercel (preview deployment per pull request) |
| Database | Neon or Supabase |
| Cache / rate limits | Upstash Redis |
| Files | Cloudflare R2 or Supabase Storage |
| DNS / CDN / WAF | Cloudflare |
| Secrets | Vercel environment variables (per environment) |
| Environments | `local`, `preview`, `staging`, `production` |
| IaC (later) | Terraform, only if moving off managed platforms |

**Note on latency:** if most users are in Bangladesh, choose the closest available region (e.g. Singapore/Mumbai) for both the app and database, and rely on CDN caching for static assets.

---

## 12. Quality, Testing, and Observability

- **Unit tests (Vitest):** solver, prerequisite logic, graduation estimator, attendance math, deadline status coloring. These are pure functions and the highest-risk logic.
- **Component tests:** Testing Library for forms and state handling (loading, empty, error).
- **End-to-end (Playwright):** signup → onboarding → dashboard, create deadline, generate plans, admin publishes notice → student notified.
- **Accessibility checks:** `axe` in Playwright and Storybook (optional).
- **Load test:** k6 against registration-peak scenarios.
- **Observability:** Sentry (errors), structured logs (Pino), PostHog (funnels for the PRD success metrics), uptime monitoring (Better Stack).
- **CI (GitHub Actions):** install → lint (ESLint) → typecheck → test → build → deploy. Block merges on failure. Prettier + Husky/lint-staged pre-commit.

---

## 13. Suggested Repository Structure

```
friday/
├─ apps/
│  └─ web/                      # Next.js app (student + admin)
│     ├─ src/app/(student)/     # /app routes
│     ├─ src/app/(admin)/       # /admin routes
│     ├─ src/server/services/   # business logic
│     ├─ src/server/jobs/       # background jobs
│     └─ src/lib/               # ai, auth, validation, utils
├─ packages/
│  ├─ db/                       # Prisma schema, migrations, seeds
│  ├─ schemas/                  # shared Zod schemas
│  └─ solver/                   # registration engine (pure TS)
├─ services/
│  └─ solver-py/                # optional OR-Tools microservice (Phase 2)
├─ .github/workflows/
└─ docs/ (prd.md, tech-stack.md)
```
A pnpm + Turborepo monorepo keeps the pure solver package independently testable and reusable.

---

## 14. Stack by Release Phase

| Phase | Stack additions |
|---|---|
| **0: Foundation** | Next.js, Tailwind/shadcn, Postgres + Prisma, Auth.js, CI, Sentry |
| **1: MVP** | Inngest jobs, Resend email, Claude API for notices, TS solver, Upstash rate limiting |
| **2: Registration & Assistant** | Optimization scoring or OR-Tools service, assistant tool-calling, web push, PostHog funnels |
| **3: Career & Documents** | Object storage with signed URLs, document OCR/parsing, external job/scholarship data sources |
| **4: Ecosystem** | Payment gateway, maps/traffic APIs, native mobile (React Native/Expo sharing the Zod schemas), multi-tenant admin tooling |

---

## 15. Alternatives Considered

| Decision | Alternative | Why not (for now) |
|---|---|---|
| Next.js full-stack | Separate React SPA + NestJS API | More infrastructure and CORS/auth complexity before it's needed |
| PostgreSQL | MongoDB / Firebase | Prerequisite graphs and constraints are relational; SQL joins simplify degree logic |
| Prisma | Drizzle | Both fine; choose Drizzle if you want lighter runtime and SQL-closer queries |
| Inngest | AWS SQS + Lambda | Higher setup cost for the same outcome at this scale |
| Postgres FTS | Elasticsearch/Algolia | Unneeded cost and complexity at MVP scale |
| TS solver first | OR-Tools from day one | Premature; backtracking covers the MVP cleanly |
| Vercel | AWS ECS / self-hosted | More ops burden; revisit if cost or data-residency requires it |

---

## 16. Risks and Mitigations (Technical)

| Risk | Mitigation |
|---|---|
| LLM extraction errors on notices | Structured outputs, confidence scores, admin review queue, source links |
| Stale section/seat data | `last_updated` display, admin refresh tools, CSV import pipeline |
| Registration-day traffic spikes | Caching with Upstash, read replicas if needed, load testing before each registration window |
| Vendor lock-in | Keep service layer provider-agnostic (adapters for email, queue, storage) |
| Cost creep from AI usage | Model tiering, caching, per-user quotas, usage dashboards |
| Student data breach | Least-privilege access, audit logs, encryption, dependency scanning, periodic security review |

---

## 17. Rough Monthly Cost (MVP, Pilot Scale)

| Item | Estimate |
|---|---|
| Vercel (Pro, optional) | $0–20 |
| Neon / Supabase | $0–25 |
| Upstash Redis | $0–10 |
| Resend | $0–20 |
| Claude API (notices + assistant) | $10–50, depending on usage |
| Sentry / PostHog free tiers | $0 |
| Domain + Cloudflare | ~$1–2 |
| **Total** | **~$10–130/month** |

Costs scale with active students and assistant usage; free tiers should cover early development and a small pilot.
