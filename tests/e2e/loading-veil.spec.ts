import { test, expect } from "@playwright/test";

/**
 * Tests E2E du voile de chargement (30/08). Verrouille le fix Sylvain
 * "je vois encore le html avant" : ces tests DOIVENT casser si quelqu'un
 * retire le critical CSS inline, deplace le PiedraSkeleton, ou casse le
 * mecanisme html[data-loaded="true"].
 */

test.describe("PiedraSkeleton : voile de chargement SOTY", () => {
  test("body a fond noir des la premiere frame (pas de flash blanc)", async ({ page }) => {
    await page.goto("/fr");
    // Verifie le fond noir AVANT que useProgress atteigne 100 : le
    // critical CSS inline dans <head> doit forcer body { background: #000 }
    // tant que html n'a pas data-loaded="true".
    const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bgColor).toBe("rgb(0, 0, 0)");
  });

  test("PiedraSkeleton visible dans le HTML SSR (aucun JS necessaire)", async ({ browser }) => {
    // Contexte sans JS : simule un navigateur qui n'a pas encore hydrate
    // React. Le PiedraSkeleton doit etre visible dans le HTML brut.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/fr");
    const skeleton = page.locator('[role="status"][aria-label*="hargement"]').first();
    await expect(skeleton).toBeVisible();
    await context.close();
  });

  test("phrase nahuatl visible dans le HTML SSR (server-side pick)", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/fr");
    // La phrase est pickee server-side, doit etre dans le HTML brut.
    // On teste qu'un <p lang="nah"> avec du contenu existe.
    const phrase = page.locator('p[lang="nah"]').first();
    await expect(phrase).toBeVisible();
    const text = await phrase.textContent();
    expect(text?.length ?? 0).toBeGreaterThan(3);
    await context.close();
  });

  test("html[data-loaded='true'] pose apres chargement complet", async ({ page }) => {
    await page.goto("/fr");
    // Attend que LoadingSync pose data-loaded="true" (useProgress >= 100
    // + MIN_VEIL_DURATION_MS ecoulee, soit 2.5s min).
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-loaded") === "true",
      { timeout: 15_000 }
    );
    const dataLoaded = await page.evaluate(() =>
      document.documentElement.getAttribute("data-loaded")
    );
    expect(dataLoaded).toBe("true");
  });

  test("skeleton fade out une fois html[data-loaded='true']", async ({ page }) => {
    await page.goto("/fr");
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-loaded") === "true",
      { timeout: 15_000 }
    );
    // Attend la fin de la transition CSS opacity 0.6s.
    await page.waitForTimeout(800);
    const opacity = await page.locator('[data-testid="piedra-skeleton"]').evaluate(
      (el) => getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBeLessThan(0.1);
  });

  test("skeleton n'intercepte plus les clics apres fade out", async ({ page }) => {
    await page.goto("/fr");
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-loaded") === "true",
      { timeout: 15_000 }
    );
    await page.waitForTimeout(800);
    // pointer-events: none pose par le CSS quand html[data-loaded="true"].
    const pointerEvents = await page.locator('[data-testid="piedra-skeleton"]').evaluate(
      (el) => getComputedStyle(el).pointerEvents
    );
    expect(pointerEvents).toBe("none");
  });
});
