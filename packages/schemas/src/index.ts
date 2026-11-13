import { z } from "zod";
import { connectScheduleSchema, type ConnectImportRecord } from "./connect";
import { connectDataBatchSchema, type ConnectDataRecord } from "./connect-data";
export * from "./connect";
export * from "./google-auth";
export * from "./connect-data";
export * from "./student-setup";

export const id = z.uuid();
export const roleSchema = z.enum(["student", "admin", "super_admin"]);
export type Role = z.infer<typeof roleSchema>;
export const pilot = {
  code: "bracu",
  name: "BRAC University",
  domain: "g.bracu.ac.bd",
  timezone: "Asia/Dhaka",
} as const;
export function isStudentEmail(email: string, domains: string[] = [pilot.domain]) {
  const parsed = z.email().safeParse(email.trim());
  return parsed.success && domains.includes(parsed.data.split("@")[1].toLowerCase());
}
export function safeNext(value: unknown, fallback = "/app") {
  return typeof value === "string" &&
    /^\/(app|admin)(\/|\?|$)/.test(value) &&
    !/[\\\r\n]/.test(value)
    ? value
    : fallback;
}
export const signupSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z
    .email()
    .trim()
    .toLowerCase()
    .refine((value) => isStudentEmail(value), "Use your BRACU student email (@g.bracu.ac.bd)."),
  student_id: z
    .string()
    .trim()
    .regex(/^\d{8}$/, "Enter your 8-digit student ID."),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, "Include an uppercase letter.")
    .regex(/[a-z]/, "Include a lowercase letter.")
    .regex(/\d/, "Include a number."),
});
export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
  next: z.string().optional(),
  portal: z.enum(["student", "admin"]).default("student"),
});
export const meetingSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    start_minute: z.number().int().min(0).max(1439),
    end_minute: z.number().int().min(1).max(1440),
  })
  .refine((value) => value.end_minute > value.start_minute, "Meeting end must follow start.");
