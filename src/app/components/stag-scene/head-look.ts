import { Object3D, Quaternion, Vector3 } from "three";

/**
 * Beat "regard caméra" (palier suivant, 21/08, cf memory project-nahual-da) :
 * fait pivoter l'os `Head` du rig (GLB inspecté le 21/08 : chaîne
 * Neck1→Neck2→Neck3→Head→Stag_Horns/Head_end confirmée, pas de clip dédié
 * dans le pack Quaternius) vers la caméra, mélangé par-dessus la pose déjà
 * posée par le mixer d'animation ce frame : jamais un remplacement total de
 * l'Idle, un layering (`blend` 0 = pose animée intacte, 1 = regard complet).
 *
 * Approche : direction cible calculée en repère LOCAL du parent de l'os
 * (Neck3), pas en world space directement : le quaternion local d'un os
 * skinné s'exprime relativement à son parent, pas au monde. `FORWARD_AXIS`
 * est une hypothèse (Y-local pointe vers l'enfant `Head_end`, convention
 * d'export Blender la plus courante) : à confirmer/ajuster par vérification
 * visuelle en direct (si le museau part dans la mauvaise direction, changer
 * cet axe plutôt que revoir le reste du calcul).
 */
const FORWARD_AXIS = new Vector3(0, 1, 0);

// Scratch réutilisés d'une frame à l'autre (pas d'allocation dans la boucle
// de rendu) : même principe que les uniforms de rim-light.ts.
const headWorldPos = new Vector3();
const parentWorldQuat = new Quaternion();
const invParentWorldQuat = new Quaternion();
const localTargetDir = new Vector3();
const lookQuat = new Quaternion();

export function applyHeadLook(headBone: Object3D, targetWorldPosition: Vector3, blend: number) {
  const clampedBlend = Math.min(1, Math.max(0, blend));
  if (clampedBlend <= 0) return;
  const parent = headBone.parent;
  if (!parent) return;

  headBone.getWorldPosition(headWorldPos);
  parent.getWorldQuaternion(parentWorldQuat);
  invParentWorldQuat.copy(parentWorldQuat).invert();

  localTargetDir.copy(targetWorldPosition).sub(headWorldPos).applyQuaternion(invParentWorldQuat).normalize();

  lookQuat.setFromUnitVectors(FORWARD_AXIS, localTargetDir);
  headBone.quaternion.slerp(lookQuat, clampedBlend);
}
