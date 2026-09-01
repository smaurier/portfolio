import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config (30/08). Tests E2E cibles sur le voile de chargement
 * PiedraSkeleton + LoadingSync : verrouillent le fix "je vois encore le
 * html avant" (retour Sylvain 30/08). Baseline sur laquelle etendre les
 * tests a11y RGAA + visual regression plus tard.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
