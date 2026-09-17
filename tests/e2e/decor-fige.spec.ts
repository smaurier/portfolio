import { test, expect, devices } from "@playwright/test";

/**
 * LE DECOR NE RECOMPOSE PAS SA MATRICE POUR RIEN (14/09, F1c).
 *
 * three recompose la matrice de chaque objet a chaque image des lors que
 * `matrixAutoUpdate` est vrai, ce qui est le defaut, et `updateMatrix()`
 * marque l'objet sale SANS REGARDER si quelque chose a change. Un rocher
 * pose une fois pour toutes paie donc, a chaque image et pour toujours, une
 * composition de matrice, une multiplication par celle de son parent, et la
 * propagation forcee a tous ses enfants.
 *
 * Mesure du 14/09, Pixel 7, processeur divise par quatre : sur les cent
 * objets de Contact qui recomposent encore leur matrice, hors os, QUARANTE-
 * SIX n'avaient pas bouge d'un cheveu sur tout l'arc. Presque la moitie du
 * poste pour rien.
 *
 * Cet oracle est un CLIQUET, pas un zero. Un objet fige ne bouge plus si on
 * ecrit dans sa position (le piege est ecrit dans `lib/freeze-decor.ts`), et
 * on ne fige donc que ce dont on a LU qu'il ne bouge jamais. Ce que la sonde
 * montre immobile ne l'est pas forcement toujours :
 *
 *  - la voie lactee et les Centzon Huitznahua recopient la position de la
 *    CAMERA a chaque image ; ils paraissaient immobiles parce qu'ils etaient
 *    caches pendant la mesure ;
 *  - les maillages des Cihuateteo et de Xolotl sont a l'origine de leur
 *    groupe : c'est le groupe qui porte la descente, et il ne bouge pas tant
 *    que la scene ne les a pas appelees ;
 *  - le rai du Sud oriente sa lance a chaque image.
 *
 * CE QUE CET ORACLE COMPTE, exactement : le decor NON GREE. Tout ce qui vit
 * sous un modele a squelette est hors compte, parce qu'on ne le figera
 * jamais et parce que ces modeles montent et demontent au fil de l'arc, ce
 * qui faisait varier le compte de 53 a 73 sans qu'une ligne de code ait
 * change. Le prix de cette exclusion : elle emporte aussi les voisins d'un
 * modele gree dans le meme sous-arbre, comme les hampes d'ocotillo, qui
 * partagent leur bouquet avec des fleurs gltf. Leur gel du 14/09 se lit
 * donc dans la sonde `.scratch/audit/figeables2.mjs`, pas ici : 73 objets
 * figeables a Contact avant, 44 apres.
 *
 * Ce que le cliquet attrape, et c'est la vraie regression : un composant de
 * decor pose a la racine de la scene sans etre fige. C'est exactement
 * comme ca que les hampes d'ocotillo recomposaient leur matrice depuis le
 * 18/08, alors que leurs fleurs, elles, etaient figees depuis le 11/09.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

// Releve du 14/09 apres F1c, trois reprises chacune : 27 a l'accueil, 20 a
// 21 a Contact, moins a Projets. Le plafond laisse une marge de trois, pas
// davantage : au-dela, c'est qu'un composant est arrive sans etre fige.
//
// ET LE CLIQUET A SERVI (17/09). Il est passe au rouge sans qu'une ligne de
// decor ait change : 32 a l'accueil, 54 a Contact. La cause n'etait pas un
// composant non fige mais le PRE-MONTAGE avance du 16/09 (`04ca94a`), qui
// monte la direction suivante pendant que le voile est encore leve. Sonde
// `.scratch/transitions/figeables-nommes.mjs`, memes regles que cet oracle,
// avec en plus la visibilite des ancetres : Contact 41 dormants pour 13
// eveilles, accueil 18 pour 14, Projets 7 pour 21. Le depassement etait
// donc en entier du decor invisible que personne ne regardait, et qui
// recomposait sa matrice a chaque image quand meme -- `updateMatrixWorld`
// ne saute pas les branches invisibles.
//
// `MountForDirection` endort desormais son sous-arbre tant qu'il est
// invisible (`lib/freeze-decor.endormirDecor`), et ne rend au reveil que ce
// qu'il a pris. Releve apres : 27, 20, 27. Exactement la ligne de base du
// 14/09, donc le plafond ne bouge pas.
const BUDGET = 30;

for (const chemin of ["fr", "fr/contact", "fr/projets"]) {
  test(`/${chemin} : au plus ${BUDGET} objets immobiles recomposent leur matrice`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(`/${chemin}?shaders-prod&veille=off`);
    await page.waitForFunction(
      () => document.documentElement.dataset.loaded === "true" && !!(window as unknown as { __nahualScene?: unknown }).__nahualScene,
      null,
      { timeout: 120_000 },
    );
    await page.waitForTimeout(3000);

    const releve = await page.evaluate(async () => {
      type Obj = { matrixAutoUpdate: boolean; isBone?: boolean; type: string; name?: string; parent?: Obj | null; matrixWorld: { elements: number[] } };
      const scene = (window as unknown as { __nahualScene: { traverse: (f: (o: Obj) => void) => void } }).__nahualScene;
      const snap = () => {
        const m = new Map<Obj, string>();
        scene.traverse((o) => m.set(o, o.matrixWorld.elements.join(",")));
        return m;
      };
      const jalons = [snap()];
      // Tout l'arc : un objet immobile en haut de page peut bouger plus bas.
      for (const f of [0.25, 0.5, 0.75, 1]) {
        window.scrollTo(0, f * (document.documentElement.scrollHeight - window.innerHeight));
        await new Promise((res) => setTimeout(res, 1300));
        jalons.push(snap());
      }
      // LES MODELES GREES SONT HORS COMPTE. Leurs noeuds de monture sont a
      // l'origine de leur groupe, et c'est le groupe qui porte la descente
      // ou la marche : ils paraissent immobiles tant que la scene ne les a
      // pas appelees. On ne les figera jamais, et ils montent et demontent
      // au fil de l'arc, ce qui faisait varier le compte de 53 a 73 sans
      // qu'une seule ligne de code ait change. Un objet est exclu des qu'un
      // os vit quelque part sous lui, ou sous l'un de ses ancetres.
      const greee = new Set<Obj>();
      scene.traverse((o) => {
        if (!(o.isBone || o.type === "Bone")) return;
        // On s'arrete SOUS la racine : marquer la scene elle-meme
        // excluerait tout le monde (elle est l'ancetre de tous).
        let p: Obj | null | undefined = o;
        while (p && p.parent) {
          greee.add(p);
          p = p.parent;
        }
      });
      const sousUnGree = (o: Obj) => {
        let p: Obj | null | undefined = o;
        while (p && p.parent) {
          if (greee.has(p)) return true;
          p = p.parent;
        }
        return false;
      };

      const familles: Record<string, number> = {};
      let figeables = 0;
      for (const [o, v] of jalons[0]) {
        if (!o.matrixAutoUpdate) continue;
        if (o.isBone || o.type === "Bone") continue;
        if (sousUnGree(o)) continue;
        if (jalons.some((j) => j.get(o) !== v)) continue;
        figeables += 1;
        const chaine: string[] = [];
        let p: Obj | null | undefined = o;
        for (let k = 0; k < 8 && p; k++) {
          chaine.push(p.name || p.type);
          p = p.parent;
        }
        const cle = chaine.join(" < ");
        familles[cle] = (familles[cle] ?? 0) + 1;
      }
      return { figeables, familles: Object.entries(familles).sort((a, b) => b[1] - a[1]).slice(0, 8) };
    });

    expect(
      releve.figeables,
      `objets immobiles non figes : ${releve.figeables}\n${releve.familles.map(([n, k]) => `  ${k}  ${n}`).join("\n")}`,
    ).toBeLessThanOrEqual(BUDGET);
  });
}
