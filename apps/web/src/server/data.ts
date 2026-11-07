import "server-only";
import { z } from "zod";
import {
  userSchema,
  profileSchema,
  programSchema,
  semesterSchema,
  courseSchema,
  sectionSchema,
  deadlineSchema,
  noticeSchema,
  enrollmentSchema,
  completedSchema,
  attendanceSchema,
  planSchema,
  notificationSchema,
  preferencesSchema,
  auditSchema,
  type PortalData,
} from "@friday/schemas";
import { requireIdentity } from "@/server/auth";
import { headers } from "next/headers";
export async function portalData(admin = false, onboarding = true): Promise<PortalData> {
  const path = (await headers()).get("x-friday-path") || (admin ? "/admin" : "/app");
  const { client, user, profile } = await requireIdentity(
    admin ? "admin" : "student",
    path,
    onboarding,
  );
  const ownerTables = new Set([
    "completed_courses",
    "enrolled_sections",
    "attendance_records",
    "registration_plans",
    "notifications",
    "notification_preferences",
    "notice_reads",
  ]);
  const tables = [
    "programs",
    "semesters",
    "courses",
    "sections",
    "notices",
    "deadlines",
    "prerequisite_groups",
    "prerequisite_items",
    ...(admin ? ["users", "audit_logs"] : [...ownerTables]),
  ];
  const entries = await Promise.all(
    tables.map(async (table) => {
      let query = client.from(table).select("*").eq("university_id", user.university_id);
      if (ownerTables.has(table)) query = query.eq("user_id", user.id);
      const { data, error } = await query.limit(2000);
      if (error)
        throw new Error(
          "Records could not be loaded. Check your connection and database setup, then retry.",
        );
      return [table, data ?? []] as const;
    }),
  );
  const rows = Object.fromEntries(entries) as Record<string, unknown[]>;
  const groups = z
    .array(z.object({ id: z.string(), course_id: z.string() }))
    .parse(rows.prerequisite_groups);
  const items = z
    .array(z.object({ group_id: z.string(), required_course_id: z.string() }))
    .parse(rows.prerequisite_items);
  const courses = courseSchema
    .array()
    .parse(rows.courses)
    .map((course) => ({
      ...course,
      prerequisite_groups: groups
        .filter((group) => group.course_id === course.id)
        .map((group) =>
          items.filter((item) => item.group_id === group.id).map((item) => item.required_course_id),
        ),
    }));
  return {
    user: userSchema.parse(user),
    profile: profile ? profileSchema.parse(profile) : null,
    programs: programSchema.array().parse(rows.programs),
    semesters: semesterSchema.array().parse(rows.semesters),
    courses,
    sections: sectionSchema.array().parse(rows.sections),
    deadlines: deadlineSchema.array().parse(rows.deadlines),
    notices: noticeSchema.array().parse(rows.notices),
    noticeReads: z
      .array(z.object({ notice_id: z.string() }))
      .parse(rows.notice_reads ?? [])
      .map((read) => read.notice_id),
    enrollments: enrollmentSchema.array().parse(rows.enrolled_sections ?? []),
    completed: completedSchema.array().parse(rows.completed_courses ?? []),
    attendance: attendanceSchema.array().parse(rows.attendance_records ?? []),
    plans: planSchema.array().parse(rows.registration_plans ?? []),
    notifications: notificationSchema.array().parse(rows.notifications ?? []),
    preferences: preferencesSchema.parse(rows.notification_preferences?.[0] ?? {}),
    users: userSchema.array().parse(rows.users ?? []),
    audit: auditSchema.array().parse(rows.audit_logs ?? []),
  };
}
