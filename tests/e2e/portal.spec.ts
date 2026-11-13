import { test, expect } from "@playwright/test";
const student = [
  "",
  "schedule",
  "connect",
  "deadlines",
  "notices",
  "degree",
  "registration",
  "planner",
  "attendance",
  "assistant",
  "notifications",
  "profile",
  "settings",
  "onboarding",
];
const admin = [
  "",
  "users",
  "catalog/programs",
  "catalog/courses",
  "catalog/sections",
  "catalog/import",
  "notices",
  "deadlines",
  "reports",
  "audit-log",
  "settings",
];
test("every student and admin page renders at desktop and mobile widths", async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["dark", "light"]) {
      await page
        .context()
        .addCookies([{ name: "friday-theme", value: theme, domain: "127.0.0.1", path: "/" }]);
      for (const [base, routes] of [
        ["/preview", student],
        ["/preview/admin", admin],
      ] as const) {
        for (const route of routes) {
          const response = await page.goto(base + (route ? "/" + route : ""));
          expect(response?.status(), route).toBe(200);
          await expect(page.locator("main h1")).toHaveCount(1);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            route + " overflow",
          ).toBe(true);
        }
      }
    }
  }
  expect(errors).toEqual([]);
});
test("public entry pages and unknown routes resolve correctly", async ({ page }) => {
  for (const route of [
    "/",
    "/login",
    "/signup",
    "/verify",
    "/forgot-password",
    "/reset-password",
    "/about",
    "/privacy",
    "/terms",
    "/support",
    "/community",
    "/admin/login",
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1")).toHaveCount(1);
  }
  for (const route of ["/toString", "/preview/constructor", "/preview/admin/toString"]) {
    const response = await page.goto(route);
    // Next.js can stream its not-found boundary with HTTP 200 after headers.
    expect([200, 404]).toContain(response?.status());
    await expect(page.getByRole("heading", { name: "That page isn’t here" })).toBeVisible();
  }
});
test("admin section and university deadline edits update shared preview records", async ({
  page,
}) => {
  await page.goto("/preview/admin/catalog/sections");
  const section = page
    .locator(".demo-card")
    .filter({ has: page.getByRole("heading", { name: "CSE220 · Section 1", exact: true }) });
  await section.getByText("Edit section", { exact: true }).click();
  await section.getByLabel("Room", { exact: false }).fill("UB999");
  await section.getByRole("button", { name: "Save section changes", exact: true }).click();
  await expect(section.getByText("ABC · UB999", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Deadlines", exact: true }).click();
  const deadline = page
    .locator(".demo-card")
    .filter({ has: page.getByRole("heading", { name: "Registration window", exact: true }) });
  await deadline.getByText("Edit university deadline", { exact: true }).click();
  await deadline.getByLabel("Title", { exact: false }).fill("Updated registration date");
  await deadline.getByRole("button", { name: "Save university deadline", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Updated registration date", exact: true }),
  ).toBeVisible();
});
test("real student and admin routes require authentication and preserve destination", async ({
  page,
}) => {
  await page.goto("/app/deadlines?source=personal");
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/app/deadlines?source=personal");
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/login\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/admin/users");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});
test("preview deadlines survive navigation, support filters and safely display markup", async ({
  page,
}) => {
  await page.goto("/preview/deadlines");
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add deadline", exact: true }) });
  await form.getByLabel("Title", { exact: false }).fill('<img src=x onerror="alert(1)">');
  await form.getByLabel("Due date and time").fill("2099-11-12T12:00");
  await form.getByRole("button", { name: "Add deadline", exact: true }).click();
  await expect(page.getByRole("heading", { name: '<img src=x onerror="alert(1)">' })).toBeVisible();
  expect(await page.locator(".demo-card img").count()).toBe(0);
  await page.getByRole("link", { name: "Notices", exact: true }).click();
  await page.getByRole("link", { name: "Deadlines", exact: true }).click();
  await expect(page.getByRole("heading", { name: '<img src=x onerror="alert(1)">' })).toBeVisible();
  await page.getByLabel("Source", { exact: false }).selectOption("personal");
  await expect(page).toHaveURL(/source=personal/);
  await page.reload();
  await expect(page.getByRole("heading", { name: '<img src=x onerror="alert(1)">' })).toHaveCount(
    0,
  );
});
test("notice filters and read state work with detail routes", async ({ page }) => {
  await page.goto("/preview/notices");
  await page.getByLabel("Search notices").fill("nothing-matches");
  await expect(page.getByRole("heading", { name: "No notices match" })).toBeVisible();
  await page.getByLabel("Search notices").fill("Registration");
  await page.getByRole("link", { name: "Read notice", exact: true }).click();
  await expect(page.getByText("This is a sample notice.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Mark read", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mark unread", exact: true })).toBeVisible();
});
test("planner and conflict-free registration produce saved plans", async ({ page }) => {
  await page.goto("/preview/planner");
  await page.getByLabel("Plan name").fill("My next semester");
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Save semester plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My next semester" })).toBeVisible();
  await page.getByRole("link", { name: "Registration Copilot", exact: true }).click();
  await expect(page).toHaveURL("/preview/registration");
  await expect(page.locator("main h1")).toHaveText("Registration Copilot");
  await page.getByRole("checkbox", { name: "MAT215 · 3 credits", exact: true }).check();
  await page.getByRole("button", { name: "Generate plans", exact: true }).click();
  await expect(page.getByText("✓ No class-time conflicts")).toBeVisible();
  await page.getByRole("button", { name: "Save registration plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Plan 1", exact: true })).toBeVisible();
});
test("admin catalog and notice forms update the preview without reaching live mutations", async ({
  page,
}) => {
  const actions: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") actions.push(request.url());
  });
  await page.goto("/preview/admin/catalog/courses");
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add course", exact: true }) });
  await form.getByLabel("Course code").fill("TEST123");
  await form.getByLabel("Course title").fill("Example course");
  await form.getByLabel("Credits", { exact: false }).fill("3");
  await form.getByRole("button", { name: "Add course", exact: true }).click();
  await expect(page.getByRole("heading", { name: "TEST123 · Example course" })).toBeVisible();
  await page.getByRole("link", { name: "Import", exact: true }).click();
  await page.getByLabel("CSV contents").fill("code,title,credits\nNEW111,Imported sample,3");
  await page.getByRole("button", { name: "Apply reviewed import" }).click();
  await expect(page.getByText("Saved in this preview.", { exact: false })).toBeVisible();
  expect(actions).toEqual([]);
});
test("public schedules escape external records, filter, switch exams, and recover from failures", async ({
  page,
}) => {
  let fail = false;
  await page.route("**/api/public/schedule", (route) =>
    fail
      ? route.fulfill({ status: 502, json: { message: "Unavailable" } })
      : route.fulfill({
          json: {
            rows: [
              {
                courseCode: "CSE220",
                courseName: "<img src=x>",
                sectionName: "1",
                faculties: "ABC",
                capacity: 30,
                consumedSeat: 10,
                sectionSchedule: {
                  classSchedules: [{ day: "Sunday", startTime: "10:00", endTime: "11:20" }],
                  midExamDate: "2026-11-20",
                },
              },
            ],
            fetchedAt: "2026-11-08T00:00:00Z",
          },
        }),
  );
  await page.goto("/schedules");
  await expect(page.getByText("<img src=x>", { exact: true })).toBeVisible();
  expect(await page.locator("table img").count()).toBe(0);
  await page.getByRole("searchbox", { name: "Faculty initials" }).fill("ZZZ");
  await expect(page.getByRole("heading", { name: "No matching sections" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Faculty initials" }).fill("");
  fail = true;
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(page.getByRole("status")).toContainText("could not be loaded");
  fail = false;
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(page.getByRole("status")).toContainText("Public Connect data");
  await page.getByRole("link", { name: "Exams", exact: true }).click();
  await expect(page.getByText("Midterm:", { exact: false })).toBeVisible();
});
test("theme, reduced motion, back navigation, and keyboard skip link remain usable", async ({
  page,
}) => {
  await page.goto("/preview");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("link", { name: "Degree progress", exact: true }).click();
  await expect(page).toHaveURL("/preview/degree");
  await expect(page.locator("main h1")).toHaveText("Degree progress");
  await page.goBack();
  await expect(page).toHaveURL("/preview");
  await expect(page.locator("main h1")).toHaveText("Your day, in focus");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});
