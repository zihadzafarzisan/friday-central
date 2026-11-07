"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { sampleData } from "@friday/db";
import {
  mutationSchemas,
  deadlineSchema,
  courseSchema,
  sectionSchema,
  noticeSchema,
  type MutationKind,
  type PortalData,
  type ActionResult,
} from "@friday/schemas";
import { mutate } from "@/server/actions";

const PreviewContext = createContext<{
  data: PortalData;
  update: (data: PortalData) => void;
} | null>(null);
export function PreviewProvider({ children }: { children: ReactNode }) {
  const [data, update] = useState(() => sampleData());
  return <PreviewContext.Provider value={{ data, update }}>{children}</PreviewContext.Provider>;
}
export const ActionContext =
  createContext<(kind: MutationKind, input: unknown) => Promise<ActionResult>>(mutate);
export function usePortal(initial: PortalData, preview: boolean) {
  const context = useContext(PreviewContext);
  const router = useRouter();
  const data = preview && context ? context.data : initial;
  const act = async (kind: MutationKind, raw: unknown): Promise<ActionResult> => {
    if (!preview) {
      const result = await mutate(kind, raw);
      if (result.ok) router.refresh();
      return result;
    }
    const result = mutationSchemas[kind].safeParse(raw);
    if (!result.success) return { ok: false, message: result.error.issues[0].message };
    if (!context) return { ok: false, message: "Preview unavailable." };
    const next = structuredClone(data);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const own = { id, university_id: data.user.university_id, user_id: data.user.id };
    switch (kind) {
      case "deadline_create": {
        const input = mutationSchemas.deadline_create.parse(raw);
        if (new Date(input.due_at).getTime() < Date.now())
          return { ok: false, message: "Choose a future due time." };
        next.deadlines.push(
          deadlineSchema.parse({
            ...own,
            ...input,
            owner_user_id: input.scope === "personal" ? data.user.id : null,
            status: "open",
          }),
        );
        break;
      }
      case "deadline_update":
      case "university_deadline_update": {
        const input = mutationSchemas[kind].parse(raw);
        next.deadlines = next.deadlines.map((row) =>
          row.id === input.id ? { ...row, ...input } : row,
        );
        break;
      }
      case "deadline_status": {
        const input = mutationSchemas.deadline_status.parse(raw);
        next.deadlines = next.deadlines.map((row) =>
          row.id === input.id ? { ...row, status: input.status } : row,
        );
        break;
      }
      case "deadline_delete":
        next.deadlines = next.deadlines.filter(
          (row) => row.id !== mutationSchemas.deadline_delete.parse(raw).id,
        );
        break;
      case "notice_read": {
        const input = mutationSchemas.notice_read.parse(raw);
        next.noticeReads =
          input.read === "true"
            ? [...new Set([...next.noticeReads, input.id])]
            : next.noticeReads.filter((id) => id !== input.id);
        break;
      }
      case "enrollment_add": {
        const input = mutationSchemas.enrollment_add.parse(raw);
        if (!next.enrollments.some((row) => row.section_id === input.section_id))
          next.enrollments.push({ ...own, ...input, status: "enrolled" });
        break;
      }
      case "enrollment_remove":
        next.enrollments = next.enrollments.filter(
          (row) => row.id !== mutationSchemas.enrollment_remove.parse(raw).id,
        );
        break;
      case "completed_add": {
        const input = mutationSchemas.completed_add.parse(raw);
        if (!next.completed.some((row) => row.course_id === input.course_id))
          next.completed.push({
            ...own,
            ...input,
            grade: input.grade || null,
            status: "completed",
          });
        break;
      }
      case "completed_remove":
        next.completed = next.completed.filter(
          (row) => row.id !== mutationSchemas.completed_remove.parse(raw).id,
        );
        break;
      case "attendance_log": {
        const input = mutationSchemas.attendance_log.parse(raw);
        next.attendance = next.attendance.filter(
          (row) =>
            !(row.enrollment_id === input.enrollment_id && row.class_date === input.class_date),
        );
        next.attendance.push({ ...own, ...input });
        break;
      }
      case "plan_save": {
        const input = mutationSchemas.plan_save.parse(raw);
        next.plans.push({
          ...own,
          name: input.name,
          semester_id: input.semester_id,
          kind: input.kind,
          items: input.course_ids.map((course_id) => ({
            course_id,
            section_id:
              next.sections.find(
                (section) =>
                  section.course_id === course_id && input.section_ids.includes(section.id),
              )?.id ?? null,
          })),
        });
        break;
      }
      case "plan_delete":
        next.plans = next.plans.filter(
          (row) => row.id !== mutationSchemas.plan_delete.parse(raw).id,
        );
        break;
      case "profile_save": {
        const { full_name, ...input } = mutationSchemas.profile_save.parse(raw);
        next.user.full_name = full_name;
        next.profile = {
          user_id: data.user.id,
          university_id: data.user.university_id,
          ...input,
          onboarding_completed_at: now,
        };
        break;
      }
      case "preferences_save": {
        const input = mutationSchemas.preferences_save.parse(raw);
        next.preferences = {
          email_enabled: input.email_enabled === "true",
          in_app_enabled: input.in_app_enabled === "true",
          reduce_effects: input.reduce_effects === "true",
        };
        break;
      }
      case "notification_read":
        next.notifications = next.notifications.map((row) =>
          row.id === mutationSchemas.notification_read.parse(raw).id
            ? { ...row, read_at: now }
            : row,
        );
        break;
      case "course_save": {
        const input = mutationSchemas.course_save.parse(raw);
        if (input.id)
          next.courses = next.courses.map((row) =>
            row.id === input.id ? { ...row, ...input } : row,
          );
        else next.courses.push(courseSchema.parse({ ...own, ...input }));
        break;
      }
      case "program_save":
        next.programs.push({ ...own, ...mutationSchemas.program_save.parse(raw) });
        break;
      case "section_save": {
        const { day_of_week, start_minute, end_minute, ...input } =
          mutationSchemas.section_save.parse(raw);
        const record = sectionSchema.parse({
          ...own,
          ...input,
          meetings: [{ day_of_week, start_minute, end_minute }],
        });
        if (input.id)
          next.sections = next.sections.map((row) => (row.id === input.id ? record : row));
        else next.sections.push(record);
        break;
      }
      case "notice_save": {
        const input = mutationSchemas.notice_save.parse(raw);
        if (input.id)
          next.notices = next.notices.map((row) =>
            row.id === input.id
              ? { ...row, ...input, published_at: input.status === "published" ? now : null }
              : row,
          );
        else
          next.notices.push(
            noticeSchema.parse({
              ...own,
              ...input,
              created_at: now,
              published_at: input.status === "published" ? now : null,
            }),
          );
        break;
      }
      case "user_status": {
        const input = mutationSchemas.user_status.parse(raw);
        next.users = next.users.map((row) =>
          row.id === input.id ? { ...row, status: input.status } : row,
        );
        break;
      }
      case "user_role": {
        const input = mutationSchemas.user_role.parse(raw);
        next.users = next.users.map((row) =>
          row.id === input.id ? { ...row, role: input.role } : row,
        );
        break;
      }
      case "catalog_import": {
        const input = mutationSchemas.catalog_import.parse(raw);
        for (const row of input.rows) {
          const existing = next.courses.find((course) => course.code === row.code);
          if (existing) Object.assign(existing, row);
          else next.courses.push(courseSchema.parse({ ...own, ...row, id: crypto.randomUUID() }));
        }
        break;
      }
    }
    context.update(next);
    return { ok: true, message: "Saved in this preview. Changes reset on reload." };
  };
  return { data, act };
}
export function ActionForm({
  kind,
  children,
  label = "Save",
  onSuccess,
  reset = false,
  className = "stack",
  payload,
}: {
  kind: MutationKind;
  children?: ReactNode;
  label?: string;
  onSuccess?: () => void;
  reset?: boolean;
  className?: string;
  payload?: Record<string, unknown>;
}) {
  const act = useContext(ActionContext);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  return (
    <form
      className={className}
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        setPending(true);
        setMessage("");
        const fields = new FormData(form);
        const input: Record<string, unknown> = { ...Object.fromEntries(fields), ...payload };
        if (kind === "section_save")
          for (const side of ["start", "end"]) {
            const time = String(fields.get(side + "_time") || "")
              .split(":")
              .map(Number);
            input[side + "_minute"] = time[0] * 60 + time[1];
          }
        if (typeof input.due_at === "string" && input.due_at)
          input.due_at = new Date(input.due_at + "+06:00").toISOString();
        if (kind === "plan_save")
          for (const key of ["course_ids", "section_ids"])
            if (!payload?.[key]) input[key] = fields.getAll(key);
        try {
          const result = await act(kind, input);
          setOk(result.ok);
          setMessage(result.message);
          if (result.ok) {
            if (reset) form.reset();
            onSuccess?.();
          }
        } catch {
          setOk(false);
          setMessage("Could not save. Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      {children}
      <button type="submit" className="action-button primary" disabled={pending}>
        {pending ? "Saving…" : label}
      </button>
      {message && (
        <p className={ok ? "positive" : "warning"} role="status">
          {message}
        </p>
      )}
    </form>
  );
}
