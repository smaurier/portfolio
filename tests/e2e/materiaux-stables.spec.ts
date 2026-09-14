import { test, expect, devices } from "@playwright/test";

/**
 * LA CHAUFFE DES SHADERS FINIT PAR SE TAIRE (14/09).
 *
 * `material.needsUpdate = true` incremente `material.version`, et la chauffe
 * s'en servait comme temoin : un materiau dont la version bouge doit etre
 * recompile avant le rendu qui suit. Mauvais temoin. three rend un materiau
 * transparent en double face EN DEUX PASSES, face arriere puis face avant,
 * et pose `needsUpdate` avant chacune (`renderObject`, et le meme geste dans
 * `prepareMaterial`, source de r185). La version de ces materiaux grimpe
 * donc de deux a chaque image, pour toujours, sans que leur programme change.
 *
 * La chauffe y lisait un changement, remettait l'objet dans sa file, le
 * recompilait, ce qui rebougeait la version. Mesure du 14/09, Pixel 7,
 * processeur divise par quatre : sur Memoire, TROIS maillages recompiles a
 * chaque image, 569 appels a `compile` en 185 images sur Contact, et chaque
 * appel parcourt la scene entiere pour ramasser les lumieres (2,8 % du
 * processeur au profil).
 *
 * L'oracle ne regarde donc pas les versions, qui bougent legitimement : il
 * regarde le seul geste qui coute, `WebGLRenderer.compile`. Un site pose,
 * qu'on parcourt une troisieme fois, ne compile plus rien.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

for (const chemin of ["fr", "fr/contact", "fr/memoire"]) {
  test(`/${chemin} : la chauffe se tait une fois la page parcourue`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(`/${chemin}?shaders-prod&veille=off`);
    await page.waitForFunction(
      () => document.documentElement.dataset.loaded === "true" && !!(window as unknown as { __nahualR3f?: unknown }).__nahualR3f,
      null,
      { timeout: 120_000 },
    );
    // La chauffe d'arrivee, puis l'intention (la direction suivante, trois
    // secondes apres le voile) ont le droit de compiler : on les laisse finir.
    await page.waitForTimeout(9000);

    const passes = await page.evaluate(async () => {
      const gl = (window as unknown as { __nahualR3f: { gl: { compile: (...a: unknown[]) => unknown } } }).__nahualR3f.gl;
      const brut = gl.compile.bind(gl) as (...a: unknown[]) => unknown;
      let appels = 0;
      gl.compile = (...a: unknown[]) => {
        appels += 1;
        return brut(...a);
      };
      const passe = async () => {
        const debut = appels;
        for (let i = 1; i <= 8; i++) {
          window.scrollTo(0, (i / 8) * (document.documentElement.scrollHeight - window.innerHeight));
          await new Promise((res) => setTimeout(res, 420));
        }
        window.scrollTo(0, 0);
        await new Promise((res) => setTimeout(res, 800));
        return appels - debut;
      };
      // Les deux premieres passes ont le droit de decouvrir : un objet peut
      // n'apparaitre qu'a une certaine profondeur de l'arc.
      const un = await passe();
      const deux = await passe();
      const trois = await passe();
      gl.compile = brut;
      return { un, deux, trois };
    });

    expect(
      passes.trois,
      `appels a compile par passe : ${passes.un}, puis ${passes.deux}, puis ${passes.trois}`,
    ).toBe(0);
  });
}
