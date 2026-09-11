import { test, expect } from "@playwright/test";

/**
 * AUCUN PROGRAMME NE COMPILE EN COURS D'ARC (11/09, Q1 du backlog).
 *
 * three compile un programme a la premiere image visible d'un materiau, en
 * synchrone : un arret, exactement la ou un geste doit etre fluide. La
 * chauffe des shaders (shader-warmup) compile tout derriere le voile, puis
 * a chaque arrivee et a chaque objet nouveau, un programme par image. Ce
 * test garde l'acquis : du voile leve au bas de la page, le nombre de
 * programmes ne bouge pas. Deterministe (un compte, pas un temps), sur le
 * serveur de dev (le handle __nahualR3f n'existe qu'en dev).
 *
 * L'INTENTION compile la direction suivante trois secondes apres le voile,
 * un programme par image pendant une quarantaine d'images : on attend huit
 * secondes apres le voile avant de prendre la ligne de base, sinon le test
 * prend cette pre-compilation pour des retards (mesure du 11/09 : 24
 * programmes « tardifs » a 15 % sur Contact, tous de la direction suivante).
 *
 * Le seuil est zero. Une tolerance documentee d'un programme a Projets et a
 * Memoire, a 15 % de l'arc (T5 du backlog) ; a retirer quand T5 est fait.
 */
const PAGES: [string, number][] = [
  ["fr", 0],
  ["fr/services", 0],
  ["fr/projets", 1],
  ["fr/contact", 0],
  ["fr/memoire", 1],
];
const ETAPES = [0.15, 0.35, 0.55, 0.8, 1];

for (const [chemin, tolerance] of PAGES) {
  test(`/${chemin} : aucun programme compile en cours d'arc (tolerance ${tolerance})`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/" + chemin + "?shaders-prod");
    await page.waitForFunction(
      () => document.documentElement.dataset.loaded === "true" && !!(window as unknown as { __nahualR3f?: unknown }).__nahualR3f,
      null,
      { timeout: 90_000 },
    );
    await page.waitForTimeout(8000);
    const lire = () => page.evaluate(() => (window as unknown as { __nahualR3f: { gl: { info: { programs: unknown[] } } } }).__nahualR3f.gl.info.programs.length);
    const arrivee = await lire();
    const nouveaux: string[] = [];
    let precedent = arrivee;
    for (const f of ETAPES) {
      await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f), f);
      await page.waitForTimeout(1500);
      const n = await lire();
      if (n > precedent) nouveaux.push(`${Math.round(f * 100)} % : +${n - precedent}`);
      precedent = Math.max(precedent, n);
    }
    expect(arrivee, "des programmes existent a l'arrivee").toBeGreaterThan(10);
    const total = precedent - arrivee;
    expect(total, `${total} programme(s) compile(s) en cours d'arc (${nouveaux.join(" ; ")})`).toBeLessThanOrEqual(tolerance);
  });
}
