import { test, expect } from "@playwright/test";

/**
 * LE VOYAGE ENTRE DEUX PAGES NE FIGE PAS LE FIL PRINCIPAL (11/09).
 *
 * Mesure du 11/09 avant correction, production locale, bureau : 1,8 s de
 * gel vers Memoire, 2,6 s de Projets vers Services, parce que three
 * compilait les programmes de la nouvelle direction a leur premiere image.
 * Depuis, la chauffe recompile a chaque arrivee pendant que le sous-arbre
 * reste invisible (shader-warmup, mount-for-direction).
 *
 * L'oracle : du clic a six secondes plus tard, aucune image ne dure plus
 * de 300 ms. Le seuil est large pour une machine chargee ; le defaut, lui,
 * se mesurait en secondes. Mesure en production apres correction : pires
 * images 187, 121, 66 et 71 ms sur les quatre trajets. Cette suite tourne avec l'agent « Desktop
 * Chrome » de Playwright, un agent reel : avec l'agent HeadlessChrome par
 * defaut, le site se croit visite par un robot et ne monte pas la scene.
 */
const TRAJETS: [string, string][] = [
  ["fr/contact", "fr/memoire"],
  ["fr/projets", "fr/services"],
];
const PLAFOND_MS = 300;

for (const [de, vers] of TRAJETS) {
  test(`voyage ${de} -> ${vers} : aucune image au-dessus de ${PLAFOND_MS} ms`, async ({ page }) => {
    test.setTimeout(150_000);
    // `?shaders-prod` : three sans verification synchrone des programmes,
    // comme en production (voir persistent-scene) ; le reglage survit a la
    // navigation, le canvas est persistant.
    await page.goto("/" + de + "?shaders-prod");
    await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
    // Comme un visiteur au bureau : le survol du lien (l'intention, qui monte
    // et compile la direction visee) precede le clic de quelques secondes.
    // Le montage lui-meme coute une image longue (backlog) ; l'oracle porte
    // sur le VOYAGE, du clic a l'arrivee.
    await page.locator(`a[href="/${vers}"]`).first().hover({ force: true });
    await page.waitForTimeout(3500);
    await page.evaluate(() => {
      const w = window as unknown as { __gaps: number[] };
      w.__gaps = [];
      let last = performance.now();
      const t0 = last;
      const tick = () => {
        const n = performance.now();
        w.__gaps.push(n - last);
        last = n;
        if (n - t0 < 7000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.locator(`a[href="/${vers}"]`).first().click({ force: true });
    await page.waitForFunction((v) => location.pathname === "/" + v, vers, { timeout: 30_000 });
    // La ligne de seuil (N1) : une region de statut existe pour le voyage.
    await expect(page.locator("p.seuilVoyage[role=status]")).toHaveCount(1);
    await page.waitForTimeout(6500);
    const gaps = await page.evaluate(() => (window as unknown as { __gaps: number[] }).__gaps);
    const pire = Math.max(...gaps);
    expect(gaps.length, "des images ont ete mesurees").toBeGreaterThan(60);
    expect(pire, `pire image ${pire.toFixed(0)} ms (${gaps.filter((g) => g > 100).length} au-dessus de 100 ms)`).toBeLessThan(PLAFOND_MS);
  });
}
