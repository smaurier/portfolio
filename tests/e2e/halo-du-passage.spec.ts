import { test, expect, devices } from "@playwright/test";

/**
 * LE HALO DU PASSAGE SUIT L'OISEAU (28/10).
 *
 * Le 28/10, l'oracle decor-fige est passe au rouge sur /fr/projets (32 pour
 * un budget de 30) : le passage du colibri ajoute un halo par oiseau, cinq
 * sprites crees invisibles, et `matrixAutoUpdate` etant vrai par defaut,
 * ils recomposaient leur matrice a chaque image sans que personne ne les
 * voie jamais -- le motif exact du rouge du 17/09.
 *
 * Le halo porte donc desormais `matrixAutoUpdate = false`. Mais le piege
 * de `lib/freeze-decor` dit qu'un objet fige ne bouge PLUS si on ecrit
 * dans sa position : il faut appeler `updateMatrix()` a la main. Cet
 * oracle garde ce fil-la, et lui seul. Sans l'appel, le halo reste colle
 * a l'endroit ou l'oiseau se trouvait a sa creation, et la chaleur du
 * passage se detache de l'oiseau : un defaut qu'aucune capture au
 * stationnaire ne montrerait, puisque l'ecart grandit avec le vol.
 *
 * Vu ROUGE le 28/10 en retirant l'`updateMatrix()` de useFrame : le halo
 * s'etait detache de 10,43 u, soit tout le vol depuis sa creation. Vert
 * avec : 0,00000 u sur quarante images.
 *
 * IL MESURE EN MONDE, ET SANS RIEN FORCER : on lit `matrixWorld`, jamais
 * `getWorldPosition()`, qui recalculerait la matrice au moment de la
 * lecture et masquerait precisement le defaut cherche.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

test("le halo du passage reste sur l'oiseau, image par image", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/fr/projets?shaders-prod&veille=off");
  await page.waitForFunction(
    () => document.documentElement.dataset.loaded === "true" && !!(window as unknown as { __nahualScene?: unknown }).__nahualScene,
    null,
    { timeout: 120_000 },
  );
  // Le passage se declenche de lui-meme ; `stationnaire` est l'etat ou
  // l'oiseau tient devant l'objectif, halo allume.
  await page.waitForFunction(() => (window as unknown as { __huitzilinPassage?: string }).__huitzilinPassage === "stationnaire", null, {
    timeout: 120_000,
  });

  const releve = await page.evaluate(async () => {
    type Obj = {
      visible: boolean;
      matrixWorld: { elements: number[] };
      userData?: { halo?: Obj };
      traverse: (f: (o: Obj) => void) => void;
    };
    const scene = (window as unknown as { __nahualScene: Obj }).__nahualScene;
    const porteurs: Obj[] = [];
    scene.traverse((o) => {
      if (o.userData?.halo) porteurs.push(o);
    });
    const monde = (o: Obj) => [o.matrixWorld.elements[12], o.matrixWorld.elements[13], o.matrixWorld.elements[14]] as const;
    const ecarts: number[] = [];
    const poses = new Set<string>();
    for (let k = 0; k < 40; k++) {
      await new Promise((r) => requestAnimationFrame(r));
      for (const m of porteurs) {
        const h = m.userData!.halo!;
        if (!h.visible) continue;
        const a = monde(m);
        const c = monde(h);
        ecarts.push(Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]));
        poses.add(a.map((x) => x.toFixed(4)).join(","));
      }
    }
    return { porteurs: porteurs.length, mesures: ecarts.length, pire: ecarts.length ? Math.max(...ecarts) : 0, poses: poses.size };
  });

  expect(releve.porteurs, "les oiseaux du Sud portent chacun leur halo").toBeGreaterThan(0);
  expect(releve.mesures, "un halo etait allume pendant le releve (sinon il ne prouve rien)").toBeGreaterThan(0);
  // Sans mouvement, un halo colle a sa pose de depart passerait : on exige
  // que l'oiseau ait vole pendant la mesure.
  expect(releve.poses, "l'oiseau a bouge pendant le releve (sinon il ne prouve rien)").toBeGreaterThan(1);
  expect(releve.pire, `le halo s'est detache de l'oiseau de ${releve.pire.toFixed(5)} u -- sa matrice est figee, il manque un updateMatrix() la ou on ecrit sa position`).toBeLessThan(0.001);
});
