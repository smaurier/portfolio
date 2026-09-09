import {
  BufferAttribute,
  BufferGeometry,
  Matrix3,
  Matrix4,
  Mesh,
  type Material,
  type Object3D,
} from "three";

/**
 * FUSIONNER CE QUI PARTAGE UN MATERIAU (09/09).
 *
 * Un modele dont chaque feuille est un maillage separe coute un appel de
 * rendu par feuille, et le double quand la lumiere projette des ombres.
 *
 * Le cas qui l'a motivee, mesure : `agave.glb` porte **79 sous-maillages
 * pour un seul materiau** (une feuille chacun), et il est clone neuf fois
 * entre la flore de fond et les epines du Sud. A midi, la page Projets
 * dessinait 1347 appels par image, dont 748 pour la seule passe d'ombres,
 * pour un plafond mobile de 100 a 200. Fusionner l'agave rend 78 appels
 * par exemplaire, sans changer un pixel : memes triangles, memes positions
 * dans le monde, meme materiau.
 *
 * Pourquoi ici et pas un utilitaire de three : la regle a des cas qu'on
 * refuse de traiter (plusieurs materiaux sur un maillage, cibles de
 * morphing, squelette) et l'invariant a prouver est geometrique. Une
 * fonction pure dans `lib` avec ses tests le dit mieux qu'un appel a une
 * boite noire, et n'ajoute aucune dependance.
 *
 * PRUDENCE ASSUMEE : tout ce qu'on ne sait pas fusionner exactement est
 * laisse en place. Mieux vaut un appel de rendu de plus qu'une plante
 * deformee.
 */

export type MergeReport = {
  /** Nombre de familles reellement fusionnees. */
  groupes: number;
  maillagesAvant: number;
  maillagesApres: number;
};

type Candidat = { mesh: Mesh; geometry: BufferGeometry };

function fusionnable(o: Object3D): o is Mesh {
  const m = o as Mesh;
  if (!m.isMesh) return false;
  if ((m as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh) return false;
  if (Array.isArray(m.material)) return false;
  const g = m.geometry as BufferGeometry | undefined;
  if (!g || !g.attributes.position) return false;
  // Les GROUPES DE DESSIN ne sont volontairement pas un motif de refus, et
  // le test l'a appris a mes depens : une BoxGeometry en declare SIX, un
  // par face, avec des indices de materiau 0 a 5, meme portee par un
  // maillage a materiau unique. Or trois ignore ces indices des lors que
  // le materiau n'est pas un tableau : tout est dessine avec le meme. Le
  // seul vrai risque est donc le materiau EN TABLEAU, deja refuse
  // au-dessus. Les groupes sont simplement abandonnes a la fusion.
  if (g.morphAttributes && Object.keys(g.morphAttributes).length > 0) return false;
  return true;
}

/**
 * Les attributs que TOUS les candidats possedent. On garde l'intersection
 * plutot que de remplir de zeros : un attribut absent rempli de zeros
 * donnerait des normales nulles ou des UV faux, donc une image differente.
 */
function attributsCommuns(candidats: Candidat[]): string[] {
  const communs = new Set(Object.keys(candidats[0].geometry.attributes));
  for (const c of candidats.slice(1)) {
    for (const nom of [...communs]) {
      const a = c.geometry.attributes[nom];
      const ref = candidats[0].geometry.attributes[nom];
      if (!a || a.itemSize !== ref.itemSize) communs.delete(nom);
    }
  }
  return [...communs].sort();
}

/** Copie l'attribut d'une geometrie en appliquant la matrice du maillage. */
function ecrire(
  nom: string,
  source: BufferGeometry,
  cible: Float32Array,
  offset: number,
  matrice: Matrix4,
  normales: Matrix3,
): void {
  const attr = source.attributes[nom];
  const n = attr.count;
  const taille = attr.itemSize;
  const positionnel = nom === "position";
  const directionnel = nom === "normal" || nom === "tangent";
  for (let i = 0; i < n; i += 1) {
    if (positionnel && taille >= 3) {
      let x = attr.getX(i), y = attr.getY(i), z = attr.getZ(i);
      const e = matrice.elements;
      const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15] || 1);
      const nx = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
      const ny = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
      const nz = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
      x = nx; y = ny; z = nz;
      cible[offset + i * taille] = x;
      cible[offset + i * taille + 1] = y;
      cible[offset + i * taille + 2] = z;
      for (let k = 3; k < taille; k += 1) cible[offset + i * taille + k] = attr.getComponent(i, k);
      continue;
    }
    if (directionnel && taille >= 3) {
      const e = normales.elements;
      const x = attr.getX(i), y = attr.getY(i), z = attr.getZ(i);
      let nx = e[0] * x + e[3] * y + e[6] * z;
      let ny = e[1] * x + e[4] * y + e[7] * z;
      let nz = e[2] * x + e[5] * y + e[8] * z;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      cible[offset + i * taille] = nx;
      cible[offset + i * taille + 1] = ny;
      cible[offset + i * taille + 2] = nz;
      for (let k = 3; k < taille; k += 1) cible[offset + i * taille + k] = attr.getComponent(i, k);
      continue;
    }
    for (let k = 0; k < taille; k += 1) {
      cible[offset + i * taille + k] = attr.getComponent(i, k);
    }
  }
}

