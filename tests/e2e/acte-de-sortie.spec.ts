import { test, expect, type Page } from "@playwright/test";

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

    // Fin de l'arc : deux hauteurs d'ecran, la ou le climax se pose.
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
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
    const geo = await page.evaluate(() => {
      const h = window.innerHeight;
      const max = document.documentElement.scrollHeight - h;
      return { partDeLArc: (h * 2) / max, restant: (max - h * 2) / h };
    });
    // La mesure du defaut du 10/09 (l'arc finissait a 63,5 % du defilement,
    // 1,15 ecran de rab fige) transformee en garde. Vaut pour l'accueil,
    // qui n'a presque pas de texte : les pages a contenu sont bien plus
    // longues, et c'est pour elles que l'acte est ancre en bas de page.
    expect(geo.partDeLArc, "l'arc occupe trop peu de la page").toBeGreaterThan(0.7);
    expect(geo.restant, "il reste trop de defilement apres l'arc").toBeLessThan(0.8);
  });

  test("SUR UNE PAGE LONGUE, rien ne bouge pendant qu'on lit encore", async ({ page }) => {
    // Memoire offre plus du double du defilement de l'accueil : une sortie
    // calee sur la fin de l'arc s'y serait jouee au tiers de la page, camera
    // qui monte et cadre qui se ferme pendant la lecture.
    await page.goto("/fr/memoire");
    await attendreScene(page);
    await defiler(page, 0.5);
    const aMiPage = await poseCamera(page);
    await defiler(page, 0.8);
    const auxQuatreCinquiemes = await poseCamera(page);
    expect(aMiPage.fov, "la sonde ne lit pas la camera").toBeGreaterThan(0);
    expect(Math.abs(auxQuatreCinquiemes.fov - aMiPage.fov), "le cadre se resserre trop tot").toBeLessThan(0.6);

    await defiler(page, 1);
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
