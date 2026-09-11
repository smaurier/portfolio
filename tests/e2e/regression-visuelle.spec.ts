import { test, expect } from "@playwright/test";

/**
 * LA REGRESSION VISUELLE (11/09, Q4 du backlog).
 *
 * Un site vivant se casse en silence : un materiau qui perd sa couleur, un
 * panneau qui glisse, une scene qui devient noire. Cette suite compare
 * chaque page, a deux points de l'arc, a une reference enregistree sur
 * CETTE machine (les captures WebGL varient d'une carte graphique a
 * l'autre : les references sont par plateforme, dans __screenshots__).
 *
 * La scene est prise sous « mouvement reduit » (boucle a la demande, plus
 * de respiration ni de particules, lib/reduced-motion). MESURE DU 11/09 : ce
 * n'est pas assez pour une reference au pixel : deux passages identiques
 * different de 2 a 13 % des pixels selon la page (la camera ne retombe pas
 * exactement au meme point de l'arc, des simulateurs avancent encore).
 * Sous ce bruit, un seuil honnete ne detecte que des desastres (une scene
 * noire, un panneau parti) : c'est ce que fait cette suite, avec 20 % de
 * pixels tolerés, et elle ne tourne QUE sur demande (VISUEL=1), jamais dans
 * la suite par defaut, pour ne pas y mettre un test instable. Q4 du backlog
 * reste ouvert : il faut un etat de scene reellement fige (la pause, un
 * temps de simulation gele) et une machine de reference.
 *
 * Creer ou mettre a jour les references, apres avoir REGARDE les differences :
 *   VISUEL=1 pnpm exec playwright test tests/e2e/regression-visuelle.spec.ts --update-snapshots
 */
test.skip(!process.env.VISUEL, "regression visuelle sur demande seulement (VISUEL=1) : bruit de 2 a 13 % mesure le 11/09");
test.use({ contextOptions: { reducedMotion: "reduce" }, viewport: { width: 1280, height: 720 } });

const PAGES = ["fr", "fr/services", "fr/projets", "fr/contact", "fr/memoire"];
const ETAPES = [0.35, 0.8];

for (const chemin of PAGES) {
  for (const f of ETAPES) {
    test(`/${chemin} a ${Math.round(f * 100)} % de l'arc ressemble a sa reference`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.goto("/" + chemin + "?shaders-prod");
      await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
      await page.waitForTimeout(2500);
      await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f), f);
      await page.waitForTimeout(2500);
      await expect(page).toHaveScreenshot(`${chemin.replace("/", "-")}-${Math.round(f * 100)}.png`, {
        maxDiffPixelRatio: 0.2,
        threshold: 0.3,
        animations: "disabled",
        caret: "hide",
      });
    });
  }
}
