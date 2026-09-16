import { Matrix4, type Object3D } from "three";

/**
 * ELAGUER CE QUI NE DESSINE RIEN (16/09).
 *
 * `mergeByMaterial` retire les maillages de leurs parents, mais laisse les
 * parents : une plante de soixante-dix-neuf feuilles fusionnee devient un
 * maillage plus soixante-dix-neuf groupes vides. Multiplie par les clones,
 * ca fait le gros des 236 objets de Contact qui ne dessinent rien.
 *
 * Et ils ne sont pas gratuits. `Object3D.updateMatrixWorld` descend TOUT le
 * graphe a chaque image, visible ou non, dirty ou non (r185, source lue) :
 * la recursion seule pesait 2,2 ms par image sur Contact, pour 800 objets,
 * contre 5,4 ms de rendu total sur l'Accueil qui n'en a que 378. Le meme
 * parcours recommence dans `projectObject`, pour le tri et le culling.
 *
 * Deux coupes, dans cet ordre :
 *
 * 1. **Les feuilles mortes** : un noeud sans role et sans enfant ne peut
 *    rien produire. On recommence tant qu'il en tombe, puisque retirer une
 *    feuille peut en faire une de son parent.
 * 2. **Les chainons** : un noeud sans role qui n'a qu'un enfant ne sert
 *    qu'a porter une transformation. On la cuit dans l'enfant et on rattache
 *    l'enfant au grand-parent. Le monde ne bouge pas d'un cheveu.
 *
 * CE QU'ON NE TOUCHE PAS, et pourquoi c'est ecrit ici : un OS porte le nom
 * que cherche un squelette, et une piste d'animation GLTF vise un noeud PAR
 * SON NOM. Un decor fusionne n'a ni l'un ni l'autre, mais le maïs de la
 * milpa pousse par animation : cette fonction ne doit pas l'approcher. Elle
 * ne s'applique qu'a ce dont on a LU qu'il est pose une fois pour toutes,
 * meme regle que `freeze-decor`.
 */

export type RapportElagage = {
  avant: number;
  apres: number;
  /** Feuilles mortes retirees. */
  feuilles: number;
  /** Chainons a un seul enfant effondres. */
  chainons: number;
};

/** Un noeud qui produit quelque chose, ou qu'un autre systeme designe. */
export function porteUnRole(o: Object3D): boolean {
  const x = o as Object3D & {
    isMesh?: boolean;
    isPoints?: boolean;
    isSprite?: boolean;
    isLine?: boolean;
    isInstancedMesh?: boolean;
    isSkinnedMesh?: boolean;
    isBone?: boolean;
    isLight?: boolean;
    isCamera?: boolean;
  };
  return Boolean(
    x.isMesh ||
      x.isPoints ||
      x.isSprite ||
      x.isLine ||
      x.isInstancedMesh ||
      x.isSkinnedMesh ||
      x.isBone ||
      x.isLight ||
      x.isCamera,
  );
}

function compter(root: Object3D): number {
  let n = 0;
  root.traverse(() => {
    n += 1;
  });
  return n;
}

export function elaguerDecor(root: Object3D): RapportElagage {
  const avant = compter(root);
  let feuilles = 0;
  let chainons = 0;

  // 1. Les feuilles mortes, en cascade.
  for (;;) {
    const morts: Object3D[] = [];
    root.traverse((o) => {
      if (o === root || porteUnRole(o)) return;
      if (o.children.length === 0) morts.push(o);
    });
    if (morts.length === 0) break;
    for (const o of morts) o.removeFromParent();
    feuilles += morts.length;
  }

  // 2. Les chainons. On collecte d'abord : on ne modifie pas un graphe
  // pendant qu'on le parcourt.
  const aEffondrer: Object3D[] = [];
  root.traverse((o) => {
    if (o === root || porteUnRole(o)) return;
    if (o.children.length === 1 && o.parent) aEffondrer.push(o);
  });
  const cuisson = new Matrix4();
  for (const noeud of aEffondrer) {
    const parent = noeud.parent;
    const enfant = noeud.children[0];
    // Le noeud a pu perdre son role de chainon si un autre effondrement
    // lui a rattache des freres entre-temps.
    if (!parent || !enfant || noeud.children.length !== 1) continue;
    noeud.updateMatrix();
    enfant.updateMatrix();
    cuisson.multiplyMatrices(noeud.matrix, enfant.matrix);
    enfant.removeFromParent();
    enfant.matrix.copy(cuisson);
    enfant.matrix.decompose(enfant.position, enfant.quaternion, enfant.scale);
    parent.add(enfant);
    noeud.removeFromParent();
    chainons += 1;
  }

  root.updateMatrixWorld(true);
  return { avant, apres: compter(root), feuilles, chainons };
}
