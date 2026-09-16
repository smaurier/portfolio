import { test, expect } from "@playwright/test";

/**
 * UN PASSAGE CARDINAL NE FAIT NI CREUX NI MARCHE (16/09).
 *
 * Mesure du 15/09, echantillon du canvas en vrais pixels : sur les cinq
 * passages de l'anneau, deux etaient fautifs.
 *
 *   Nord vers Centre : 32, 32, 32, 30, 12, 71   <- UN CREUX, une image au noir
 *   Sud vers Ouest   : 20, 20, 72               <- UNE MARCHE, aucun fondu
 *
 * LES DEUX CAUSES, trouvees le 16/09 :
 *
 *  - le creux : `CardinalLink` appelait `router.push(href)` sans options,
 *    et l'App Router remonte en haut de page par defaut. Lenis, monte une
 *    seule fois dans le layout, garde sa propre valeur de defilement et la
 *    reecrit a son tick suivant. Entre les deux, une image est rendue a
 *    l'avancement zero, et `getRevealFloor(0)` vaut zero : l'arc y est noir
 *    par construction. D'ou `scroll: false`, qui rend explicite l'intention
 *    deja ecrite dans `scene-refs-context` (« l'utilisateur qui navigue en
 *    interne ne veut pas repartir de zero »).
 *  - la marche : `approachFog` lissait la PORTEE du brouillard, mais sa
 *    TEINTE basculait d'un coup au commit. D'ou `approachTint`.
 *
 * L'ORACLE EST RELATIF, PAS ABSOLU, et c'est ce qui le rend utilisable :
 * la luminance absolue d'une page depend de la machine, du pilote et de
 * l'heure du jour rendue par la scene, mais la FORME d'un creux ne depend
 * de rien. Une image plus sombre que ses deux voisines d'un facteur qu'on
 * ne peut pas attribuer au hasard est un creux, ici comme ailleurs.
 *
 * Meme raison qu'ailleurs dans cette suite : agent « Desktop Chrome »,
 * sinon le site se croit visite par un robot et ne monte pas la scene.
 */

/** Sous ce facteur par rapport a la plus sombre de ses deux voisines,
 *  une image est un creux. Le creux mesure le 15/09 valait 0,40 fois sa
 *  voisine ; un fondu propre ne descend pas sous 0,85. */
const FACTEUR_CREUX = 0.6;

/**
 * Part de l'ecart total qu'une seule image a le droit de franchir. Une
 * bascule seche en franchit 1,0 ; le fondu vise, qui dure une seconde, en
 * franchit quelques centiemes.
 *
 * LE SEUIL EST A 0,6 ET PAS A 0,35, ET C'EST UN AVEU. Mesures du 16/09,
 * avant puis apres les trois corrections (scroll, teinte, fondu d'arc) :
 *
 *   Sud vers Ouest    0,93  ->  0,49
 *   Nord vers Centre  0,65  ->  0,36
 *
 * Il reste donc une marche, et elle a un nom. Sonde `qui-apparait` :
 * a l'image du saut, les lumieres BAISSENT, le brouillard, la camera, le
 * plancher de revelation, la vignette et le bloom sont tous continus, et
 * le nombre d'objets visibles ne bouge pas. Ce qui bouge, c'est l'image
 * suivante : le decor propre a la direction quittee sort et celui de la
 * nouvelle entre EN UNE SEULE IMAGE (les cranes et les porteuses d'annee
 * du Sud, puis les pieces de l'Ouest). Les ambiances, elles, fondent
 * deja. C'est un chantier a part, avec une vraie question de direction
 * artistique derriere : comment le monde d'une direction s'en va-t-il.
 *
 * Le seuil garde donc ce qui est acquis (il retombe au rouge si l'une des
 * trois corrections saute) sans pretendre que le passage est fini. Quand
 * le decor traversera a son tour, le ramener a 0,35.
 */
const PART_MAX_PAR_IMAGE = 0.6;

/** En dessous, l'ecart entre les deux pages est trop faible pour que la
 *  marche veuille dire quoi que ce soit (Est vers Sud est dans ce cas). */
const ECART_SIGNIFICATIF = 12;

const TRAJETS: { de: string; vers: string; quoi: string }[] = [
  { de: "fr/memoire", vers: "fr", quoi: "Nord vers Centre (le creux du 15/09)" },
  { de: "fr/projets", vers: "fr/contact", quoi: "Sud vers Ouest (la marche du 15/09)" },
];

