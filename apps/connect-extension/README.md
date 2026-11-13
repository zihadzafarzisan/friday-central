# FRIDAY Connect Data Sync

This unpacked Chrome/Edge extension captures your own class schedule while you
use BRACU Connect, then opens FRIDAY for review and confirmation. It does not
submit registration or run unattended requests against Connect.

Google login to FRIDAY does not sign you into Connect. Sign into both separately.

## Capture other student records

Schedule capture remains automatic. To include other records, select **Capture
other Connect records while I browse this tab** in the extension popup. Then open
the relevant Connect pages (grades, advising, fee records, notices or other student
pages). The extension observes successful same-origin `/api/` JSON GET responses;
it does not enumerate endpoints, submit actions or capture images/HTML/SSE streams.

Choose **Review other records in FRIDAY** after selecting the destination and
consenting to transfer. `/app/connect` (or `/preview/connect`) shows each response
for review. Confirm to save a private snapshot per endpoint. Existing endpoint
snapshots are replaced; other saved endpoints remain. You can inspect, export
and remove records. These raw snapshots do not change official registration,
degree credits, grades or payment status in FRIDAY.

Authentication endpoints are excluded. Known credential field names and JWT/Bearer
strings are redacted recursively before messaging/storage and again by FRIDAY.
Review every response before saving; an undocumented service can introduce new
fields. Data remains private to the signed-in FRIDAY student and is self-reported.

Broad capture is off by default and scoped to the selected Connect tab. Captures
expire for transfer after 15 minutes. The batch retains at most 100 endpoints and
768 KB total, with at most 256 KB per response; the popup reports skipped records.
Sync a batch and clear captures to continue collecting. Reload/close clears the
tab's captured records; browser restart also clears the opt-in. To change Connect
accounts, clear captures or reload before collecting records for the new account.

## Install

1. Extract the ZIP downloaded from FRIDAY's schedule page, or use this source folder.
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Enable **Developer mode**, choose **Load unpacked**, and select the extracted
   folder containing `manifest.json`.
4. Reload your Connect tab after installation and open your class schedule.

## Sync

1. Keep the Connect tab active and click the extension icon.
2. Enter your actual FRIDAY site origin, such as `http://127.0.0.1:3000` locally.
   Use HTTPS for a hosted FRIDAY site. Enter no path, query, or credentials.
3. Select **Try in FRIDAY preview** to test without saving to an account.
4. Check the consent box and choose **Review in FRIDAY**. Allow access to that
   specific FRIDAY site if the browser prompts you.
5. Sign into FRIDAY if necessary. You can import private Connect records before
   completing your academic profile. Review the received classes and confirm.

The transfer waits up to ten minutes for the destination schedule page, including
while you sign in. If it expires, return to Connect and sync again. Confirming an
import replaces only your previous Connect snapshot for the same semester.

## Data and permissions

- Automatically runs only on `https://connect.bracu.ac.bd/`.
- Automatic schedule capture observes successful responses from exactly
  `/api/adv/v1/student-courses/schedules`, through fetch or XMLHttpRequest.
- Never reads request headers or browser cookies. Broad capture excludes auth
  endpoints and redacts known credential fields in response bodies.
- For schedule imports, allowlisted fields include courses, sections, lab links, semester IDs, faculty,
  rooms, credits, meetings, exams, and seat counts. Student portfolio IDs and
  unrelated response fields are dropped before messaging or storage.
- Captures remain in extension session memory, scoped to a Connect tab. They
  expire for transfer after 15 minutes, clear on tab reload/close or browser
  restart, and can be cleared using **Clear captured records**.
- Only the selected FRIDAY origin is requested at runtime. The broad HTTPS
  optional pattern supports user-chosen FRIDAY hosts; it grants no access until
  you approve a particular origin. Local HTTP is limited to localhost/127.0.0.1.
- The selected FRIDAY origin is the only persistent setting. FRIDAY receives the
  records only when you click a transfer button and saves only after review.
- FRIDAY validates again and stores imports privately under the signed-in
  student. It is a self-reported snapshot, not verified enrollment or live seats.

## Troubleshooting

- **Nothing captured:** reload Connect, open your schedule again, then reopen the
  extension while the Connect tab is selected. For other data, enable broad capture
  and revisit the relevant pages. Only successful JSON GET responses under `/api/`
  are supported; auth endpoints are excluded.
- **FRIDAY not receiving:** check its address and permission, sign in, and open its
  Schedule or Connect data page within ten minutes. Onboarding may need to be completed first.
- **Permission declined:** use manual JSON import or retry and allow the selected
  FRIDAY origin. Manage/revoke site access from the browser's extension settings.
- **Connect changes its frontend:** use the manual JSON import. This extension
  observes page requests and can require maintenance when Connect changes.

## Development

From the repository root, run `npm run extension:package` to recreate
`apps/web/public/downloads/friday-connect-extension.zip`. The package contains
only the ten explicitly listed production/documentation files. The root build
also packages it automatically. Reload the unpacked extension after code changes.

Automated browser tests use synthetic responses and a local FRIDAY origin. A real
authenticated Connect account and hosted Supabase save still need user acceptance.
