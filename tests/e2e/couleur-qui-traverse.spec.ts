import { test, expect, devices } from "@playwright/test";

/**
 * LA COULEUR DE DIRECTION TRAVERSE, ELLE NE SE REMPLACE PAS (17/09).
 *
 * `persistent-scene` pose la palette sur l'HEURE atmospherique et non sur
 * la route : pendant un passage, l'heure marche par directions
 * intermediaires, et son commentaire dit en toutes lettres le contrat que
 * ce fichier garde -- « les enfants lissent deja ces couleurs via leurs
 * useFrame : la traversee se lit comme un balayage de teintes ».
 *
 * DEUX ENFANTS NE LE FAISAIENT PAS. Sonde `diff-au-saut` du 17/09, Sud
 * vers Ouest, apres la correction du ciel : `uColor` de 0f6bb8 a d76464 et
 * `uAccentColor` de ffb400 a 4ade80, en une image. Du bleu au rouge d'un
 * bloc. Ce sont `stag-aura` et `spirit-particles`, les deux seuls a
 * recevoir `climaxRimColor` en propriete et a en faire un `useMemo` : la
 * couleur n'etait pas lissee, elle etait reconstruite.
 *
 * ET LA GEOMETRIE PARTAIT AVEC. Le memo de `spirit-particles` rendait la
 * geometrie ET les uniformes, avec les deux couleurs en dependances : tout
 * le systeme de particules etait donc realloue a chaque changement de
 * direction, c'est-a-dire exactement pendant le passage, quand la machine
 * paie deja la chauffe des shaders et le commit de la route. D'ou la
 * seconde assertion, qui ne regarde pas une couleur mais une identite.
 *
 * LE MOTIF, PARCE QU'IL DEPASSE CES DEUX FICHIERS : un fondu qui ne pilote
 * qu'une porte n'est pas un fondu. Le ciel avait la meme forme (`uDay` par
 * la route), les Cihuateteo aussi (`g.visible` sur un blend que rien ne
 * suivait). C'est la troisieme fois, donc ca vaut un oracle et pas une
 * correction de plus.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, colorScheme: "dark" });

/** Part de l'ecart total qu'une seule image a le droit de franchir. Une
 *  bascule seche vaut 1,0 ; un lissage a 0,06 par image ne depasse pas sa
 *  propre constante sur le premier pas. */
const PART_MAX_PAR_IMAGE = 0.15;

/** En dessous, les deux directions se ressemblent trop pour que la mesure
 *  veuille dire quelque chose. Sud (bleu) vers Ouest (rouge) est le plus
 *  grand ecart de l'anneau. */
const ECART_SIGNIFICATIF = 0.2;

type Suivi = { couleurs: number[][]; accents: number[][]; geometries: string[] };

test("la palette du cerf traverse au lieu de se remplacer, et sa geometrie ne bouge pas", async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto("/fr/projets?shaders-prod&veille=off");
  await page.waitForFunction(
    () => document.documentElement.dataset.loaded === "true" && !!(window as unknown as { __nahualScene?: unknown }).__nahualScene,
    null,
    { timeout: 120_000 },
  );
  await page.waitForTimeout(4000);

  // On echantillonne a chaque image : les deux couleurs du systeme de
  // particules et l'identite de sa geometrie. Les materiaux se trouvent par
  // leurs uniformes et non par un nom, parce que la scene n'en donne pas.
  await page.evaluate(() => {
    const w = window as unknown as {
      __nahualScene: { traverse: (f: (n: unknown) => void) => void };
      __suivi: Suivi;
      __stop: boolean;
    };
    w.__suivi = { couleurs: [], accents: [], geometries: [] };
    w.__stop = false;
    const tick = () => {
      if (w.__stop) return;
      let mat: Record<string, { value: { r: number; g: number; b: number } }> | null = null;
      let geo = "";
      w.__nahualScene.traverse((n) => {
        const noeud = n as { material?: { uniforms?: Record<string, { value: unknown }> }; geometry?: { uuid?: string } };
        const u = noeud.material?.uniforms;
        if (u && u.uAccentColor && u.uColor) {
          mat = u as Record<string, { value: { r: number; g: number; b: number } }>;
          geo = noeud.geometry?.uuid ?? "";
        }
      });
      // Le cast rompt l'inference : `mat` est affecte dans un rappel, donc
      // TypeScript le reduit a `never` apres le test de nullite.
      const trouve = mat as Record<string, { value: { r: number; g: number; b: number } }> | null;
      if (trouve) {
        const c = trouve.uColor.value;
        const a = trouve.uAccentColor.value;
        w.__suivi.couleurs.push([c.r, c.g, c.b]);
        w.__suivi.accents.push([a.r, a.g, a.b]);
        w.__suivi.geometries.push(geo);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.evaluate(() => {
    const l = [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === "/fr/contact");
    if (l instanceof HTMLElement) l.click();
  });
  await page.waitForTimeout(6000);

  const suivi = (await page.evaluate(() => {
    const w = window as unknown as { __stop: boolean; __suivi: Suivi };
    w.__stop = true;
    return w.__suivi;
  })) as Suivi;

  expect(suivi.couleurs.length, "aucune image echantillonnee : le systeme de particules est introuvable").toBeGreaterThan(30);

  const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  for (const [quoi, serie] of [
    ["la couleur cardinale", suivi.couleurs],
    ["l'accent", suivi.accents],
  ] as const) {
    const ecart = distance(serie[0], serie[serie.length - 1]);
    if (ecart < ECART_SIGNIFICATIF) continue;
    let plusGrandPas = 0;
    let ou = 0;
    for (let i = 1; i < serie.length; i += 1) {
      const pas = distance(serie[i - 1], serie[i]);
      if (pas > plusGrandPas) {
        plusGrandPas = pas;
        ou = i;
      }
    }
    expect(
      plusGrandPas / ecart,
      `${quoi} : plus grand pas ${plusGrandPas.toFixed(3)} sur un ecart de ${ecart.toFixed(3)}, image ${ou}`,
    ).toBeLessThan(PART_MAX_PAR_IMAGE);
  }

  const identites = new Set(suivi.geometries);
  expect(
    identites.size,
    `la geometrie des particules a ete reconstruite ${identites.size - 1} fois pendant le passage`,
  ).toBe(1);
});