/**
 * Fusionne, sous `root`, les maillages qui partagent un materiau. Mutation
 * en place : les originaux sont retires, un maillage fusionne est ajoute a
 * `root`. Idempotente (au deuxieme passage, il ne reste qu'un maillage par
 * materiau, donc rien a faire).
 */
export function mergeByMaterial(root: Object3D): MergeReport {
  root.updateMatrixWorld(true);
  const mondeInverse = new Matrix4().copy(root.matrixWorld).invert();

  const familles = new Map<Material, Candidat[]>();
  let maillagesAvant = 0;
  root.traverse((o) => {
    if ((o as Mesh).isMesh) maillagesAvant += 1;
    if (!fusionnable(o)) return;
    const mesh = o as Mesh;
    const mat = mesh.material as Material;
    if (!familles.has(mat)) familles.set(mat, []);
    familles.get(mat)!.push({ mesh, geometry: mesh.geometry as BufferGeometry });
  });

  let groupes = 0;
  for (const [materiau, candidats] of familles) {
    if (candidats.length < 2) continue;
    const noms = attributsCommuns(candidats);
    if (!noms.includes("position")) continue;

    const total = candidats.reduce((n, c) => n + c.geometry.attributes.position.count, 0);
    const tampons = new Map<string, Float32Array>();
    for (const nom of noms) {
      tampons.set(nom, new Float32Array(total * candidats[0].geometry.attributes[nom].itemSize));
    }
    const indices: number[] = [];

    let sommet = 0;
    const local = new Matrix4();
    const normales = new Matrix3();
    for (const c of candidats) {
      // Matrice du maillage RELATIVE a la racine : les noeuds
      // intermediaires d'un GLB portent des rotations et des echelles, et
      // les ignorer effondrerait la plante sur son centre.
      c.mesh.updateWorldMatrix(true, false);
      local.copy(mondeInverse).multiply(c.mesh.matrixWorld);
      normales.setFromMatrix4(local).invert().transpose();
      const n = c.geometry.attributes.position.count;
      for (const nom of noms) {
        const attr = candidats[0].geometry.attributes[nom];
        ecrire(nom, c.geometry, tampons.get(nom)!, sommet * attr.itemSize, local, normales);
      }
      const idx = c.geometry.getIndex();
      if (idx) {
        for (let i = 0; i < idx.count; i += 1) indices.push(idx.getX(i) + sommet);
      } else {
        for (let i = 0; i < n; i += 1) indices.push(i + sommet);
      }
      sommet += n;
    }

    const fusion = new BufferGeometry();
    for (const nom of noms) {
      const itemSize = candidats[0].geometry.attributes[nom].itemSize;
      fusion.setAttribute(nom, new BufferAttribute(tampons.get(nom)!, itemSize));
    }
    fusion.setIndex(indices);
    fusion.name = (candidats[0].geometry.name || "fusion") + "-fusion";

    const modele = candidats[0].mesh;
    const maille = new Mesh(fusion, materiau);
    maille.castShadow = modele.castShadow;
    maille.receiveShadow = modele.receiveShadow;
    maille.renderOrder = modele.renderOrder;
    maille.frustumCulled = modele.frustumCulled;
    maille.name = (modele.name || "maillages") + "-fusion";

    for (const c of candidats) {
      c.mesh.removeFromParent();
      c.geometry.dispose();
    }
    root.add(maille);
    groupes += 1;
  }

  let maillagesApres = 0;
  root.traverse((o) => {
    if ((o as Mesh).isMesh) maillagesApres += 1;
  });
  return { groupes, maillagesAvant, maillagesApres };
}
