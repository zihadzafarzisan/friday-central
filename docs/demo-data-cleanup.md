# Demo-data cleanup

Normal previews now start with empty catalog and personal-record arrays. Their
visitor identity is an in-memory placeholder with blank name/email, never a saved student account.
Preview mutations still reset on reload. The admin preview no longer adds a fake
student to its users list, and CSV imports no longer prefill a sample course.

The normal `packages/db/seed.sql` creates only the BRACU tenant. Populated browser
fixtures require `FRIDAY_E2E_FIXTURES=1` on the isolated Playwright server, and SQL
policy fixtures live in `packages/db/testing/catalog.sql`. These test fixtures
are not application records and must not be loaded into the hosted project.

## Existing hosted sample catalog

The hosted setup generator already excludes the sample catalog. If the former
`seed.sql` was separately loaded, run
[`remove-sample-catalog.sql`](../packages/db/maintenance/remove-sample-catalog.sql)
in the project's [SQL Editor](https://supabase.com/dashboard/project/dfciqixacqwszllfcbvg/sql/new)
as the database owner, or through a connected administrative Supabase session.
The public publishable key cannot perform this shared-catalog cleanup.

The script targets the 12 known seed rows: one program, two semesters, four
courses, three sections and two prerequisite rows. It checks their original
field values before deletion, locks the relevant catalog and plan tables briefly, and
performs all deletions in one transaction. Already-absent rows are harmless.

Edited seed rows, new prerequisite children, or references from student profiles,
enrollments, completed courses or plans stop the transaction. Plan IDs inside JSON
are checked explicitly as well as ordinary foreign keys. Nothing is cascaded
away to force cleanup. Inspect those dependencies before deciding how to migrate
them. Accounts, profiles, private Connect snapshots, real catalog rows and the
BRACU tenant remain intact.

The script has been tested against the actual migrations with PostgreSQL/PGlite;
hosted execution and row counts remain unverified until administrative access is
connected or the SQL Editor result is available.

## Import real Connect data

1. Download the extension from `/app/connect` or `/app/schedule`, extract it,
   enable Developer mode in Chrome/Edge extensions, and select Load unpacked.
2. Sign into FRIDAY and Connect separately. Reload Connect after installation.
3. For schedules, open the Connect class schedule. For other records, enable
   **Capture other Connect records while I browse this tab**, then visit the
   pages to sync. Only successful JSON GET responses are captured.
4. Set the extension's FRIDAY address to `http://127.0.0.1:3000` locally, leave
   temporary preview mode unchecked, consent to transfer, and choose **Review
   in FRIDAY** or **Review other records in FRIDAY**.
5. Review and confirm in FRIDAY. Imports are private snapshots; revisit Connect
   and repeat the capture to refresh them. Google login does not authorize the
   Connect session, and unattended background synchronization is not implemented.
