import { test, expect, devices } from "@playwright/test";

/**
 * LA VEILLE (13/09, lib/veille). Sans un geste, le monde continue sans
 * nous : les textes, le bandeau et les controles s'effacent, la camera
 * derive, une musique entre. Tout geste rend le monde.
 *
 * Le delai est raccourci par `?veille=<ms>` : la suite ne peut pas
 * attendre vingt secondes par cas, et la valeur par defaut est verifiee
 * dans les tests unitaires (lib/veille).
 *
 * Oracles :
 *  - apres le delai, `data-veille` est pose et le bandeau est transparent ;
 *  - la camera a bouge alors que le defilement n'a pas bouge ;
 *  - une touche rend le monde, et le bandeau redevient opaque ;
 *  - le texte reste dans le DOM et accessible (il s'efface, il ne
 *    disparait pas) ;
 *  - sous mouvement reduit, la veille s'ouvre mais la camera ne derive pas.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

async function attendreLeMonde(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 30_000 });
  await page.waitForTimeout(1200);
}

const poseCamera = () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((window as any).__nahualR3f?.camera?.position ?? { x: 0, y: 0, z: 0 }) as { x: number; y: number; z: number };

test("sans un geste, le monde continue sans nous ; une touche le rend", async ({ page }) => {
  test.setTimeout(200_000);
  await page.goto("/fr?shaders-prod&veille=2500");
  await attendreLeMonde(page);
  const banniere = page.locator("header.header, .header").first();
  // Un vrai geste : le compte repart de zero, et on verifie qu'on est bien
  // eveille avant de ne plus rien faire (sinon la veille a pu s'ouvrir
  // pendant le chargement, qui dure plus que le delai raccourci).
  await page.mouse.move(640, 400);
  await expect(page.locator("html")).not.toHaveAttribute("data-veille", "en-cours");

  // On ne touche plus a rien.
  const avant = await page.evaluate(poseCamera);
  const defilementAvant = await page.evaluate(() => window.scrollY);
  await page.waitForFunction(() => document.documentElement.getAttribute("data-veille") === "en-cours", null, { timeout: 15_000 });

  // Les textes s'effacent (2,5 s de fondu).
  await expect.poll(async () => Number(await banniere.evaluate((el) => getComputedStyle(el).opacity)), { timeout: 8_000 }).toBeLessThan(0.2);
  // Mais ils sont toujours la : la veille est un fondu, pas un demontage.
  await expect(page.locator("h1").first()).toHaveCount(1);
  await expect(page.locator("[data-theme-toggle]").first()).toBeAttached();

  // La camera a derive alors que le defilement n'a pas bouge d'un pixel.
  await page.waitForTimeout(2500);
  const pendant = await page.evaluate(poseCamera);
  expect(await page.evaluate(() => window.scrollY)).toBe(defilementAvant);
  const derive = Math.hypot(pendant.x - avant.x, pendant.y - avant.y, pendant.z - avant.z);
  expect(derive, `derive de la camera : ${derive.toFixed(3)}`).toBeGreaterThan(0.05);

  // Une touche rend le monde.
  await page.keyboard.press("Shift");
  await expect(page.locator("html")).not.toHaveAttribute("data-veille", "en-cours");
  await expect.poll(async () => Number(await banniere.evaluate((el) => getComputedStyle(el).opacity)), { timeout: 5_000 }).toBeGreaterThan(0.9);
});

test("mouvement reduit : les textes s'effacent, la camera ne derive pas", async ({ browser }) => {
  test.setTimeout(200_000);
  const context = await browser.newContext({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/fr?shaders-prod&veille=2500");
  await attendreLeMonde(page);
  const avant = await page.evaluate(poseCamera);
  await page.waitForFunction(() => document.documentElement.getAttribute("data-veille") === "en-cours", null, { timeout: 15_000 });
  await page.waitForTimeout(3000);
  const pendant = await page.evaluate(poseCamera);
  const derive = Math.hypot(pendant.x - avant.x, pendant.y - avant.y, pendant.z - avant.z);
  expect(derive, `derive sous mouvement reduit : ${derive.toFixed(3)}`).toBeLessThan(0.02);
  await context.close();
});
