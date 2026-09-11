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
 * un programme par image : on attend que le compte de programmes soit
 * stable trois secondes avant de prendre la ligne de base, sinon le test
 * prend cette pre-compilation pour des retards (mesure du 11/09 : 24
 * programmes « tardifs » a 15 % sur Contact, tous de la direction suivante).
 *
 * Le seuil est zero, sur les cinq pages (la tolerance d'un programme a
 * Projets et Memoire, T5, est tombee avec le compte des programmes nes au
 * rendu : ces programmes etaient des tranches de la chauffe).
 */
const PAGES: [string, number][] = [
  ["fr", 0],
  ["fr/services", 0],
  ["fr/projets", 0],
  ["fr/contact", 0],
  ["fr/memoire", 0],
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
    // Programmes existants MOINS ceux crees par la chauffe (handle de dev
    // __nahualChauffe) : ce qui reste est ne au rendu, un gel.
    const lire = () =>
      page.evaluate(() => {
        const w = window as unknown as { __nahualR3f: { gl: { info: { programs: unknown[] } } }; __nahualChauffe?: { crees: number } };
        return w.__nahualR3f.gl.info.programs.length - (w.__nahualChauffe?.crees ?? 0);
      });
    // La ligne de base se prend quand la chauffe est INACTIVE : le compte de
    // programmes n'a pas bouge pendant trois secondes (l'intention compile
    // la direction suivante un programme par image ; sur une machine
    // chargee, huit secondes fixes ne suffisaient pas).
    // D'abord le delai de l'intention (trois secondes apres le voile), sinon
    // la stabilite se constate AVANT qu'elle ne demarre.
    await page.waitForTimeout(5000);
    let stable = 0;
    let precedentLu = -1;
    for (let i = 0; i < 40 && stable < 3; i++) {
      await page.waitForTimeout(1000);
      const n = await lire();
      stable = n === precedentLu ? stable + 1 : 0;
      precedentLu = n;
    }
    const arrivee = await lire();
    const nouveaux: string[] = [];
    let precedent = arrivee;
    for (const f of ETAPES) {
      await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f), f);
      await page.waitForTimeout(1500);
      const n = await lire();
      if (n > precedent) nouveaux.push(`${Math.round(f * 100)} % : +${n - precedent} au rendu`);
      precedent = Math.max(precedent, n);
    }
    const total = precedent - arrivee;
    const tardifs = await page.evaluate(() => (window as unknown as { __nahualTardifs?: string[] }).__nahualTardifs ?? []);
    expect(total, `${total} programme(s) compile(s) en cours d'arc (${nouveaux.join(" ; ")}) : ${tardifs.slice(-4).join(" | ")}`).toBeLessThanOrEqual(tolerance);
  });
}
