import { PGlite } from "@electric-sql/pglite";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { readFile, readdir } from "node:fs/promises";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
let db: PGlite;
let sql: string;
const student = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const unlinked = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
beforeAll(async () => {
  await promisify(execFile)(process.execPath, [
    fileURLToPath(new URL("../../../scripts/prepare-supabase.mjs", import.meta.url)),
  ]);
  sql = await readFile(new URL("../../../supabase/setup-friday.sql", import.meta.url), "utf8");
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; grant usage on schema public,auth to authenticated;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');
    create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),provider text,identity_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant execute on function auth.uid() to authenticated;
    alter default privileges in schema public grant all on tables to anon,authenticated;
  `);
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'existing@g.bracu.ac.bd',now(),$3::jsonb),($2,'unlinked@g.bracu.ac.bd',now(),$3::jsonb)",
    [student, unlinked, JSON.stringify({ full_name: "Existing student", role: "super_admin" })],
  );
  await db.query(
    "insert into auth.identities(user_id,provider,identity_data) values($1,'google',$2::jsonb)",
    [
      student,
      JSON.stringify({
        email: "existing@g.bracu.ac.bd",
        email_verified: true,
        custom_claims: { hd: "g.bracu.ac.bd" },
      }),
    ],
  );
  await db.exec(sql);
}, 60000);
afterAll(async () => {
  await db?.close();
});
describe("SQL Editor fresh setup", () => {
  it("includes every migration and creates private profiles without sample academic records", async () => {
    for (const file of (await readdir(new URL("../migrations/", import.meta.url))).filter((name) =>
      name.endsWith(".sql"),
    ))
      expect(sql).toContain(
        await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8"),
      );
    expect((await db.query("select * from public.universities")).rows).toHaveLength(1);
    for (const table of ["programs", "semesters", "courses", "sections"])
      expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(0);
    const users = await db.query<{ role: string }>("select role from public.users");
    expect(users.rows).toHaveLength(2);
    expect(users.rows.every((row) => row.role === "student")).toBe(true);
    expect(
      (await db.query("select student_id from public.student_profiles where student_id is null"))
        .rows,
    ).toHaveLength(2);
  });
  it("enforces Workspace identity and denies dangerous inherited default privileges", async () => {
    await db.exec("set role authenticated");
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [student]);
      expect((await db.query("select * from public.student_profiles")).rows).toHaveLength(1);
      await expect(db.exec("truncate public.connect_schedule_imports")).rejects.toThrow();
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [unlinked]);
      expect((await db.query("select * from public.student_profiles")).rows).toHaveLength(0);
    } finally {
      await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");
    }
    await db.exec("set role anon");
    try {
      await expect(db.exec("select * from public.connect_schedule_imports")).rejects.toThrow();
      await expect(db.exec("truncate public.connect_schedule_imports")).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  });
  it("refuses to overwrite an existing installation and leaves its records intact", async () => {
    await expect(db.exec(sql)).rejects.toThrow("already exists");
    await db.exec("rollback");
    expect((await db.query("select * from public.users")).rows).toHaveLength(2);
    expect((await db.query("select * from public.universities")).rows).toHaveLength(1);
  });
});
