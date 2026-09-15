import { test, expect } from "@playwright/test";

/**
 * LE SITE TOURNE SOUS WEBKIT (15/09).
 *
 * Le trou etait reel : la suite e2e ne declarait qu'un seul navigateur,
 * `chromium`, et le site n'avait jamais tourne sous le moteur de Safari.
 * Une scene WebGL a shaders modifies est precisement ce qui casse d'un
 * moteur a l'autre, et un site du jour qui ne s'ouvre pas sur iPhone n'est
 * pas un site du jour.
 *
 * CE QUE CE TEST PROUVE, ET CE QU'IL NE PROUVE PAS. WebKit de Playwright
 * sous Windows n'est pas Safari sur macOS, et encore moins Safari sur un
 * iPhone : la pile graphique, les limites de memoire et la perte de
 * contexte WebGL y sont differentes. Ce test ecarte la panne grossiere (un
 * JavaScript non supporte, un canvas qui ne demarre pas, une page blanche).
 * Il ne remplace pas un vrai appareil, qui reste ouvert au backlog (V3).
 *
 * Mesure du 15/09, meme appareil emule (iPhone 14) sous les deux moteurs :
 * chargement 7,7 s contre 8,3 s, typographie identique au centieme de
 * pixel, canvas 585x996 des deux cotes, luminance de scene 0,115 contre
 * 0,109. Les deux moteurs rendent la meme page.
 *
 * Il ne tourne QUE dans le projet `webkit` (voir playwright.config.ts) :
 * la suite par defaut reste sur chromium, pour ne pas doubler sa duree.
 */
const PAGES = ["fr", "fr/memoire", "fr/projets"];

for (const chemin of PAGES) {
  test(`/${chemin} s'ouvre et monte sa scene sous WebKit`, async ({ page }) => {
    test.setTimeout(240_000);
    const erreurs: string[] = [];
    page.on("pageerror", (e) => erreurs.push(String(e).slice(0, 200)));

    await page.goto(`/${chemin}?veille=off`);
    await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 180_000 });
    await page.waitForTimeout(4000);

    const etat = await page.evaluate(() => {
      const cs = [...document.querySelectorAll("canvas")];
      const grand = cs.find((c) => c.width > 400);
      let webgl = "aucun";
      try {
        const t = document.createElement("canvas");
        webgl = t.getContext("webgl2") ? "webgl2" : t.getContext("webgl") ? "webgl1" : "aucun";
      } catch {
        webgl = "exception";
      }
      return {
        webgl,
        canvas: grand ? { w: grand.width, h: grand.height } : null,
        titre: document.title,
        h1: document.querySelector("h1")?.textContent?.trim() ?? "",
      };
    });

    expect(etat.webgl, "WebGL est disponible").not.toBe("aucun");
    expect(etat.canvas, "la scene a un canvas a la taille de la fenetre").not.toBeNull();
    expect(etat.canvas!.w, "largeur du canvas").toBeGreaterThan(300);
    expect(etat.h1.length, "la page porte son titre de premier niveau").toBeGreaterThan(3);
    expect(erreurs, `erreurs de page sous WebKit : ${erreurs.join(" | ")}`).toEqual([]);
  });
}
