import { test, expect, devices, type Page } from "@playwright/test";

/**
 * Aucun controle flottant ne doit se poser sur du texte lisible, ni sur un
 * autre controle (08/09).
 *
 * Trouve sur les captures Pixel 7 de la production : sur l'accueil, les
 * lignes du paragraphe etaient litteralement coupees par la colonne de
 * boutons, on lisait « utres » au lieu de « autres ». Et deux boutons
 * independants se chevauchaient, le mode recit passant SOUS le bouton son,
 * c'est-a-dire le bouton d'accessibilite sous le bouton de confort.
 *
 * Ecrit comme un INVARIANT DE GEOMETRIE et non comme une comparaison de
 * pixels : il releve tout ce qui flotte et tout ce qui se lit, quel que
 * soit le composant qui les pose. Un futur bouton depose dans un coin deja
 * pris fera echouer ce test sans que personne ait a y penser.
 *
 * Trois pieges rencontres en l'ecrivant, gardes ici pour la prochaine fois :
 *  - les boutons de la colonne sont `position: static`, c'est leur
 *    CONTENEUR qui est fixe : il faut remonter la chaine des parents ;
 *  - une taille de fenetre ne suffit pas a reproduire le mobile, il faut
 *    l'emulation complete (`devices["Pixel 7"]`) : sans elle la mise en
 *    page n'est pas celle du telephone et le test passe a vide ;
 *  - les blocs de texte de la scene se RELAIENT EN FONDU, donc viser un
 *    paragraphe precis est fragile : on ne retient que ce qui est
 *    effectivement opaque a l'instant de la mesure.
 *
 * Criteres RGAA en jeu : 10.7 (focus visible : un lien recouvert peut
 * recevoir un anneau de focus invisible) et, par consequence, 10.11
 * (perte d'information a 320px).
 */

type Box = { x: number; y: number; w: number; h: number; label: string };

/** Marge de tolerance : deux bords qui se touchent ne se recouvrent pas. */
const TOUCH_EPSILON = 0.5;

/** En dessous, le bloc est en train de disparaitre : il ne se lit plus. */
const READABLE_OPACITY = 0.4;

function overlap(a: Box, b: Box): number {
  const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return dx > TOUCH_EPSILON && dy > TOUCH_EPSILON ? dx * dy : 0;
}

async function measure(page: Page): Promise<{ texts: Box[]; controls: Box[]; clipped: Box[] }> {
  return page.evaluate((minOpacity) => {
    const TOUCH = 0.5;
    type B = { x: number; y: number; w: number; h: number; label: string };

    const onScreen = (r: DOMRect) =>
      r.width >= 1 &&
      r.height >= 1 &&
      r.bottom > 0 &&
      r.right > 0 &&
      r.top < innerHeight &&
      r.left < innerWidth;

    /**
     * On ne classe PAS par positionnement : la scene entiere vit dans un
     * conteneur fixe, donc « fixe » ne distingue pas un bouton flottant
     * d'un paragraphe. On classe par ROLE et par FORME : un controle
     * flottant est une pastille d'icone, carree, petite, qui porte son sens
     * dans un `aria-label` et non dans son texte.
     */
    const CONTROL_MAX_SIDE = 80;
    const isIconControl = (el: Element) => {
      const aria = el.getAttribute("aria-label");
      if (!aria) return false;
      if ((el.textContent?.trim() ?? "").length > 2) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.width <= CONTROL_MAX_SIDE && r.height <= CONTROL_MAX_SIDE;
    };

    /** Opacite reellement percue : le produit de la chaine des parents. */
    const effectiveOpacity = (el: Element) => {
      let o = 1;
      for (let n: Element | null = el; n; n = n.parentElement) {
        o *= Number(getComputedStyle(n).opacity || "1");
        if (o < 0.01) break;
      }
      return o;
    };

    const label = (el: Element) =>
      el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 28) || el.tagName;

    const controls: B[] = [];
    for (const el of Array.from(document.querySelectorAll("button, a[href]"))) {
      if (!isIconControl(el)) continue;
      // On ignore volontairement l'opacite pour les controles : un bouton a
      // opacite 0,55 au repos occupe la place et reste cliquable.
      if (!el.checkVisibility({ checkVisibilityCSS: true })) continue;
      const r = el.getBoundingClientRect();
      if (!onScreen(r)) continue;
      controls.push({ x: r.x, y: r.y, w: r.width, h: r.height, label: label(el) });
    }

    // Un controle qui deborde du cadre est inatteignable : c'est une perte
    // de FONCTIONNALITE, pas un defaut d'esthetique.
    const clipped: B[] = [];
    for (const el of Array.from(document.querySelectorAll("button, a[href]"))) {
      if (!isIconControl(el)) continue;
      if (!el.checkVisibility({ checkVisibilityCSS: true })) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const inside = r.top >= -TOUCH && r.left >= -TOUCH && r.bottom <= innerHeight + TOUCH && r.right <= innerWidth + TOUCH;
      if (!inside) clipped.push({ x: r.x, y: r.y, w: r.width, h: r.height, label: label(el) });
    }

    const texts: B[] = [];
    for (const el of Array.from(document.querySelectorAll("h1, h2, p, a[href]"))) {
      if (isIconControl(el)) continue;
      if (!el.checkVisibility({ checkVisibilityCSS: true })) continue;
      if (effectiveOpacity(el) < minOpacity) continue;
      const text = el.textContent?.trim() ?? "";
      if (text.length < 12) continue;
      const r = el.getBoundingClientRect();
      // Le passage lecteur d'ecran est reduit a 1px : il n'est pas « lisible
      // a l'ecran » et ne doit pas compter.
      if (r.width < 40 || r.height < 12) continue;
      if (!onScreen(r)) continue;
      texts.push({ x: r.x, y: r.y, w: r.width, h: r.height, label: label(el) });
    }
    return { texts, controls, clipped };
  }, READABLE_OPACITY);
}

