import { defineConfig, devices } from "@playwright/test";

// E2E, accessibility and responsive test infrastructure (S1-P01-T005).
// Projects mirror knowledge/implementation/slice-01/testing.md §2.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Authenticated specs will depend on this project once test users exist (S1-P03-T001).
    { name: "clerk-setup", testMatch: /global\.setup\.ts/ },
    {
      name: "desktop-chromium",
      testIgnore: /global\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "tablet",
      testIgnore: /global\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: false },
    },
    {
      name: "mobile",
      testIgnore: /global\.setup\.ts/,
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: isCI ? `npm run build && npm run start -- -p ${PORT}` : `npx next dev -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 180_000,
      },
});
