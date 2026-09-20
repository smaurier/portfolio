import { test, expect } from "@playwright/test";

/**
 * LA REGRESSION VISUELLE (11/09, Q4 du backlog).
 *
 * Un site vivant se casse en silence : un materiau qui perd sa couleur, un
 * panneau qui glisse, une scene qui devient noire. Cette suite compare
 * chaque page, a deux points de l'arc, a une reference enregistree sur
 * CETTE machine (les captures WebGL varient d'une carte graphique a
 * l'autre : les references sont par plateforme, dans __screenshots__).
 *
 * La scene est prise sous « mouvement reduit » (boucle a la demande, plus
 * de respiration ni de particules, lib/reduced-motion). MESURE DU 11/09 : ce
 * n'est pas assez pour une reference au pixel : deux passages identiques
 * different de 2 a 13 % des pixels selon la page (la camera ne retombe pas
 * exactement au meme point de l'arc, des simulateurs avancent encore).
 * Sous ce bruit, un seuil honnete ne detecte que des desastres (une scene
 * noire, un panneau parti) : c'est ce que fait cette suite, avec 20 % de
 * pixels tolerés, et elle ne tourne QUE sur demande (VISUEL=1), jamais dans
 * la suite par defaut, pour ne pas y mettre un test instable. Q4 du backlog
 * reste ouvert : il faut un etat de scene reellement fige (la pause, un
 * temps de simulation gele) et une machine de reference.
 *
 * Creer ou mettre a jour les references, apres avoir REGARDE les differences :
 *   VISUEL=1 pnpm exec playwright test tests/e2e/regression-visuelle.spec.ts --update-snapshots
 */
test.skip(!process.env.VISUEL, "regression visuelle sur demande seulement (VISUEL=1) : bruit de 2 a 13 % mesure le 11/09");
/**
 * LE THEME EST EPINGLE (20/09), ET C'EST UN DEFAUT DE TEST CORRIGE.
 *
 * Les dix captures echouaient a 93 % des pixels. La cause n'etait ni le
 * site ni le design de l'arc : **la reference est en thEme sombre et la
 * suite photographiait le thEme CLAIR**. Le miroir fumant est arrive le
 * 13/09, deux jours apres les references du 11/09, et Playwright ouvre ses
 * pages en `prefers-color-scheme: light` par defaut. Une variable de premier
 * ordre n'etait epinglee nulle part -- et comme cette suite ne tourne qu'a
 * la demande (VISUEL=1), personne ne l'a vu pendant une semaine.
 *
 * Le sombre est la signature du site ; c'est lui qu'on garde en reference.
 * Le clair merite les siennes le jour ou on les enregistrera : ce serait
 * `colorScheme: "light"` et un second jeu de noms.
 *
 * ET LES TROIS QUI RESTAIENT : LES REFERENCES DATENT D'AVANT LE MOUVEMENT
 * REDUIT. Le theme epingle, sept captures sur dix repassaient au vert. Les
 * trois autres -- l'Est a 35 et 80 %, le Sud a 35 % -- montraient une scene
 * en plein jour la ou le site en rend une noire. Ni le code (l'ecart est
 * deja la au commit qui etait en place a la capture, verifie par dichotomie
 * sur 96 commits), ni dev contre production (memes ratios a trente pixels
 * pres). L'horloge du depot a donne la reponse :
 *
 *   15:24-15:28  les references sont capturees
 *   15:32        ce fichier est commite, avec `test.use({ reducedMotion })`
 *   15:34        a69be96 le passe en `contextOptions` -- "le build
 *                type-checke les tests"
 *
 * La premiere forme ne s'appliquait pas. Les references ont donc ete prises
 * SANS mouvement reduit, arc suivant le defilement, Est et Sud eclaires a
 * 35 et 80 % de la page. Deux minutes plus tard le test s'est mis a figer
 * l'arc a 0 -- ou l'Est et le Sud sont la nuit (`eastDay(0)` et
 * `remapSouthArc(0).day` valent zero, l'Ouest et le Centre non) -- sans que
 * personne reprenne les captures. Neuf jours invisibles : cette suite ne
 * tourne qu'a la demande, et la derive de theme noyait le reste.
 *
 * Les trois sont regenerees le 20/09 sur cette explication-la, pas sur un
 * `--update-snapshots` a l'aveugle.
 */
test.use({
  contextOptions: { reducedMotion: "reduce", colorScheme: "dark" },
  viewport: { width: 1280, height: 720 },
});

const PAGES = ["fr", "fr/services", "fr/projets", "fr/contact", "fr/memoire"];
const ETAPES = [0.35, 0.8];

for (const chemin of PAGES) {
  for (const f of ETAPES) {
    test(`/${chemin} a ${Math.round(f * 100)} % de l'arc ressemble a sa reference`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.goto("/" + chemin + "?shaders-prod");
      await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
      await page.waitForTimeout(2500);
      await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f), f);
      await page.waitForTimeout(2500);
      await expect(page).toHaveScreenshot(`${chemin.replace("/", "-")}-${Math.round(f * 100)}.png`, {
        maxDiffPixelRatio: 0.2,
        threshold: 0.3,
        animations: "disabled",
        caret: "hide",
      });
    });
  }
}
