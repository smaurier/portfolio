import { test, expect, devices } from "@playwright/test";

/**
 * LA BOUSSOLE VRAIE (13/09). Sur telephone, la rose des vents tourne pour
 * que son nord pointe le vrai nord. Oracles, avec un capteur simule
 * (evenement d'orientation absolue envoye a la fenetre) :
 *  - avant tout releve, la rose est orientee ecran (rotation nulle, etat
 *    « absente ») ;
 *  - un cap de 90 degres (le haut du telephone vers l'est) tourne la rose
 *    de -90 degres : le point du Nord passe a gauche ;
 *  - la boussole se dit dans le libelle de la navigation ;
 *  - la trace « true-north » est inscrite.
 * Sur ordinateur (pointeur fin), rien ne bouge jamais.
 */
// Les profils sans `defaultBrowserType` : dans un describe, ce champ force
// un nouveau worker et Playwright le refuse (meme convention que
// controls-overlap.spec.ts).
const { defaultBrowserType: _p, ...PIXEL_7 } = devices["Pixel 7"];
const { defaultBrowserType: _d, ...DESKTOP } = devices["Desktop Chrome"];
void _p;
void _d;

test.describe("la boussole vraie, telephone", () => {
  test.use({ ...PIXEL_7 });

  test("la rose tourne vers le vrai nord et le site s'en souvient", async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/fr?shaders-prod");
    await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 90_000 });
    const nav = page.locator("nav[data-boussole]");
    await expect(nav).toHaveAttribute("data-boussole", "absente");

    // Le haut du telephone pointe l'est : alpha = 270 (anti-horaire), cap 90.
    await page.evaluate(() => {
      const envoyer = () => {
        const e = new DeviceOrientationEvent("deviceorientationabsolute", { alpha: 270, beta: 30, gamma: 0, absolute: true });
        window.dispatchEvent(e);
      };
      envoyer();
      (window as unknown as { __envoyerCap: () => void }).__envoyerCap = envoyer;
    });
    await expect(nav).toHaveAttribute("data-boussole", "vive", { timeout: 5_000 });
    await expect(nav).toHaveAttribute("aria-label", /vrai nord/);
    // Le lissage converge vers -90 en moins de deux secondes.
    await expect.poll(async () => {
      const r = await page.evaluate(() => getComputedStyle(document.querySelector("nav[data-boussole] > div")!).transform);
      // matrix(a, b, c, d, tx, ty) : angle = atan2(b, a)
      const m = r.match(/matrix\(([^)]+)\)/);
      if (!m) return 999;
      const [a, b] = m[1].split(",").map(Number);
      return Math.round((Math.atan2(b, a) * 180) / Math.PI);
    }, { timeout: 5_000 }).toBe(-90);
    const traces = await page.evaluate(() => localStorage.getItem("nahual-traces") ?? "");
    expect(traces).toContain("true-north");
  });
});

test.describe("la boussole vraie, ordinateur", () => {
  test.use({ ...DESKTOP, viewport: { width: 1280, height: 800 } });
  test("sans capteur, la rose reste orientee ecran", async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/fr?shaders-prod");
    await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 90_000 });
    const nav = page.locator("nav[data-boussole]");
    await expect(nav).toHaveAttribute("data-boussole", "absente");
    await page.evaluate(() => window.dispatchEvent(new DeviceOrientationEvent("deviceorientationabsolute", { alpha: 270, absolute: true })));
    await page.waitForTimeout(800);
    await expect(nav).toHaveAttribute("data-boussole", "absente");
  });
});
