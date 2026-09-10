import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
      await page.evaluate((f) => window.scrollTo(0, window.innerHeight * 2 * f), fraction);
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
