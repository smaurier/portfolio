import { test, expect } from "@playwright/test";

/**
 * LA FUMEE DU VISITEUR HUMAIN (04/11/2026).
 *
 * NE DE SEPT HEURES DE PANNE EN PRODUCTION. Le 04/11, Next 16.4.1 est
 * arrive sur `main` par une PR Dependabot et a ete deploye dans la minute.
 * La scene ne montait plus du tout pour un visiteur : React #438, « An
 * unsupported type was passed to use() », levee par
 * `BailoutToCSRForNextDynamic` de `next/dynamic` rendu dans le Canvas r3f
 * (voir le commentaire de `persistent-scene.tsx`). Aucun canvas, aucune
 * scene, pour tout le monde.
 *
 * POURQUOI PERSONNE N'A RIEN VU PENDANT SEPT HEURES, et c'est la vraie
 * lecon : `isBot()` (src/lib/is-bot.ts) sert une page SANS scene aux
 * user-agents qui contiennent `HeadlessChrome`. Les robots, les audits
 * Lighthouse et toute sonde automatique lancee sans descripteur d'appareil
 * voyaient donc un site parfaitement sain. Le seul chemin casse etait
 * celui des humains, et c'est le seul que rien n'ouvrait.
 *
 * CE TEST TIENT LES DEUX BOUTS :
 *
 * 1. Il verifie D'ABORD que le user-agent de la suite n'est PAS pris pour
 *    un robot. Sans cette assertion, un changement de configuration
 *    ferait silencieusement basculer tout le fichier sur le chemin robot,
 *    ou tout passe toujours : le test deviendrait vert et aveugle.
 * 2. Il refuse toute erreur non capturee. C'est elle qui signe cette
 *    famille de pannes, bien avant qu'on puisse parler de pixels : React
 *    lache au montage, l'arbre entier disparait.
 *
 * Il est volontairement court et pose peu d'exigences graphiques, pour
 * pouvoir tourner en integration continue sur une machine sans carte
 * graphique, la ou la barre de performance (qui exige ANGLE sur d3d11) ne
 * peut pas aller.
 */

const PAGES = ["fr", "en", "es"];

for (const chemin of PAGES) {
  test(`/${chemin} monte sa scene pour un visiteur humain, sans erreur`, async ({ page }) => {
    // Le defaut par defaut de la suite est de 60 s, et une machine sans carte
    // graphique rend la scene en logiciel : il lui faut de la marge.
    test.setTimeout(180_000);

    const erreurs: string[] = [];
    page.on("pageerror", (e) => erreurs.push(String(e.message).slice(0, 300)));

    await page.goto(`/${chemin}?veille=off`);

    // LE GARDE-FOU DE L'ORACLE LUI-MEME : si la suite se met un jour a
    // tourner sous un user-agent headless, elle emprunte le chemin robot et
    // ne prouve plus rien. On le dit ici, pas dans un commentaire.
    const vuCommeRobot = await page.evaluate(() =>
      /Chrome-Lighthouse|HeadlessChrome|PageSpeed|Googlebot|bingbot|Applebot|DuckDuckBot|YandexBot|Baiduspider/i.test(
        navigator.userAgent,
      ),
    );
    expect(vuCommeRobot, "la suite doit tourner sous un user-agent HUMAIN, sinon elle teste le chemin robot").toBe(
      false,
    );

    await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, {
      timeout: 120_000,
    });

    const canvas = await page.evaluate(() => document.querySelectorAll("canvas").length);
    expect(canvas, "la scene doit avoir monte au moins un canvas").toBeGreaterThan(0);

    expect(erreurs, "aucune erreur non capturee ne doit survivre au montage").toEqual([]);
  });
}
