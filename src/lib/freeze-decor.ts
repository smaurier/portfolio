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

/**
 * LE DECOR QUI DORT (17/09).
 *
 * `MountForDirection` monte la direction suivante AVANT qu'on y aille, et la
 * garde invisible le temps de la chauffe (11/09, puis 16/09 qui a avance ce
 * montage pendant que le voile est encore leve). Un sous-arbre invisible
 * n'est pas gratuit pour autant : `updateMatrixWorld` le parcourt comme les
 * autres, et chacun de ses objets recompose sa matrice a chaque image. Pour
 * personne.
 *
 * Mesure du 17/09, sonde `.scratch/transitions/figeables-nommes.mjs`, regles
 * de l'oracle `decor-fige` : Contact 41 dormants pour 13 eveilles, accueil
 * 18 pour 14, Projets 7 pour 21. Le depassement du budget etait donc en
 * entier du decor que personne ne regarde.
 *
 * CE QU'ON N'ENDORT PAS : ce qui dormait deja. Le sol et la flore sont figes
 * pour de bon depuis le 10/09 ; si on les endormait avec les autres, le
 * reveil les rendrait a `matrixAutoUpdate`, et ce gain-la disparaitrait en
 * silence, sans qu'aucun oracle ne le dise. On ne rend donc que ce qu'on a
 * pris.
 *
 * Appeler plusieurs fois est prevu et necessaire : un modele charge en
 * retard (Suspense) monte dans un sous-arbre deja endormi, et il faut
 * l'endormir a son tour sans compter deux fois ses voisins.
 */
export function endormirDecor(racine: Object3D): Object3D[] {
  racine.updateMatrixWorld(true);
  const pris: Object3D[] = [];
  racine.traverse((o) => {
    if (!o.matrixAutoUpdate) return;
    o.matrixAutoUpdate = false;
    pris.push(o);
  });
  return pris;
}

/**
 * Le reveil. On recompose la pose tout de suite : une boucle d'animation a
 * pu ecrire dans `position` pendant le sommeil sans que rien ne la compose,
 * et sans ce geste le premier rendu visible montrerait la pose d'avant.
 */
export function reveillerDecor(endormis: Object3D[]): void {
  for (const o of endormis) {
    o.matrixAutoUpdate = true;
    o.updateMatrix();
  }
}
