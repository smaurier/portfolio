import { test, expect, devices } from "@playwright/test";

/**
 * LES OMBRES DU TEXTE SUIVENT LA FACE DU MONDE (04/11/2026).
 *
 * NE DE L'OEIL DE SYLVAIN sur la 404 : « le text-shadow est degueulasse
 * non ? ». Il l'etait, et la mesure a dit pourquoi.
 *
 * Le CSS dit lui-meme son intention : « text-shadow subtile pour lisibilite
 * contre la scene 3D ». Elle est faite pour du texte CLAIR pose sur une
 * scene SOMBRE. Mais elle etait posee sous `body.nahual-lab-reveal`, sans
 * aucune condition de face : en face claire, elle s'appliquait a du texte
 * presque noir (`rgb(29, 22, 38)`) sur un fond creme (`rgb(243, 236, 224)`),
 * ou elle ne separe plus rien et empate le contour des lettres. Le `h1` en
 * portait deux : un halo CLAIR a 18 % (pour se detacher du sombre) et une
 * ombre SOMBRE a 50 %, les deux en meme temps, en plein jour.
 *
 * ⚠️ CE N'EST PAS UN ECHEC RGAA, et ce test ne pretend pas en etre un. Le
 * critere 3.2 mesure la couleur du texte contre son fond, et une
 * `text-shadow` n'entre pas dans ce calcul ; mesure sur la page reelle, le
 * contraste y etait de 10,2:1 pour les paragraphes et 15:1 pour les titres.
 * C'est un defaut de LISIBILITE et de theme, du genre que l'oeil attrape et
 * que l'outil laisse passer. Meme famille que les trois fonds en dur du
 * 01/11 qui restaient noirs en face claire.
 *
 * ⭐ LES DEUX SENS COMPTENT. Le test exige qu'aucune couche ne soit plus
 * sombre que le texte en face claire, ET qu'au moins une le soit en face
 * sombre. Sans cette seconde assertion, un menage futur qui supprimerait
 * l'ombre partout passerait au vert, et on perdrait la lisibilite du texte
 * clair sur la scene, qui est la raison d'etre de cette ombre.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, colorScheme: "dark" });

/** Une route qui n'existe pas : la 404 vit dans le layout, scene derriere. */
const PAGE = "/fr/cette-route-n-existe-pas";

/**
 * L'INVARIANT QUE CE FICHIER GARDE, et il vaut mieux que « pas d'ombre » :
 * une ombre existe pour SEPARER le texte de ce qu'il y a derriere, donc
 * elle doit toujours aller du cote OPPOSE au texte. Sombre sous un texte
 * clair, claire sous un texte sombre. Exiger `none` en face claire aurait
 * marche pour la 404 mais aurait interdit le halo clair qui detache le
 * texte d'encre quand il croise une partie sombre de la scene.
 *
 * Le depot a deja le jeton pour ca, `--shadow-rgb` : noir en face sombre,
 * creme en face claire. Les regles fautives le contournaient en codant
 * `rgba(0, 0, 0, …)` en dur.
 */
async function ombres(page: import("@playwright/test").Page) {
  await page.waitForSelector("[data-not-found]", { timeout: 60_000 });
  await page.waitForTimeout(1200);
  return page.evaluate(() => {
    // ⛔ ON PEINT LA COULEUR, ON NE L'ANALYSE PAS. Premiere version de ce
    // test : lire `getComputedStyle().color` et extraire les nombres a la
    // regle. Chrome rend `color(srgb 0.94902 0.92549 0.882353 / 0.18)`,
    // c'est-a-dire des flottants de 0 a 1, que l'extraction lisait comme du
    // 0 a 255 : un halo CREME ressortait a une luminance de presque noir, et
    // le test accusait un CSS deja correct. Un pixel reellement peint ne
    // ment pas sur ses unites.
    const toile = document.createElement("canvas");
    toile.width = toile.height = 1;
    const ctx = toile.getContext("2d", { willReadFrequently: true })!;
    const enRgb = (couleur: string): [number, number, number] => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = couleur;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    };
    const lum = ([r, g, b]: [number, number, number]) => {
      const c = [r, g, b].map((v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };

    const lire = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`introuvable : ${sel}`);
      const cs = getComputedStyle(el);
      const brut = cs.textShadow;
      // Chaque couche commence par sa couleur ; `rgb(…)`, `rgba(…)` et
      // `color(… / …)` portent tous des parentheses, d'ou cette coupe.
      const couches = brut === "none" ? [] : (brut.match(/(?:rgba?|color|hsla?)\([^)]*\)/g) ?? []);
      return {
        ombre: brut,
        couleur: cs.color,
        lumTexte: lum(enRgb(cs.color)),
        lumCouches: couches.map((c) => lum(enRgb(c))),
      };
    };

    const resultat = {
      face: document.documentElement.getAttribute("data-theme"),
      fond: getComputedStyle(document.body).backgroundColor,
      titre: lire("[data-not-found] h1"),
      paragraphe: lire("[data-not-found] section p"),
    };
    return resultat;
  });
}

test("en face CLAIRE, aucune ombre n'est plus sombre que le texte", async ({ page }) => {
  test.setTimeout(150_000);
  // `nahual-theme` prime sur la preference du navigateur : c'est le levier
  // que les tests de la face claire utilisent deja (voir miroir.spec.ts).
  await page.addInitScript(() => {
    try {
      localStorage.setItem("nahual-theme", "light");
    } catch {
      /* un navigateur sans stockage retombe sur la preference : le test le dira */
    }
  });
  await page.goto(PAGE);

  const vu = await ombres(page);
  expect(vu.face, "la face claire doit etre posee").toBe("light");

  for (const [nom, cible] of [
    ["titre", vu.titre],
    ["paragraphe", vu.paragraphe],
  ] as const) {
    const plusSombres = cible.lumCouches.filter((l) => l < cible.lumTexte);
    expect(
      plusSombres,
      `${nom} : texte ${cible.couleur} sur ${vu.fond}, ombre « ${cible.ombre} ». Une couche plus sombre que le texte d'encre l'empate au lieu de le detacher.`,
    ).toEqual([]);
  }
});

test("en face SOMBRE, l'ombre reste : c'est elle qui detache le texte de la scene", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto(PAGE);

  const vu = await ombres(page);
  expect(vu.face, "la face sombre est celle par defaut ici").toBe("dark");

  for (const [nom, cible] of [
    ["titre", vu.titre],
    ["paragraphe", vu.paragraphe],
  ] as const) {
    const plusSombres = cible.lumCouches.filter((l) => l < cible.lumTexte);
    expect(
      plusSombres.length,
      `${nom} : texte ${cible.couleur} sur ${vu.fond}, ombre « ${cible.ombre} ». Sans couche plus sombre que le texte clair, rien ne le detache de la scene.`,
    ).toBeGreaterThan(0);
  }
});
