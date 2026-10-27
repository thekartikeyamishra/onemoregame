import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Build first with `npm run build:local` so canonical URLs, cookies and CSP target http://localhost:3100.

/**
 * End-to-end tests run against a production build using the in-memory data store and console mailer
 * (ALLOW_INSECURE_DEV_BACKENDS). They exercise real routes, forms and server actions, but NOT Firestore
 * or a real email provider; see docs/LAUNCH-CHECKLIST.md for the staging checks that cover those.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 320, height: 640 } }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `mkdir -p .e2e && npx next start -p ${PORT} > .e2e/server.log 2>&1`,
    url: `http://localhost:${PORT}/robots.txt`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATA_BACKEND: "memory",
      MAIL_PROVIDER: "console",
      ALLOW_INSECURE_DEV_BACKENDS: "true",
      APP_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
      BATTLE_TEST_ROUND_SECONDS: "12",
    },
  },
});
