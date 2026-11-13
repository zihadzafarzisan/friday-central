"use client";
import { useEffect, useState } from "react";
import {
  CONNECT_IMPORT_MAX_BYTES,
  CONNECT_IMPORT_STORAGE_KEY,
  parseConnectSchedule,
  type ConnectCourse,
  type ConnectImportRecord,
  type MutationKind,
  type ActionResult,
} from "@friday/schemas";
import { Card } from "@/components/ui";

function CourseList({ courses }: { courses: ConnectCourse[] }) {
  return (
    <div className="schedule-table-wrap">
      <table className="schedule-table">
        <caption className="sr-only">Imported Connect classes and exams</caption>
        <thead>
          <tr>
            <th>Course / section</th>
            <th>Faculty / room</th>
            <th>Classes</th>
            <th>Exams</th>
            <th>Seats</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => {
            const schedule = course.sectionSchedule;
            const parent = courses.find((row) => row.sectionId === course.parentSectionId);
            return (
              <tr key={course.sectionId}>
                <td>
                  <strong>
                    {course.courseCode} · Section {course.sectionName}
                  </strong>
                  <small>
                    {course.courseCredit} credits · {course.courseType === "LAB" ? "Lab" : "Theory"}
                  </small>
                  {course.parentSectionId && (
                    <small>
                      Linked to {parent?.courseCode || `section ${course.parentSectionId}`}
                    </small>
                  )}
                </td>
                <td>
                  {course.faculties || "TBA"}
                  <small>{course.roomName || "Room pending"}</small>
                </td>
                <td>
                  {schedule.classSchedules.map((meeting, index) => (
                    <p key={index}>
                      {meeting.day} {meeting.startTime.slice(0, 5)}–{meeting.endTime.slice(0, 5)}
                    </p>
                  ))}
                  {!schedule.classSchedules.length && "Class times pending"}
                  {schedule.classStartDate && (
                    <small>
                      {schedule.classStartDate} to {schedule.classEndDate || "end date pending"}
                    </small>
                  )}
                </td>
                <td>
                  {(["mid", "final"] as const).map((exam) => {
                    const date = exam === "mid" ? schedule.midExamDate : schedule.finalExamDate;
                    const start =
                      exam === "mid" ? schedule.midExamStartTime : schedule.finalExamStartTime;
                    const end =
                      exam === "mid" ? schedule.midExamEndTime : schedule.finalExamEndTime;
                    return date ? (
                      <p key={exam}>
                        {exam === "mid" ? "Midterm" : "Final"}: {date} {start?.slice(0, 5)}
                        {end ? `–${end.slice(0, 5)}` : ""}
                      </p>
                    ) : null;
                  })}
                  {!schedule.midExamDate && !schedule.finalExamDate && "Exam dates pending"}
                </td>
                <td>
                  {course.capacity != null && course.consumedSeat != null ? (
                    <>
                      {course.consumedSeat} / {course.capacity}
                      <small>Enrolled / capacity</small>
                    </>
                  ) : (
                    "Unavailable"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ConnectScheduleImport({
  imports,
  act,
  preview,
}: {
  imports: ConnectImportRecord[];
  act: (kind: MutationKind, raw: unknown) => Promise<ActionResult>;
  preview: boolean;
}) {
  const [text, setText] = useState("");
  const [courses, setCourses] = useState<ConnectCourse[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    function receive() {
      try {
        const raw = sessionStorage.getItem(CONNECT_IMPORT_STORAGE_KEY);
        if (!raw) return;
        sessionStorage.removeItem(CONNECT_IMPORT_STORAGE_KEY);
        if (new TextEncoder().encode(raw).byteLength > CONNECT_IMPORT_MAX_BYTES + 1024)
          throw new Error("Extension schedule is too large.");
        const envelope = JSON.parse(raw);
        if (
          envelope.version !== 1 ||
          typeof envelope.expiresAt !== "number" ||
          envelope.expiresAt < Date.now()
        )
          throw new Error("This extension transfer expired. Sync from Connect again.");
        const parsed = parseConnectSchedule(JSON.stringify(envelope.courses));
        setText(JSON.stringify(parsed, null, 2));
        setCourses(parsed);
        setConfirmed(false);
        setMessage("Received from the extension. Review your classes before saving.");
      } catch (error) {
        setCourses(null);
        setConfirmed(false);
        setMessage(error instanceof Error ? error.message : "Could not read extension schedule.");
      }
    }
    window.addEventListener("friday-connect-import", receive);
    // The extension may deliver before or after React mounts.
    const timer = window.setTimeout(receive, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("friday-connect-import", receive);
    };
  }, []);

  function change(value: string) {
    setText(value);
    setCourses(null);
    setConfirmed(false);
    setMessage("");
  }
  async function save() {
    if (!courses || !confirmed) return;
    setPending(true);
    setMessage("");
    try {
      const result = await act("connect_schedule_import", { courses });
      setMessage(
        result.ok
          ? preview
            ? "Imported in this preview. Changes reset on reload."
            : "Schedule imported to your account."
          : result.message,
      );
      if (result.ok) {
        setCourses(null);
        setText("");
        setConfirmed(false);
      }
    } catch {
      setMessage("Could not save your schedule. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="stack connect-import" data-friday-connect-import="v1">
      <Card title="Import from Connect">
        <p className="muted">
          Paste or upload the JSON from Connect’s student schedule response, or use the FRIDAY
          Connect extension. Review the result before saving it to your account.
        </p>
        <p>
          <a className="action-button" href="/downloads/friday-connect-extension.zip" download>
            Download Connect extension
          </a>
        </p>
        <details>
          <summary>How to get your schedule JSON</summary>
          <ol>
            <li>Sign into Connect and open your class schedule.</li>
            <li>In browser developer tools, open Network and select Fetch/XHR.</li>
            <li>
              Find <code>student-courses/schedules</code> and copy its Response JSON.
            </li>
          </ol>
          <p>Copy only the response. Keep authorization headers, cookies, and passwords private.</p>
        </details>
        <label className="field">
          Upload schedule JSON (up to 256 KB)
          <input
            type="file"
            accept=".json,application/json"
            disabled={pending}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              change("");
              if (file.size > CONNECT_IMPORT_MAX_BYTES) {
                setMessage("Schedule JSON must be 256 KB or smaller.");
                return;
              }
              try {
                change(await file.text());
              } catch {
                setMessage("Could not read that file. Try uploading it again.");
              }
            }}
          />
        </label>
        <label className="field">
          Connect schedule JSON
          <textarea
            rows={7}
            value={text}
            maxLength={CONNECT_IMPORT_MAX_BYTES}
            disabled={pending}
            placeholder="Paste the schedules response array here"
            onChange={(event) => change(event.target.value)}
          />
        </label>
        <button
          className="action-button"
          disabled={pending || !text.trim()}
          onClick={() => {
            setCourses(null);
            setConfirmed(false);
            try {
              setCourses(parseConnectSchedule(text));
              setMessage("");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Invalid schedule.");
            }
          }}
        >
          Preview import
        </button>
        {courses && (
          <div className="stack">
            <h3>Review Connect semester {courses[0].semesterSessionId}</h3>
            <p>
              {courses.length} entries ·{" "}
              {courses.filter((row) => row.courseType === "THEORY").length} theory ·{" "}
              {courses.filter((row) => row.courseType === "LAB").length} labs ·{" "}
              {courses.reduce((sum, row) => sum + row.courseCredit, 0)} credits
            </p>
            <CourseList courses={courses} />
            <p className="muted">
              Times are shown as supplied by Connect. Seat counts are a snapshot and do not confirm
              registration availability.
            </p>
            <label className="connect-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={pending}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              This is my schedule. Save it privately and replace my previous Connect import for this
              semester.
            </label>
            <button
              className="action-button primary"
              disabled={pending || !confirmed}
              onClick={save}
            >
              {pending ? "Importing…" : "Confirm schedule import"}
            </button>
            <button
              className="action-button"
              disabled={pending}
              onClick={() => {
                setCourses(null);
                setConfirmed(false);
              }}
            >
              Cancel review
            </button>
          </div>
        )}
        {message && <p role="status">{message}</p>}
      </Card>
      {imports
        .slice()
        .sort((a, b) => b.semester_session_id - a.semester_session_id)
        .map((record) => (
          <Card
            key={record.semester_session_id}
            title={`Connect semester ${record.semester_session_id}`}
          >
            <p className="muted">
              Last imported:{" "}
              {new Date(record.imported_at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}{" "}
              (Asia/Dhaka). Source freshness unknown.
            </p>
            <CourseList courses={record.courses} />
            <button
              className="action-button"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  const result = await act("connect_schedule_delete", {
                    semester_session_id: record.semester_session_id,
                  });
                  setMessage(result.ok ? "Connect import removed." : result.message);
                } catch {
                  setMessage("Could not remove this import. Please try again.");
                } finally {
                  setPending(false);
                }
              }}
            >
              Remove Connect import {record.semester_session_id}
            </button>
          </Card>
        ))}
    </div>
  );
}
