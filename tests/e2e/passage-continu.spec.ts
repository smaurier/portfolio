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
 * LE SEUIL EST A 0,15, ET IL NE GARDE PLUS UN AVEU (17/09).
 *
 * Mesures successives du trajet Sud vers Ouest, toutes sur trois passes :
 *
 *   15/09, avant tout                            0,93
 *   16/09, apres scroll + teinte + fondu d'arc   0,49
 *   17/09, apres « on arrive en haut de l'arc »  0,58  0,61   <- regression
 *   17/09, apres le ciel par le depot            0,092 0,092 0,100
 *
 * LA REGRESSION, PARCE QU'ELLE SE LIT MAL AUTREMENT. Arriver en haut de
 * l'arc (16/09, 8066788) a fait REMONTER la marche de 0,49 a 0,59, et le
 * seuil valait 0,6 : l'oracle n'a pas rougi, il a frole. La cause n'etait
 * pas la descente, elle etait bonne ; c'est que l'ecart d'arc au commit
 * est devenu maximal, et que deux lecteurs de l'arc n'etaient pas passes
 * par le fondu. Un seuil pose au ras de la mesure du jour ne garde rien :
 * il attend la regression suivante pour devenir faux.
 *
 * CE QUI RESTE, ET POURQUOI CE N'EST PLUS LA MEME CHOSE. Sonde
 * `diff-au-saut` apres correction : 4,0 points de luminance au lieu de
 * 26,2, et plus aucun uniforme du ciel dans le diff. Restent la camera
 * qui se deplace encore de cinq unites dans l'image du commit, un
 * `Points` qui entre a 0,06 d'alpha, et une paire mesh/points qui change
 * de couleur d'un bloc (bleu vers rouge). Trois chantiers nommes, aucun
 * dominant.
 *
 * Le seuil garde donc 0,10 avec une marge de moitie : il rougit si l'une
 * des corrections saute, sans rougir pour le bruit de chauffe.
 */
const PART_MAX_PAR_IMAGE = 0.15;

/** En dessous, l'ecart entre les deux pages est trop faible pour que la
 *  marche veuille dire quoi que ce soit (Est vers Sud est dans ce cas). */
const ECART_SIGNIFICATIF = 12;

/**
 * LA NUIT, EXPLICITEMENT (16/09, et ca a failli nous avoir).
 *
 * Le meme jour, la face du monde a cesse d'etre la nuit par defaut pour
 * suivre la preference du visiteur (lib/theme.faceInitiale). Playwright
 * n'exprime aucune preference, donc il recevait desormais l'amate, ou la
 * luminance moyenne tourne autour de 211 au lieu de 20. Les seuils de ce
 * fichier sont calibres sur des mesures faites dans la nuit : sans cette
 * ligne, ils compareraient deux mondes differents et passeraient au vert
 * pour une raison qui n'a rien a voir avec ce qu'ils gardent.
 *
 * L'amate merite le meme oracle, mais comme une seconde execution, pas
 * comme un accident (backlog SOTY, entree F2).
 */
test.use({ colorScheme: "dark" });

/**
 * CHAQUE TRAJET NE GARDE QUE CE QU'IL MESURE VRAIMENT (16/09).
 *
 * La premiere version appliquait les deux assertions aux deux trajets.
 * Trois passes de suite sur Nord vers Centre ont donne 0,64, puis vert,
 * puis vert : la valeur straddle le seuil, parce que ce trajet a un ecart
 * de luminance plus faible et que ce qui reste de marche depend de
 * l'instant ou la chauffe des shaders finit, qui n'est pas deterministe.
 * Un oracle qui tombe une fois sur trois ne garde rien : il apprend a
 * ignorer les rouges.
 *
 * Sud vers Ouest, lui, est stable (0,49 puis 0,487 sur deux passes) parce
 * que son ecart est large. C'est donc lui qui porte la marche ; Nord vers
 * Centre porte le creux, qui est le defaut qu'il a reellement montre le
 * 15/09 et qui, lui, ne varie pas du tout.
 */
const TRAJETS: { de: string; vers: string; quoi: string; marche: boolean }[] = [
  { de: "fr/memoire", vers: "fr", quoi: "Nord vers Centre (le creux du 15/09)", marche: false },
  { de: "fr/projets", vers: "fr/contact", quoi: "Sud vers Ouest (la marche du 15/09)", marche: true },
];

type Releve = { lum: number; chemin: string };

for (const { de, vers, quoi, marche } of TRAJETS) {
  test(`${quoi} : ${marche ? "ni creux ni marche" : "aucun creux"}`, async ({ page }) => {
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

    // 2. AUCUNE MARCHE : la traversee se fait en plusieurs images. Seulement
    // sur le trajet ou la mesure est stable (voir TRAJETS).
    const ecart = Math.max(...lums) - Math.min(...lums);
    if (marche && ecart >= ECART_SIGNIFICATIF) {
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

/**
 * ON ARRIVE TOUJOURS EN HAUT (16/09, decision de Sylvain : « on doit
 * remonter absolument tout en haut lorsqu'on arrive sur une nouvelle
 * scene, sinon tout se joue lorsqu'on arrive »).
 *
 * Le test part d'un defilement REEL : sans ca il passerait au vert sans
 * rien garder, puisque la descente ne se joue que si on n'est pas deja en
 * haut. C'est la lecon du 16/09 sur les lectures de mise en page : un
 * oracle qui ne tombe pas sur le defaut qu'il pretend garder ne vaut rien.
 */
test("un passage cardinal ramene en haut de l'arc", async ({ page }) => {
  test.setTimeout(150_000);

  await page.goto("/fr/projets?shaders-prod&veille=off");
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });

  // A mi-arc : la ou l'ancien comportement laissait arriver le visiteur.
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2));
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);

  await page.locator('a[href="/fr/contact"]').first().hover({ force: true });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const l = [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === "/fr/contact");
    if (l instanceof HTMLElement) l.click();
  });

  await page.waitForTimeout(4000);
  expect(page.url()).toContain("/fr/contact");
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(2);
});
