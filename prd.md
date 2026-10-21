# FRIDAY: Product Requirements Document

**Product name:** FRIDAY (Student OS)
**Document status:** Draft v1.0
**Date:** October 21, 2026
**Platform:** Responsive web application (student portal + admin portal)

---

## 1. Product Overview

### 1.1 Vision
FRIDAY is a Student OS: "Everything I need to manage my university life in one place." It consolidates the academic, administrative, career, and personal tools a student currently juggles across a dozen disconnected platforms, and puts an AI assistant on top of that structured data.

### 1.2 Problem Statement
Students do not lack information. Their university life is fragmented across too many places:

| Need | Where it lives today |
|---|---|
| Registration, results | University portal |
| Course materials | LMS |
| Official announcements | Email |
| Class communication | Messenger / WhatsApp |
| Unofficial information | Facebook groups |
| Personal schedule | Google Calendar |
| Degree planning | Excel / notes |
| Internships | LinkedIn |
| Scholarships | Google |
| Tuition payments | bKash / bank |
| Commute | Maps / ridesharing |

The result is missed deadlines, registration conflicts, unclear graduation timelines, and wasted time hunting for information.

### 1.3 Goals
1. Give every student a single dashboard for classes, deadlines, notices, and degree progress.
2. Remove the pain of course registration through conflict-free, optimized schedule generation.
3. Make graduation timelines transparent and "what-if" explorable.
4. Turn unstructured university notices into actionable, personalized reminders.
5. Provide an AI assistant that answers questions from the student's own structured data (not a generic chatbot).

### 1.4 Non-Goals (initial release)
- Replacing the official university registration or payment systems.
- Acting as a social network.
- Building a full LMS.

### 1.5 Success Metrics
| Metric | Target (first 2 semesters post-launch) |
|---|---|
| Weekly active students / registered students | ≥ 40% |
| Registration plans generated per registration period | ≥ 60% of active students |
| Deadline reminders acted on (opened or marked done) | ≥ 50% |
| Notice classification accuracy | ≥ 90% |
| AI assistant answer helpfulness (thumbs-up rate) | ≥ 80% |
| Median dashboard load time | < 2 s |

---

## 2. Users and Roles

### 2.1 Roles
| Role | Access | Description |
|---|---|---|
| **Student** | Student portal | Primary user. Logs in with student credentials. Manages own academic and personal data. |
| **Administrator** | Admin portal | University staff or FRIDAY operators. Logs in with admin credentials. Manages catalog data, notices, and users. |

### 2.2 Authentication
- Separate login entry points and credentials for the student portal and the admin portal.
- Students are verified by university email (e.g. `@university.edu`); this is the basis of trust for the marketplace and verified features.
- Admin accounts are created by a super-admin only, never by self-signup.

### 2.3 Primary Student Personas
- **First-year Fatima:** new to the university, overwhelmed by systems, needs a simple "what's today" view.
- **Third-year Rafi:** planning registration around prerequisites, wants an optimized schedule and a graduation estimate.
- **Final-year Nadia:** applying for internships and scholarships, needs documents and career matching.

---

## 3. Scope and Features

### 3.1 Module Map
**Academic:** today's classes, class schedule, exam schedule, assignment deadlines, attendance tracker, course materials, results/CGPA.
**Degree:** completed credits, remaining credits, prerequisites, degree progress, graduation prediction, semester planner.
**Administrative:** tuition deadlines, registration reminders, forms/documents, important notices, section/room changes.
**Career:** internships, jobs, CV builder, portfolio, skill roadmap, career recommendations.
**Personal:** to-do, calendar, study planner, expense tracker.

### 3.2 MVP (Release 1)
Strategy: start with **Schedule + Deadlines + Notices + Reminders + Degree Progress**, then expand.

| # | Feature | Priority |
|---|---|---|
| M1 | Student and admin authentication | Must-have |
| M2 | Student profile (program, semester, completed courses) | Must-have |
| M3 | Class schedule and "Today" dashboard | Must-have |
| M4 | Unified Deadline Manager (university + personal) with reminders | Must-have |
| M5 | Notice board with AI classification and deadline extraction | Must-have |
| M6 | Degree progress tracker (completed/remaining credits, prerequisites) | Must-have |
| M7 | Admin portal: manage courses, sections, notices, users | Must-have |
| M8 | Notifications (in-app + email) | Must-have |
| M9 | Course Registration Copilot (plan generation, conflict detection) | Should-have |
| M10 | Attendance tracker with "classes you can miss" calculation | Should-have |
| M11 | AI University Assistant (read-only Q&A over student data) | Should-have |

