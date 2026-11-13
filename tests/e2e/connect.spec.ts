import { test, expect, chromium } from "@playwright/test";
import { readFile, readdir, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { resolve, join } from "node:path";
import { connectFixture } from "../../packages/schemas/src/connect.fixture";

test("JSON uploads preserve other semesters and the extension package is downloadable", async ({
  page,
}) => {
  await page.goto("/preview/schedule");
  const download = await page.request.get("/downloads/friday-connect-extension.zip");
  expect(download.ok()).toBe(true);
  expect((await download.body()).subarray(0, 4).toString("hex")).toBe("504b0304");
  for (const semester of [20263, 20271]) {
    const raw = connectFixture().map((row) => ({ ...row, semesterSessionId: semester }));
    await page.getByLabel("Upload schedule JSON (up to 256 KB)", { exact: true }).setInputFiles({
      name: "schedule.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(raw)),
    });
    await page.getByRole("button", { name: "Preview import", exact: true }).click();
    await page.getByRole("checkbox", { name: /This is my schedule/ }).check();
    await page.getByRole("button", { name: "Confirm schedule import" }).click();
  }
  for (const semester of [20263, 20271])
    await expect(
      page.getByRole("heading", { name: `Connect semester ${semester}`, exact: true }),
    ).toHaveCount(1);
  await page.getByLabel("Upload schedule JSON (up to 256 KB)", { exact: true }).setInputFiles({
    name: "oversized.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(262145, " "),
  });
  await expect(
    page.getByText("Schedule JSON must be 256 KB or smaller.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview import", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Remove Connect import 20271" }).click();
  await expect(
    page.getByRole("heading", { name: "Connect semester 20263", exact: true }),
  ).toHaveCount(1);
});

test("schedule JSON import supports review, replacement, navigation, validation and removal", async ({
  page,
}) => {
  await page.goto("/preview/schedule");
  const input = page.getByLabel("Connect schedule JSON", { exact: true });
  await input.fill(JSON.stringify(connectFixture()));
  await page.getByRole("button", { name: "Preview import", exact: true }).click();
  await expect(
    page.getByText("7 entries · 4 theory · 3 labs · 12 credits", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm schedule import" })).toBeDisabled();
  await expect(
    page.getByRole("row").filter({ hasText: "MAT215" }).getByRole("cell").last(),
  ).toContainText("41 / 40");
  await page.getByRole("checkbox", { name: /This is my schedule/ }).check();
  await page.getByRole("button", { name: "Confirm schedule import" }).click();
  const imported = page.getByRole("heading", { name: "Connect semester 20263", exact: true });
  await expect(imported).toHaveCount(1);
  await page.getByRole("link", { name: "Deadlines", exact: true }).click();
  await page.getByRole("link", { name: "Schedule", exact: true }).click();
  await expect(imported).toHaveCount(1);
  await input.fill(JSON.stringify(connectFixture()));
  await page.getByRole("button", { name: "Preview import", exact: true }).click();
  await page.getByRole("checkbox", { name: /This is my schedule/ }).check();
  await page.getByRole("button", { name: "Confirm schedule import" }).click();
  await expect(imported).toHaveCount(1);
  await input.fill("not-json");
  await page.getByRole("button", { name: "Preview import", exact: true }).click();
  await expect(
    page.getByText("Enter a valid JSON array from Connect's schedules response.", { exact: true }),
  ).toBeVisible();
  await expect(imported).toHaveCount(1);
  await page.getByRole("button", { name: "Remove Connect import 20263" }).click();
  await expect(imported).toHaveCount(0);
});

test("extension transfer waits for review and rejects expired handoffs", async ({ page }) => {
  await page.goto("/preview/schedule");
  await page.evaluate(
    ({ courses }) => {
      sessionStorage.setItem(
        "friday.connect.schedule.v1",
        JSON.stringify({ version: 1, courses, expiresAt: Date.now() + 60000 }),
      );
      window.dispatchEvent(new Event("friday-connect-import"));
    },
    { courses: connectFixture() },
  );
  await expect(page.getByRole("heading", { name: "Review Connect semester 20263" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Connect semester 20263", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => sessionStorage.getItem("friday.connect.schedule.v1")),
  ).toBeNull();
  await page.setViewportSize({ width: 360, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Cancel review" }).click();
  await page.evaluate(() => {
    sessionStorage.setItem(
      "friday.connect.schedule.v1",
      JSON.stringify({ version: 1, courses: [], expiresAt: Date.now() - 1000 }),
    );
    window.dispatchEvent(new Event("friday-connect-import"));
  });
  await expect(
    page.getByText("This extension transfer expired. Sync from Connect again.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm schedule import" })).toHaveCount(0);
});

test("unpacked extension captures fetch and XHR schedules and hands off to FRIDAY", async () => {
  test.setTimeout(60000);
  const source = resolve("apps/connect-extension");
  await mkdir(resolve(".cache"), { recursive: true });
  const folder = await mkdtemp(resolve(".cache/extension-e2e-"));
  const extension = join(folder, "extension");
  await mkdir(extension);
  for (const file of await readdir(source))
    if (/\.(js|html|css)$/.test(file))
      await writeFile(join(extension, file), await readFile(join(source, file)));
  const manifest = JSON.parse(await readFile(join(source, "manifest.json"), "utf8"));
  // Grant only the local test origin up front, avoiding an interactive permission
  // prompt in headless Chromium. All production extension scripts are unchanged.
  manifest.host_permissions.push("http://127.0.0.1/*");
  await writeFile(join(extension, "manifest.json"), JSON.stringify(manifest));
  const context = await chromium.launchPersistentContext(join(folder, "profile"), {
    channel: "chromium",
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    await context.route("https://connect.bracu.ac.bd/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/adv/v1/student-courses/schedules")
        return route.fulfill({ json: connectFixture() });
      if (url.pathname === "/api/student/grades")
        return route.fulfill({
          json: { grades: [{ code: "CSE101", grade: "A" }], access_token: "private-token-value" },
        });
      if (url.pathname === "/api/student/fees")
        return route.fulfill({ json: { balance: 1500, currency: "BDT" } });
      if (url.pathname === "/api/auth/token")
        return route.fulfill({ json: { access_token: "private-token-value" } });
      return route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Mock Connect</title><h1>Mock Connect schedule</h1>",
      });
    });
    const worker = context.serviceWorkers()[0] || (await context.waitForEvent("serviceworker"));
    const extensionId = new URL(worker.url()).host;
    const connect = await context.newPage();
    await connect.goto("https://connect.bracu.ac.bd/");
    await connect.evaluate(async () => {
      await fetch("/api/adv/v1/student-courses/schedules?studentPortfolioId=99999");
    });
    await expect
      .poll(() =>
        worker.evaluate(
          async () =>
            Object.keys(await chrome.storage.session.get(null)).filter((key) =>
              key.startsWith("capture:"),
            ).length,
        ),
      )
      .toBe(1);
    await worker.evaluate(async () => {
      const stored = await chrome.storage.session.get(null);
      await chrome.storage.session.remove(
        Object.keys(stored).filter((key) => key.startsWith("capture:")),
      );
    });
    await connect.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "/api/adv/v1/student-courses/schedules?studentPortfolioId=99999");
          xhr.responseType = "json";
          xhr.onload = () => resolve();
          xhr.onerror = () => reject(new Error("Mock XHR failed"));
          xhr.send();
        }),
    );
    await expect
      .poll(() =>
        worker.evaluate(
          async () =>
            Object.keys(await chrome.storage.session.get(null)).filter((key) =>
              key.startsWith("capture:"),
            ).length,
        ),
      )
      .toBe(1);
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await worker.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: "https://connect.bracu.ac.bd/*" });
      await chrome.tabs.update(tabs[0].id, { active: true });
    });
    await popup.evaluate("refresh()");
    await expect(popup.locator("#capture")).toContainText("7 schedule entries");
    await popup.locator("#origin").fill("http://127.0.0.1:3100");
    await popup.locator("#preview").check();
    await popup.locator("#consent").check();
    const [friday] = await Promise.all([
      context.waitForEvent("page"),
      popup.locator("#sync").click(),
    ]);
    await expect(friday).toHaveURL(/\/preview\/schedule\?connectImport=1/);
    await expect(
      friday.getByRole("heading", { name: "Review Connect semester 20263" }),
    ).toBeVisible();
    await friday.getByRole("checkbox", { name: /This is my schedule/ }).check();
    await friday.getByRole("button", { name: "Confirm schedule import" }).click();
    await expect(
      friday.getByRole("heading", { name: "Connect semester 20263", exact: true }),
    ).toBeVisible();
    const stored = await worker.evaluate(async () =>
      JSON.stringify(await chrome.storage.session.get(null)),
    );
    expect(stored).not.toContain("studentPortfolioId");
    expect(stored).not.toContain("authorization");

    // Broader records are opt-in, redacted and handed to a separate private archive.
    await worker.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: "https://connect.bracu.ac.bd/*" });
      await chrome.tabs.update(tabs[0].id, { active: true });
    });
    await popup.evaluate("refresh()");
    await connect.evaluate(async () => {
      await fetch("/api/student/grades");
    });
    expect(
      await worker.evaluate(
        async () =>
          Object.keys(await chrome.storage.session.get(null)).filter((key) =>
            key.startsWith("data:"),
          ).length,
      ),
    ).toBe(0);
    await popup.locator("#capture-other").check();
    await expect
      .poll(() =>
        worker.evaluate(async () =>
          Object.entries(await chrome.storage.session.get(null)).some(
            ([key, value]) => key.startsWith("archive:") && value === true,
          ),
        ),
      )
      .toBe(true);
    await connect.evaluate(async () => {
      await Promise.all([
        fetch("/api/student/grades"),
        fetch("/api/student/fees"),
        fetch("/api/auth/token"),
      ]);
      await fetch("/api/student/grades", { method: "POST" });
    });
    await expect(popup.locator("#data-capture")).toContainText("2 other responses captured");
    const dataStored = await worker.evaluate(async () =>
      JSON.stringify(
        Object.entries(await chrome.storage.session.get(null)).filter(([key]) =>
          key.startsWith("data:"),
        ),
      ),
    );
    expect(dataStored).not.toContain("private-token-value");
    expect(dataStored).not.toContain("/api/auth/token");
    const [archive] = await Promise.all([
      context.waitForEvent("page"),
      popup.locator("#sync-data").click(),
    ]);
    await expect(archive).toHaveURL(/\/preview\/connect\?connectImport=1/);
    await expect(
      archive.getByRole("heading", { name: "Review 2 Connect responses", exact: true }),
    ).toBeVisible();
    await archive.getByRole("checkbox", { name: /These are my Connect records/ }).check();
    await archive.getByRole("button", { name: "Confirm Connect data import" }).click();
    await expect(
      archive.getByRole("heading", { name: "Your saved Connect responses (2)", exact: true }),
    ).toBeVisible();

    // A real sign-in redirect must keep the pending transfer, without delivering
    // schedule data to the login page or a different FRIDAY route.
    await worker.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: "https://connect.bracu.ac.bd/*" });
      await chrome.tabs.update(tabs[0].id, { active: true });
    });
    await popup.evaluate("refresh()");
    await popup.locator("#preview").uncheck();
    const [signIn] = await Promise.all([
      context.waitForEvent("page"),
      popup.locator("#sync").click(),
    ]);
    await expect(signIn).toHaveURL(/\/login\?next=/);
    expect(
      await signIn.evaluate(() => sessionStorage.getItem("friday.connect.schedule.v1")),
    ).toBeNull();
    await signIn.goto("http://127.0.0.1:3100/preview/schedule");
    await expect(
      signIn.getByRole("heading", { name: "Review Connect semester 20263" }),
    ).toHaveCount(0);
    await context.route("http://127.0.0.1:3100/app/schedule?connectImport=1", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><h1>Mock authenticated destination</h1><div data-friday-connect-import="v1"></div>',
      }),
    );
    await signIn.goto("http://127.0.0.1:3100/app/schedule?connectImport=1");
    await expect
      .poll(() =>
        signIn.evaluate(() => {
          const raw = sessionStorage.getItem("friday.connect.schedule.v1");
          return raw ? JSON.parse(raw).courses.length : 0;
        }),
      )
      .toBe(7);
  } finally {
    await context.close();
  }
});