export type Meeting = z.infer<typeof meetingSchema>;
export const courseSchema = z.object({
  id,
  university_id: id,
  code: z.string(),
  title: z.string(),
  credits: z.number().positive(),
  is_active: z.boolean().default(true),
  prerequisite_groups: z.array(z.array(id)).default([]),
});
export type Course = z.infer<typeof courseSchema>;
export const sectionSchema = z.object({
  id,
  university_id: id,
  course_id: id,
  semester_id: id,
  section_number: z.string(),
  faculty: z.string().default("TBA"),
  room: z.string().default("TBA"),
  capacity: z.number().int().positive(),
  seats_available: z.number().int().nonnegative(),
  meetings: z.array(meetingSchema).default([]),
  seats_updated_at: z.string().nullable().default(null),
});
export type Section = z.infer<typeof sectionSchema>;
export const programSchema = z.object({
  id,
  university_id: id,
  code: z.string(),
  name: z.string(),
  credits_required: z.number().positive(),
});
export const semesterSchema = z.object({
  id,
  university_id: id,
  name: z.string(),
  start_date: z.string(),
  end_date: z.string(),
});
export const userSchema = z.object({
  id,
  university_id: id,
  full_name: z.string(),
  email: z.string(),
  role: roleSchema,
  status: z.enum(["active", "deactivated"]),
  created_at: z.string().optional(),
});
export type AppUser = z.infer<typeof userSchema>;
export const profileSchema = z.object({
  user_id: id,
  university_id: id,
  student_id: z.string().nullable(),
  program_id: id.nullable(),
  semester_id: id.nullable(),
  onboarding_completed_at: z.string().nullable(),
});
export const deadlineSchema = z.object({
  id,
  university_id: id,
  owner_user_id: id.nullable(),
  scope: z.enum(["personal", "university"]),
  title: z.string(),
  description: z.string().default(""),
  due_at: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["open", "done"]),
  notice_id: id.nullable().default(null),
});
export type Deadline = z.infer<typeof deadlineSchema>;
export const noticeSchema = z.object({
  id,
  university_id: id,
  title: z.string(),
  body: z.string(),
  category: z.string(),
  importance: z.enum(["normal", "high", "emergency"]),
  status: z.enum(["draft", "review", "published", "archived"]),
  created_at: z.string(),
  published_at: z.string().nullable(),
});
export type Notice = z.infer<typeof noticeSchema>;
export const enrollmentSchema = z.object({
  id,
  user_id: id,
  university_id: id,
  section_id: id,
  status: z.enum(["enrolled", "withdrawn"]),
});
export const completedSchema = z.object({
  id,
  user_id: id,
  university_id: id,
  course_id: id,
  status: z.enum(["completed", "failed", "withdrawn"]),
  grade: z.string().nullable().default(null),
});
export const attendanceSchema = z.object({
  id,
  user_id: id,
  university_id: id,
  enrollment_id: id,
  class_date: z.string(),
  status: z.enum(["attended", "missed", "cancelled"]),
});
export const planSchema = z.object({
  id,
  user_id: id,
  university_id: id,
  semester_id: id,
  name: z.string(),
  kind: z.enum(["registration", "semester"]),
  items: z.array(z.object({ course_id: id, section_id: id.nullable() })).default([]),
});
export type Plan = z.infer<typeof planSchema>;
export const notificationSchema = z.object({
  id,
  user_id: id,
  university_id: id,
  title: z.string(),
  body: z.string(),
  link: z.string(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});
export const preferencesSchema = z.object({
  email_enabled: z.boolean().default(true),
  in_app_enabled: z.boolean().default(true),
  reduce_effects: z.boolean().default(false),
});
export const auditSchema = z.object({
  id,
  university_id: id,
  actor_id: id.nullable(),
  action: z.string(),
  entity_type: z.string(),
  created_at: z.string(),
});

export interface PortalData {
  connectData: ConnectDataRecord[];
  connectImports: ConnectImportRecord[];
  user: AppUser;
  profile: z.infer<typeof profileSchema> | null;
  programs: z.infer<typeof programSchema>[];
  semesters: z.infer<typeof semesterSchema>[];
  courses: Course[];
  sections: Section[];
  deadlines: Deadline[];
  notices: Notice[];
  noticeReads: string[];
  enrollments: z.infer<typeof enrollmentSchema>[];
  completed: z.infer<typeof completedSchema>[];
  attendance: z.infer<typeof attendanceSchema>[];
  plans: Plan[];
  notifications: z.infer<typeof notificationSchema>[];
  preferences: z.infer<typeof preferencesSchema>;
  users: AppUser[];
  audit: z.infer<typeof auditSchema>[];
}

const text = z.string().trim().min(1).max(200);
const check = z.enum(["true", "false"]);
export const mutationSchemas = {
  connect_data_import: z.object({ entries: connectDataBatchSchema }),
  connect_data_delete: z.object({ endpoint: z.string().min(1).max(1024) }),
  connect_schedule_import: z.object({ courses: connectScheduleSchema }),
  connect_schedule_delete: z.object({
    semester_session_id: z.number().int().positive().max(2147483647),
  }),
  deadline_create: z.object({
    title: text,
    description: z.string().trim().max(2000).default(""),
    due_at: z.iso.datetime({ offset: true }),
    priority: z.enum(["low", "medium", "high"]),
    scope: z.enum(["personal", "university"]).default("personal"),
  }),
  deadline_update: z.object({
    id,
    title: text,
    description: z.string().trim().max(2000).default(""),
    due_at: z.iso.datetime({ offset: true }),
    priority: z.enum(["low", "medium", "high"]),
  }),
  deadline_status: z.object({ id, status: z.enum(["open", "done"]) }),
  university_deadline_update: z.object({
    id,
    title: text,
    description: z.string().trim().max(2000).default(""),
    due_at: z.iso.datetime({ offset: true }),
    priority: z.enum(["low", "medium", "high"]),
  }),
  deadline_delete: z.object({ id }),
  notice_read: z.object({ id, read: check }),
  enrollment_add: z.object({ section_id: id }),
  enrollment_remove: z.object({ id }),
  completed_add: z.object({ course_id: id, grade: z.string().max(8).optional() }),
  completed_remove: z.object({ id }),
  attendance_log: z.object({
    enrollment_id: id,
    class_date: z.iso.date(),
    status: z.enum(["attended", "missed", "cancelled"]),
  }),
  plan_save: z.object({
    name: text,
    semester_id: id,
    kind: z.enum(["registration", "semester"]),
    course_ids: z.array(id).min(1).max(12),
    section_ids: z.array(id).max(12).default([]),
  }),
  plan_delete: z.object({ id }),
  profile_save: z.object({
    full_name: z.string().trim().min(2).max(100),
    student_id: z.string().regex(/^\d{8}$/),
    program_id: id,
    semester_id: id,
  }),
  preferences_save: z.object({
    email_enabled: check,
    in_app_enabled: check,
    reduce_effects: check,
  }),
  notification_read: z.object({ id }),
  course_save: z.object({
    id: id.optional(),
    code: z.string().trim().min(2).max(20),
    title: text,
    credits: z.coerce.number().min(0.5).max(12),
  }),
  program_save: z.object({
    code: z.string().trim().min(2).max(20),
    name: text,
    credits_required: z.coerce.number().int().min(1).max(300),
  }),
  section_save: z
    .object({
      id: id.optional(),
      course_id: id,
      semester_id: id,
      section_number: z.string().min(1).max(10),
      faculty: z.string().max(40),
      room: z.string().max(80),
      capacity: z.coerce.number().int().min(1).max(500),
      seats_available: z.coerce.number().int().min(0).max(500),
      day_of_week: z.coerce.number().int().min(0).max(6),
      start_minute: z.coerce.number().int().min(0).max(1439),
      end_minute: z.coerce.number().int().min(1).max(1440),
    })
    .refine(
      (value) => value.seats_available <= value.capacity && value.end_minute > value.start_minute,
      "Check seat capacity and meeting times.",
    ),
  notice_save: z.object({
    id: id.optional(),
    title: text,
    body: z.string().trim().min(1).max(20000),
    category: z.enum([
      "academic",
      "registration",
      "exam",
      "tuition",
      "administrative",
      "holiday",
      "emergency",
    ]),
    importance: z.enum(["normal", "high", "emergency"]),
    status: z.enum(["draft", "review", "published", "archived"]),
  }),
  user_status: z.object({ id, status: z.enum(["active", "deactivated"]) }),
  user_role: z.object({ id, role: roleSchema }),
  catalog_import: z.object({
    rows: z
      .array(
        z.object({
          code: z.string().trim().min(2).max(20),
          title: text,
          credits: z.coerce.number().min(0.5).max(12),
        }),
      )
      .min(1)
      .max(200),
  }),
};
export type MutationKind = keyof typeof mutationSchemas;
export interface ActionResult {
  ok: boolean;
  message: string;
  fields?: Record<string, string[]>;
}

export const connectRowSchema = z.object({
  courseCode: z.string().max(40),
  courseName: z.string().max(500).nullish(),
  sectionName: z.union([z.string(), z.number()]).nullish(),
  faculties: z.string().nullish(),
  labFaculties: z.string().nullish(),
  roomName: z.string().nullish(),
  sectionType: z.string().nullish(),
  capacity: z.number().nullish(),
  consumedSeat: z.number().nullish(),
  sectionSchedule: z
    .object({
      classSchedules: z
        .array(z.object({ day: z.string(), startTime: z.string(), endTime: z.string() }))
        .optional(),
      midExamDate: z.string().nullish(),
      midExamStartTime: z.string().nullish(),
      midExamEndTime: z.string().nullish(),
      finalExamDate: z.string().nullish(),
      finalExamStartTime: z.string().nullish(),
      finalExamEndTime: z.string().nullish(),
    })
    .nullish(),
  labSchedules: z
    .array(z.object({ day: z.string(), startTime: z.string(), endTime: z.string() }))
    .nullish(),
});
export type ConnectRow = z.infer<typeof connectRowSchema>;
