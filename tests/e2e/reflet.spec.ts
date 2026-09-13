import { test, expect, devices } from "@playwright/test";

/**
 * LE REFLET (13/09, le miroir fumant, lot 2) : la scene suit la face.
 *
 * Oracles, mesures sur les PIXELS du canvas (une zone de scene a droite du
 * calque de texte, sous le bandeau), pas sur le DOM :
 *  - sur la face claire, la scene est claire (luminance moyenne haute) ;
 *  - sur la nuit, elle est sombre ; le rapport entre les deux est net ;
 *  - retourner le miroir emmene la scene avec lui : apres la ceremonie,
 *    la zone est claire sans rechargement.
 * Le decodage se fait dans la page (Image + canvas 2D) : aucune
 * dependance de plus pour lire un PNG.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

const ZONE = { x: 660, y: 130, width: 560, height: 520 };

async function attendre(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function luminanceMoyenne(page: import("@playwright/test").Page): Promise<number> {
  const png = await page.screenshot({ clip: ZONE });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let somme = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 16) {
      somme += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      n++;
    }
    return somme / n;
  }, png.toString("base64"));
}

test("la scene est claire dans le miroir, sombre la nuit", async ({ page }) => {
  test.setTimeout(200_000);
  // Le script d'init rejoue a chaque navigation : il ne pose la face claire
  // que la premiere fois (drapeau de session), le rechargement mesure la nuit.
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem("reflet-nuit")) localStorage.setItem("nahual-theme", "light");
    } catch {}
  });
  await page.goto("/fr?shaders-prod");
  await attendre(page);
  const clair = await luminanceMoyenne(page);

  await page.evaluate(() => { try { sessionStorage.setItem("reflet-nuit", "1"); localStorage.setItem("nahual-theme", "dark"); } catch {} });
  await page.reload();
  await attendre(page);
  const nuit = await luminanceMoyenne(page);

  expect(clair, `face claire : ${clair.toFixed(2)}`).toBeGreaterThan(0.45);
  expect(nuit, `nuit : ${nuit.toFixed(2)}`).toBeLessThan(0.25);
  expect(clair / Math.max(nuit, 0.01)).toBeGreaterThan(2.5);
});

test("retourner le miroir emmene la scene : claire apres la ceremonie, sans rechargement", async ({ page }) => {
  test.setTimeout(200_000);
  await page.goto("/fr?shaders-prod");
  await attendre(page);
  const avant = await luminanceMoyenne(page);
  await page.locator("[data-theme-toggle]").first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 5_000 });
  // La fumee se retire (1,2 s) et la scene finit de suivre (~0,8 s).
  await page.waitForTimeout(3500);
  const apres = await luminanceMoyenne(page);
  expect(apres, `avant ${avant.toFixed(2)}, apres ${apres.toFixed(2)}`).toBeGreaterThan(0.45);
  expect(apres).toBeGreaterThan(avant * 2);
});
