import type { Object3D, Skeleton, SkinnedMesh } from "three";

/**
 * UN SQUELETTE PAR FIGURE, PAS PAR MAILLAGE (11/09).
 *
 * `SkeletonUtils.clone` cree un Skeleton PAR SkinnedMesh, meme quand les
 * parties d'une figure partagent les memes os (tete, corps, jambes, pieds
 * d'un meme personnage). Or three met a jour chaque Skeleton une fois par
 * image (62 multiplications de matrices, puis un televersement de texture
 * d'os) : quatre porteuses de dix parties, c'est quarante squelettes de
 * 62 os a mettre a jour et quarante textures a televerser, la ou quatre
 * suffiraient. Mesure sur Contact, CPU x4 : 35 squelettes de 62 os pour
 * quatre figures, et texSubImage2D a 20 ms par seconde.
 *
 * Deux maillages partagent un squelette quand ils ont les MEMES os (les
 * memes objets, dans le meme ordre) et les memes inverses de liaison ; la
 * matrice de liaison, propre a chaque maillage, est conservee. Retourne le
 * nombre de squelettes retires. Sur une porteuse : dix parties, quatre
 * familles d'inverses, donc quatre squelettes au lieu de dix.
 */
export function shareSkeletons(root: Object3D): number {
  // Par liste d'os, PLUSIEURS candidats : les parties d'un meme personnage
  // peuvent venir de skins aux inverses legerement differents (mesure sur
  // les porteuses : tete, corps, pieds, jambes, ecarts jusqu'a 1,6 %). On
  // partage a l'interieur de chaque famille exacte, jamais entre familles.
  const parCle = new Map<string, Skeleton[]>();
  let retires = 0;
  root.traverse((o) => {
    const mesh = o as SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
    const sk = mesh.skeleton;
    const cle = sk.bones.map((b) => b.uuid).join("|");
    const candidats = parCle.get(cle);
    if (!candidats) {
      parCle.set(cle, [sk]);
      return;
    }
    const partage = candidats.find((c) => memesInverses(c, sk));
    if (!partage) {
      candidats.push(sk);
      return;
    }
    mesh.bind(partage, mesh.bindMatrix);
    retires += 1;
  });
  return retires;
}

function memesInverses(a: Skeleton, b: Skeleton): boolean {
  if (a.boneInverses.length !== b.boneInverses.length) return false;
  for (let i = 0; i < a.boneInverses.length; i++) {
    const ea = a.boneInverses[i].elements;
    const eb = b.boneInverses[i].elements;
    for (let k = 0; k < 16; k++) if (Math.abs(ea[k] - eb[k]) > 1e-6) return false;
  }
  return true;
}
