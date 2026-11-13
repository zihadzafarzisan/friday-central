# Connect schedule import

Students now sign into FRIDAY using [BRACU Google Workspace](google-workspace-auth.md).
The extension also offers opt-in capture of other Connect JSON GET responses while
the student browses. Review these at `/app/connect` or `/preview/connect`; generic
responses remain private snapshots in `connect_data_records`. Capture excludes
auth endpoints and redacts known credential fields. It is limited to 100 endpoints,
256 KB per response and 768 KB per transfer, with skipped counts shown in the popup.
It never automatically signs into Connect or claims access to unvisited endpoints.
See the [extension guide](../apps/connect-extension/README.md) for the exact boundaries.

The student Schedule page (`/app/schedule`) supports paste/upload and an unpacked
Chrome/Edge extension. `/preview/schedule` exercises the same validation and UI
using temporary in-memory data. The extension is downloaded from that page.
Verified students can use `/app/schedule` and `/app/connect` before academic
onboarding is complete. Authentication, Workspace eligibility, role and owner RLS
remain mandatory. Manual academic actions still require the completed profile.

The known source is the authenticated Connect endpoint
`/api/adv/v1/student-courses/schedules?studentPortfolioId=<portfolioId>`. FRIDAY
does not call this endpoint or receive the student's Connect session. The
extension observes the response in the signed-in browser and transfers an
allowlisted snapshot to a user-selected FRIDAY origin for explicit review.

## Storage and validation

Apply `packages/db/migrations/202611120001_connect_schedule_imports.sql` after the
existing migrations. It creates `connect_schedule_imports`, keyed by authenticated
user and external semester ID, with a composite tenant/user foreign key and owner
RLS. Other students and administrators cannot read or mutate an owner's imports.
The database stamps the import time and checks JSON shape, bounds, IDs, semester
consistency, duplicate sections, meetings, and dates/times independently of Zod.

Saving replaces one semester atomically; other semesters and manual enrollments
remain intact. Imported courses never modify shared catalog/degree records and
never become completed credits. Zero-credit labs and parent-section links are
preserved. Imported entries appear in their own semester cards on Schedule,
including exam dates and raw enrolled/capacity counts. Over-capacity counts are
preserved. They are not interpreted as registration permission.

The shared schema accepts a 1–100 row array, parses stringified `sectionSchedule`,
and strips unknown fields at both browser/server boundaries. Files and normalized
payloads are capped at 256 KB. Student identifiers, profile data, request headers,
and credentials are not saved. Imports are self-reported; the endpoint's portfolio
identifier is not proof that a supplied file belongs to the FRIDAY account.

## Extension handoff

See [installation and privacy details](../apps/connect-extension/README.md).
The extension temporarily stores sanitized responses per Connect tab in
`chrome.storage.session`. It transfers only on explicit consent, requests only
the selected destination origin, and opens the matching schedule page. Pending
handoffs survive FRIDAY sign-in redirects for ten minutes. Delivery checks the
origin, path and rendered import component before injecting an expiring
sessionStorage envelope, including during streamed redirects and client navigation. The client
consumes and removes it, validates it, and displays a review; no save occurs until
confirmation. Captures older than fifteen minutes cannot be transferred.

No token refresh, password collection, server-side Connect session storage,
background polling, registration submission, or university-wide seat tracking is
implemented. Source update time is unknown; the displayed time is FRIDAY import
time. Connect changes can break capture; manual JSON import is the fallback.

## Verification and rollout

Unit tests cover nested parsing, labs, exams, malformed/oversized data, privacy
allowlists and destination validation. PostgreSQL tests cover RLS, replacement,
atomic rejection, server timestamps and shared-catalog isolation. Browser tests
cover manual review/import/removal, repeat imports, expired handoffs, mobile
overflow, and a real unpacked extension using mocked Connect fetch/XHR responses.

The root build packages the downloadable extension. `npm run extension:package`
can regenerate it separately. Existing hosted Supabase setup remains required;
local tests do not apply migrations to a hosted database. Final acceptance needs
the user's browser: install the extension, open a real Connect schedule, send it
to the configured FRIDAY site, and confirm it persists after signing in again.
