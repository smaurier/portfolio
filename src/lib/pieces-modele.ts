import { Box3, Matrix4, Quaternion, Vector3, type BufferGeometry, type Material, type Mesh, type Object3D } from "three";

/**
 * LES PIECES D'UN MODELE, PRETES A ETRE INSTANCIEES (16/09).
 *
 * Un decor pose vingt exemplaires du meme GLB, c'est vingt appels de dessin
 * et quarante objets dans le graphe pour UNE geometrie et UN materiau.
 * `three` sait n'en faire qu'un seul appel, a condition de lui donner une
 * matrice par exemplaire. Cette fonction prepare l'autre moitie : la pose
 * du modele lui-meme, celle qui etait jusqu'ici recalculee dans chaque
 * clone.
 *
 * La NORMALISATION (mettre le modele a la hauteur voulue et le poser sur
 * son socle) ne depend que du modele, jamais de l'endroit ou on le pose.
 * L'ancien code la refaisait par clone, dans un `useFrame` qui attendait
 * que le clone soit attache au graphe pour que sa boite soit juste. En la
 * calculant sur la source, une fois, l'attente n'a plus lieu d'etre.
 *
 * La pose rendue vaut : normalisation composee avec la matrice de la piece
 * RELATIVE a la racine du modele. Les noeuds intermediaires d'un GLB
 * portent des rotations et des echelles, les ignorer effondrerait la plante
 * sur son centre (meme piege que `merge-meshes`).
 *
 * Ce qu'on refuse : un materiau en tableau, qu'une maille instanciee ne
 * sait pas rendre tel quel. Mieux vaut une piece laissee de cote qu'une
 * plante fausse.
 */

export type PieceModele = {
  geometry: BufferGeometry;
  material: Material;
  /** Du repere du modele normalise vers le repere de la piece. */
  pose: Matrix4;
};

/**
 * @param racine la scene du GLB, pas un clone : les geometries sont
 *   partagees, et c'est ce partage qui rend l'instanciation possible.
 * @param hauteurCible la hauteur voulue en unites de scene. Zero ou moins
 *   laisse le modele a sa taille native.
 */
export function preparerPieces(racine: Object3D, hauteurCible: number): PieceModele[] {
  racine.updateMatrixWorld(true);
  const boite = new Box3().setFromObject(racine);
  const taille = boite.getSize(new Vector3());
  const echelle = hauteurCible > 0 && taille.y > 0 ? hauteurCible / taille.y : 1;
  const centre = boite.getCenter(new Vector3());
  // Centre en x et z, pose sur son socle en y : exactement ce que faisaient
  // les clones, `clone.position.set(-center.x * s, -box.min.y * s, -center.z * s)`.
  const base = new Matrix4().compose(
    new Vector3(-centre.x * echelle, -boite.min.y * echelle, -centre.z * echelle),
    new Quaternion(),
    new Vector3(echelle, echelle, echelle),
  );
  const versRacine = new Matrix4().copy(racine.matrixWorld).invert();
  const pieces: PieceModele[] = [];
  racine.traverse((o) => {
    const maille = o as Mesh;
    if (!maille.isMesh || Array.isArray(maille.material) || !maille.geometry) return;
    const locale = new Matrix4().multiplyMatrices(versRacine, maille.matrixWorld);
    pieces.push({
      geometry: maille.geometry as BufferGeometry,
      material: maille.material as Material,
      pose: new Matrix4().multiplyMatrices(base, locale),
    });
  });
  return pieces;
}
