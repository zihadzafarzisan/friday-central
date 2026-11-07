"use client";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { attendanceSummary, degreeCredits, eligible, generatePlans } from "@friday/solver";
import type { PortalData, Deadline, MutationKind } from "@friday/schemas";
import { ActionContext, ActionForm, usePortal } from "@/components/portal-context";
import {
  PageHeader,
  Card,
  Empty,
  Metrics,
  Field,
  Tag,
  formatDate,
  timeLabel,
} from "@/components/ui";
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
import { studentTitles } from "@/lib/routes";
function DueFields({ value }: { value?: Deadline }) {
  let local = "";
  if (value) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(value.due_at));
    const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    local = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  }
  return (
    <>
      <Field label="Title" name="title" value={value?.title} />
      <Field label="Description" name="description" value={value?.description} required={false} />
      <Field
        label="Due date and time (Asia/Dhaka)"
        name="due_at"
        type="datetime-local"
        value={local}
      />
      <Field label="Priority" name="priority">
        <select name="priority" defaultValue={value?.priority ?? "medium"}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </Field>
    </>
  );
}
export { DueFields };
export function StudentPage({
  initial,
  name,
  preview = false,
  detailId,
}: {
  initial: PortalData;
  name: string;
  preview?: boolean;
  detailId?: string;
}) {
  const { data, act } = usePortal(initial, preview);
  const base = preview ? "/preview" : "/app";
  const [answer, setAnswer] = useState<{ text: string; route: string; label: string } | null>(null);
  const [generated, setGenerated] = useState<ReturnType<typeof generatePlans> | null>(null);
  const [term, setTerm] = useState(data.profile?.semester_id ?? data.semesters[0]?.id ?? "");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get("q")?.toLowerCase() ?? "";
  function filter(key: string, value: string) {
    const search = new URLSearchParams(params);
    if (value) search.set(key, value);
    else search.delete(key);
    router.replace(pathname + "?" + search, { scroll: false });
  }
  const course = (id: string) => data.courses.find((row) => row.id === id);
  const enrolled = data.enrollments.filter((row) => row.status === "enrolled");
  const completed = new Set(
    data.completed.filter((row) => row.status === "completed").map((row) => row.course_id),
  );
  const earned = degreeCredits(data.courses, data.completed);
  const program = data.programs.find((row) => row.id === data.profile?.program_id);
  const required = program?.credits_required ?? null;
  const todo = data.deadlines
    .filter((row) => row.status === "open")
    .sort((a, b) => a.due_at.localeCompare(b.due_at));
  const smallAction = (kind: MutationKind, payload: Record<string, unknown>, label: string) => (
    <ActionForm kind={kind} payload={payload} label={label} className="compact-form" />
  );
  function semesterSelect(field = "semester_id") {
    return (
      <select name={field} required defaultValue={term}>
        {data.semesters.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>
    );
  }
  function planCard(plan: PortalData["plans"][number]) {
    return (
      <Card key={plan.id} title={plan.name}>
        <Tag>{plan.kind === "registration" ? "Registration plan" : "Semester plan"}</Tag>
        <p className="muted">{data.semesters.find((term) => term.id === plan.semester_id)?.name}</p>
        {plan.items.map((item) => (
          <p key={item.course_id}>
            {course(item.course_id)?.code} · {course(item.course_id)?.title}
          </p>
        ))}
        <div className="actions">
          <Link href={`${base}/registration/plans/${plan.id}`}>View plan</Link>
          {smallAction("plan_delete", { id: plan.id }, "Delete saved plan")}
        </div>
      </Card>
    );
  }
  let content;
  if (name === "")
    content = (
      <>
        <Metrics
          items={[
            [enrolled.length, "Enrolled sections"],
            [todo.length, "Open deadlines"],
            [earned, "Completed credits"],
          ]}
        />
        <div className="split-grid">
          <Card title={`Welcome, ${data.user.full_name.split(" ")[0]}`}>
            <p className="muted">A clear view of what needs your attention.</p>
            <div className="actions">
              <Link className="action-button primary" href={`${base}/schedule`}>
                Open your schedule
              </Link>
              <Link className="action-button" href={`${base}/deadlines`}>
                Manage deadlines
              </Link>
            </div>
          </Card>
          <Card title="Next deadlines">
            {todo.slice(0, 3).map((row) => (
              <div className="course-row" key={row.id}>
                <strong>{row.title}</strong>
                <time dateTime={row.due_at}>{formatDate(row.due_at)}</time>
              </div>
            ))}
            {!todo.length && (
              <p className="muted">You’re all caught up. Add your next task when you’re ready.</p>
            )}
          </Card>
        </div>
        <Card title="Latest notices">
          {data.notices
            .filter((row) => row.status === "published")
            .slice(0, 3)
            .map((row) => (
              <Link className="course-row" href={`${base}/notices/${row.id}`} key={row.id}>
                <strong>{row.title}</strong>
                <Tag>{row.importance}</Tag>
              </Link>
            ))}
          {!data.notices.length && <p className="muted">No published notices yet.</p>}
        </Card>
      </>
    );
  if (name === "schedule")
    content = (
      <>
        <div className="row">
          <p className="muted">
            These are your manually selected enrollments, not official registration submissions.
          </p>
          <div className="actions">
            <Link className="action-button" href="/schedules">
              Public class browser
            </Link>
            <Link className="action-button" href="/exams">
              Public exams
            </Link>
          </div>
        </div>
        {enrolled.length ? (
          <Card title="Your classes">
            {enrolled.map((row) => {
              const section = data.sections.find((section) => section.id === row.section_id);
              return (
                <div className="course-row" key={row.id}>
                  <div>
                    <strong>
                      {course(section?.course_id ?? "")?.code} · Section {section?.section_number}
                    </strong>
                    <p className="muted">
                      {section?.faculty} · {section?.room}
                    </p>
                    {section?.meetings.map((meeting, index) => (
                      <p className="muted" key={index}>
                        {days[meeting.day_of_week]} {timeLabel(meeting.start_minute)}–
                        {timeLabel(meeting.end_minute)}
                      </p>
                    ))}
                  </div>
                  {smallAction("enrollment_remove", { id: row.id }, "Remove from my schedule")}
                </div>
              );
            })}
          </Card>
        ) : (
          <Empty title="Your schedule is open">
            Select enrolled sections below to build your personal timetable.
          </Empty>
        )}
        <Card title="Add an enrolled section">
          <ActionForm kind="enrollment_add" label="Add to my schedule">
            <Field label="Section" name="section_id">
              <select name="section_id" required>
                <option value="">Choose a section</option>
                {data.sections
                  .filter((section) => !enrolled.some((row) => row.section_id === section.id))
                  .map((section) => (
                    <option key={section.id} value={section.id}>
                      {course(section.course_id)?.code} · {section.section_number} ·{" "}
                      {section.faculty}
                    </option>
                  ))}
              </select>
            </Field>
          </ActionForm>
        </Card>
      </>
    );
  if (name === "deadlines") {
    const source = params.get("source") ?? "all";
    const status = params.get("status") ?? "all";
    const rows = data.deadlines
      .filter(
        (row) =>
          row.title.toLowerCase().includes(q) &&
          (source === "all" || row.scope === source) &&
          (status === "all" || row.status === status),
      )
      .sort((a, b) => a.due_at.localeCompare(b.due_at));
    content = (
      <>
        <div className="toolbar">
          <label>
            Search deadlines
            <input
              type="search"
              value={params.get("q") || ""}
              onChange={(event) => filter("q", event.target.value)}
            />
          </label>
          <label>
            Source
            <select value={source} onChange={(event) => filter("source", event.target.value)}>
              <option value="all">All sources</option>
              <option value="personal">Personal</option>
              <option value="university">University</option>
            </select>
          </label>
        </div>
        <div className="filter-chips">
          {[
            ["all", "All deadlines"],
            ["open", "Open"],
            ["done", "Completed"],
          ].map(([value, label]) => (
            <button
              key={value}
              className="action-button"
              aria-pressed={status === value}
              onClick={() => filter("status", value)}
            >
              {label}
            </button>
          ))}
        </div>
        <Card title="Add a personal deadline">
          <ActionForm kind="deadline_create" label="Add deadline" reset>
            <DueFields />
            <input type="hidden" name="scope" value="personal" />
          </ActionForm>
        </Card>
        {rows.length ? (
          rows.map((row) => (
            <Card key={row.id} title={row.title}>
              <div className="row">
                <Tag>{row.scope === "university" ? "▣ University" : "○ Personal"}</Tag>
                <Tag>
                  {row.status === "done"
                    ? "✓ Completed"
                    : new Date(row.due_at) < new Date()
                      ? "⚠ Overdue"
                      : "◷ Upcoming"}{" "}
                  · {row.priority}
                </Tag>
              </div>
              <p className="muted">{row.description}</p>
              <time dateTime={row.due_at}>{formatDate(row.due_at)} · Dhaka time</time>
              {row.scope === "personal" ? (
                <>
                  <div className="actions">
                    {smallAction(
                      "deadline_status",
                      { id: row.id, status: row.status === "done" ? "open" : "done" },
                      row.status === "done" ? "Reopen" : "Mark done",
                    )}
                    {smallAction("deadline_delete", { id: row.id }, "Delete personal deadline")}
                  </div>
                  <details>
                    <summary>Edit deadline</summary>
                    <ActionForm
                      kind="deadline_update"
                      payload={{ id: row.id }}
                      label="Save changes"
                    >
                      <DueFields value={row} />
                    </ActionForm>
                  </details>
                </>
              ) : (
                <p className="muted">University deadlines are managed by administrators.</p>
              )}
            </Card>
          ))
        ) : (
          <Empty title="No deadlines match">Try another filter or add a personal deadline.</Empty>
        )}
      </>
    );
  }
  if (name === "notices") {
    const category = params.get("category") || "all";
    const unread = params.get("unread") === "true";
    const rows = data.notices.filter(
      (row) =>
        row.status === "published" &&
        `${row.title} ${row.body}`.toLowerCase().includes(q) &&
        (category === "all" || row.category === category) &&
        (!unread || !data.noticeReads.includes(row.id)),
    );
    const detail = detailId ? data.notices.find((row) => row.id === detailId) : null;
    content = detail ? (
      <Card title={detail.title}>
        <div className="row">
          <Tag>{detail.category}</Tag>
          <Tag>{detail.importance}</Tag>
        </div>
        <p className="notice-body">{detail.body}</p>
        {smallAction(
          "notice_read",
          { id: detail.id, read: String(!data.noticeReads.includes(detail.id)) },
          data.noticeReads.includes(detail.id) ? "Mark unread" : "Mark read",
        )}
        <Link href={`${base}/notices`}>All notices</Link>
      </Card>
    ) : (
      <>
        <div className="toolbar">
          <label>
            Search notices
            <input
              type="search"
              value={params.get("q") || ""}
              onChange={(event) => filter("q", event.target.value)}
            />
          </label>
          <label>
            Category
            <select value={category} onChange={(event) => filter("category", event.target.value)}>
              <option value="all">All categories</option>
              {[...new Set(data.notices.map((row) => row.category))].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={unread}
            onChange={(event) => filter("unread", String(event.target.checked))}
          />
          Unread only
        </label>
        <p role="status" className="muted">
          {rows.length} notices
        </p>
        {rows.map((row) => (
          <Card key={row.id} title={row.title}>
            <div className="row">
              <Tag>{row.category}</Tag>
              <Tag>{data.noticeReads.includes(row.id) ? "✓ Read" : "● Unread"}</Tag>
            </div>
            <p className="muted">{row.body.slice(0, 180)}</p>
            <div className="actions">
              <Link href={`${base}/notices/${row.id}`}>Read notice</Link>
              {smallAction(
                "notice_read",
                { id: row.id, read: String(!data.noticeReads.includes(row.id)) },
                data.noticeReads.includes(row.id) ? "Mark unread" : "Mark read",
              )}
            </div>
          </Card>
        ))}
        {!rows.length && <Empty title="No notices match">Try another search or category.</Empty>}
      </>
    );
  }
  if (name === "degree")
    content = (
      <>
        <Metrics
          items={[
            [earned, "Completed credits"],
            [required ?? "—", "Program credit requirement"],
            [required === null ? "—" : Math.max(0, required - earned), "Credits not yet completed"],
          ]}
        />
        <Card title={program?.name ?? "Choose your program"}>
          {required && (
            <>
              <p>
                {earned} of {required} credits completed
              </p>
              <progress value={earned} max={required} aria-label="Degree credits completed" />
            </>
          )}
          <p className="muted">
            Progress is computed from your completed courses. In-progress sections are not counted
            as earned credits.
          </p>
          <p className="muted">
            Detailed requirement-group matching will appear after your official program rules are
            imported.
          </p>
          <Link href={`${base}/profile`}>Update completed courses</Link>
        </Card>
        <Card title="Prerequisites">
          {data.courses
            .filter((row) => !completed.has(row.id))
            .map((row) => (
              <div className="course-row" key={row.id}>
                <div>
                  <strong>
                    {row.code} · {row.title}
                  </strong>
                  <p className="muted">
                    {row.prerequisite_groups.length
                      ? row.prerequisite_groups
                          .map((group) =>
                            group.map((id) => course(id)?.code ?? "Unknown course").join(" or "),
                          )
                          .join(" and ")
                      : "No prerequisites recorded"}
                  </p>
                </div>
                <Tag>
                  {eligible(row.prerequisite_groups, completed)
                    ? "✓ Eligible"
                    : "⚠ Prerequisites unmet"}
                </Tag>
              </div>
            ))}
        </Card>
      </>
    );
  if (name === "attendance")
    content = (
      <>
        <div className="demo-banner">
          Attendance is self-reported. Confirm your university’s policy before relying on absence
          allowances. The current estimate uses a 75% threshold.
        </div>
        {enrolled.length ? (
          enrolled.map((row) => {
            const section = data.sections.find((section) => section.id === row.section_id);
            const summary = attendanceSummary(
              data.attendance.filter((record) => record.enrollment_id === row.id),
            );
            return (
              <Card
                key={row.id}
                title={`${course(section?.course_id ?? "")?.code ?? "Course"} · Attendance`}
              >
                <Metrics
                  items={[
                    [summary.percent === null ? "—" : summary.percent + "%", "Attendance"],
                    [`${summary.attended}/${summary.total}`, "Attended / held sessions"],
                    [summary.canMiss, "Further absences at 75%"],
                  ]}
                />
                {summary.percent !== null && summary.percent < 75 && <Tag>⚠ Below threshold</Tag>}
                <ActionForm
                  kind="attendance_log"
                  payload={{ enrollment_id: row.id }}
                  label="Log attendance"
                >
                  <Field label="Class date" name="class_date" type="date" />
                  <Field label="Attendance" name="status">
                    <select name="status">
                      <option value="attended">Attended</option>
                      <option value="missed">Missed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </Field>
                </ActionForm>
              </Card>
            );
          })
        ) : (
          <Empty title="No enrolled courses yet">
            <Link href={`${base}/schedule`}>Add your enrolled sections</Link> to start tracking
            attendance.
          </Empty>
        )}
      </>
    );
  if (name === "profile" || name === "onboarding")
    content = (
      <>
        <Card title={name === "onboarding" ? "Your academic starting point" : "Academic profile"}>
          <ActionForm
            kind="profile_save"
            label={name === "onboarding" ? "Continue to dashboard" : "Save profile"}
            onSuccess={name === "onboarding" ? () => router.push(base) : undefined}
          >
            <Field label="Full name" name="full_name" value={data.user.full_name} />
            <Field label="Student ID" name="student_id" value={data.profile?.student_id} />
            <Field label="Program" name="program_id">
              <select name="program_id" required defaultValue={data.profile?.program_id ?? ""}>
                <option value="">Choose a program</option>
                {data.programs.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Current semester" name="semester_id">
              {semesterSelect()}
            </Field>
          </ActionForm>
        </Card>
        <Card title="Completed courses">
          <ActionForm kind="completed_add" label="Add completed course">
            <Field label="Course" name="course_id">
              <select name="course_id" required>
                <option value="">Choose a completed course</option>
                {data.courses
                  .filter((row) => !completed.has(row.id))
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.code} · {row.title}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Grade (optional)" name="grade" required={false} />
          </ActionForm>
          {data.completed.map((row) => (
            <div key={row.id} className="course-row">
              <strong>
                {course(row.course_id)?.code} · {row.status}
              </strong>
              {smallAction("completed_remove", { id: row.id }, "Remove completed record")}
            </div>
          ))}
        </Card>
      </>
    );
  if (name === "settings")
    content = (
      <Card title="Your preferences">
        <ActionForm kind="preferences_save" label="Save preferences">
          <Field label="Email reminders" name="email_enabled">
            <select name="email_enabled" defaultValue={String(data.preferences.email_enabled)}>
              <option value="true">Enabled when email delivery is connected</option>
              <option value="false">Disabled</option>
            </select>
          </Field>
          <Field label="In-app notifications" name="in_app_enabled">
            <select name="in_app_enabled" defaultValue={String(data.preferences.in_app_enabled)}>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </Field>
          <Field label="Visual effects" name="reduce_effects">
            <select name="reduce_effects" defaultValue={String(data.preferences.reduce_effects)}>
              <option value="false">Standard</option>
              <option value="true">Reduced effects</option>
            </select>
          </Field>
        </ActionForm>
        <p className="muted">
          Your browser’s reduced-motion and contrast preferences are always respected.
        </p>
      </Card>
    );
  if (name === "notifications")
    content = data.notifications.length ? (
      <>
        {data.notifications.map((row) => (
          <Card key={row.id} title={row.title}>
            <Tag>{row.read_at ? "✓ Read" : "● Unread"}</Tag>
            <p className="muted">{row.body}</p>
            <div className="actions">
              <Link href={row.link.replace(/^\/app/, base)}>Open related page</Link>
              {!row.read_at &&
                smallAction("notification_read", { id: row.id }, "Mark notification read")}
            </div>
          </Card>
        ))}
      </>
    ) : (
      <Empty title="You’re up to date">
        Your notifications will appear here as university updates arrive.
      </Empty>
    );
  if (name === "planner")
    content = (
      <>
        <Card title="Plan a semester">
          <ActionForm kind="plan_save" label="Save semester plan">
            <input type="hidden" name="kind" value="semester" />
            <Field label="Plan name" name="name" />
            <Field label="Semester" name="semester_id">
              {semesterSelect()}
            </Field>
            <fieldset className="stack">
              <legend>Choose courses</legend>
              {data.courses
                .filter((row) => row.is_active && !completed.has(row.id))
                .map((row) => (
                  <label key={row.id} className="check-label">
                    <input type="checkbox" name="course_ids" value={row.id} />
                    {row.code} · {row.credits} credits
                  </label>
                ))}
            </fieldset>
            <p className="muted">
              Maximum 18 credits per plan. Saving a plan does not enroll you in courses.
            </p>
          </ActionForm>
        </Card>
        {data.plans.filter((row) => row.kind === "semester").map(planCard)}
        {!data.plans.some((row) => row.kind === "semester") && (
          <Empty title="A fresh semester">Save your first course plan above.</Empty>
        )}
      </>
    );
  if (name === "registration") {
    const eligibleCourses = data.courses.filter(
      (row) =>
        row.is_active && !completed.has(row.id) && eligible(row.prerequisite_groups, completed),
    );
    content = detailId ? (
      <>
        {data.plans.filter((row) => row.id === detailId).map(planCard)}
        <Link href={`${base}/registration`}>All registration plans</Link>
      </>
    ) : (
      <>
        <Card title="Build a conflict-free plan">
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              const wanted = fields.getAll("course_ids").map(String);
              const candidates = data.sections
                .filter((row) => row.semester_id === term)
                .map((row) => ({ ...row, credits: course(row.course_id)?.credits ?? 0 }));
              setGenerated(
                generatePlans(wanted, candidates, {
                  avoidEarly: fields.get("avoidEarly") === "on",
                  compact: fields.get("compact") === "on",
                }),
              );
            }}
          >
            <Field label="Semester" name="semester_id">
              <select
                name="semester_id"
                value={term}
                onChange={(event) => {
                  setTerm(event.target.value);
                  setGenerated(null);
                }}
              >
                {data.semesters.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </Field>
            <fieldset className="stack">
              <legend>Eligible courses</legend>
              {eligibleCourses.map((row) => (
                <label className="check-label" key={row.id}>
                  <input type="checkbox" name="course_ids" value={row.id} />
                  {row.code} · {row.credits} credits
                </label>
              ))}
              {!eligibleCourses.length && (
                <p className="muted">
                  No eligible courses are available. Update your completed courses or catalog.
                </p>
              )}
            </fieldset>
            <label className="check-label">
              <input type="checkbox" name="avoidEarly" defaultChecked />
              Prefer classes after 9 am
            </label>
            <label className="check-label">
              <input type="checkbox" name="compact" />
              Prefer fewer campus days
            </label>
            <button className="action-button primary" type="submit">
              Generate plans
            </button>
          </form>
        </Card>
        {generated !== null && !generated.length && (
          <Empty title="No conflict-free plan found">
            Select at least one eligible course, try another semester, or ask your administrator to
            update section times and seats.
          </Empty>
        )}
        {generated?.map((plan, index) => (
          <Card
            title={`Plan ${index + 1} · ${plan.credits} credits`}
            key={plan.sections.map((row) => row.id).join()}
          >
            <Tag>✓ No class-time conflicts</Tag>
            {plan.sections.map((section) => (
              <p key={section.id}>
                {course(section.course_id)?.code} · Section{" "}
                {data.sections.find((row) => row.id === section.id)?.section_number}
              </p>
            ))}
            <ActionForm
              kind="plan_save"
              label="Save registration plan"
              payload={{
                name: `Plan ${index + 1}`,
                kind: "registration",
                semester_id: term,
                course_ids: plan.sections.map((row) => row.course_id),
                section_ids: plan.sections.map((row) => row.id),
              }}
            />
          </Card>
        ))}
        <div className="demo-banner">
          Seat availability can change. Saved plans are checked again on the server; complete
          registration only in{" "}
          <a href="https://connect.bracu.ac.bd" target="_blank" rel="noreferrer">
            BRACU Connect
          </a>
          .
        </div>
        {data.plans.filter((row) => row.kind === "registration").map(planCard)}
      </>
    );
  }
  if (name === "assistant") {
    function ask(question: string) {
      const text = question.toLowerCase();
      if (/deadline|due/.test(text))
        setAnswer({
          text: todo.length
            ? `${todo.length} open deadlines. Next: ${todo[0].title}, due ${formatDate(todo[0].due_at)}.`
            : "There are no open deadlines in your FRIDAY records.",
          route: "deadlines",
          label: "Your deadlines",
        });
      else if (/degree|credit|progress/.test(text))
        setAnswer({
          text: `Your records show ${earned} completed credits${required ? ` toward a ${required}-credit program` : "; no program requirement is set"}.`,
          route: "degree",
          label: "Degree records",
        });
      else if (/class|schedule|exam/.test(text))
        setAnswer({
          text: `You have ${enrolled.length} selected sections. Consult public exam records and Connect for official dates.`,
          route: "schedule",
          label: "Your schedule",
        });
      else if (/attend|miss|absence/.test(text))
        setAnswer({
          text: "Attendance estimates use only the sessions you have logged. Open your attendance page for each course’s totals.",
          route: "attendance",
          label: "Attendance records",
        });
      else
        setAnswer({
          text: "I don’t have enough information for that question. Try asking about your schedule, deadlines, attendance, or credits.",
          route: "profile",
          label: "Your profile",
        });
    }
    content = (
      <>
        <Card title="Answers from your records">
          <p className="muted">
            Guided, read-only answers with source links. AI-generated answers are not enabled yet.
          </p>
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              ask(String(new FormData(event.currentTarget).get("question") ?? ""));
            }}
          >
            <Field
              label="Your question"
              name="question"
              placeholder="What deadlines are coming up?"
            />
            <button className="action-button primary">Ask FRIDAY</button>
          </form>
          <div className="actions">
            {["My deadlines", "My schedule", "My degree credits"].map((text) => (
              <button className="action-button" key={text} onClick={() => ask(text)}>
                {text}
              </button>
            ))}
          </div>
        </Card>
        {answer && (
          <Card title="From your FRIDAY data">
            <p role="status">{answer.text}</p>
            <Link href={`${base}/${answer.route}`}>Source: {answer.label}</Link>
          </Card>
        )}
      </>
    );
  }
  return (
    <ActionContext.Provider value={act}>
      <div className={`page-content ${data.preferences.reduce_effects ? "reduce-effects" : ""}`}>
        <PageHeader
          title={studentTitles[name] ?? "Your page"}
          eyebrow={preview ? "BRACU · Student preview" : "BRAC University"}
          home={base}
        />
        {content}
      </div>
    </ActionContext.Provider>
  );
}
