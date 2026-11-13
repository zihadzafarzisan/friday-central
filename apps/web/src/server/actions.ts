"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  signupSchema,
  loginSchema,
  mutationSchemas,
  safeNext,
  canMutateBeforeOnboarding,
  type MutationKind,
  type ActionResult,
} from "@friday/schemas";
import { supabase } from "@/lib/supabase/server";
import { environment } from "@/lib/env";
import { identity, requireIdentity } from "@/server/auth";

export async function authenticate(
  mode: "login" | "signup" | "forgot" | "reset" | "resend",
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const client = await supabase();
  if (!client)
    return {
      ok: false,
      message: "Supabase is not connected yet. You can explore every page in the preview.",
    };
  const input = Object.fromEntries(form);
  if (mode === "signup" || (mode === "login" && input.portal !== "admin"))
    return {
      ok: false,
      message: "Students must continue with their BRACU Google Workspace account.",
    };
  const origin = environment().appUrl;
  if (mode === "forgot" || mode === "resend") {
    const parsed = z.email().safeParse(input.email);
    if (!parsed.success) return { ok: false, message: "Enter a valid email address." };
    if (mode === "forgot")
      await client.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });
    else
      await client.auth.resend({
        type: "signup",
        email: parsed.data,
        options: { emailRedirectTo: `${origin}/auth/callback?next=/app/onboarding` },
      });
    return {
      ok: true,
      message:
        "If this address is eligible, an email has been sent. Check your inbox and spam folder.",
    };
  }
  if (mode === "reset") {
    const result = signupSchema.shape.password.safeParse(input.password);
    if (!result.success) return { ok: false, message: result.error.issues[0].message };
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return { ok: false, message: "Your recovery link is invalid or expired. Request a new one." };
    const { error } = await client.auth.updateUser({ password: result.data });
    if (error)
      return {
        ok: false,
        message: "The password could not be updated. Request a fresh recovery link.",
      };
    await client.auth.signOut();
    redirect("/login?password=updated");
  }
  const result = loginSchema.safeParse(input);
  if (!result.success) return { ok: false, message: "Enter a valid email and password." };
  const { email, password, portal, next } = result.data;
  const { error, data } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user?.email_confirmed_at)
    return {
      ok: false,
      message: "Sign-in failed. Check your credentials and email verification, then try again.",
    };
  const profile = await client.from("users").select("role,status").eq("id", data.user.id).single();
  if (
    profile.error ||
    profile.data?.status !== "active" ||
    (portal === "student") !== (profile.data?.role === "student")
  ) {
    await client.auth.signOut();
    return {
      ok: false,
      message:
        "This account cannot access this portal. Use the appropriate login page or contact an administrator.",
    };
  }
  const destination = safeNext(next, portal === "admin" ? "/admin" : "/app");
  redirect(
    portal === "admin" && !destination.startsWith("/admin")
      ? "/admin"
      : portal === "student" && !destination.startsWith("/app")
        ? "/app"
        : destination,
  );
}
export async function signOut() {
  const client = await supabase();
  if (client) await client.auth.signOut();
  redirect("/");
}

