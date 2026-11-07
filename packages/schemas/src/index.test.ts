import { describe, it, expect } from "vitest";
import { isStudentEmail, safeNext, signupSchema, mutationSchemas, connectRowSchema } from "./index";
describe("request boundaries", () => {
  it("matches the exact student domain", () => {
    expect(isStudentEmail("student@g.bracu.ac.bd")).toBe(true);
    expect(isStudentEmail("STUDENT@G.BRACU.AC.BD")).toBe(true);
    for (const email of [
      "x@bracu.ac.bd",
      "x@evilg.bracu.ac.bd",
      "x@g.bracu.ac.bd.evil.com",
      "x@gmail.com",
    ])
      expect(isStudentEmail(email)).toBe(false);
  });
  it("prevents external post-login redirects", () => {
    for (const path of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/app\\evil",
      "/application",
    ])
      expect(safeNext(path)).toBe("/app");
    expect(safeNext("/app/notices?q=exam")).toBe("/app/notices?q=exam");
  });
  it("validates signup and password strength on the server", () => {
    const base = {
      full_name: "A Student",
      email: "x@g.bracu.ac.bd",
      student_id: "26101001",
      password: "Password1",
    };
    expect(signupSchema.safeParse(base).success).toBe(true);
    expect(signupSchema.safeParse({ ...base, password: "password" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, student_id: "1" }).success).toBe(false);
  });
  it("rejects impossible section times and seats", () => {
    const base = {
      course_id: "00000000-0000-4000-8000-000000000001",
      semester_id: "44444444-4444-4444-8444-444444444444",
      section_number: "1",
      faculty: "ABC",
      room: "UB201",
      capacity: 30,
      seats_available: 31,
      day_of_week: 0,
      start_minute: 600,
      end_minute: 590,
    };
    expect(mutationSchemas.section_save.safeParse(base).success).toBe(false);
  });
  it("rejects malformed schedule records while accepting plain untrusted strings safely", () => {
    expect(connectRowSchema.safeParse(null).success).toBe(false);
    expect(connectRowSchema.safeParse({ courseCode: "<img src=x>" }).success).toBe(true);
    expect(connectRowSchema.safeParse({ courseCode: 7 }).success).toBe(false);
  });
});
