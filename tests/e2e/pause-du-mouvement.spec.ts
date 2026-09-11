import { test, expect } from "@playwright/test";

/**
 * LA PAUSE DU MOUVEMENT (11/09, A1 du backlog, WCAG 2.2.2).
 *
 * La scene bouge d'elle-meme, plus de cinq secondes, des l'arrivee : il
 * faut une commande du visiteur qui la mette en pause, independante de la
 * preference systeme. Le bouton « Figer la scene » coupe la boucle de rendu
 * du canvas ; l'image reste, le texte vit ; « Reprendre » relance. La
 * touche G fait la meme chose.
 *
 * L'oracle : le compteur d'images de three (gl.info.render.frame, handle de
 * dev ; il compte les passes, une trentaine par image au bureau) avance
 * avant, ne bouge plus pendant la pause, repart apres. On laisse une
 * seconde apres la commande : la derniere image en vol se rend encore. Et
 * on tolere trois images ISOLEES (r3f rend une image a chaque
 * redimensionnement du canvas : une infobulle qui apparait, un indice
 * clavier), ce qui n'est pas une boucle : mesure du 11/09, deux images a
 * 1,4 s et 1,7 s apres la touche G, puis plus rien.
 */
const IMAGES_ISOLEES_MAX = 3 * 35;
type Handle = { __nahualR3f?: { gl: { info: { render: { frame: number } } } } };

async function imagesEn(page: import("@playwright/test").Page, ms: number): Promise<number> {
  const avant = await page.evaluate(() => (window as unknown as Handle).__nahualR3f!.gl.info.render.frame);
  await page.waitForTimeout(ms);
  const apres = await page.evaluate(() => (window as unknown as Handle).__nahualR3f!.gl.info.render.frame);
  return apres - avant;
}

test("le bouton fige la scene, puis la reprend", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/fr/services");
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true" && !!(window as unknown as Handle).__nahualR3f, null, { timeout: 90_000 });
  await page.waitForTimeout(1500);
  expect(await imagesEn(page, 1500), "la scene bouge avant la pause").toBeGreaterThan(20);

  const bouton = page.getByRole("button", { name: "Figer la scène" });
  await expect(bouton).toHaveAttribute("aria-pressed", "false");
  await bouton.click();
  await expect(page.getByRole("button", { name: "Reprendre la scène" })).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(1200);
  expect(await imagesEn(page, 1500), "pas de boucle de rendu pendant la pause").toBeLessThanOrEqual(IMAGES_ISOLEES_MAX);
  // Le texte vit toujours : le titre est la, la page defile.
  await expect(page.locator("main h1").first()).toBeVisible();

  await page.getByRole("button", { name: "Reprendre la scène" }).click();
  await page.waitForTimeout(500);
  expect(await imagesEn(page, 1500), "la scene repart").toBeGreaterThan(20);
});

test("la touche G fige la scene", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/fr/services");
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true" && !!(window as unknown as Handle).__nahualR3f, null, { timeout: 90_000 });
  await page.waitForTimeout(1500);
  await page.keyboard.press("g");
  await expect(page.getByRole("button", { name: "Reprendre la scène" })).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(1200);
  expect(await imagesEn(page, 1500), "pas de boucle de rendu pendant la pause").toBeLessThanOrEqual(IMAGES_ISOLEES_MAX);
});