// `defaultBrowserType` ne peut pas etre pose dans un describe (il forcerait
// un autre worker) : on garde tout le reste du profil d'appareil, dont
// `isMobile`, sans lequel la mise en page n'est pas celle du telephone.
const { defaultBrowserType: _pixelBrowser, ...PIXEL_7 } = devices["Pixel 7"];

const CASES = [
  { name: "Pixel 7", use: PIXEL_7 },
  // Le meme telephone couche : c'est le sujet meme du critere RGAA 13.9,
  // « le contenu est-il consultable quelle que soit l'orientation ». La
  // hauteur tombe a 412 px, ou une colonne de huit boutons ne tient pas.
  {
    name: "Pixel 7 paysage",
    use: { ...PIXEL_7, viewport: { width: 839, height: 412 }, screen: { width: 839, height: 412 } },
  },
  { name: "ordinateur", use: { viewport: { width: 1280, height: 800 } } },
];

for (const c of CASES) {
  test.describe(`controles flottants, ${c.name}`, () => {
    test.use(c.use);
    // Le voile de chargement, la compilation en dev et l'arrivee du premier
    // bloc de texte cumulent facilement plus que le delai par defaut.
    test.describe.configure({ timeout: 150_000 });

    test.beforeEach(async ({ page }) => {
      await page.goto("/fr");
      await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, {
        timeout: 60_000,
      });
      // Le voile se retire, la scene se pose, puis les blocs de texte se
      // RELAIENT EN FONDU. Une attente fixe tombe une fois sur deux entre
      // deux blocs, quand aucun n'est lisible, et le test passait a vide.
      // On attend donc qu'un bloc soit reellement pose, opacite pleine.
      await page.waitForFunction(
        () => {
          const eff = (el: Element) => {
            let o = 1;
            for (let n: Element | null = el; n; n = n.parentElement) {
              o *= Number(getComputedStyle(n).opacity || "1");
            }
            return o;
          };
          for (const el of Array.from(document.querySelectorAll("h1, h2, p"))) {
            if ((el.textContent?.trim() ?? "").length < 12) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 40 || r.height < 12) continue;
            if (r.bottom <= 0 || r.top >= innerHeight) continue;
            if (eff(el) > 0.9) return true;
          }
          return false;
        },
        null,
        { timeout: 45_000 },
      );
    });

    test("aucun controle ne recouvre du texte lisible", async ({ page }) => {
      const { texts, controls } = await measure(page);
      // Garde-fous de la mesure elle-meme : si la detection casse, le test
      // doit echouer au lieu de passer a vide.
      expect(controls.length, "controles flottants detectes").toBeGreaterThan(3);
      expect(
        texts.length,
        `blocs de texte lisibles detectes (controles: ${controls.map((c) => c.label).join(", ")})`,
      ).toBeGreaterThan(0);

      const offenders: string[] = [];
      for (const ctrl of controls) {
        for (const t of texts) {
          const area = overlap(ctrl, t);
          if (area > 0) {
            offenders.push(`« ${ctrl.label} » recouvre ${Math.round(area)} px2 de « ${t.label} »`);
          }
        }
      }
      expect(offenders, offenders.join(" ; ")).toEqual([]);
    });

    test("aucun controle ne deborde du cadre", async ({ page }) => {
      const { clipped, controls } = await measure(page);
      expect(controls.length + clipped.length, "controles detectes").toBeGreaterThan(3);
      const offenders = clipped.map(
        (c) => `« ${c.label} » sort du cadre (haut ${Math.round(c.y)}, bas ${Math.round(c.y + c.h)})`,
      );
      expect(offenders, offenders.join(" ; ")).toEqual([]);
    });

    test("deux controles ne se recouvrent jamais entre eux", async ({ page }) => {
      const { controls } = await measure(page);
      expect(controls.length, "controles flottants detectes").toBeGreaterThan(3);

      const offenders: string[] = [];
      for (let i = 0; i < controls.length; i++) {
        for (let j = i + 1; j < controls.length; j++) {
          const area = overlap(controls[i], controls[j]);
          if (area > 0) {
            offenders.push(
              `« ${controls[i].label} » et « ${controls[j].label} » se recouvrent sur ${Math.round(area)} px2`,
            );
          }
        }
      }
      expect(offenders, offenders.join(" ; ")).toEqual([]);
    });
  });
}
