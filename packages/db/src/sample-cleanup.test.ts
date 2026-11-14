import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fixtureId, ids } from "./index";

let db: PGlite;
let migrations: string;
let catalog: string;
let cleanup: string;
let bootstrap: string;
const student = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const realCourse = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

beforeAll(async () => {
  const folder = new URL("../migrations/", import.meta.url);
  migrations = (
    await Promise.all(
      (await readdir(folder)).sort().map((file) => readFile(new URL(file, folder), "utf8")),
    )
  ).join("\n");
  catalog = await readFile(new URL("../testing/catalog.sql", import.meta.url), "utf8");
  cleanup = await readFile(
    new URL("../maintenance/remove-sample-catalog.sql", import.meta.url),
    "utf8",
  );
  bootstrap = await readFile(new URL("../seed.sql", import.meta.url), "utf8");
});
beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; grant usage on schema public,auth to authenticated;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');
    create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),provider text,identity_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant execute on function auth.uid() to authenticated;
  `);
  await db.exec(migrations);
  await db.exec(catalog);
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'real@g.bracu.ac.bd',now(),$2::jsonb)",
    [student, JSON.stringify({ full_name: "Real student" })],
  );
  await db.query(
    "insert into public.courses(id,university_id,code,title,credits) values($1,$2,'REAL101','Verified course',3)",
    [realCourse, ids.university],
  );
  await db.query(
    "insert into public.deadlines(university_id,owner_user_id,scope,title,due_at) values($1,$2,'personal','Real task','2099-01-01')",
    [ids.university, student],
  );
});
afterEach(async () => db?.close());

async function expectSampleCatalogIntact() {
  expect((await db.query("select * from public.programs")).rows).toHaveLength(1);
  expect((await db.query("select * from public.semesters")).rows).toHaveLength(2);
  expect((await db.query("select * from public.courses")).rows).toHaveLength(5);
  expect((await db.query("select * from public.sections")).rows).toHaveLength(3);
  expect((await db.query("select * from public.prerequisite_groups")).rows).toHaveLength(1);
}
async function expectRefusal(message: RegExp) {
  await expect(db.exec(cleanup)).rejects.toThrow(message);
  await db.exec("rollback");
  await expectSampleCatalogIntact();
}

describe("selective sample catalog cleanup", () => {
  it("removes sample rows idempotently, preserves real data and cannot reseed samples", async () => {
    const snapshot = async () =>
      (
        await db.query(`select jsonb_build_object(
          'auth', (select jsonb_agg(r) from auth.users r),
          'users', (select jsonb_agg(r) from public.users r),
          'profiles', (select jsonb_agg(r) from public.student_profiles r),
          'preferences', (select jsonb_agg(r) from public.notification_preferences r),
          'deadlines', (select jsonb_agg(r) from public.deadlines r),
          'universities', (select jsonb_agg(r) from public.universities r)
        ) as data`)
      ).rows;
    const before = await snapshot();
    await db.exec(cleanup);
    await db.exec(cleanup);
    await db.exec(bootstrap);
    expect(await snapshot()).toEqual(before);
    expect((await db.query("select id from public.courses")).rows).toEqual([{ id: realCourse }]);
    for (const table of [
      "programs",
      "semesters",
      "sections",
      "prerequisite_groups",
      "prerequisite_items",
    ])
      expect((await db.query(`select * from public.${table}`)).rows).toEqual([]);
  });
  it("refuses sample IDs whose content has been edited", async () => {
    await db.query("update public.courses set title='Verified replacement' where id=$1", [
      fixtureId(1),
    ]);
    await expectRefusal(/was modified/);
  });
  it("rolls everything back when a student's completed courses use the sample", async () => {
    await db.query(
      "insert into public.completed_courses(user_id,university_id,course_id) values($1,$2,$3)",
      [student, ids.university, fixtureId(1)],
    );
    await expectRefusal(/foreign key/);
    expect((await db.query("select * from public.completed_courses")).rows).toHaveLength(1);
  });
  it("preserves a student's program selection and rolls back earlier deletes", async () => {
    await db.query("update public.student_profiles set program_id=$1 where user_id=$2", [
      ids.program,
      student,
    ]);
    await expectRefusal(/foreign key/);
  });
  it("preserves enrollments instead of cascading their removal", async () => {
    await db.query(
      "insert into public.enrolled_sections(user_id,university_id,section_id) values($1,$2,$3)",
      [student, ids.university, fixtureId(11)],
    );
    await expectRefusal(/foreign key/);
    expect((await db.query("select * from public.enrolled_sections")).rows).toHaveLength(1);
  });
  it("refuses non-sample children of a seeded prerequisite group", async () => {
    await db.query(
      "insert into public.prerequisite_items(university_id,group_id,required_course_id) values($1,$2,$3)",
      [ids.university, fixtureId(81), realCourse],
    );
    await expectRefusal(/non-sample items/);
    expect((await db.query("select * from public.prerequisite_items")).rows).toHaveLength(2);
  });
  it("protects JSON plan items even when their semester is not a sample", async () => {
    const semester = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    await db.query(
      "insert into public.semesters(id,university_id,name,start_date,end_date) values($1,$2,'Verified semester','2028-01-01','2028-04-30')",
      [semester, ids.university],
    );
    await db.query(
      "insert into public.registration_plans(user_id,university_id,semester_id,name,kind,items) values($1,$2,$3,'Real plan','semester',$4::jsonb)",
      [
        student,
        ids.university,
        semester,
        JSON.stringify([{ course_id: fixtureId(1), section_id: null }]),
      ],
    );
    await expect(db.exec(cleanup)).rejects.toThrow(/saved student plan/);
    await db.exec("rollback");
    expect((await db.query("select * from public.courses")).rows).toHaveLength(5);
    expect((await db.query("select * from public.prerequisite_items")).rows).toHaveLength(1);
    expect((await db.query("select * from public.registration_plans")).rows).toHaveLength(1);
  });
});
