// tests/e2e/partition-centre.spec.ts
import { test, expect, devices, type Page } from "@playwright/test";

/**
 * LA PARTITION DU CENTRE (11/10, spec 2026-10-10-partition-texte-design).
 *
 * Audit visuel du 10/10 : a t=0,15 trois panneaux de texte se lisaient
 * ensemble, a t=0,4 le chant cachait le cerf. Sylvain : « un seul panneau
 * a la fois [...] C'est l'image qui prevaut. »
 *
 * L'oracle lit le site, pas la lib : a sept instants de l'arc (`?t=`, lien
 * de l'instant v2), parmi TOUS les blocs nommes (`data-bloc` : le calque
 * fixe, le chant en flux, la cloture), au plus un est visible, c'est celui
 * de la partition, et au climax (0,72, dans le silence 0,66 -> 0,78) il
 * n'y en a aucun. Pour les chapitres, la cascade des mots est bien jouee
 * (RevealText pilote par la fenetre).
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

const ATTENDU: readonly [number, string | null][] = [
  [0.05, "hero"],
  [0.21, "chapitre-0"],
  [0.41, "chant"],
  [0.59, "chapitre-1"],
  [0.72, null],
  [0.86, "chapitre-2"],
  [0.98, "cloture"],
];

async function blocsVisibles(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const eff = (n: Element | null) => {
      let o = 1;
      for (; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity || "1");
      return o;
    };
    return [...document.querySelectorAll<HTMLElement>("[data-bloc]")]
      .filter((b) => {
        const cs = getComputedStyle(b);
        return cs.display !== "none" && cs.visibility !== "hidden" && eff(b) > 0.05;
      })
      .map((b) => b.dataset.bloc ?? "?");
  });
}

for (const [t, bloc] of ATTENDU) {
  test(`/fr?t=${t} : ${bloc ? `seul « ${bloc} » parle` : "le silence, l'image seule"}`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto(`/fr?t=${t}&v=2&shaders-prod`);
    await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
    // Le lien de l'instant defile une fois le voile tombe ; puis les
    // transitions d'opacite (0,6 s) et de la cloture (0,4 s) finissent.
    await page.waitForTimeout(2500);
    expect(await blocsVisibles(page), `a t=${t}`).toEqual(bloc ? [bloc] : []);
    if (bloc?.startsWith("chapitre")) {
      // Les deux RevealText du chapitre (kicker + ligne) ont joue leur cascade.
      await expect(page.locator(`[data-bloc="${bloc}"] [class*="revealed"]`)).toHaveCount(2);
    }
  });
}
