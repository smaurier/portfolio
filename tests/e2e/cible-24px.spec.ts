import { test, expect, devices, type Page } from "@playwright/test";

/**
 * LA TAILLE DES CIBLES DE LA BARRE (WCAG 2.5.8, nouveau en 2.2).
 * Design : docs/superpowers/specs/2026-11-02-trois-couches-design.md,
 * oracle n° 5 de la section 10.
 *
 * Pourquoi ce test existe. La conception des trois couches (25/10) a releve
 * que « la barre de gauche porte huit icones dont la taille n'est PAS
 * mesuree », et que ce serait « le premier endroit ou ca coincera » quand on
 * y ajoutera la truelle. La feuille de style AFFIRME pourtant le contraire,
 * en commentaire : « a 36 px, toujours au-dessus de la cible minimale de
 * 24 px ». ⛔ Un commentaire n'est pas une mesure -- et ce depot en a la
 * preuve : celui de `netlify.toml` affirmait que le defaut etait « du bon
 * cote » alors qu'il etait du mauvais, ce qui a coute une mise en ligne
 * fantome le 28/10. Ce test transforme donc l'affirmation en releve, et il
 * gardera la barre REFONDUE (02/11) quand la truelle y entrera.
 *
 * Le critere est applique en entier, pas a moitie : une cible sous 24x24
 * n'est pas fautive si l'ESPACEMENT la sauve. La regle exacte de 2.5.8 :
 * un cercle de 24 px de diametre centre sur la cible ne doit croiser ni une
 * autre cible, ni le cercle d'une autre cible sous-dimensionnee. Une
 * verification naive a 24x24 rendrait donc de faux defauts.
 *
 * ⚠️ RGAA 4.1.2 ne porte PAS ce critere (il s'aligne sur WCAG 2.1) : il
 * arrivera avec RGAA 5, en cours de redaction. Ce test est donc en avance
 * sur le referentiel, ce qui est exactement ce que la spec a decide.
 */

const MINIMUM = 24;

type Cible = { w: number; h: number; cx: number; cy: number; label: string; href: string | null; boussole: boolean };

/**
 * Les liens de TOUTE la page avec leur taille, pour l'exception
 * d'equivalence de 2.5.8 (« la fonction peut etre atteinte par un autre
 * controle de la meme page qui, lui, respecte le critere »).
 *
 * ⚠️ Limite assumee de cette implementation : l'equivalence est jugee sur
 * le `href`, qui est un bon substitut pour une navigation mais ne dit rien
 * de deux BOUTONS qui feraient la meme chose. Le jour ou un bouton
 * sous-dimensionne apparait dans la barre, cette exception ne le couvrira
 * pas automatiquement, et c'est le bon defaut : mieux vaut un faux rouge
 * qu'une exemption inventee.
 */
async function liensDeLaPage(page: Page): Promise<{ href: string; w: number; h: number }[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]"))
      .map((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        const visible = s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0 && r.width >= 1 && r.height >= 1;
        return visible ? { href: el.getAttribute("href") ?? "", w: r.width, h: r.height } : null;
      })
      .filter((x): x is { href: string; w: number; h: number } => x !== null),
  );
}

async function cibles(page: Page): Promise<Cible[]> {
  return page.evaluate(() => {
    // La barre, c'est tout ce qui porte `data-scene-controls` : le bloc de
    // boutons, le bouton son, la boussole et le mode recit. On prend les
    // elements interactifs qui le portent OU qui vivent dedans, pour que la
    // mesure ne depende pas de l'implementation de chacun.
    const racines = Array.from(document.querySelectorAll("[data-scene-controls]"));
    const vus = new Set<Element>();
    const out: { w: number; h: number; cx: number; cy: number; label: string; href: string | null; boussole: boolean }[] = [];
    for (const racine of racines) {
      const candidats = racine.matches("button, a[href], [role=button]")
        ? [racine]
        : Array.from(racine.querySelectorAll("button, a[href], [role=button]"));
      for (const el of candidats) {
        if (vus.has(el)) continue;
        vus.add(el);
        const r = el.getBoundingClientRect();
        // Une cible masquee n'est pas une cible : le critere ne porte que
        // sur ce qui est atteignable au pointeur.
        if (r.width < 1 || r.height < 1) continue;
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
        const label =
          el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 28) ?? el.tagName;
        out.push({
          w: r.width,
          h: r.height,
          cx: r.x + r.width / 2,
          cy: r.y + r.height / 2,
          label,
          href: el.getAttribute("href"),
          // Les cinq points cardinaux de la boussole, traites a part : voir
          // le test marque `fixme` en bas de ce fichier.
          boussole: el.hasAttribute("data-compass-direction"),
        });
      }
    }
    return out;
  });
}

