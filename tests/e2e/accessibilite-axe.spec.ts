import { defilerDansLArc } from "./arc";
import { test, expect, devices, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { composer, parseCouleurCss, ratioDeContraste, type Rgb } from "../../src/lib/contraste-wcag";

/**
 * L'ACCESSIBILITE AUTOMATIQUE, A CHAQUE COMMIT (11/09, go de Sylvain sur la
 * dependance).
 *
 * axe ne remplace pas un audit RGAA : il attrape ce qui se detecte par le
 * DOM (noms accessibles, roles, contrastes de texte sur fond uni, ordre des
 * titres, attributs). Sur ce site, le fond est une scene 3D et les
 * contrastes se mesurent au pixel (.scratch/contraste.mjs) ; on demande donc
 * a axe tout SAUF la regle de contraste couleur, qui ne sait pas lire un
 * canvas et rendrait un verdict au hasard.
 *
 * 13/09 : la regle de contraste est reprise a part, ci-dessous, sur le
 * TEXTE DU DOCUMENT (pied de page, Codex, pages legales), ou il n'y a pas
 * de canvas derriere et ou le verdict d'axe fait foi. C'est la qu'un audit
 * complet a trouve 180 violations, toutes dans le pied de page, sur les dix
 * pages du site et dans les deux faces : des couleurs en dur jamais passees
 * en jetons, et une opacite de bloc qui delavait ses enfants.
 *
 * Les cinq pages, apres l'ouverture du voile, a deux moments de l'arc : le
 * DOM change avec le defilement (chapitrage, acte de sortie, sortie de
 * scene). Aucune violation de niveau critique ou serieux ; les mineures et
 * moderees sont listees, pas bloquantes, pour ne pas figer un site vivant
 * sur des avis d'outil.
 */
const PAGES = ["fr", "fr/services", "fr/projets", "fr/contact", "fr/memoire"];

async function ouvrir(page: Page, chemin: string) {
  await page.goto("/" + chemin);
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
  await page.waitForTimeout(1500);
}

for (const chemin of PAGES) {
  test(`axe : /${chemin}, aucune violation critique ou serieuse`, async ({ page }) => {
    test.setTimeout(150_000);
    await ouvrir(page, chemin);
    const rapports: string[] = [];
    for (const fraction of [0, 0.6]) {
      // 20/09 : une fraction de l'arc REEL, plus de « deux fenetres fois f ».
      await defilerDansLArc(page, fraction);
      await page.waitForTimeout(1200);
      const resultats = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
        .disableRules(["color-contrast"])
        .analyze();
      for (const v of resultats.violations) {
        const ligne = `[${v.impact}] ${v.id} : ${v.help} (${v.nodes.length} noeud(s), ex. ${v.nodes[0]?.target?.join(" ") ?? "?"})`;
        if (v.impact === "critical" || v.impact === "serious") rapports.push(`@${fraction} ${ligne}`);
        else console.log(`  avis ${chemin} @${fraction} ${ligne}`);
      }
    }
    expect(rapports, rapports.join("\n")).toEqual([]);
  });
}

/**
 * LE CONTRASTE DU TEXTE DE DOCUMENT (13/09). Le pied de page est le meme
 * partout : une seule page suffit a l'attraper, dans les deux faces, en
 * haut et en bas. Le reste du texte de document (Codex, pages legales) n'a
 * pas de canvas derriere non plus.
 */
for (const theme of ["dark", "light"] as const) {
  test(`contraste du texte de document, face ${theme}`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("nahual-theme", t);
      } catch {}
    }, theme);
    await ouvrir(page, "fr/codex");
    const echecs: string[] = [];
    for (const fraction of [0, 1]) {
      await page.evaluate((f) => window.scrollTo(0, f * (document.documentElement.scrollHeight - window.innerHeight)), fraction);
      await page.waitForTimeout(1200);
      const resultats = await new AxeBuilder({ page })
        .include(".siteFooter")
        .include(".codexPage")
        .withRules(["color-contrast"])
        .analyze();
      for (const v of resultats.violations) {
        for (const n of v.nodes) echecs.push(`@${fraction} ${n.target.join(" ")} : ${n.html.replace(/\s+/g, " ").slice(0, 60)}`);
      }
    }
    expect(echecs, echecs.join(" | ")).toEqual([]);
  });
}

