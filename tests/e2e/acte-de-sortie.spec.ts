import { test, expect, type Page } from "@playwright/test";
import { defilerDansLArc, longueurDeLArc } from "./arc";

/**
 * L'ACTE DE SORTIE (10/09, F2, lot 5 du panel du 08/09).
 *
 * Mesure du 10/09 sur la production : l'arc de revelation se terminait a
 * 63,5 % du defilement de la page, et le tiers restant -- plus d'un ecran
 * entier -- se faisait sur une image FIGEE. Le panel avait nomme le piege
 * d'avance : le climax zenithal du Centre y tombait aux deux tiers de la
 * page que le jury charge en premier.
 *
 * L'oracle demande par le plan, mot pour mot : « en fin de page, le pied de
 * page n'occupe plus la moitie de la fenetre, et un mouvement de camera a
 * bien eu lieu apres le climax ».
 *
 * Le second point est le seul qui puisse regresser en silence, parce qu'il
 * ne se voit pas sur une capture : on lit la focale et la hauteur de la
 * camera de part et d'autre de la fenetre de sortie.
 */

type Pose = { fov: number; y: number };

async function attendreScene(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, {
    timeout: 90_000,
  });
}

/** Le progres de l'acte de sortie, lu dans le site (sonde du 20/09). */
async function sortie(page: Page): Promise<number> {
  return page.evaluate(() => {
    const s = (window as unknown as { __nahualArc?: { exit: { current: number } } }).__nahualArc;
    return s ? s.exit.current : -1;
  });
}

async function poseCamera(page: Page): Promise<Pose> {
  return page.evaluate(() => {
    const c = (window as unknown as { __nahualR3f?: { camera: { fov: number; position: { y: number } } } })
      .__nahualR3f?.camera;
    return { fov: c?.fov ?? -1, y: c?.position.y ?? -1 };
  });
}

/** Va a une fraction du defilement REEL de la page, et laisse la scene suivre. */
async function defiler(page: Page, fraction: number) {
  await page.evaluate((f) => {
    window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f);
  }, fraction);
  await page.waitForTimeout(1200);
}

test.describe("l'acte de sortie", () => {
  test("la camera bouge encore APRES la fin de l'arc", async ({ page }) => {
    await page.goto("/fr");
    await attendreScene(page);

    // Fin de l'arc, la ou le climax se pose. C'etait « deux hauteurs
    // d'ecran » jusqu'au 20/09 ; c'est desormais la longueur de la page.
    await defilerDansLArc(page, 1);
    await page.waitForTimeout(1500);
    const auClimax = await poseCamera(page);
    expect(auClimax.fov, "la sonde ne lit pas la camera").toBeGreaterThan(0);

    // Tout en bas : l'acte de sortie est joue en entier.
    await defiler(page, 1);
    const apres = await poseCamera(page);

    // Le cadre s'est resserre (focale plus courte) ET la camera a pris de
    // la hauteur. Les deux, sinon ce n'est pas un depart, c'est un reglage.
    expect(auClimax.fov - apres.fov, "la focale ne s'est pas resserree").toBeGreaterThan(2);
    expect(apres.y - auClimax.y, "la camera n'a pas pris de hauteur").toBeGreaterThan(0.2);
  });

  test("sur l'accueil, l'arc occupe l'essentiel de la page", async ({ page }) => {
    await page.goto("/fr");
    await attendreScene(page);
    // 20/09 : `(h * 2) / max` calculait la part de l'arc avec deux fenetres
    // EN DUR. Le test serait reste vert en mesurant autre chose -- et il
    // avait echappe a une recherche de `innerHeight * 2`, la hauteur passant
    // par une variable locale. La longueur vient maintenant du site.
    const arc = await longueurDeLArc(page);
    const geo = await page.evaluate((a) => {
      const h = window.innerHeight;
      const max = document.documentElement.scrollHeight - h;
      return { partDeLArc: a / max, restant: (max - a) / h };
    }, arc);
    // La mesure du defaut du 10/09 (l'arc finissait a 63,5 % du defilement,
    // 1,15 ecran de rab fige) transformee en garde. Vaut pour l'accueil,
    // qui n'a presque pas de texte : les pages a contenu sont bien plus
    // longues, et c'est pour elles que l'acte est ancre en bas de page.
    expect(geo.partDeLArc, "l'arc occupe trop peu de la page").toBeGreaterThan(0.7);
    expect(geo.restant, "il reste trop de defilement apres l'arc").toBeLessThan(0.8);
  });

  test("SUR UNE PAGE LONGUE, l'acte de sortie ne se joue pas pendant la lecture", async ({ page }) => {
    // Memoire offre plus du double du defilement de l'accueil : une sortie
    // calee sur la fin de l'arc s'y serait jouee au tiers de la page, camera
    // qui monte et cadre qui se ferme pendant la lecture.
    //
    // REECRIT LE 20/09, ET PAS REBASE. Ce test demandait « rien ne bouge
    // entre 50 % et 80 % », en comparant la focale a 0,6 pres. Le design
    // « l'arc dure la page » abolit cette premisse : l'arc court maintenant
    // jusqu'a 93 % du defilement de Memoire, donc la camera bouge, et c'est
    // le but. Ce qu'il protegeait n'a pas change pour autant -- son propre
    // commentaire le dit, « camera qui monte et cadre qui se ferme pendant
    // la lecture », c'est-a-dire l'ACTE DE SORTIE. On lit donc `exitRef`,
    // la chose meme, au lieu de la focale, qui n'en etait que l'ombre.
    await page.goto("/fr/memoire");
    await attendreScene(page);

    await defiler(page, 0.5);
    const aMiPage = await poseCamera(page);
    expect(aMiPage.fov, "la sonde ne lit pas la camera").toBeGreaterThan(0);
    expect(await sortie(page), "la sortie a commence a mi-page").toBe(0);

    await defiler(page, 0.8);
    expect(await sortie(page), "la sortie a commence aux quatre cinquiemes").toBe(0);

    await defiler(page, 1);
    expect(await sortie(page), "la sortie ne s'est pas jouee en bas de page").toBeGreaterThan(0);
    const enBas = await poseCamera(page);
    expect(aMiPage.fov - enBas.fov, "l'acte de sortie ne se joue pas en bas de page").toBeGreaterThan(2);
  });

  test("en fin de page, le pied de page n'occupe pas la moitie de la fenetre", async ({ page }) => {
    await page.goto("/fr");
    await attendreScene(page);
    await defiler(page, 1);
    const part = await page.evaluate(() => {
      const f = document.querySelector("footer");
      if (!f) return -1;
      const r = f.getBoundingClientRect();
      const visible = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
      return visible / window.innerHeight;
    });
    expect(part).toBeGreaterThan(0);
    expect(part).toBeLessThan(0.5);
  });
});
