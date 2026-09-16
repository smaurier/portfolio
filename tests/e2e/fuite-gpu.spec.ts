import { test, expect, devices } from "@playwright/test";

/**
 * LE SITE NE FUIT PAS SUR LE PROCESSEUR GRAPHIQUE (15/09).
 *
 * Le canvas survit aux changements de page (PersistentScene) : les objets
 * d'une direction sont demontes quand on part, mais leurs geometries et
 * leurs textures vivent sur le GPU, et le ramasse-miettes de JavaScript ne
 * les libere PAS. Seul `dispose()` le fait.
 *
 * Mesure du 15/09, production locale, sept tours des cinq directions :
 *
 *   geometries  36 -> 90 -> 130 -> 146 -> 163 -> 181 -> 199 -> 214
 *   textures    47 -> 75 ->  92 ->  95 ->  97 -> 100 -> 104 -> 107
 *
 * Le premier tour charge legitimement les cinq mondes. Ensuite, chaque tour
 * ajoute DIX-SEPT geometries et TROIS textures, lineairement, sans jamais
 * redescendre, meme apres un ramassage force. Le graphe de scene, lui, est
 * propre (989 objets, stable) et le tas JavaScript ne bouge pas : ce sont
 * des ressources purement graphiques, orphelines.
 *
 * Ce que ca coute : un visiteur qui se promene dix minutes accumule des
 * centaines de geometries. Sur un telephone, et sur iOS en particulier ou
 * la memoire graphique est serree, cela finit par une perte de contexte
 * WebGL, c'est-a-dire un canvas noir.
 *
 * L'ORACLE compare deux tours TARDIFS entre eux, pas au depart : le premier
 * tour a le droit de charger le monde, les suivants n'ont plus rien de neuf
 * a apprendre. Entre le deuxieme et le quatrieme tour, le compte ne doit
 * plus bouger.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

const DIRECTIONS = ["/fr/services", "/fr/projets", "/fr/contact", "/fr/memoire", "/fr"];
/** Les geometries ne doivent plus bouger du tout ; deux de marge pour une
 *  ressource cuite en differe qui arriverait entre deux releves. */
const TOLERANCE_GEO = 3;
/**
 * LA CAUSE A ETE TROUVEE LE 16/09, et ce plafond redevient un vrai garde.
 *
 * L'hypothese du 15/09 (« des cibles de rendu des simulateurs du Nord »)
 * etait fausse, et elle l'etait parce qu'on comptait des textures sans
 * jamais regarder NI leur taille NI qui les avait creees. En interceptant
 * `createTexture` et `deleteTexture` du contexte WebGL lui-meme, avec la
 * pile d'appel et la taille de chaque image, il y avait deux fuites, de
 * natures opposees :
 *
 *  - LE POIDS : sept copies de la photographie de ciel (2048 x 1024, 8 Mo
 *    piece, 48 Mo en trop). L'effet de `sud-sky` depend de `direction`,
 *    donc il refaisait une texture a chaque page, et son nettoyage appelait
 *    `dispose()` SANS vider l'uniforme : le materiau, lui, survit, et il
 *    suffisait d'un rendu pour que three RE-ALLOUE ce qu'on venait de
 *    liberer. Corrige par un singleton paresseux, comme `mictlan-sky`.
 *  - LE COMPTE : treize textures d'os par tour. three donne a chaque
 *    `Skeleton` une image ou il ecrit une matrice par os (16 x 16 pour 62
 *    os), et elle ne part que sur `dispose()`. Personne ne l'appelait.
 *    Corrige par `lib/liberer-squelettes`, sur les deux composants qui
 *    CLONENT leur modele et possedent donc leurs squelettes.
 *
 * Apres : le compte monte d'UNE texture par tour au lieu de treize, et le
 * poids ne bouge plus (113,8 Mo sur un ecran de bureau, 17,2 sur telephone).
 * Quatre de marge pour une ressource cuite en differe entre deux releves.
 */
const TOLERANCE_TEX = 4;

test("deux tours du site n'ajoutent plus rien au processeur graphique", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/fr?shaders-prod&veille=off");
  await page.waitForFunction(
    () => document.documentElement.dataset.loaded === "true" && !!(window as unknown as { __nahualR3f?: unknown }).__nahualR3f,
    null,
    { timeout: 120_000 },
  );
  await page.waitForTimeout(6000);

  const lire = () =>
    page.evaluate(() => {
      const w = window as unknown as { __nahualR3f: { gl: { info: { memory: { geometries: number; textures: number } } } } };
      return { geometries: w.__nahualR3f.gl.info.memory.geometries, textures: w.__nahualR3f.gl.info.memory.textures };
    });

  const tour = async () => {
    for (const d of DIRECTIONS) {
      await page.evaluate((url) => {
        const lien = [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === url);
        if (lien instanceof HTMLElement) lien.click();
        else window.location.href = url;
      }, d);
      await page.waitForTimeout(2400);
    }
  };

  // Trois tours de mise en route : le premier charge les cinq mondes, et le
  // serveur de developpement met plus longtemps que la production a se
  // poser (mesure du 15/09 : palier atteint au deuxieme tour en production,
  // au troisieme en developpement). On compare donc ce qui suit le palier.
  await tour();
  await tour();
  await tour();
  const apresTrois = await lire();
  await tour();
  await tour();
  const apresCinq = await lire();

  const geo = apresCinq.geometries - apresTrois.geometries;
  const tex = apresCinq.textures - apresTrois.textures;

  expect(
    geo,
    `geometries : ${apresTrois.geometries} au troisieme tour, ${apresCinq.geometries} au cinquieme (+${geo})`,
  ).toBeLessThanOrEqual(TOLERANCE_GEO);
  expect(
    tex,
    `textures : ${apresTrois.textures} au troisieme tour, ${apresCinq.textures} au cinquieme (+${tex})`,
  ).toBeLessThanOrEqual(TOLERANCE_TEX);
});