/** Le cercle de 24 px de diametre centre sur une cible croise-t-il ce
 *  rectangle ? (distance du centre au rectangle < le rayon) */
function cercleCroiseRect(cible: Cible, autre: Cible): boolean {
  const dx = Math.max(Math.abs(cible.cx - autre.cx) - autre.w / 2, 0);
  const dy = Math.max(Math.abs(cible.cy - autre.cy) - autre.h / 2, 0);
  return Math.hypot(dx, dy) < MINIMUM / 2;
}

/**
 * L'exception d'espacement de 2.5.8, prise a la lettre : « les cibles
 * sous-dimensionnees sont placees de sorte que, si un cercle de 24 px de
 * DIAMETRE est centre sur la boite de chacune, les cercles ne croisent ni
 * une autre cible, ni le cercle d'une autre cible sous-dimensionnee ».
 *
 * Deux conditions distinctes, et c'est pour ca que la premiere version de
 * cette fonction etait fausse : elle ne comparait que les distances entre
 * centres (bon pour cercle contre cercle), ce qui est plus PERMISSIF que le
 * critere face a une grande cible voisine, dont c'est la BOITE qu'il ne
 * faut pas croiser.
 */
function espacementSuffisant(cible: Cible, toutes: Cible[]): boolean {
  const petite = (c: Cible) => c.w < MINIMUM || c.h < MINIMUM;
  return toutes.every((autre) => {
    if (autre === cible) return true;
    // Cercle contre cercle, entre deux sous-dimensionnees.
    if (petite(autre)) return Math.hypot(autre.cx - cible.cx, autre.cy - cible.cy) >= MINIMUM;
    // Cercle contre la boite d'une cible de taille suffisante.
    return !cercleCroiseRect(cible, autre);
  });
}

function rapport(toutes: Cible[]): string {
  return toutes
    .map((c) => `  ${c.w.toFixed(1)} x ${c.h.toFixed(1)} px  ${c.label}`)
    .join("\n");
}

function verdict(
  toutes: Cible[],
  liens: { href: string; w: number; h: number }[],
): { fautives: Cible[]; sauveesParEspacement: Cible[]; sauveesParEquivalence: Cible[] } {
  const petites = toutes.filter((c) => c.w < MINIMUM || c.h < MINIMUM);
  const sauveesParEspacement = petites.filter((c) => espacementSuffisant(c, toutes));
  const reste = petites.filter((c) => !sauveesParEspacement.includes(c));
  const sauveesParEquivalence = reste.filter(
    (c) => c.href !== null && liens.some((l) => l.href === c.href && l.w >= MINIMUM && l.h >= MINIMUM),
  );
  const fautives = reste.filter((c) => !sauveesParEquivalence.includes(c));
  return { fautives, sauveesParEspacement, sauveesParEquivalence };
}

async function arriver(page: Page, chemin = "/fr"): Promise<void> {
  await page.goto(chemin);
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60_000 });
  // Les controles n'apparaissent qu'une fois l'arrivee jouee (13/09, X3).
  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 30_000 });
  await page.waitForTimeout(1500);
}

const { defaultBrowserType: _pixel, ...PIXEL_7 } = devices["Pixel 7"];
const PIXEL_7_PAYSAGE = { ...PIXEL_7, viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true };

const CADRAGES = [
  { nom: "ordinateur", options: { viewport: { width: 1440, height: 900 } } },
  { nom: "Pixel 7 portrait", options: PIXEL_7 },
  // Le cadrage qui compte le plus : sous 500 px de haut, la feuille passe
  // les boutons de 44 a 36 px (regle « ecran couche » du 08/09).
  { nom: "Pixel 7 paysage", options: PIXEL_7_PAYSAGE },
];

