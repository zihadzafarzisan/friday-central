import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { ids, fixtureId } from "./index";
let db: PGlite;
const other = fixtureId(900);
const admin = fixtureId(901);
const superAdmin = fixtureId(902);
const uni2 = fixtureId(999);
async function asUser<T>(user: string, run: () => Promise<T>) {
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${user}',false);`,
  );
  try {
    return await run();
  } finally {
    await db.exec("reset role;select set_config('request.jwt.claim.sub','',false);");
  }
}
async function addUser(
  id: string,
  email: string,
  studentId: string,
  role = "student",
  university = ids.university,
) {
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data) values($1,$2,now(),$3::jsonb,$4::jsonb)",
    [
      id,
      email,
      JSON.stringify({ full_name: "Test account", student_id: studentId, role: "super_admin" }),
      JSON.stringify(role === "student" ? {} : { role, university_id: university }),
    ],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create schema auth;grant usage on schema public,auth to authenticated;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant execute on function auth.uid() to authenticated;`,
  );
  const folder = new URL("../migrations/", import.meta.url);
  for (const file of (await readdir(folder)).sort())
    await db.exec(await readFile(new URL(file, folder), "utf8"));
  const seed = await readFile(new URL("../seed.sql", import.meta.url), "utf8");
  await db.exec(seed);
  await db.exec(seed);
  await addUser(ids.user, "first@g.bracu.ac.bd", "26101001");
  await addUser(other, "second@g.bracu.ac.bd", "26101002");
  await addUser(admin, "admin@bracu.ac.bd", "26101003", "admin");
  await addUser(superAdmin, "operator@bracu.ac.bd", "26101004", "super_admin");
  await db.query(
    "insert into public.universities(id,name,code,student_domains) values($1,'Other university','other',array['other.edu'])",
    [uni2],
  );
  await db.query(
    "insert into public.courses(id,university_id,code,title,credits) values($1,$2,'OTHER101','Other tenant',3)",
    [fixtureId(998), uni2],
  );
  await db.query(
    "insert into public.deadlines(university_id,owner_user_id,scope,title,due_at) values($1,$2,'personal','Private task','2099-01-01'),($1,$3,'personal','Other private task','2099-01-01'),($1,null,'university','University date','2099-01-01')",
    [ids.university, ids.user, other],
  );
  await db.query(
    "insert into public.notices(university_id,title,body,category,status) values($1,'Draft notice','Private draft','academic','draft'),($1,'Published notice','Public to tenant','academic','published')",
    [ids.university],
  );
}, 60000);
afterAll(async () => {
  await db?.close();
});
describe("actual PostgreSQL migrations and policies", () => {
  it("applies the migration and seed twice without duplicate catalog records", async () => {
    const result = await db.query<{ count: number }>(
      "select count(*)::int as count from public.courses",
    );
    expect(result.rows[0].count).toBe(5);
  });
  it("ignores a student-supplied role in signup metadata", async () => {
    const result = await db.query<{ role: string }>("select role from public.users where id=$1", [
      ids.user,
    ]);
    expect(result.rows[0].role).toBe("student");
  });
  it("rejects unsupported signup domains in the auth trigger", async () => {
    await expect(addUser(fixtureId(903), "attacker@gmail.com", "26101009")).rejects.toThrow();
  });
  it("denies anonymous catalog access", async () => {
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from public.courses")).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  });
  it("filters catalog by tenant even without an application query filter", async () => {
    await asUser(ids.user, async () => {
      const result = await db.query<{ code: string }>("select code from public.courses");
      expect(result.rows).toHaveLength(4);
      expect(result.rows.some((row) => row.code === "OTHER101")).toBe(false);
    });
  });
  it("hides other students' deadlines and administrator drafts", async () => {
    await asUser(ids.user, async () => {
      const deadlines = await db.query<{ title: string }>("select title from public.deadlines");
      expect(deadlines.rows.map((row) => row.title).sort()).toEqual([
        "Private task",
        "University date",
      ]);
      const notices = await db.query("select * from public.notices");
      expect(notices.rows).toHaveLength(1);
    });
  });
  it("prevents role escalation through direct column updates and RPC", async () => {
    await asUser(ids.user, async () => {
      await expect(
        db.query("update public.users set role='super_admin' where id=$1", [ids.user]),
      ).rejects.toThrow();
      await expect(
        db.query("select public.manage_user($1,null,'super_admin')", [other]),
      ).rejects.toThrow();
    });
  });
  it("prevents personal-to-university deadline scope changes", async () => {
    await asUser(ids.user, async () => {
      await expect(
        db.query(
          "update public.deadlines set scope='university',owner_user_id=null where title='Private task'",
        ),
      ).rejects.toThrow();
    });
  });
  it("prevents cross-tenant catalog references in owned records", async () => {
    await asUser(ids.user, async () => {
      await expect(
        db.query(
          "insert into public.completed_courses(user_id,university_id,course_id) values($1,$2,$3)",
          [ids.user, ids.university, fixtureId(998)],
        ),
      ).rejects.toThrow();
    });
  });
  it("does not let administrators read personal deadlines", async () => {
    await asUser(admin, async () => {
      const result = await db.query("select * from public.deadlines where scope='personal'");
      expect(result.rows).toHaveLength(0);
    });
  });
  it("creates atomic append-only audit entries on admin catalog changes", async () => {
    await asUser(admin, async () => {
      await db.query("update public.courses set title='Updated title' where code='ENG102'");
      const audit = await db.query("select * from public.audit_logs where entity_type='courses'");
      expect(audit.rows.length).toBeGreaterThan(0);
      await expect(db.query("delete from public.audit_logs")).rejects.toThrow();
    });
  });
  it("restricts role changes to a super administrator", async () => {
    await asUser(admin, async () => {
      await expect(
        db.query("select public.manage_user($1,null,'admin')", [other]),
      ).rejects.toThrow();
    });
    await asUser(superAdmin, async () => {
      await db.query("select public.manage_user($1,null,'admin')", [other]);
    });
    const result = await db.query<{ role: string }>("select role from public.users where id=$1", [
      other,
    ]);
    expect(result.rows[0].role).toBe("admin");
  });
  it("rejects invalid section seats and meeting ranges at the database", async () => {
    await asUser(admin, async () => {
      await expect(
        db.query("update public.sections set seats_available=500 where id=$1", [fixtureId(11)]),
      ).rejects.toThrow();
      await expect(
        db.query(
          `update public.sections set meetings='[{"day_of_week":0,"start_minute":700,"end_minute":600}]' where id=$1`,
          [fixtureId(11)],
        ),
      ).rejects.toThrow();
    });
  });
  it("revalidates registration plans and prerequisite eligibility inside the RPC", async () => {
    await asUser(ids.user, async () => {
      await db.query("select public.save_plan('Valid',$1,'registration',$2::uuid[],$3::uuid[])", [
        ids.semester,
        [fixtureId(1), fixtureId(2)],
        [fixtureId(11), fixtureId(12)],
      ]);
      await expect(
        db.query("select public.save_plan('Invalid',$1,'registration',$2::uuid[],$3::uuid[])", [
          ids.semester,
          [fixtureId(4)],
          [fixtureId(11)],
        ]),
      ).rejects.toThrow();
      await expect(
        db.query(
          "insert into public.registration_plans(university_id,user_id,semester_id,name,kind,items) values($1,$2,$3,'Bypass','semester','[]')",
          [ids.university, ids.user, ids.semester],
        ),
      ).rejects.toThrow();
    });
  });
  it("imports courses atomically and rejects partial invalid batches", async () => {
    await asUser(admin, async () => {
      await db.query("select public.import_courses($1::jsonb)", [
        JSON.stringify([{ code: "TEST101", title: "Good", credits: 3 }]),
      ]);
      await expect(
        db.query("select public.import_courses($1::jsonb)", [
          JSON.stringify([
            { code: "TEST102", title: "Good", credits: 3 },
            { code: "BAD101", title: "Bad", credits: -1 },
          ]),
        ]),
      ).rejects.toThrow();
      const result = await db.query("select * from public.courses where code='TEST102'");
      expect(result.rows).toHaveLength(0);
    });
  });
  it("checks actual overlapping meetings and prerequisites inside database plan validation", async () => {
    await db.query(
      `update public.sections set meetings='[{"day_of_week":0,"start_minute":630,"end_minute":710}]' where id=$1`,
      [fixtureId(12)],
    );
    await asUser(ids.user, async () => {
      await expect(
        db.query("select public.save_plan('Overlap',$1,'registration',$2::uuid[],$3::uuid[])", [
          ids.semester,
          [fixtureId(1), fixtureId(2)],
          [fixtureId(11), fixtureId(12)],
        ]),
      ).rejects.toThrow();
    });
    await db.query(
      `update public.sections set meetings='[{"day_of_week":1,"start_minute":700,"end_minute":780}]' where id=$1`,
      [fixtureId(12)],
    );
    await db.query(
      'insert into public.sections(id,university_id,course_id,semester_id,section_number,capacity,seats_available,meetings) values($1,$2,$3,$4,\'1\',30,10,\'[{"day_of_week":2,"start_minute":600,"end_minute":680}]\')',
      [fixtureId(14), ids.university, fixtureId(4), ids.semester],
    );
    await asUser(ids.user, async () => {
      await expect(
        db.query(
          "select public.save_plan('Prerequisites',$1,'registration',$2::uuid[],$3::uuid[])",
          [ids.semester, [fixtureId(4)], [fixtureId(14)]],
        ),
      ).rejects.toThrow();
      await db.query(
        "insert into public.completed_courses(user_id,university_id,course_id) values($1,$2,$3)",
        [ids.user, ids.university, fixtureId(1)],
      );
      await db.query(
        "select public.save_plan('Eligible',$1,'registration',$2::uuid[],$3::uuid[])",
        [ids.semester, [fixtureId(4)], [fixtureId(14)]],
      );
    });
    await expect(
      db.query(
        `update public.sections set meetings='[{"day_of_week":0,"start_minute":600,"end_minute":680},{"day_of_week":0,"start_minute":630,"end_minute":710}]' where id=$1`,
        [fixtureId(11)],
      ),
    ).rejects.toThrow();
  });
  it("publishes notifications with preference handling and emergency deduplication", async () => {
    await asUser(ids.user, async () => {
      await db.query(
        "update public.notification_preferences set in_app_enabled=false where user_id=$1",
        [ids.user],
      );
    });
    await asUser(admin, async () => {
      await db.query(
        "insert into public.notices(university_id,title,body,category,importance,status) values($1,'Normal test','Text','academic','normal','published'),($1,'Emergency test','Text','emergency','emergency','published')",
        [ids.university],
      );
      await db.query("update public.notices set status='draft' where title='Emergency test'");
      await db.query("update public.notices set status='published' where title='Emergency test'");
    });
    await asUser(ids.user, async () => {
      const rows = await db.query<{ title: string }>(
        "select title from public.notifications where title in ('Normal test','Emergency test')",
      );
      expect(rows.rows).toEqual([{ title: "Emergency test" }]);
    });
  });
  it("keeps provider emails synchronized and rejects student domain changes", async () => {
    await expect(
      db.query("update auth.users set email='outside@gmail.com' where id=$1", [ids.user]),
    ).rejects.toThrow();
    await db.query("update auth.users set email='updated@g.bracu.ac.bd' where id=$1", [ids.user]);
    const row = await db.query<{ email: string }>("select email from public.users where id=$1", [
      ids.user,
    ]);
    expect(row.rows[0].email).toBe("updated@g.bracu.ac.bd");
  });
  it("revokes data access immediately for a deactivated user", async () => {
    await db.query("update public.users set status='deactivated' where id=$1", [ids.user]);
    await asUser(ids.user, async () => {
      const result = await db.query("select * from public.courses");
      expect(result.rows).toHaveLength(0);
    });
  });
});
