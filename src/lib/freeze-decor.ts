import type { Object3D } from "three";

/**
 * FIGER LE DECOR (10/09).
 *
 * three recompose la matrice de chaque objet a chaque image des lors que
 * `matrixAutoUpdate` est vrai, ce qui est le defaut. Et `updateMatrix()`
 * marque l'objet sale SANS REGARDER si quelque chose a change :
 *
 *   updateMatrix() {
 *     this.matrix.compose(this.position, this.quaternion, this.scale);
 *     this.matrixWorldNeedsUpdate = true;
 *   }
 *
 * Donc un rocher pose une fois pour toutes paie, a chaque image et pour
 * toujours, une composition de matrice, une multiplication par la matrice
 * de son parent, et la propagation forcee de cette mise a jour a tous ses
 * enfants.
 *
 * Mesure du 10/09 sur Contact, CPU x4 : 941 objets dans la scene, dont 488
 * dont la matrice monde ne bouge JAMAIS, et updateMatrixWorld plus
 * multiplyMatrices plus projectObject plus traverse comptent 159 ms par
 * seconde, soit 4,1 ms par image sur un budget de 16,7.
 *
 * LE PIEGE, a connaitre avant d'appeler ceci : un objet fige ne bougera
 * plus si on ecrit dans son `position`, sa `rotation` ou son `scale`, il
 * faudra appeler `updateMatrix()` a la main. En revanche il suit toujours
 * son parent : la propagation forcee traverse les objets figes. C'est ce
 * qui permet au decor fige de tourner quand la boussole tourne.
 */
export function freezeDecor(root: Object3D): number {
  // Les matrices monde doivent etre justes AVANT de figer, sinon on gele
  // une pose fausse.
  root.updateMatrixWorld(true);
  let n = 0;
  root.traverse((o) => {
    o.matrixAutoUpdate = false;
    n += 1;
  });
  return n;
}
