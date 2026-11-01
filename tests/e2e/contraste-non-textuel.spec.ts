import { test, expect, type Page } from "@playwright/test";
import { composer, parseCouleurCss, ratioDeContraste, type Rgb } from "../../src/lib/contraste-wcag";

/**
 * CONTRASTE DES ELEMENTS NON-TEXTUELS (WCAG 1.4.11), 01/11.
 *
 * Suite du passage sur le contraste du texte (accessibilite-axe.spec.ts) :
 * ici, la bordure qui dessine le contour de trois boutons flottants (son,
 * controles de scene, boussole) contre leur PROPRE fond. Pas de canvas a
 * lire derriere pour cette mesure precise — le canvas n'affecte que
 * l'opacite d'ensemble du bouton (un choix de DA valide a l'oeil sur
 * capture, cf PR), jamais la relation bordure/fond l'un envers l'autre.
 *
 * Mesure avant correctif (meilleur cas : fond du bouton compose sur le
 * fond de la page, pas sur la scene qui peut etre plus dure) : bordure a
 * alpha 0,18-0,25 contre le fond a 0,65-0,72 d'opacite -> 1,5:1 a 2,4:1
 * selon le theme, loin sous le seuil AA de 3:1. Seuil choisi : 3:1
 * (WCAG 1.4.11, limites d'un composant d'interface), pas 4,5:1 (reserve
 * au texte).
 */
const SEUIL_NON_TEXTE = 3;

async function fondDePage(page: Page): Promise<Rgb> {
  const css = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  return parseCouleurCss(css).slice(0, 3) as unknown as Rgb;
}

async function ratioBordureVsFond(page: Page, selecteur: string): Promise<number> {
  const [bordureCss, fondCss, fondPage] = await Promise.all([
    page.locator(selecteur).first().evaluate((el) => getComputedStyle(el).borderColor),
    page.locator(selecteur).first().evaluate((el) => getComputedStyle(el).backgroundColor),
    fondDePage(page),
  ]);
  const fond = composer(parseCouleurCss(fondCss), fondPage);
  const bordure = composer(parseCouleurCss(bordureCss), fond);
  return ratioDeContraste(bordure, fond);
}

const CIBLES = [
  { nom: "bouton son", selecteur: 'button[aria-label*="son" i]' },
  { nom: "bouton controles de scene (photo)", selecteur: 'button[aria-label*="Photo de la scène"]' },
  { nom: "boussole cardinale", selecteur: 'nav[aria-label*="oussole"], nav[aria-label*="ompass"], nav[aria-label*="rújula"]' },
];

for (const theme of ["dark", "light"] as const) {
  for (const { nom, selecteur } of CIBLES) {
    test(`contraste non-textuel : ${nom}, face ${theme}`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.addInitScript((t) => {
        try {
          localStorage.setItem("nahual-theme", t);
        } catch {}
      }, theme);
      await page.goto("/fr");
      await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
      await page.waitForTimeout(500);
      await page.mouse.move(640, 450);
      await page.mouse.move(600, 400);
      await page.waitForTimeout(1200);
      const ratio = await ratioBordureVsFond(page, selecteur);
      expect(ratio, `${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(SEUIL_NON_TEXTE);
    });
  }
}
