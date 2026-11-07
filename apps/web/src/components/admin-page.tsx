"use client";
import { useContext, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { PortalData, Notice } from "@friday/schemas";
import { mutationSchemas } from "@friday/schemas";
import { ActionContext, ActionForm, usePortal } from "@/components/portal-context";
import {
  Card,
  Empty,
  Field,
  Metrics,
  PageHeader,
  Tag,
  formatDate,
  timeLabel,
} from "@/components/ui";
import { DueFields } from "@/components/student-page";
import { adminTitles } from "@/lib/routes";
function NoticeFields({ notice }: { notice?: Notice }) {
  return (
    <>
      <Field label="Title" name="title" value={notice?.title} />
      <label className="field">
        Notice text
        <textarea name="body" required rows={5} defaultValue={notice?.body} />
      </label>
      <Field label="Category" name="category">
        <select name="category" defaultValue={notice?.category}>
          {[
            "academic",
            "registration",
            "exam",
            "tuition",
            "administrative",
            "holiday",
            "emergency",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Importance" name="importance">
        <select name="importance" defaultValue={notice?.importance}>
          {["normal", "high", "emergency"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Publication status" name="status">
        <select name="status" defaultValue={notice?.status}>
          {["draft", "review", "published", "archived"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
    </>
  );
}
function ImportCourses() {
  const act = useContext(ActionContext);
  const [csv, setCsv] = useState("code,title,credits\nCSE220,Data structures,3");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  // Restrict this small synchronous importer to a documented, unquoted format.
  const lines = csv.trim().split(/\r?\n/);
  const rawRows = lines
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [code, title, credits, ...extra] = line.split(",");
      return { code: code?.trim(), title: extra.length ? undefined : title?.trim(), credits };
    });
  const result = mutationSchemas.catalog_import.safeParse({ rows: rawRows });
  const valid =
    lines[0] === "code,title,credits" &&
    result.success &&
    !csv.includes('"') &&
    new Set(rawRows.map((row) => row.code)).size === rawRows.length;
  return (
    <Card title="Import courses">
      <p className="muted">
        Paste up to 200 courses as code,title,credits. This importer accepts plain fields without
        embedded commas or quotes. Review every row before applying; existing course codes are
        updated together in one transaction.
      </p>
      <label className="field">
        CSV contents
        <textarea
          aria-label="CSV contents"
          rows={8}
          value={csv}
          onChange={(event) => {
            setCsv(event.target.value);
            setMessage("");
          }}
        />
      </label>
      <p role="status" className={valid ? "positive" : "warning"}>
        {valid
          ? `${rawRows.length} valid course rows ready to review.`
          : "Check the exact header, missing fields, duplicate codes, credits, and commas."}
      </p>
      {valid && result.success && (
        <div className="demo-list">
          {result.data.rows.map((row) => (
            <p key={row.code}>
              {row.code} · {row.title} · {row.credits} credits
            </p>
          ))}
        </div>
      )}
      <button
        className="action-button primary"
        disabled={!valid || pending}
        onClick={async () => {
          if (!result.success) return;
          setPending(true);
          try {
            const saved = await act("catalog_import", result.data);
            setMessage(saved.message);
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Importing…" : "Apply reviewed import"}
      </button>
      {message && <p role="status">{message}</p>}
    </Card>
  );
}
export function AdminPage({
  initial,
  name,
  preview = false,
}: {
  initial: PortalData;
  name: string;
  preview?: boolean;
}) {
  const { data, act } = usePortal(initial, preview);
  const base = preview ? "/preview/admin" : "/admin";
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = params.get("q") ?? "";
  function search(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value);
    else next.delete("q");
    router.replace(pathname + "?" + next, { scroll: false });
  }
  const users = preview ? [{ ...data.user, role: "student" as const }, ...data.users] : data.users;
  let content;
  if (name === "")
    content = (
      <>
        <Metrics
          items={[
            [users.length, "University accounts"],
            [data.courses.length, "Catalog courses"],
            [data.notices.filter((row) => row.status === "published").length, "Published notices"],
          ]}
        />
        <div className="split-grid">
          <Card title="Keep your catalog current">
            <p className="muted">
              Students rely on section times, room changes, and seat information when they plan.
            </p>
            <Link className="action-button" href={`${base}/catalog/sections`}>
              Manage sections
            </Link>
          </Card>
          <Card title="Publish an update">
            <p className="muted">
              Draft a notice, review it, and publish it to students at your university.
            </p>
            <Link className="action-button" href={`${base}/notices`}>
              Manage notices
            </Link>
          </Card>
        </div>
      </>
    );
  if (name === "catalog/programs")
    content = (
      <>
        <Card title="Add a program">
          <ActionForm kind="program_save" label="Add program" reset>
            <Field name="code" label="Program code" />
            <Field name="name" label="Program name" />
            <Field
              name="credits_required"
              label="Required credits"
              type="number"
              min={1}
              max={300}
            />
          </ActionForm>
        </Card>
        {data.programs.map((row) => (
          <Card key={row.id} title={row.name}>
            <Tag>{row.code}</Tag>
            <p>{row.credits_required} credits required</p>
            <p className="muted">
              Import verified requirement groups before using this catalog for an official degree
              audit.
            </p>
          </Card>
        ))}
      </>
    );
  if (name === "catalog/courses")
    content = (
      <>
        <Card title="Add a course">
          <ActionForm kind="course_save" label="Add course" reset>
            <Field name="code" label="Course code" />
            <Field name="title" label="Course title" />
            <Field name="credits" label="Credits" type="number" min={0.5} max={12} step="0.5" />
          </ActionForm>
        </Card>
        <label className="field">
          Search courses
          <input type="search" value={query} onChange={(event) => search(event.target.value)} />
        </label>
        {data.courses
          .filter((row) => `${row.code} ${row.title}`.toLowerCase().includes(query.toLowerCase()))
          .map((row) => (
            <Card key={row.id} title={`${row.code} · ${row.title}`}>
              <Tag>{row.credits} credits</Tag>
              <details>
                <summary>Edit course</summary>
                <ActionForm kind="course_save" payload={{ id: row.id }} label="Update course">
                  <Field name="code" label="Course code" value={row.code} />
                  <Field name="title" label="Course title" value={row.title} />
                  <Field
                    name="credits"
                    label="Credits"
                    type="number"
                    min={0.5}
                    max={12}
                    step="0.5"
                    value={row.credits}
                  />
                </ActionForm>
              </details>
            </Card>
          ))}
      </>
    );
  if (name === "catalog/sections")
    content = (
      <>
        <Card title="Add a section">
          <ActionForm kind="section_save" label="Add section" reset>
            <Field label="Course" name="course_id">
              <select name="course_id" required>
                {data.courses.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Semester" name="semester_id">
              <select name="semester_id" required>
                {data.semesters.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-grid">
              <Field label="Section number" name="section_number" />
              <Field label="Faculty initials" name="faculty" />
              <Field label="Room" name="room" />
              <Field label="Capacity" name="capacity" type="number" min={1} max={500} />
              <Field
                label="Seats available"
                name="seats_available"
                type="number"
                min={0}
                max={500}
              />
              <Field label="Day" name="day_of_week">
                <select name="day_of_week">
                  {[
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ].map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Start time (Dhaka)" name="start_time" type="time" />
              <Field label="End time (Dhaka)" name="end_time" type="time" />
            </div>
          </ActionForm>
        </Card>
        {data.sections.map((row) => (
          <Card
            key={row.id}
            title={`${data.courses.find((course) => course.id === row.course_id)?.code} · Section ${row.section_number}`}
          >
            <p>
              {row.faculty} · {row.room} · {row.seats_available}/{row.capacity} seats available
            </p>
            <p className="muted">
              {data.semesters.find((term) => term.id === row.semester_id)?.name}
            </p>
            <details>
              <summary>Edit section</summary>
              <ActionForm
                kind="section_save"
                label="Save section changes"
                payload={{
                  id: row.id,
                  course_id: row.course_id,
                  semester_id: row.semester_id,
                  section_number: row.section_number,
                }}
              >
                <Field label="Faculty initials" name="faculty" value={row.faculty} />
                <Field label="Room" name="room" value={row.room} />
                <Field
                  label="Capacity"
                  name="capacity"
                  type="number"
                  min={1}
                  max={500}
                  value={row.capacity}
                />
                <Field
                  label="Seats available"
                  name="seats_available"
                  type="number"
                  min={0}
                  max={500}
                  value={row.seats_available}
                />
                <Field label="Meeting day" name="day_of_week">
                  <select name="day_of_week" defaultValue={row.meetings[0]?.day_of_week ?? 0}>
                    {[
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                    ].map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Start time (Dhaka)"
                  name="start_time"
                  type="time"
                  value={timeLabel(row.meetings[0]?.start_minute ?? 600)}
                />
                <Field
                  label="End time (Dhaka)"
                  name="end_time"
                  type="time"
                  value={timeLabel(row.meetings[0]?.end_minute ?? 680)}
                />
                <p className="muted">This editor saves one weekly meeting for this section.</p>
              </ActionForm>
            </details>
          </Card>
        ))}
      </>
    );
  if (name === "catalog/import") content = <ImportCourses />;
  if (name === "notices")
    content = (
      <>
        <Card title="Draft a notice">
          <ActionForm kind="notice_save" label="Save notice" reset>
            <NoticeFields />
          </ActionForm>
        </Card>
        <p className="muted">
          AI extraction is not enabled. Review and enter university deadlines manually.
        </p>
        {data.notices.map((row) => (
          <Card key={row.id} title={row.title}>
            <div className="actions">
              <Tag>{row.status}</Tag>
              <Tag>{row.importance}</Tag>
            </div>
            <p className="notice-body">{row.body}</p>
            <details>
              <summary>Edit and publish</summary>
              <ActionForm kind="notice_save" payload={{ id: row.id }} label="Save notice changes">
                <NoticeFields notice={row} />
              </ActionForm>
            </details>
          </Card>
        ))}
      </>
    );
  if (name === "deadlines")
    content = (
      <>
        <Card title="Add a university deadline">
          <ActionForm
            kind="deadline_create"
            label="Publish deadline"
            payload={{ scope: "university" }}
            reset
          >
            <DueFields />
          </ActionForm>
        </Card>
        {data.deadlines
          .filter((row) => row.scope === "university")
          .map((row) => (
            <Card key={row.id} title={row.title}>
              <p>
                {formatDate(row.due_at)} · {row.priority}
              </p>
              <p className="muted">{row.description}</p>
              <details>
                <summary>Edit university deadline</summary>
                <ActionForm
                  kind="university_deadline_update"
                  payload={{ id: row.id }}
                  label="Save university deadline"
                >
                  <DueFields value={row} />
                </ActionForm>
              </details>
            </Card>
          ))}
      </>
    );
  if (name === "users")
    content = (
      <>
        <label className="field">
          Find a university account
          <input type="search" value={query} onChange={(event) => search(event.target.value)} />
        </label>
        {users
          .filter((user) =>
            `${user.full_name} ${user.email}`.toLowerCase().includes(query.toLowerCase()),
          )
          .map((user) => (
            <Card key={user.id} title={user.full_name}>
              <p>{user.email}</p>
              <div className="actions">
                <Tag>{user.role}</Tag>
                <Tag>{user.status}</Tag>
              </div>
              {user.id !== data.user.id && (
                <>
                  <ActionForm
                    kind="user_status"
                    label={user.status === "active" ? "Deactivate account" : "Reactivate account"}
                    payload={{
                      id: user.id,
                      status: user.status === "active" ? "deactivated" : "active",
                    }}
                  />
                  {(data.user.role === "super_admin" || preview) && (
                    <ActionForm kind="user_role" payload={{ id: user.id }} label="Update role">
                      <Field label="Account role" name="role">
                        <select name="role" defaultValue={user.role}>
                          <option value="student">Student</option>
                          <option value="admin">Administrator</option>
                          <option value="super_admin">Super administrator</option>
                        </select>
                      </Field>
                    </ActionForm>
                  )}
                </>
              )}
            </Card>
          ))}
      </>
    );
  if (name === "reports")
    content = (
      <>
        <Metrics
          items={[
            [users.filter((user) => user.status === "active").length, "Active university accounts"],
            [data.sections.length, "Managed sections"],
            [data.notices.filter((row) => row.status === "published").length, "Published notices"],
          ]}
        />
        <Card title="Catalog coverage">
          <p>
            {data.programs.length} programs · {data.courses.length} courses ·{" "}
            {data.semesters.length} semesters
          </p>
          <p className="muted">
            These figures come from accessible university records. Reminder engagement and
            registration analytics will appear after their event pipelines are connected.
          </p>
        </Card>
      </>
    );
  if (name === "audit-log")
    content = (
      <>
        <label className="field">
          Filter audit history
          <input type="search" value={query} onChange={(event) => search(event.target.value)} />
        </label>
        {data.audit
          .filter((row) =>
            `${row.action} ${row.entity_type}`.toLowerCase().includes(query.toLowerCase()),
          )
          .map((row) => (
            <Card key={row.id} title={`${row.action} · ${row.entity_type}`}>
              <p className="muted">
                {formatDate(row.created_at)} · Actor {row.actor_id ?? "System"}
              </p>
            </Card>
          ))}
        {!data.audit.length && (
          <Empty title="No administrative changes yet">
            Catalog edits, notice changes, and account administration create append-only audit
            entries.
          </Empty>
        )}
      </>
    );
  if (name === "settings")
    content = (
      <>
        <Card title="Pilot university">
          <p>BRAC University</p>
          <p className="muted">Student domain: @g.bracu.ac.bd · Timezone: Asia/Dhaka</p>
          <p className="muted">
            University configuration is managed through trusted database migrations. Additional
            universities can be added later without sharing student records.
          </p>
        </Card>
        <Card title="Administrator access">
          <p className="muted">
            Administrator accounts are provisioned through trusted Supabase administration. Super
            administrators can change existing account roles on the Users page. Self-signup always
            creates a student.
          </p>
          <Link className="action-button" href={`${base}/users`}>
            Manage existing accounts
          </Link>
        </Card>
      </>
    );
  return (
    <ActionContext.Provider value={act}>
      <div className="page-content">
        <PageHeader
          title={adminTitles[name] ?? "Administration"}
          eyebrow={preview ? "BRACU · Admin preview" : "FRIDAY administration"}
          home={base}
        />
        {content}
      </div>
    </ActionContext.Provider>
  );
}