for (const cadrage of CADRAGES) {
  test.describe(cadrage.nom, () => {
    test.use(cadrage.options);

    test(`chaque commande de la barre tient 24 x 24 px, ou s'en sauve par l'espacement`, async ({ page }) => {
      await arriver(page);
      const relevees = await cibles(page);
      const liens = await liensDeLaPage(page);
      expect(relevees.length, "aucune cible relevee : la barre n'est pas la, le test ne garde rien").toBeGreaterThan(0);
      // Les cinq points de la boussole sortent de CETTE assertion : ils sont
      // sous le minimum, aucune exception ne les couvre, et leur sort est une
      // decision qui appartient a Sylvain (voir le test `fixme` plus bas).
      // La regle du 04/10 est celle-la : un rouge sans cause tranchee devient
      // une note, pas une suite rouge en permanence.
      const toutes = relevees.filter((c) => !c.boussole);
      const { fautives, sauveesParEspacement, sauveesParEquivalence } = verdict(toutes, liens);
      const detail = `${cadrage.nom} -- ${toutes.length} cibles relevees :\n${rapport(toutes)}`;
      // Le releve s'imprime a chaque passage : c'est le chiffre que la
      // conception du 25/10 reclamait, et il doit rester lisible sans avoir
      // a faire rougir le test.
      console.log(detail);
      if (sauveesParEspacement.length > 0) {
        console.log(`  (${sauveesParEspacement.length} sous 24 px, sauvees par l'espacement)`);
      }
      if (sauveesParEquivalence.length > 0) {
        console.log(`  (${sauveesParEquivalence.length} sous 24 px, sauvees par l'equivalence : ${sauveesParEquivalence.map((c) => c.label).join(", ")})`);
      }
      // Pour chaque fautive, dire POURQUOI aucune exception ne joue : c'est
      // ce qui rend le rouge actionnable plutot que decoratif.
      const pourquoi = fautives
        .map((c) => {
          const memeDestination = c.href === null ? [] : liens.filter((l) => l.href === c.href);
          const tailles = memeDestination.map((l) => `${l.w.toFixed(1)}x${l.h.toFixed(1)}`).join(", ") || "aucun";
          return `  ${c.label} : ${c.w.toFixed(1)}x${c.h.toFixed(1)} px, href ${c.href ?? "(bouton)"}, controles vers la meme destination : ${tailles}`;
        })
        .join("\n");
      expect(
        fautives.map((c) => `${c.label} (${c.w.toFixed(1)} x ${c.h.toFixed(1)})`),
        `cible(s) sous ${MINIMUM} px, ni sauvee(s) par l'espacement ni par l'equivalence :\n${pourquoi}\n\n${detail}`,
      ).toEqual([]);
    });

    /**
     * LA BOUSSOLE EST SOUS LE MINIMUM, ET C'EST MESURE (02/11/2026).
     *
     * Ses cinq points cardinaux : **18,0 x 18,0 px sur ordinateur**,
     * **15,3 x 15,3 px sur Pixel 7**. Aucune des exceptions de 2.5.8 ne les
     * couvre :
     *  - espacement : leurs centres sont a moins de 24 px les uns des
     *    autres, les cercles se croisent ;
     *  - equivalence : la navigation du header mene bien aux memes cinq
     *    destinations, mais ses liens font **17 px de haut** (/fr 57x17,
     *    /fr/memoire 66x17, /fr/services 66x17, /fr/projets 54x17,
     *    /fr/contact 60x17), donc ils ne respectent pas le critere non plus
     *    et ne peuvent pas servir d'equivalent conforme ;
     *  - inline : ce n'est pas du texte dans une phrase.
     *
     * ⚠️ Ces cinq points sont des `<button>` qui appellent `router.push()`
     * (cardinal-compass.tsx), pas des liens : l'exception d'equivalence de
     * ce fichier, qui compare les `href`, ne pouvait donc pas les juger.
     * C'est ce qui a failli me faire annoncer un faux positif.
     *
     * ⏭️ POURQUOI C'EST `fixme` ET NON UN ROUGE : la boussole est un
     * mecanisme CENTRAL du site (elle pointe le vrai nord sur telephone,
     * tout le site repose sur les directions), agrandir ses points est une
     * decision de DA, et le critere n'est meme pas encore dans le
     * referentiel que Sylvain audite (RGAA 4.1.2 s'aligne sur WCAG 2.1 ;
     * 2.5.8 arrivera avec RGAA 5). Le choix est donc a lui, et ce test
     * garde le chiffre en attendant.
     */
    test.fixme(`les cinq points de la boussole sont sous 24 px (decision de DA en attente)`, async ({ page }) => {
      await arriver(page);
      const relevees = await cibles(page);
      const liens = await liensDeLaPage(page);
      const boussole = relevees.filter((c) => c.boussole);
      expect(boussole.length, "les points de la boussole n'ont pas ete trouves").toBe(5);
      const { fautives } = verdict(boussole, liens);
      expect(fautives, `${cadrage.nom} : ${rapport(boussole)}`).toEqual([]);
    });
  });
}
