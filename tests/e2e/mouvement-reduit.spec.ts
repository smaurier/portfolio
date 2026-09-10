import { test, expect, type Page } from "@playwright/test";

/**
 * MOUVEMENT REDUIT : LE BOUTON DOIT FAIRE QUELQUE CHOSE (09/09).
 *
 * Le site gele le canvas sous `prefers-reduced-motion: reduce` : plus de
 * respiration du cerf, plus de parallaxe, plus de particules. C'est un
 * choix documente et defendable, et le mode recit accessible est
 * l'alternative offerte.
 *
 * Mais le site offre aussi « Contemplation : la scene deroule seule », et
 * sous mouvement reduit ce bouton ne faisait RIEN : mesure du 09/09 sur la
 * page Projets, 0,0 % des pixels du canvas changeaient dans les 4,5 s
 * suivant le clic. Deux causes empilees -- le canvas rendait en mode
 * « demand », et surtout `reducedMotionRef` figeait chaque composant, tandis
 * que l'arc lui-meme cessait de suivre le scroll.
 *
 * Or supprimer le mouvement par defaut n'est acceptable qu'avec un moyen de
 * le retablir. Un bouton qui ne fait rien est pire que pas de bouton :
 * l'utilisateur ne peut meme pas savoir que sa demande a ete perdue.
 *
 * Les deux tests tiennent les deux moitieres de la regle : par defaut la
 * scene se tait, sur demande explicite elle joue.
 */

/**
 * PIEGE DE SONDE (09/09) : `test.use({ reducedMotion: "reduce" })` ne prend
 * PAS dans ce projet -- mesure faite depuis un test, `matchMedia` repondait
 * faux et le frameloop restait « always ». Un test d'accessibilite ecrit
 * ainsi mesure l'etat NORMAL et passe quand meme, ce qui est pire qu'un
 * test absent. On appelle donc `emulateMedia` explicitement, AVANT la
 * navigation, parce que la page lit la preference au montage.
 */

/** Empreinte du canvas, reduite : compare des IMAGES, pas des uniformes,
 * parce que c'est le gel a l'ecran qui est en cause. */
async function empreinte(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    // LE PLUS GRAND canvas, et non le premier : la page en porte un autre,
    // de 300x150, qui n'a pas de contexte 3D. Premiere version de ce test
    // rouge pour cette raison, en mesurant un canvas qui n'etait pas la
    // scene.
    const tous = [...document.querySelectorAll("canvas")] as HTMLCanvasElement[];
    const c = tous.sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null;
    if (!c) return [];
    const petit = document.createElement("canvas");
    petit.width = 64;
    petit.height = 40;
    const ctx = petit.getContext("2d");
    if (!ctx) return [];
    ctx.drawImage(c, 0, 0, 64, 40);
    return [...ctx.getImageData(0, 0, 64, 40).data];
  });
}

function partChangee(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return -1;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 12) n += 1;
  }
  return (n / (a.length / 4)) * 100;
}

async function arrive(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/fr/projets?scene=1");
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90000 });
  await page.waitForTimeout(2500);
}

/** La scene 3D est-elle vraiment la ? Sans cette garde, un test qui mesure
 * un canvas de passage passe en ne prouvant rien (l'UA d'un robot suffit a
 * demonter le Canvas : cf lib/is-bot). */
async function sceneMontee(page: Page): Promise<boolean> {
  return page.evaluate(() => Boolean((window as unknown as { __nahualR3f?: unknown }).__nahualR3f));
}

test.describe("mouvement reduit", () => {
  test("par defaut, la scene se tait", async ({ page }) => {
    await arrive(page);
    expect(await sceneMontee(page), "la scene 3D doit etre montee, sinon ce test ne mesure rien").toBe(true);
    expect((await empreinte(page)).length, "le canvas doit exister").toBeGreaterThan(0);
    // On attend d'abord la STABILITE, au lieu de prendre une reference a
    // l'aveugle : un modele qui finit d'arriver fait rendre une image de
    // plus, et c'est du chargement, pas de l'animation. La distinction
    // compte -- premiere version de ce test rouge sous charge pour cette
    // seule raison, alors que la scene mesuree seule ne bougeait pas d'un
    // pixel en 14 s. Si le canvas ne se stabilise JAMAIS, c'est le defaut
    // que ce test doit attraper, et l'attente expire.
    let stable = await empreinte(page);
    let calme = false;
    for (let i = 0; i < 16 && !calme; i += 1) {
      await page.waitForTimeout(700);
      const suivant = await empreinte(page);
      calme = partChangee(stable, suivant) < 1;
      stable = suivant;
    }
    expect(calme, "le canvas doit finir de charger et se poser").toBe(true);
    await page.waitForTimeout(4000);
    expect(partChangee(stable, await empreinte(page)), "aucune animation non demandee").toBeLessThan(1);
  });

  test("la contemplation demandee joue quand meme", async ({ page }) => {
    await arrive(page);
    expect(await sceneMontee(page), "la scene 3D doit etre montee").toBe(true);
    // Le silence, mesure dans la meme course : c'est lui la reference.
    await page.waitForTimeout(3000);
    const s0 = await empreinte(page);
    await page.waitForTimeout(2500);
    const silence = Math.max(0, partChangee(s0, await empreinte(page)));
    await page.locator("button[aria-label*='Contemplation']").click();
    // Le temps que le frameloop reparte et que la scene se pose sur
    // l'heure vraie de Tenochtitlan avant de derouler le jour.
    await page.waitForTimeout(3000);
    const a = await empreinte(page);
    await page.waitForTimeout(4500);
    const b = await empreinte(page);
    // L'ORACLE (revu le 10/09). La ligne etait « plus de 1 % des pixels » sur
    // un echantillon de 64 x 40 : elle avait ete posee comme une ligne de
    // BRUIT, pas comme une ligne de mouvement. Le 10/09, le cadre decale a
    // mis plus de ciel uniforme dans l'image et la profondeur de champ a
    // adouci les lointains ; une orbite de 16 degres en 4,5 s ne change plus
    // qu'environ 0,9 % de cet echantillon, et le test tombait pour un site
    // qui bougeait. Ce que le test doit tenir, c'est la difference entre
    // « joue » et « se tait » : le canvas fige du premier test donne 0,0 %.
    // Donc un plancher bas mais net, ET un rapport au silence mesure dans
    // la meme course, pour que la barre ne soit jamais une constante
    // choisie a la main.
    const joue = partChangee(a, b);
    expect(joue, "la demande explicite de l'utilisateur doit jouer").toBeGreaterThan(0.4);
    expect(joue, "elle doit jouer NETTEMENT plus qu'au silence").toBeGreaterThan(5 * silence);
  });
});
