import type { Page } from "@playwright/test";

/**
 * OU EST « 80 % DE L'ARC » SUR CETTE PAGE (20/09, `docs/da/arc-dure-la-page.md`).
 *
 * Avant ce design, l'arc faisait deux fenetres partout : un test pouvait
 * ecrire `window.innerHeight * 1.6` et viser les quatre cinquiemes de
 * l'histoire. La longueur suit desormais la page, et ces pixels-la ne
 * veulent plus rien dire -- sur Projets, 1,6 fenetre ne fait plus que 22 %
 * de l'arc. Sept endroits de la suite visaient ainsi en pixels absolus.
 *
 * LA REGLE N'EST PAS RECOPIEE ICI. La longueur vient de `__nahualArc.longueur()`,
 * c'est-a-dire de `arcScrollHeight` elle-meme, celle que le site consomme.
 * Une aide de test qui refait le calcul ne garde que son propre calcul, et
 * les deux derivent en silence des qu'on touche a la formule.
 */
export async function positionDansArc(page: Page, fraction: number): Promise<number> {
  const arc = await longueurDeLArc(page);
  return arc * fraction;
}

/** Defile jusqu'a une fraction de l'arc reel de la page. */
export async function defilerDansLArc(page: Page, fraction: number): Promise<void> {
  const y = await positionDansArc(page, fraction);
  await page.evaluate((t) => window.scrollTo({ top: t, behavior: "instant" }), y);
}

/** La longueur de l'arc de la page courante, en pixels, telle que le site la calcule. */
export async function longueurDeLArc(page: Page): Promise<number> {
  const arc = await page.evaluate(() => {
    const sonde = (window as unknown as { __nahualArc?: { longueur: () => number } }).__nahualArc;
    return sonde ? sonde.longueur() : -1;
  });
  if (arc < 0) throw new Error("la sonde __nahualArc est absente : la scene n'est pas montee");
  return arc;
}
