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
    /**
     * ANGLE sur d3d11 (08/09). Sans ces drapeaux, Chromium sous Windows
     * rend la scene en LOGICIEL : l'image s'affiche quand meme, mais a
     * quelques images par seconde. Or presque toutes nos transitions sont
     * pilotees par image et non par horloge (le motif
     * `blend += (cible - blend) * 0.06` de useFrame), donc un fondu qui
     * prend une seconde a l'ecran prend une minute dans ce contexte, et
     * tout test qui attend un etat stable expire. Meme reglage que les
     * scripts de capture de .scratch.
     */
    launchOptions: {
      args: ["--use-angle=d3d11", "--use-gl=angle", "--ignore-gpu-blocklist"],
    },
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
