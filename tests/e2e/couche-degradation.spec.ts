import { expect, test, type Browser } from "@playwright/test";
import { COUCHE_STORAGE_KEY } from "../../src/lib/couche";

/**
 * LA COUCHE D'OUVERTURE SE DECIDE AVANT LE PREMIER PAINT (02/11/2026).
 * Design : docs/superpowers/specs/2026-11-02-trois-couches-design.md,
 * oracle n° 4 de la section 10.
 *
 * Ce que ce test garde : la scene si la machine suit, l'amatl sinon
 * (mouvement reduit, WebGL absent, connexion degradee), et le choix
 * memorise par-dessus -- SAUF une scene memorisee sans WebGL, parce qu'une
 * preference se respecte mais qu'une impossibilite ne se discute pas.
 *
 * Il lit `data-couche` sur <html>, que le script inline du layout pose
 * avant le premier paint : c'est precisement ce moment-la qui compte, et
 * c'est pour ca que le test n'attend aucun montage de scene et ne mesure
 * aucune image. Il est donc exploitable sur n'importe quelle machine,
 * contrairement aux oracles chronometres de ce dossier.
 */

/** Coupe WebGL comme le ferait une machine qui n'en a pas : getContext rend
 *  null pour les deux contextes, et on garde le reste intact (2d compris). */
const SANS_WEBGL = `
  (() => {
    const vrai = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...reste) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
      return vrai.call(this, type, ...reste);
    };
  })();
`;

const memoriser = (couche: string) => `
  try { localStorage.setItem(${JSON.stringify(COUCHE_STORAGE_KEY)}, ${JSON.stringify(couche)}); } catch (e) {}
`;

async function coucheOuverte(
  browser: Browser,
  options: { reduitLeMouvement?: boolean; sansWebgl?: boolean; memorise?: string } = {},
): Promise<string | null> {
  const ctx = await browser.newContext({
    reducedMotion: options.reduitLeMouvement ? "reduce" : "no-preference",
  });
  // Les deux scripts partent AVANT tout script de la page, donc avant celui
  // du layout : c'est la seule facon de simuler la machine du visiteur.
  if (options.sansWebgl) await ctx.addInitScript(SANS_WEBGL);
  if (options.memorise !== undefined) await ctx.addInitScript(memoriser(options.memorise));
  const page = await ctx.newPage();
  // `commit` suffit : l'attribut est pose par un script inline du <head>,
  // on n'attend ni la scene, ni le foyer, ni le reseau.
  await page.goto("/fr", { waitUntil: "commit" });
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-couche"), null, { timeout: 15_000 });
  const couche = await page.evaluate(() => document.documentElement.getAttribute("data-couche"));
  await ctx.close();
  return couche;
}

test("la machine suit : la scene s'ouvre", async ({ browser }) => {
  expect(await coucheOuverte(browser)).toBe("scene");
});

test("mouvement reduit : l'amatl s'ouvre", async ({ browser }) => {
  expect(await coucheOuverte(browser, { reduitLeMouvement: true })).toBe("amatl");
});

test("sans WebGL : l'amatl s'ouvre", async ({ browser }) => {
  expect(await coucheOuverte(browser, { sansWebgl: true })).toBe("amatl");
});

test("un choix memorise l'emporte sur le mouvement reduit : une demande explicite gagne sur une preference", async ({ browser }) => {
  expect(await coucheOuverte(browser, { memorise: "scene", reduitLeMouvement: true })).toBe("scene");
});

test("la parole memorisee est honoree, meme sans WebGL : elle ne demande rien a la machine", async ({ browser }) => {
  expect(await coucheOuverte(browser, { memorise: "parole", sansWebgl: true })).toBe("parole");
});

test("MAIS la scene memorisee sans WebGL retombe sur l'amatl : une impossibilite ne se discute pas", async ({ browser }) => {
  expect(await coucheOuverte(browser, { memorise: "scene", sansWebgl: true })).toBe("amatl");
});

test("une valeur de stockage abimee se traite comme une absence", async ({ browser }) => {
  expect(await coucheOuverte(browser, { memorise: "3d" })).toBe("scene");
});
