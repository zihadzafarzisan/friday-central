"use client";
import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { connectRowSchema, type ConnectRow } from "@friday/schemas";
import { z } from "zod";
import { Empty, Tag } from "@/components/ui";
export function PublicSchedule({ exam = false }: { exam?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [rows, setRows] = useState<ConnectRow[]>([]);
  const [status, setStatus] = useState("Loading public schedule data…");
  const [pending, setPending] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const change = useCallback(
    (key: string, value: string) => {
      const query = new URLSearchParams(params);
      if (value) query.set(key, value);
      else query.delete(key);
      query.delete("page");
      router.replace(pathname + "?" + query.toString(), { scroll: false });
    },
    [params, pathname, router],
  );
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/public/schedule", { signal: controller.signal });
        if (!response.ok) throw new Error("Unavailable");
        const result = z
          .object({ rows: connectRowSchema.array(), fetchedAt: z.string() })
          .parse(await response.json());
        if (controller.signal.aborted) return;
        setRows(result.rows);
        setStatus(
          `Public Connect data · fetched ${new Date(result.fetchedAt).toLocaleTimeString()} · source freshness unknown`,
        );
      } catch {
        if (!controller.signal.aborted)
          setStatus(
            "Public schedules could not be loaded. Previously fetched records remain available; try again.",
          );
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refresh]);
  const q = params.get("q")?.toLowerCase() || "";
  const faculty = params.get("faculty")?.toLowerCase() || "";
  const filtered = rows
    .filter(
      (row) =>
        `${row.courseCode} ${row.courseName || ""}`.toLowerCase().includes(q) &&
        `${row.faculties || ""} ${row.labFaculties || ""}`.toLowerCase().includes(faculty),
    )
    .sort((a, b) =>
      `${a.courseCode} ${a.sectionName}`.localeCompare(
        `${b.courseCode} ${b.sectionName}`,
        undefined,
        { numeric: true },
      ),
    );
  const page = Math.max(
    1,
    Math.min(Number(params.get("page")) || 1, Math.ceil(filtered.length / 50) || 1),
  );
  const shown = filtered.slice((page - 1) * 50, page * 50);
  return (
    <div className="stack">
      <div className="demo-banner">
        Public section listings are separate from your personal enrollments. Confirm final details
        in{" "}
        <a href="https://connect.bracu.ac.bd" target="_blank" rel="noreferrer">
          BRACU Connect
        </a>
        .
      </div>
      <div className="actions">
        <Link className="action-button" href="/schedules">
          Classes
        </Link>
        <Link className="action-button" href="/exams">
          Exams
        </Link>
      </div>
      <div className="schedule-toolbar">
        <label>
          Course or name
          <input
            type="search"
            aria-label="Course or name"
            value={params.get("q") || ""}
            onChange={(event) => change("q", event.target.value)}
          />
        </label>
        <label>
          Faculty initials
          <input
            type="search"
            aria-label="Faculty initials"
            value={params.get("faculty") || ""}
            onChange={(event) => change("faculty", event.target.value)}
          />
        </label>
        <button
          className="action-button"
          disabled={pending}
          onClick={() => {
            setPending(true);
            setStatus("Refreshing public records…");
            setRefresh((value) => value + 1);
          }}
        >
          Refresh data
        </button>
      </div>
      <p className="muted" role="status">
        {status} · {filtered.length} matches
      </p>
      {shown.length ? (
        <div className="schedule-table-wrap">
          <table className="schedule-table">
            <caption className="sr-only">Public {exam ? "exam" : "class"} schedule</caption>
            <thead>
              <tr>
                {["Course", "Faculty", exam ? "Exams" : "Meetings", "Room", "Seats"].map(
                  (label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {shown.map((row, index) => (
                <tr key={row.courseCode + String(row.sectionName) + index}>
                  <td>
                    <strong>
                      {row.courseCode} · {row.sectionName || "—"}
                    </strong>
                    <small>{row.courseName}</small>
                  </td>
                  <td>
                    <Tag>{row.faculties || "TBA"}</Tag>
                  </td>
                  <td>
                    {exam ? (
                      <>
                        {row.sectionSchedule?.midExamDate && (
                          <p>
                            Midterm: {row.sectionSchedule.midExamDate}{" "}
                            {row.sectionSchedule.midExamStartTime}
                          </p>
                        )}
                        {row.sectionSchedule?.finalExamDate && (
                          <p>
                            Final: {row.sectionSchedule.finalExamDate}{" "}
                            {row.sectionSchedule.finalExamStartTime}
                          </p>
                        )}
                        {!row.sectionSchedule?.midExamDate &&
                          !row.sectionSchedule?.finalExamDate &&
                          "Exam date pending"}
                      </>
                    ) : (
                      <>
                        {row.sectionSchedule?.classSchedules?.map((meeting, i) => (
                          <p key={i}>
                            {meeting.day} {meeting.startTime}–{meeting.endTime}
                          </p>
                        ))}
                        {row.labSchedules?.map((meeting, i) => (
                          <p key={i}>
                            Lab: {meeting.day} {meeting.startTime}–{meeting.endTime}
                          </p>
                        ))}
                      </>
                    )}
                  </td>
                  <td>{row.roomName || "TBA"}</td>
                  <td>
                    {row.consumedSeat ?? "—"}/{row.capacity ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !pending && (
          <Empty title={rows.length ? "No matching sections" : "No public sections available"}>
            Try another search or refresh the data.
          </Empty>
        )
      )}
      {filtered.length > 50 && (
        <nav className="actions" aria-label="Schedule pages">
          <button
            className="action-button"
            disabled={page <= 1}
            onClick={() => {
              const query = new URLSearchParams(params);
              query.set("page", String(page - 1));
              router.replace(pathname + "?" + query);
            }}
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.ceil(filtered.length / 50)}
          </span>
          <button
            className="action-button"
            disabled={page * 50 >= filtered.length}
            onClick={() => {
              const query = new URLSearchParams(params);
              query.set("page", String(page + 1));
              router.replace(pathname + "?" + query);
            }}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