type Releve = { lum: number; chemin: string };

for (const { de, vers, quoi } of TRAJETS) {
  test(`${quoi} : ni creux ni marche`, async ({ page }) => {
    test.setTimeout(150_000);

    await page.goto("/" + de + "?shaders-prod&veille=off");
    await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
    // Le survol precede le clic, comme chez un visiteur au bureau : la
    // direction visee se monte et se compile avant le voyage.
    await page.locator(`a[href="/${vers}"]`).first().hover({ force: true });
    await page.waitForTimeout(3500);

    // Echantillonnage A CHAQUE IMAGE, depuis la page : un aller-retour par
    // mesure raterait justement l'image unique qu'on cherche.
    await page.evaluate(() => {
      const w = window as unknown as {
        __toile: HTMLCanvasElement | null;
        __mini: HTMLCanvasElement;
        __c2: CanvasRenderingContext2D;
        __suite: Releve[];
        __stop: boolean;
      };
      w.__toile = document.querySelector("canvas");
      w.__mini = document.createElement("canvas");
      w.__mini.width = 48;
      w.__mini.height = 30;
      w.__c2 = w.__mini.getContext("2d", { willReadFrequently: true })!;
      w.__suite = [];
      w.__stop = false;
      const tick = () => {
        if (w.__stop) return;
        if (w.__toile) {
          w.__c2.drawImage(w.__toile, 0, 0, 48, 30);
          const d = w.__c2.getImageData(0, 0, 48, 30).data;
          let s = 0;
          for (let i = 0; i < d.length; i += 4) s += (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
          w.__suite.push({ lum: s / (d.length / 4), chemin: location.pathname });
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    await page.evaluate((url) => {
      const l = [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === url);
      if (l instanceof HTMLElement) l.click();
    }, "/" + vers);

    // Le voyage dure deux secondes (NEPANTLA_TIMING.progressDuration) et le
    // fondu de teinte environ une : on regarde large.
    await page.waitForTimeout(4000);

    const suite: Releve[] = await page.evaluate(() => {
      const w = window as unknown as { __suite: Releve[]; __stop: boolean };
      w.__stop = true;
      return w.__suite;
    });

    expect(suite.length, "aucune image echantillonnee : la toile n'a pas ete lue").toBeGreaterThan(60);
    expect(
      suite.some((e) => e.chemin.replace(/\/$/, "") === "/" + vers.replace(/\/$/, "")),
      "la navigation n'a pas eu lieu",
    ).toBe(true);

    const lums = suite.map((e) => e.lum);
    const dessine = (i: number) =>
      lums
        .slice(Math.max(0, i - 3), i + 4)
        .map((v, k) => `${Math.max(0, i - 3) + k === i ? ">" : " "}${v.toFixed(1)}`)
        .join(" ");

    // 1. AUCUN CREUX : pas d'image plus sombre que ses deux voisines.
    const creux: string[] = [];
    for (let i = 1; i < lums.length - 1; i += 1) {
      const voisine = Math.min(lums[i - 1], lums[i + 1]);
      if (voisine > 1 && lums[i] < voisine * FACTEUR_CREUX) {
        creux.push(`image ${i} : ${lums[i].toFixed(1)} contre ${voisine.toFixed(1)} [${dessine(i)}]`);
      }
    }
    expect(creux, `creux de luminance :${String.fromCharCode(10)}${creux.join(String.fromCharCode(10))}`).toEqual([]);

    // 2. AUCUNE MARCHE : la traversee se fait en plusieurs images.
    const ecart = Math.max(...lums) - Math.min(...lums);
    if (ecart >= ECART_SIGNIFICATIF) {
      let plusGrandPas = 0;
      let ou = 0;
      for (let i = 1; i < lums.length; i += 1) {
        const pas = Math.abs(lums[i] - lums[i - 1]);
        if (pas > plusGrandPas) {
          plusGrandPas = pas;
          ou = i;
        }
      }
      expect(
        plusGrandPas / ecart,
        `plus grand pas ${plusGrandPas.toFixed(1)} sur un ecart de ${ecart.toFixed(1)}, image ${ou} [${dessine(ou)}]`,
      ).toBeLessThan(PART_MAX_PAR_IMAGE);
    }
  });
}
