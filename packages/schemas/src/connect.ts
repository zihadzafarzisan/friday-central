import { z } from "zod";

export const CONNECT_IMPORT_MAX_BYTES = 262144;
export const CONNECT_IMPORT_STORAGE_KEY = "friday.connect.schedule.v1";
const externalId = z.number().int().positive().max(2147483647);
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/);
const date = z.iso.date().nullish();
const examTime = clock.nullish();
const days = z.enum(["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]);
const schedule = z
  .object({
    classStartDate: date,
    classEndDate: date,
    classSchedules: z
      .array(
        z
          .object({
            day: days,
            startTime: clock,
            endTime: clock,
          })
          .refine((row) => row.endTime > row.startTime, "Class end must follow its start."),
      )
      .max(14)
      .default([]),
    midExamDate: date,
    midExamStartTime: examTime,
    midExamEndTime: examTime,
    finalExamDate: date,
    finalExamStartTime: examTime,
    finalExamEndTime: examTime,
  })
  .superRefine((row, ctx) => {
    if (row.classStartDate && row.classEndDate && row.classEndDate < row.classStartDate)
      ctx.addIssue({ code: "custom", message: "Class end date precedes its start." });
    for (const [start, end] of [
      [row.midExamStartTime, row.midExamEndTime],
      [row.finalExamStartTime, row.finalExamEndTime],
    ])
      if (start && end && end <= start)
        ctx.addIssue({ code: "custom", message: "Exam end must follow its start." });
  });
const scheduleInput = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}, schedule);

// Deliberately allowlist fields: student identifiers, profile details and credentials
// in a pasted response never become part of a saved schedule.
export const connectCourseSchema = z.object({
  courseId: externalId,
  courseCode: z.string().trim().min(1).max(40),
  courseCredit: z.number().min(0).max(12),
  courseType: z.enum(["THEORY", "LAB"]),
  sectionId: externalId,
  sectionName: z.string().trim().min(1).max(40),
  parentSectionId: externalId.nullish(),
  faculties: z.string().trim().max(200).nullish(),
  roomName: z.string().trim().max(200).nullish(),
  capacity: z.number().int().min(0).max(10000).nullish(),
  consumedSeat: z.number().int().min(0).max(10000).nullish(),
  semesterSessionId: externalId,
  sectionSchedule: scheduleInput,
});
export type ConnectCourse = z.infer<typeof connectCourseSchema>;
export const connectScheduleSchema = z
  .array(connectCourseSchema)
  .min(1, "Add at least one course.")
  .max(100)
  .superRefine((courses, ctx) => {
    if (new Set(courses.map((row) => row.semesterSessionId)).size !== 1)
      ctx.addIssue({ code: "custom", message: "Import one semester at a time." });
    if (new Set(courses.map((row) => row.sectionId)).size !== courses.length)
      ctx.addIssue({ code: "custom", message: "Duplicate section IDs. Import each section once." });
    if (courses.some((row) => row.parentSectionId === row.sectionId))
      ctx.addIssue({ code: "custom", message: "A lab cannot be its own parent section." });
  });
export const connectImportRecordSchema = z.object({
  semester_session_id: externalId,
  courses: connectScheduleSchema,
  imported_at: z.iso.datetime({ offset: true }),
});
export type ConnectImportRecord = z.infer<typeof connectImportRecordSchema>;

export function parseConnectSchedule(text: string): ConnectCourse[] {
  if (new TextEncoder().encode(text).byteLength > CONNECT_IMPORT_MAX_BYTES)
    throw new Error("Schedule JSON must be 256 KB or smaller.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Enter a valid JSON array from Connect's schedules response.");
  }
  const result = connectScheduleSchema.safeParse(raw);
  if (!result.success)
    throw new Error(result.error.issues[0]?.message || "Invalid Connect schedule.");
  return result.data;
}
