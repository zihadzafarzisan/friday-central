import { test, expect } from "@playwright/test";
test("student entry points use Google Workspace and admin login keeps its own form", async ({
  page,
}) => {
  for (const route of ["/login", "/signup"]) {
    await page.goto(route);
    await expect(
      page.getByRole("button", { name: "Continue with Google", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Use your BRACU student Google Workspace account (@g.bracu.ac.bd).", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  }
  await page.goto("/login?error=workspace");
  await expect(
    page.getByText("Use your verified BRACU Google Workspace account (@g.bracu.ac.bd).", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/admin/login");
  await expect(page.getByLabel("Admin email")).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google", exact: true })).toHaveCount(
    0,
  );
});
test("Connect data archive reviews/redacts, replaces privately, exports and removes records", async ({
  page,
}) => {
  await page.goto("/preview/connect");
  await page.getByText("Import an exported Connect data batch", { exact: true }).click();
  const entries = [
    {
      endpoint: "/api/student/grades",
      method: "GET",
      captured_at: "2026-11-12T00:00:00Z",
      data: { grades: [{ code: "CSE101", grade: "A" }], access_token: "private-token-value" },
    },
  ];
  await page.getByLabel("Connect data JSON", { exact: true }).fill(JSON.stringify(entries));
  await page.getByRole("button", { name: "Preview Connect data", exact: true }).click();
  await page.getByText("GET /api/student/grades", { exact: true }).click();
  await expect(page.locator(".connect-data-record pre")).toContainText("[redacted]");
  await expect(page.locator(".connect-data-record pre")).not.toContainText("private-token-value");
  await expect(page.getByRole("button", { name: "Confirm Connect data import" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /These are my Connect records/ }).check();
  await page.getByRole("button", { name: "Confirm Connect data import" }).click();
  await expect(
    page.getByRole("heading", { name: "Your saved Connect responses (1)", exact: true }),
  ).toBeVisible();
  entries[0].data.grades[0].grade = "A-";
  await page.getByLabel("Connect data JSON", { exact: true }).fill(JSON.stringify(entries));
  await page.getByRole("button", { name: "Preview Connect data", exact: true }).click();
  await page.getByRole("checkbox", { name: /These are my Connect records/ }).check();
  await page.getByRole("button", { name: "Confirm Connect data import" }).click();
  await expect(
    page.getByRole("heading", { name: "Your saved Connect responses (1)", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Schedule", exact: true }).click();
  await page.getByRole("link", { name: "Connect data", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your saved Connect responses (1)", exact: true }),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export saved Connect data" }).click();
  expect((await downloadEvent).suggestedFilename()).toBe("friday-connect-data.json");
  await page.setViewportSize({ width: 360, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Remove /api/student/grades", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your saved Connect responses (0)", exact: true }),
  ).toBeVisible();
});
