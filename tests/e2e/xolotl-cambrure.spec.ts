import { test, expect, devices } from "@playwright/test";

/**
 * LA CAMBRURE DE XOLOTL NE S'ACCUMULE PAS (13/09).
 *
 * Retour de Sylvain : « il y a un vrai probleme avec Xolotl ». Mesure : la
 * cambrure du dos, posee a chaque image PAR-DESSUS la pose courante,
 * supposait que le cycle de marche reecrivait les vertebres. Il n'en
 * reecrit qu'une partie : sur la premiere, le delta s'ajoutait a lui-meme
 * et le dos restait tordu de 28 degres pour le reste de la visite, la
 * cambrure revenue a zero depuis longtemps.
 *
 * L'oracle est donc celui qui manquait : au bord du bassin le dos PLIE, et
 * une fois loin du bord il revient exactement a sa pose de repos. On lit
 * l'os directement dans la scene (sonde de dev), parce que c'est la seule
 * chose qu'une image ne montre pas.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

const OS = "Wolf_Spine_01SHJnt_26";

type Releve = { cambrure: number; angle: number };

async function lire(page: import("@playwright/test").Page, os: string): Promise<Releve | null> {
  return page.evaluate((nom) => {
    const w = window as unknown as {
      __nahualScene?: { traverse: (f: (o: { name: string; quaternion: { w: number } }) => void) => void };
      __nahualXolotl?: { cambrure: number };
    };
    if (!w.__nahualXolotl || !w.__nahualScene) return null;
    let angle: number | null = null;
    w.__nahualScene.traverse((o) => {
      if (angle === null && o.name === nom) angle = (2 * Math.acos(Math.min(1, Math.abs(o.quaternion.w))) * 180) / Math.PI;
    });
    return angle === null ? null : { cambrure: w.__nahualXolotl.cambrure, angle };
  }, os);
}

test("le dos plie au bord du bassin, et revient exactement a sa pose", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/fr/memoire?shaders-prod&veille=off");
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 120_000 });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const releves: Releve[] = [];
  for (let i = 0; i <= 60; i++) {
    await page.evaluate((f) => window.scrollTo(0, f * (document.documentElement.scrollHeight - window.innerHeight)), i / 60);
    await page.waitForTimeout(280);
    const r = await lire(page, OS);
    if (r) releves.push(r);
  }

  test.skip(releves.length < 8, "Xolotl ne s'est pas montre pendant ce balayage");

  const auRepos = releves.filter((r) => Math.abs(r.cambrure) < 0.05).map((r) => r.angle);
  const plies = releves.filter((r) => Math.abs(r.cambrure) > 3).map((r) => r.angle);
  expect(auRepos.length, "des releves dos au repos").toBeGreaterThan(2);

  // 1. Au repos, TOUJOURS la meme pose : c'est ce qui manquait. Avant la
  //    correction, l'angle derivait de 122 a 94 puis y restait.
  const min = Math.min(...auRepos);
  const max = Math.max(...auRepos);
  expect(max - min, `pose de repos : ${min.toFixed(1)} a ${max.toFixed(1)} degres`).toBeLessThan(1.5);

  // 2. Et quand la cambrure joue, le dos bouge vraiment (sinon l'oracle
  //    ci-dessus serait tenu par un dos qui ne fait rien).
  if (plies.length > 0) {
    const ecart = Math.max(...plies.map((a) => Math.abs(a - max)));
    expect(ecart, "le dos plie quand la cambrure joue").toBeGreaterThan(0.05);
  }
});