/**
 * TROIS AUTRES SURFACES HORS CANVAS (01/11, retour Sylvain en se montrant
 * son propre portfolio : "le premier menu ne se voit pas parce qu'il est
 * sombre sur du noir"). Panel mobile, bouton d'appel et carte de projet ont
 * chacun leur PROPRE fond quasi-opaque (0.96 / 0.62 / 0.88) : la scène ne
 * compte presque pas derrière. Mais axe ne le voit pas de cet œil : sur ces
 * trois composants il rend `incomplete` (messageKey `bgImage`, impact
 * serious) parce qu'un bloc de scène AILLEURS sur la page porte un
 * background-image — vérifié à la main le 01/11, zéro `violations` malgré
 * un vrai défaut. On lit donc les couleurs résolues par le navigateur
 * (`getComputedStyle`) et on calcule le ratio nous-mêmes avec
 * `src/lib/contraste-wcag.ts` (testé à l'unité à part).
 *
 * Aucun test existant n'ouvrait jamais le panneau mobile : le bug a pu
 * vivre sans qu'aucun oracle ne le voie.
 */
const { defaultBrowserType: _burgerBrowser, ...PIXEL_7_BURGER } = devices["Pixel 7"];

/** Couleur de fond réelle de la page, pour composer un fond semi-opaque. */
async function fondDePage(page: Page): Promise<Rgb> {
  const css = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  return parseCouleurCss(css).slice(0, 3) as unknown as Rgb;
}

/**
 * Ratio de contraste réel entre le texte d'un sélecteur et le fond
 * (quasi-opaque) de son conteneur. `opacity` CSS (dt/dd/notes à 0.55-0.9)
 * compose le texte avec ce qu'il y a dessous exactement comme un alpha de
 * couleur : on la lit et on la traite comme telle plutôt que de l'ignorer.
 */
async function contrasteTexteSurConteneur(page: Page, texte: string, conteneur: string): Promise<number> {
  const [{ couleur, opacite }, fondCss, fondPage] = await Promise.all([
    page.locator(texte).first().evaluate((el) => ({ couleur: getComputedStyle(el).color, opacite: Number(getComputedStyle(el).opacity) })),
    page.locator(conteneur).first().evaluate((el) => getComputedStyle(el).backgroundColor),
    fondDePage(page),
  ]);
  const fondConteneur = composer(parseCouleurCss(fondCss), fondPage);
  const [r, g, b, a] = parseCouleurCss(couleur);
  const couleurEffective = composer([r, g, b, a * opacite], fondConteneur);
  return ratioDeContraste(couleurEffective, fondConteneur);
}

const SEUIL_AA = 4.5;

test.describe("contraste du panneau mobile (burger)", () => {
  test.use({ ...PIXEL_7_BURGER });
  for (const theme of ["dark", "light"] as const) {
    test(`face ${theme}`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.addInitScript((t) => {
        try {
          localStorage.setItem("nahual-theme", t);
        } catch {}
      }, theme);
      await ouvrir(page, "fr");
      await page.locator(".mobileMenuButton").click();
      await page.locator("#mobile-menu-panel").waitFor({ state: "visible" });
      await page.waitForTimeout(400);
      const ratioNav = await contrasteTexteSurConteneur(page, ".mobileNav a", ".mobilePanel");
      const ratioLangue = await contrasteTexteSurConteneur(page, '.mobileLangSwitcher a[aria-current="true"]', ".mobilePanel");
      expect(ratioNav, `nav ${ratioNav.toFixed(2)}:1`).toBeGreaterThanOrEqual(SEUIL_AA);
      expect(ratioLangue, `langue active ${ratioLangue.toFixed(2)}:1`).toBeGreaterThanOrEqual(SEUIL_AA);
    });
  }
});

for (const theme of ["dark", "light"] as const) {
  test(`contraste du bouton d'appel (ctaButton), face ${theme}`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("nahual-theme", t);
      } catch {}
    }, theme);
    await ouvrir(page, "fr/services");
    const ratio = await contrasteTexteSurConteneur(page, ".ctaButton", ".ctaButton");
    expect(ratio, `${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(SEUIL_AA);
  });

  test(`contraste de la carte de projet (projectCase), face ${theme}`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("nahual-theme", t);
      } catch {}
    }, theme);
    await ouvrir(page, "fr/projets");
    const ratioTitre = await contrasteTexteSurConteneur(page, ".projectCase h2", ".projectCase");
    const ratioDetail = await contrasteTexteSurConteneur(page, ".projectCaseDetails dd", ".projectCase");
    expect(ratioTitre, `titre ${ratioTitre.toFixed(2)}:1`).toBeGreaterThanOrEqual(SEUIL_AA);
    expect(ratioDetail, `detail ${ratioDetail.toFixed(2)}:1`).toBeGreaterThanOrEqual(SEUIL_AA);
  });
}
