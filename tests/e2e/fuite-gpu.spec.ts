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
  test.setTimeout(420_000);
  await page.goto("/fr?shaders-prod&veille=off");
  await page.waitForFunction(
    () => document.documentElement.dataset.loaded === "true" && !!(window as unknown as { __nahualR3f?: unknown }).__nahualR3f,
    null,
    { timeout: 120_000 },
  );
  await page.waitForTimeout(6000);

  /**
   * L'ORACLE DE CAUSE (22/09) : AUCUNE GEOMETRIE NE RENTRE DEUX FOIS.
   *
   * Le compteur du moteur monte quand WebGLGeometries voit une geometrie
   * pour la premiere fois -- a cet instant precis, three appelle
   * `geometry.addEventListener("dispose", ...)` -- et redescend sur
   * `dispose()`. Une geometrie disposee PUIS ENCORE RENDUE re-entre dans le
   * compte : ses tampons sont renvoyes au pilote, et entre le dispose et le
   * rendu suivant, le compteur ment de tout ce qu'elle pese.
   *
   * C'est ce que ce test lisait le 20/09 et le 22/09 (+18, puis +7, jamais
   * la meme assertion) : l'ocotillo passait a `useLibereToutAuDemontage` un
   * tableau reconstruit a chaque rendu, donc l'effet se nettoyait a chaque
   * rendu et disposait les sept tubes d'un bouquet pendant qu'ils etaient a
   * l'ecran. Deux cents re-entrees par tour, mesurees ; et sept, c'est un
   * bouquet. Le compte etait stable en moyenne, et faux a tout instant.
   *
   * Le plafond est UN par geometrie, pas zero : en developpement, le
   * StrictMode de React joue chaque effet deux fois au montage, donc chaque
   * `useLibereAuDemontage` dispose une fois sa ressource juste apres sa
   * naissance, et elle re-entre a l'image suivante. Une fois, au montage,
   * en developpement seulement. Une deuxieme, c'est un dispose pendant la
   * vie de l'objet, et c'est un defaut.
   */
  type FicheReentree = { type: string; sommets: number; materiau: string; porteurs: number; fois: number };
  await page.evaluate(() => {
    type Geometrie = {
      isBufferGeometry?: boolean; uuid: string; type: string; __vue?: boolean;
      attributes: { position?: { count: number } };
    };
    type Objet = { geometry?: Geometrie; material?: { type: string } | Array<{ type: string }> };
    const w = window as unknown as {
      __nahualR3f: { scene: { traverse: (f: (o: Objet) => void) => void } };
      __reentrees: Map<string, FicheReentree>;
    };
    const { scene } = w.__nahualR3f;
    w.__reentrees = new Map();
    let temoin: Geometrie | null = null;
    scene.traverse((o) => { if (!temoin && o.geometry) temoin = o.geometry; });
    if (!temoin) throw new Error("aucune geometrie dans la scene chargee");
    let proto: object | null = Object.getPrototypeOf(temoin);
    while (proto && !Object.prototype.hasOwnProperty.call(proto, "addEventListener")) proto = Object.getPrototypeOf(proto);
    if (!proto) throw new Error("EventDispatcher introuvable sous la geometrie");
    const dispatcher = proto as { addEventListener: (this: Geometrie, type: string, fn: unknown) => void };
    const original = dispatcher.addEventListener;
    dispatcher.addEventListener = function (this: Geometrie, type: string, fn: unknown) {
      if (type === "dispose" && this.isBufferGeometry) {
        if (this.__vue) {
          const fiche = w.__reentrees.get(this.uuid);
          if (fiche) fiche.fois += 1;
          else {
            let porteurs = 0;
            let materiau = "?";
            scene.traverse((o) => {
              if (o.geometry !== this) return;
              porteurs += 1;
              const m = Array.isArray(o.material) ? o.material[0] : o.material;
              if (m) materiau = m.type;
            });
            w.__reentrees.set(this.uuid, { type: this.type, sommets: this.attributes.position?.count ?? 0, materiau, porteurs, fois: 1 });
          }
        }
        this.__vue = true;
      }
      return original.call(this, type, fn);
    };
  });

  /** Le compteur se lit APRES une image rendue : entre un `dispose()` et le
   *  rendu qui suit, il ne compte pas ce qui est a l'ecran. */
  const lire = () =>
    page.evaluate(async () => {
      await new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok())));
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

  /**
   * LE PALIER EST MESURE, PLUS PARIE (20/09).
   *
   * Ce test attendait TROIS tours, puis comparait. Trois venait d'une mesure
   * du 15/09 (« palier atteint au deuxieme tour en production, au troisieme
   * en developpement ») -- juste ce jour-la, sur une machine au repos.
   *
   * Le 20/09, il est tombe DEUX FOIS en fin de suite de vingt-quatre
   * minutes, et jamais sur la meme assertion : geometries +18 la premiere
   * fois, textures +8 la seconde. Une fuite ne change pas de nature d'une
   * passe a l'autre ; un palier pas encore atteint, si. Isole, avec ou sans
   * les changements du jour, il passait. Le defaut n'etait donc pas dans le
   * site, il etait dans le nombre trois.
   *
   * On tourne maintenant JUSQU'A ce que le compte se pose, et on compare
   * ensuite. L'oracle n'en perd rien : une vraie fuite ne se pose jamais, le
   * plafond de tours est atteint, et la comparaison echoue en le disant.
   *
   * Le palier se juge sur les GEOMETRIES seules : les textures montent d'une
   * par tour par construction (mesure du 16/09, ci-dessus), donc elles ne
   * peuvent pas servir a decider que plus rien ne bouge.
   */
  const MAX_TOURS = 10;
  let precedent = await lire();
  let tours = 0;
  let pose = false;
  while (tours < MAX_TOURS) {
    await tour();
    tours += 1;
    const maintenant = await lire();
    if (maintenant.geometries === precedent.geometries) {
      precedent = maintenant;
      pose = true;
      break;
    }
    precedent = maintenant;
  }

  const auPalier = precedent;
  await tour();
  await tour();
  const apresDeux = await lire();

  const geo = apresDeux.geometries - auPalier.geometries;
  const tex = apresDeux.textures - auPalier.textures;
  const ou = pose
    ? `palier atteint au tour ${tours}`
    : `AUCUN palier en ${MAX_TOURS} tours -- c'est la signature d'une fuite`;

  // La cause avant le compte : une geometrie qui re-entre plus d'une fois a
  // ete disposee pendant qu'elle etait rendue. Le rouge dit lesquelles.
  const reentrees = await page.evaluate(() =>
    [...(window as unknown as { __reentrees: Map<string, FicheReentree> }).__reentrees.values()],
  );
  const fautives = reentrees.filter((f) => f.fois > 1).sort((a, b) => b.fois - a.fois);
  const decrire = (f: FicheReentree) => `${f.type} ${f.sommets} sommets, ${f.materiau}, ${f.porteurs} maillage(s) : re-entree ${f.fois} fois`;
  expect(
    fautives.length,
    `${fautives.length} geometrie(s) disposee(s) pendant qu'elles etaient rendues, sur ${tours + 2} tours :\n  ${fautives.slice(0, 12).map(decrire).join("\n  ")}`,
  ).toBe(0);

  expect(
    geo,
    `geometries : ${auPalier.geometries} au palier, ${apresDeux.geometries} deux tours plus tard (+${geo}) ; ${ou}`,
  ).toBeLessThanOrEqual(TOLERANCE_GEO);
  expect(
    tex,
    `textures : ${auPalier.textures} au palier, ${apresDeux.textures} deux tours plus tard (+${tex}) ; ${ou}`,
  ).toBeLessThanOrEqual(TOLERANCE_TEX);
});