### 3.3 Future Enhancements (Release 2+)
| Feature | Priority |
|---|---|
| Graduation planner with what-if credit loads | Should-have |
| Registration optimization (gaps, campus days, early/late classes, preferred instructors) | Should-have |
| Career hub: internships, jobs, scholarships, hackathons, research, with match scoring and skill-gap explanation | Should-have |
| Student document vault with scholarship document checklist | Could-have |
| Study planner and expense tracker | Could-have |
| CV builder and portfolio | Could-have |
| Commute assistant ("leave now" alerts) and carpool matching | Could-have |
| Verified university marketplace (used books, electronics, etc.) | Could-have |
| Student services marketplace (printing, tutoring, design, repair) | Could-have |
| Multi-university support | Could-have |
| Mobile apps and push notifications | Could-have |
| Messenger/WhatsApp/Google Calendar integrations | Could-have |

### 3.4 Out of Scope
- Processing real tuition payments in Release 1 (only reminders and deadlines).
- Submitting registration to the official university system (FRIDAY plans; the student registers in the official portal).
- Hosting LMS course content (links only).
- Peer-to-peer chat or social feeds.
- Handling of government-ID or financial-account data beyond encrypted document storage in the later vault module.

### 3.5 Priority Definitions
- **Must-have:** release is not viable without it.
- **Should-have:** important, included if capacity allows within the release.
- **Could-have:** desirable, deferred without major impact.

---

## 4. User Flows and Functional Requirements

### 4.1 Registration and Login

**Student flow**
1. Student opens the landing page and selects *Sign up*.
2. Enters name, university email, student ID, and password.
3. Receives a verification email with a link/OTP; the account is inactive until verified.
4. On first login, completes onboarding: program, current semester, completed courses (manual entry or transcript upload in a later release).
5. Lands on the dashboard.

**Admin flow**
1. Admin opens the admin login URL and signs in with credentials issued by a super-admin.
2. Lands on the admin dashboard.

**Requirements**
- FR-1.1: Password minimum 8 characters, mixed case and a number; passwords stored hashed (bcrypt/argon2).
- FR-1.2: Email verification required before first login.
- FR-1.3: Password reset via emailed expiring link.
- FR-1.4: Role-based access control; students can never reach admin routes.
- FR-1.5: Rate-limit login attempts; lock for 15 minutes after 5 failures.
- FR-1.6: Sessions expire after inactivity (e.g. 30 minutes for admin, 7 days "remember me" for students).

### 4.2 Navigation and Page Transitions

**Student portal navigation (sidebar on desktop, bottom bar on mobile):**
Dashboard · Schedule · Deadlines · Notices · Degree · Registration · Attendance · Assistant · Profile

**Admin portal navigation:**
Dashboard · Users · Courses & Sections · Notices · Deadlines & Calendar · Reports · Settings

**Requirements**
- FR-2.1: Dashboard is the default landing page and shows: today's classes, next three deadlines, latest important notices, attendance warnings.
- FR-2.2: Breadcrumbs on nested pages; browser back/forward works correctly.
- FR-2.3: Unauthenticated users are redirected to login and returned to the originally requested page afterwards.
- FR-2.4: Global search accessible from every page (see 4.4).
- FR-2.5: Fully responsive down to 360 px width.

### 4.3 Form Submissions and Validation

Applies to: signup, profile, add deadline, add course attendance, admin course/section/notice forms.

**Requirements**
- FR-3.1: Client-side and server-side validation on all forms; server is authoritative.
- FR-3.2: Inline field errors shown beside the field, with a summary at the top for long forms.
- FR-3.3: Required fields clearly marked; submit button disabled while submitting to prevent duplicates.
- FR-3.4: Specific validation rules:
  - Email must match university domain.
  - Student ID format configurable per university.
  - Deadline dates cannot be set before today unless marked as "past/record".
  - Credits per course: integer 1 to 6; per-semester credit limits enforced by program rules.
  - Section capacity: positive integer; time slots must not be malformed or overlapping within the same section.
- FR-3.5: Unsaved-changes warning on navigating away from a dirty form.

### 4.4 Search, Filtering, Sorting

| Area | Search | Filters | Sort |
|---|---|---|---|
| Notices | Full-text (title, body) | Category (Registration, Exam, Tuition, Scholarship, Holiday, Academic, Administrative, Emergency), date range, unread | Newest, Importance |
| Deadlines | Title | Source (university/personal), status, course, due this week/month | Due date, Priority |
| Courses/Sections (registration) | Course code/name | Semester, credits, instructor, day, time range, seats available | Code, Time, Availability |
| Admin Users | Name, ID, email | Role, status, program | Name, Created date |

