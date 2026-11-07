import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  expect: { timeout: 10000 },
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { launchOptions: { executablePath: process.env.BROWSER_EXECUTABLE } }
      : {}),
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.FRIDAY_E2E_EXTERNAL_SERVER
    ? undefined
    : {
        command:
          "node apps/web/node_modules/next/dist/bin/next start apps/web --hostname 127.0.0.1 --port 3100",
        url: "http://127.0.0.1:3100/api/health",
        reuseExistingServer: false,
        timeout: 60000,
      },
});
