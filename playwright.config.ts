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
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Sur Windows, Chromium headless rend en SwiftShader (logiciel) :
        // la scene 3D bloque le fil principal et les tests expirent. ANGLE
        // D3D11 donne le vrai GPU, et un adaptateur WebGPU (05/09).
        launchOptions: process.platform === "win32" ? { args: ["--use-angle=d3d11", "--use-gl=angle", "--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] } : undefined,
      },
    },
  ],
  webServer: {
    command: "pnpm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