export async function mutate(kind: MutationKind, raw: unknown): Promise<ActionResult> {
  if (!Object.hasOwn(mutationSchemas, kind)) return { ok: false, message: "Unknown action." };
  const parsed = mutationSchemas[kind].safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const actor = await identity();
  if (!actor) return { ok: false, message: "Your session is unavailable. Sign in again." };
  const adminKinds = [
    "course_save",
    "program_save",
    "section_save",
    "notice_save",
    "user_status",
    "user_role",
    "catalog_import",
    "university_deadline_update",
  ];
  const inputScope =
    typeof raw === "object" && raw !== null && "scope" in raw ? raw.scope : "personal";
  const admin =
    adminKinds.includes(kind) || (kind === "deadline_create" && inputScope === "university");
  const { client, user } = await requireIdentity(
    admin ? "admin" : "student",
    admin ? "/admin" : "/app",
    !canMutateBeforeOnboarding(kind),
  );
  const tenant = user.university_id;
  const own = { university_id: tenant, user_id: user.id };
  const check = async (promise: PromiseLike<{ error: unknown }>) => {
    const result = await promise;
    if (result.error) throw new Error("Save failed. Check the values and try again.");
  };
  try {
    switch (kind) {
      case "connect_data_import": {
        const { entries } = mutationSchemas.connect_data_import.parse(raw);
        await check(
          client.from("connect_data_records").upsert(
            entries.map((entry) => ({ ...entry, ...own })),
            { onConflict: "user_id,endpoint" },
          ),
        );
        break;
      }
      case "connect_data_delete": {
        const { endpoint } = mutationSchemas.connect_data_delete.parse(raw);
        await check(
          client
            .from("connect_data_records")
            .delete()
            .eq("user_id", user.id)
            .eq("university_id", tenant)
            .eq("endpoint", endpoint),
        );
        break;
      }
      case "connect_schedule_import": {
        const { courses } = mutationSchemas.connect_schedule_import.parse(raw);
        if (new TextEncoder().encode(JSON.stringify(courses)).byteLength > 262144)
          return { ok: false, message: "Schedule JSON must be 256 KB or smaller." };
        await check(
          client.from("connect_schedule_imports").upsert(
            {
              ...own,
              semester_session_id: courses[0].semesterSessionId,
              courses,
            },
            { onConflict: "user_id,semester_session_id" },
          ),
        );
        break;
      }
      case "connect_schedule_delete": {
        const { semester_session_id } = mutationSchemas.connect_schedule_delete.parse(raw);
        await check(
          client
            .from("connect_schedule_imports")
            .delete()
            .eq("user_id", user.id)
            .eq("university_id", tenant)
            .eq("semester_session_id", semester_session_id),
        );
        break;
      }
      case "deadline_create": {
        const input = mutationSchemas.deadline_create.parse(raw);
        if (new Date(input.due_at).getTime() < Date.now() - 60000)
          return { ok: false, message: "Choose a future due time." };
        await check(
          client.from("deadlines").insert({
            ...input,
            university_id: tenant,
            owner_user_id: input.scope === "personal" ? user.id : null,
          }),
        );
        break;
      }
      case "deadline_update": {
        const { id, ...input } = mutationSchemas.deadline_update.parse(raw);
        await check(
          client
            .from("deadlines")
            .update(input)
            .eq("id", id)
            .eq("university_id", tenant)
            .eq("owner_user_id", user.id)
            .eq("scope", "personal"),
        );
        break;
      }
      case "university_deadline_update": {
        const { id, ...input } = mutationSchemas.university_deadline_update.parse(raw);
        await check(
          client
            .from("deadlines")
            .update(input)
            .eq("id", id)
            .eq("university_id", tenant)
            .eq("scope", "university"),
        );
        break;
      }
      case "deadline_status": {
        const input = mutationSchemas.deadline_status.parse(raw);
        await check(
          client
            .from("deadlines")
            .update({ status: input.status })
            .eq("id", input.id)
            .eq("university_id", tenant)
            .eq("owner_user_id", user.id)
            .eq("scope", "personal"),
        );
        break;
      }
      case "deadline_delete": {
        const input = mutationSchemas.deadline_delete.parse(raw);
        await check(
          client
            .from("deadlines")
            .delete()
            .eq("id", input.id)
            .eq("university_id", tenant)
            .eq("owner_user_id", user.id)
            .eq("scope", "personal"),
        );
        break;
      }
      case "notice_read": {
        const input = mutationSchemas.notice_read.parse(raw);
        if (input.read === "true")
          await check(
            client
              .from("notice_reads")
              .upsert(
                { ...own, notice_id: input.id },
                { onConflict: "user_id,notice_id", ignoreDuplicates: true },
              ),
          );
        else
          await check(
            client
              .from("notice_reads")
              .delete()
              .eq("user_id", user.id)
              .eq("university_id", tenant)
              .eq("notice_id", input.id),
          );
        break;
      }
      case "enrollment_add":
        await check(
          client
            .from("enrolled_sections")
            .upsert(
              { ...own, ...mutationSchemas.enrollment_add.parse(raw) },
              { onConflict: "user_id,section_id" },
            ),
        );
        break;
      case "enrollment_remove":
        await check(
          client
            .from("enrolled_sections")
            .delete()
            .eq("id", mutationSchemas.enrollment_remove.parse(raw).id)
            .eq("user_id", user.id)
            .eq("university_id", tenant),
        );
        break;
      case "completed_add":
        await check(
          client
            .from("completed_courses")
            .upsert(
              { ...own, ...mutationSchemas.completed_add.parse(raw), status: "completed" },
              { onConflict: "user_id,course_id" },
            ),
        );
        break;
      case "completed_remove":
        await check(
          client
            .from("completed_courses")
            .delete()
            .eq("id", mutationSchemas.completed_remove.parse(raw).id)
            .eq("user_id", user.id)
            .eq("university_id", tenant),
        );
        break;
      case "attendance_log":
        await check(
          client
            .from("attendance_records")
            .upsert(
              { ...own, ...mutationSchemas.attendance_log.parse(raw) },
              { onConflict: "enrollment_id,class_date" },
            ),
        );
        break;
      case "plan_save": {
        const input = mutationSchemas.plan_save.parse(raw);
        await check(
          client.rpc("save_plan", {
            plan_name: input.name,
            term_id: input.semester_id,
            plan_kind: input.kind,
            course_ids: input.course_ids,
            section_ids: input.section_ids,
          }),
        );
        break;
      }
      case "plan_delete":
        await check(
          client
            .from("registration_plans")
            .delete()
            .eq("id", mutationSchemas.plan_delete.parse(raw).id)
            .eq("user_id", user.id)
            .eq("university_id", tenant),
        );
        break;
      case "profile_save": {
        const { full_name, ...input } = mutationSchemas.profile_save.parse(raw);
        await check(
          client.from("users").update({ full_name }).eq("id", user.id).eq("university_id", tenant),
        );
        await check(
          client
            .from("student_profiles")
            .upsert({ ...own, ...input, onboarding_completed_at: new Date().toISOString() }),
        );
        break;
      }
      case "preferences_save": {
        const input = mutationSchemas.preferences_save.parse(raw);
        await check(
          client.from("notification_preferences").upsert({
            ...own,
            email_enabled: input.email_enabled === "true",
            in_app_enabled: input.in_app_enabled === "true",
            reduce_effects: input.reduce_effects === "true",
          }),
        );
        break;
      }
      case "notification_read":
        await check(
          client
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("id", mutationSchemas.notification_read.parse(raw).id)
            .eq("user_id", user.id)
            .eq("university_id", tenant),
        );
        break;
      case "course_save": {
        const input = mutationSchemas.course_save.parse(raw);
        await check(
          input.id
            ? client.from("courses").update(input).eq("id", input.id).eq("university_id", tenant)
            : client.from("courses").insert({ ...input, university_id: tenant }),
        );
        break;
      }
      case "program_save":
        await check(
          client
            .from("programs")
            .insert({ ...mutationSchemas.program_save.parse(raw), university_id: tenant }),
        );
        break;
      case "section_save": {
        const { id, day_of_week, start_minute, end_minute, ...input } =
          mutationSchemas.section_save.parse(raw);
        const record = {
          ...input,
          university_id: tenant,
          meetings: [{ day_of_week, start_minute, end_minute }],
          seats_updated_at: new Date().toISOString(),
        };
        await check(
          id
            ? client.from("sections").update(record).eq("id", id).eq("university_id", tenant)
            : client.from("sections").insert(record),
        );
        break;
      }
      case "notice_save": {
        const input = mutationSchemas.notice_save.parse(raw);
        const data = {
          ...input,
          published_at: input.status === "published" ? new Date().toISOString() : null,
        };
        await check(
          input.id
            ? client.from("notices").update(data).eq("id", input.id).eq("university_id", tenant)
            : client.from("notices").insert({ ...data, university_id: tenant }),
        );
        break;
      }
      case "user_status": {
        const input = mutationSchemas.user_status.parse(raw);
        await check(client.rpc("manage_user", { target_id: input.id, new_status: input.status }));
        break;
      }
      case "user_role": {
        const input = mutationSchemas.user_role.parse(raw);
        await check(client.rpc("manage_user", { target_id: input.id, new_role: input.role }));
        break;
      }
      case "catalog_import":
        await check(
          client.rpc("import_courses", {
            input_rows: mutationSchemas.catalog_import.parse(raw).rows,
          }),
        );
        break;
    }
    revalidatePath("/app", "layout");
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Saved." };
  } catch {
    return {
      ok: false,
      message: "Could not save. Check your inputs, permissions, and connection, then retry.",
    };
  }
}
