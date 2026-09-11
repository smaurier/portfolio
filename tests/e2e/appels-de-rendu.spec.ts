import { test, expect } from "@playwright/test";

/**
 * UN PLAFOND D'APPELS DE RENDU PAR PAGE (11/09, Q2 du backlog).
 *
 * Le 09/09, le Sud etait a 1 349 appels de rendu par image sans que rien
 * ne le dise ; ramene a 211 en une soiree. Ce test fige les ordres de
 * grandeur mesures le 11/09 (bureau 1280x720, passes du post-traitement
 * comprises, maximum sur trois points de l'arc) avec quinze pour cent de
 * marge : un composant qui multiplie les maillages sera vu au commit.
 *
 * `gl.info` est remis a zero par three a chaque `render` : avec le
 * compositeur, la derniere passe ne compte qu'un appel. On coupe
 * `autoReset` le temps de la mesure et on lit le total d'une image.
 */
const PLAFONDS: [string, number][] = [
  ["fr", 195],
  ["fr/services", 155],
  ["fr/projets", 235],
  ["fr/contact", 245],
  ["fr/memoire", 180],
];
const ETAPES = [0, 0.5, 0.9];

for (const [chemin, plafond] of PLAFONDS) {
  test(`/${chemin} : au plus ${plafond} appels de rendu par image`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/" + chemin);
    await page.waitForFunction(
      () => document.documentElement.dataset.loaded === "true" && !!(window as unknown as { __nahualR3f?: unknown }).__nahualR3f,
      null,
      { timeout: 90_000 },
    );
    const releves: string[] = [];
    let pire = 0;
    for (const f of ETAPES) {
      await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f), f);
      await page.waitForTimeout(3000);
      const max = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            type Info = { autoReset: boolean; reset: () => void; render: { calls: number } };
            const info = (window as unknown as { __nahualR3f: { gl: { info: Info } } }).__nahualR3f.gl.info;
            info.autoReset = false;
            const vals: number[] = [];
            let n = 0;
            const tick = () => {
              vals.push(info.render.calls);
              info.reset();
              if (++n < 30) requestAnimationFrame(tick);
              else {
                info.autoReset = true;
                resolve(Math.max(...vals.slice(2)));
              }
            };
            info.reset();
            requestAnimationFrame(tick);
          }),
      );
      releves.push(`${Math.round(f * 100)} % : ${max}`);
      pire = Math.max(pire, max);
    }
    expect(pire, `appels de rendu par image : ${releves.join(" ; ")}`).toBeLessThanOrEqual(plafond);
    expect(pire, "la scene rend quelque chose").toBeGreaterThan(10);
  });
}
