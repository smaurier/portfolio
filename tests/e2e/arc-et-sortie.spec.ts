import { test, expect, type Page } from "@playwright/test";

/**
 * L'ARC FINIT OU LA SORTIE COMMENCE (20/09, spec `docs/da/arc-dure-la-page.md`).
 *
 * C'est la SEULE promesse propre au design « l'arc dure la page », donc
 * c'est elle qu'un oracle doit porter -- et elle ne se voit sur aucune
 * capture. Le defaut qu'elle garde, mesure le 18/09 : sur Memoire, l'arc
 * finissait a 26 % du defilement et la sortie ne commencait qu'a 93 %.
 * Entre les deux, les deux tiers de la page se lisaient sur une scene qui
 * avait fini son histoire et ne repartait pas encore.
 *
 * CE QU'IL MESURE, ET POURQUOI PAS DEUX POINTS. Echantillonner « a 50 % » et
 * « a 80 % » ne dit rien : la reponse depend de la page. Ce test cherche les
 * deux bornes reelles -- le premier defilement ou l'arc est fini, le premier
 * ou la sortie a commence -- et mesure la distance entre elles. Un chiffre,
 * en fenetres, comparable d'une page a l'autre.
 *
 * IL LIT LE SITE, IL NE LE RECALCULE PAS. Les valeurs viennent de
 * `__nahualArc`, les refs memes que la scene consomme (sonde posee le 20/09
 * dans `scene-refs-context`, motif de `__nahualFoyer`). Un oracle qui
 * refait le calcul de la regle ne garde que son propre calcul : c'est la
 * lecon des sept rebasages de ce meme design, un test en pixels absolus est
 * vert par accident sur une page et rouge sur une autre.
 *
 * LA TOLERANCE EST UN CINQUIEME DE FENETRE, et elle n'est pas negociee sur
 * le resultat : avec 80 echantillons, le pas vaut 0,11 fenetre sur la page
 * la plus longue du site (Projets, 8,6 fenetres), donc la mesure est deux
 * fois plus fine que le seuil.
 *
 * PREMIERE MESURE, 20/09, avant le design (c'est le rouge qu'il faut avoir
 * vu) : Memoire, **5,77 fenetres** de zone morte -- arc fini a 1510 px,
 * sortie a 5663, sur une page de 8,4 fenetres. L'accueil, **0,24**. Et la
 * deuxieme ligne corrige une prediction ecrite ici meme : l'accueil devait
 * passer vert d'avance, les deux bornes valant le plancher sous 2,55
 * fenetres de defilement. En 1280 x 720, l'accueil en fait 2,79. Au-dessus
 * du seuil, donc une zone morte, petite et reelle. La page qui sert de
 * temoin n'etait pas le temoin qu'on croyait.
 */

const PAGES = ["fr", "fr/services", "fr/projets", "fr/contact", "fr/memoire"];

/** Un cinquieme de fenetre : au-dela, il y a une zone morte, pas un arrondi. */
const TOLERANCE_FENETRES = 0.2;
const ECHANTILLONS = 80;

type Releve = {
  max: number;
  vh: number;
  points: { y: number; arc: number; sortie: number }[];
};

async function attendreScene(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, {
    timeout: 90_000,
  });
}

/**
 * Descend la page en `n` paliers et releve les deux refs a chaque palier.
 *
 * Tout se passe DANS la page, en une seule evaluation : quatre-vingts
 * allers-retours Playwright couteraient une minute par page. On attend que
 * `scrollY` se pose avant de lire (Lenis lisse le defilement, la position
 * demandee n'est pas la position atteinte a l'image suivante), et on releve
 * la position REELLE, pas celle qu'on visait : la paire (position, refs)
 * reste coherente meme si le lissage prend du retard.
 */
async function balayer(page: Page, n: number): Promise<Releve> {
  return page.evaluate(async (pas) => {
    const sonde = (window as unknown as {
      __nahualArc?: { progress: { current: number }; exit: { current: number } };
    }).__nahualArc;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    if (!sonde) return { max: -1, vh, points: [] };

    const image = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    const points: { y: number; arc: number; sortie: number }[] = [];

    for (let i = 0; i <= pas; i++) {
      window.scrollTo(0, (max * i) / pas);
      // Pose : on attend que la position cesse de bouger, 20 images au plus.
      let precedent = Number.NaN;
      for (let k = 0; k < 20; k++) {
        await image();
        if (window.scrollY === precedent) break;
        precedent = window.scrollY;
      }
      points.push({ y: window.scrollY, arc: sonde.progress.current, sortie: sonde.exit.current });
    }

    window.scrollTo(0, 0);
    return { max, vh, points };
  }, n);
}

/** Le premier defilement ou le predicat est vrai, -1 s'il ne l'est jamais. */
function premier(points: Releve["points"], predicat: (p: Releve["points"][0]) => boolean): number {
  const t = points.find(predicat);
  return t ? t.y : -1;
}

for (const chemin of PAGES) {
  test(`/${chemin} : l'arc finit exactement ou la sortie commence`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto(`/${chemin}`);
    await attendreScene(page);

    const releve = await balayer(page, ECHANTILLONS);
    expect(releve.max, "la sonde __nahualArc est absente").toBeGreaterThan(0);

    const finDeLArc = premier(releve.points, (p) => p.arc >= 0.999);
    const debutDeLaSortie = premier(releve.points, (p) => p.sortie > 0.001);

    // Les deux bornes existent : en bas de page l'arc est fini et la sortie
    // jouee. Si l'une manque, ce n'est pas une zone morte, c'est une panne.
    expect(finDeLArc, "l'arc n'atteint jamais sa fin").toBeGreaterThanOrEqual(0);
    expect(debutDeLaSortie, "la sortie ne commence jamais").toBeGreaterThanOrEqual(0);

    const zoneMorte = (debutDeLaSortie - finDeLArc) / releve.vh;
    const detail = `arc fini a ${finDeLArc} px, sortie a ${debutDeLaSortie} px, page ${(releve.max / releve.vh).toFixed(1)} fenetres`;

    // Le defaut que ce design corrige : la scene a fini, le depart n'a pas
    // commence, et on lit encore.
    expect(zoneMorte, `zone morte de ${zoneMorte.toFixed(2)} fenetre -- ${detail}`).toBeLessThanOrEqual(
      TOLERANCE_FENETRES,
    );

    // L'inverse est un defaut aussi, et plus grave : la camera qui monte et
    // le cadre qui se ferme PENDANT que l'histoire se joue encore.
    expect(zoneMorte, `la sortie commence avant la fin de l'arc -- ${detail}`).toBeGreaterThanOrEqual(
      -TOLERANCE_FENETRES,
    );
  });
}