**Requirements**
- FR-4.1: Search is debounced and returns results within 500 ms for typical datasets.
- FR-4.2: Filters are combinable and persist in the URL so views are shareable and survive refresh.
- FR-4.3: Result lists are paginated (or infinitely scrolled) at 20 items by default.

### 4.5 Core Feature Flows

#### 4.5.1 Dashboard and Schedule
- Shows today's classes in time order with room and instructor.
- Weekly schedule view (grid) and list view.
- Exam schedule overlays on the calendar.
- Section/room change notices automatically update the student's schedule and trigger a notification.

#### 4.5.2 Unified Deadline Manager
- Combines university deadlines (admin-published or extracted from notices) with personal deadlines.
- Fields: title, due date/time, source, course (optional), status, priority.
- Status colors: 🔴 urgent (≤ 2 days), 🟡 upcoming (≤ 7 days), 🟢 later/on track; ✅ done.
- Reminder defaults: 3 days, 1 day, and 2 hours before; user-configurable.
- FR-5.1: Student can create, edit, complete, and delete personal deadlines; cannot edit university deadlines (can only hide or snooze).

#### 4.5.3 Notice Intelligence
1. Admin publishes a notice, or the system ingests one (email/RSS/paste in later releases).
2. System classifies the category and extracts structured data (e.g. *Withdrawal deadline: October 15*).
3. Extracted dates become university deadlines linked to the notice.
4. System sends a personalized alert, e.g. "Course withdrawal deadline is October 15. You currently have 2 registered courses."
- FR-5.2: Admin can review and correct AI classification and extracted dates before or after publishing.
- FR-5.3: Emergency notices bypass student notification preferences and are delivered immediately.
- FR-5.4: Notices can target all students, a program, a semester, or a specific course.

#### 4.5.4 Degree Progress
- Displays completed credits, remaining credits, and a requirement checklist by category (core, major, electives, etc.).
- Highlights courses blocked by unmet prerequisites.
- FR-5.5: Degree rules (requirements, prerequisites, credit limits) are stored per program and managed by admins.

#### 4.5.5 Course Registration Copilot
1. Student enters desired courses (e.g. CSE321, CSE340, MAT120).
2. System checks completed courses and prerequisites; blocks or warns on unmet ones.
3. System fetches available sections with times and instructors.
4. System generates up to three conflict-free plans (Plan A/B/C), each showing sections, total credits, and conflict count.
5. System recommends a best plan with a short explanation.
- Optimization preferences (later in MVP or Release 2): minimize gaps, campus days, early/late classes; maximize preferred instructors and free days.
- FR-5.6: If no conflict-free plan exists, show the minimal-conflict option and explain which courses clash.
- FR-5.7: Plans can be saved, compared side by side, and exported as an image/PDF.
- FR-5.8: Section data must show a "last updated" timestamp so students know how fresh seat availability is.

#### 4.5.6 Attendance Tracker
- Student logs attended/missed per class session (manual in MVP).
- Shows percentage, required minimum, and "approximately N more classes you can miss".
- Warns when upcoming consecutive classes would put the student below the threshold.

#### 4.5.7 AI University Assistant
- Chat interface answering from the student's own structured data: next class, graduation estimate, absences allowed, next-semester suggestions, tuition due dates, free time between classes.
- FR-5.9: Answers cite or link the underlying data (e.g. the schedule entry or notice used).
- FR-5.10: The assistant is read-only in the MVP; it does not change data or register courses.
- FR-5.11: When it does not have the data, it says so rather than guessing.

#### 4.5.8 Admin Portal
- CRUD for programs, courses, prerequisites, sections (time, room, instructor, capacity), and semesters.
- Publish and manage notices and university deadlines.
- Manage users: view, deactivate, reset password, assign roles.
- Bulk import via CSV for courses and sections, with a validation report.
- Audit log of admin actions.

### 4.6 Payments, Notifications, and Other Workflows

**Payments**
- Release 1: tuition and fee *reminders* only. No payment processing.
- Future: integration with bKash/bank gateways for the tuition payment workflow and marketplace transactions, using a PCI-compliant provider; FRIDAY never stores card numbers.

**Notifications**
- Channels: in-app notification center, email (MVP); push, SMS/WhatsApp (future).
- Types: deadline reminders, notice alerts, schedule changes, attendance warnings, registration window reminders.
- FR-6.1: Students control channel and category preferences, except emergency alerts.
- FR-6.2: Notifications are de-duplicated and batched (digest option) to avoid spam.
- FR-6.3: Notifications are marked read/unread and link directly to the relevant item.

### 4.7 UI States

| State | Requirement |
|---|---|
| **Loading** | Skeleton loaders for lists and cards; spinners only for short actions. Registration plan generation shows progress text. |
| **Empty** | Friendly message with a clear action, e.g. "No deadlines yet. Add one or check upcoming notices." Empty dashboard widgets collapse gracefully. |
| **Success** | Toast confirmation for saves and actions; plan-saved and reminder-set confirmations. |
| **Error** | Human-readable messages with a retry action; field-level errors on forms; a generic fallback page for 404/500 with a link home. |
| **Offline/stale data** | Show last-synced time; cached schedule and deadlines available read-only when offline (stretch goal). |
| **Permission denied** | Clear explanation and redirect to the appropriate portal. |

---

## 5. Data Model (High Level)

- **User** (id, role, name, email, student_id, status)
- **Program** (id, name, requirements, credit_rules)
- **Course** (id, code, title, credits, prerequisites)
- **Section** (id, course_id, semester, instructor, days/times, room, capacity, seats_available)
- **Enrollment/CompletedCourse** (user_id, course_id, grade, semester)
- **Deadline** (id, owner/source, title, due_at, status, linked_notice_id, course_id)
- **Notice** (id, title, body, category, audience, extracted_dates, published_at)
- **AttendanceRecord** (user_id, section_id, date, status)
- **RegistrationPlan** (user_id, semester, sections, score, conflicts)
- **Notification** (user_id, type, payload, channel, read_at)
- **AuditLog** (admin_id, action, entity, timestamp)

---

## 6. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Performance** | Pages load in < 2 s on a typical mobile connection; plan generation < 5 s for up to 8 courses. |
| **Availability** | 99.5% uptime, with extra capacity planning for registration peak periods. |
| **Security** | HTTPS everywhere, hashed passwords, RBAC, CSRF/XSS protection, input sanitization, secure session cookies, admin action audit log. |
| **Privacy** | Student data accessible only to the student and authorized admins; data minimization; clear privacy policy; ability to export and delete account data. |
| **AI safety** | Assistant grounded in student data; no fabricated deadlines or credits; human review path for extracted notice data. |
| **Accessibility** | WCAG 2.1 AA: keyboard navigation, contrast, labels, screen-reader support. |
| **Compatibility** | Latest two versions of Chrome, Edge, Safari, Firefox; mobile web. |
| **Scalability** | Architecture supports multiple universities (tenant-aware data model) even if launch is single-university. |
| **Localization** | English first; Bangla support planned. |

---

## 7. Assumptions, Dependencies, and Risks

**Assumptions**
- The university (or admins) can supply course catalog, section, and program-rule data in a structured form (CSV or API).
- Students will enter completed courses manually until transcript import exists.

**Dependencies**
- Email delivery service.
- LLM provider for notice extraction and the assistant.
- University data sources for sections and notices.

**Risks and Mitigations**
| Risk | Mitigation |
|---|---|
| No official API from the university portal | Admin-managed data and CSV import first; negotiate integration later. |
| Stale section/seat data leads to bad plans | Show "last updated"; admin refresh tools; clear disclaimers. |
| AI misreads a notice or hallucinates | Admin review step, confidence flags, source links, grounded prompts. |
| Low adoption | Start with the highest-pain features (schedule, deadlines, registration) and onboard through a pilot cohort. |
| Sensitive student data exposure | Least-privilege access, encryption in transit and at rest, regular security review. |

---

## 8. Release Plan

| Phase | Contents |
|---|---|
| **Phase 0: Foundation** | Auth, roles, data model, admin catalog management. |
| **Phase 1: MVP** | Schedule, deadlines, notices with AI extraction, reminders, degree progress, notifications. |
| **Phase 2: Registration & Assistant** | Registration Copilot with optimization, attendance, AI assistant, graduation planner. |
| **Phase 3: Career & Documents** | Career hub, CV/portfolio, document vault. |
| **Phase 4: Ecosystem** | Marketplaces, commute/carpool, multi-university rollout, mobile apps. |

---

## 9. Open Questions
1. Which university (or universities) is the pilot, and what data access exists?
2. Will students self-report completed courses, or will transcript import be required for MVP?
3. Should admins be university staff, FRIDAY operators, or both?
4. What is the expected scale (students per university) at launch?
5. Which notification channel matters most to students in the target market: email, WhatsApp, or push?
