import { describe, expect, it } from "vitest";
import { BoxGeometry, Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { mergeByMaterial } from "./merge-meshes";

/**
 * La fusion par materiau : « un modele dont chaque feuille est un maillage
 * separe coute un appel de rendu par feuille ».
 *
 * Cas reel qui l'a motivee (09/09) : `agave.glb` porte 79 sous-maillages
 * pour UN seul materiau, et il est clone neuf fois entre la flore de fond
 * et les epines du Sud. 711 appels de rendu, doubles par la passe
 * d'ombres, pour une plante qu'on peut dessiner en un appel.
 *
 * L'invariant qui compte n'est pas le compte de maillages, c'est que
 * l'IMAGE ne change pas : memes triangles, memes positions dans le monde,
 * meme materiau. Les tests portent donc sur la geometrie, pas sur le gain.
 */

function feuille(x: number, y: number, z: number, mat: MeshStandardMaterial): Mesh {
  const m = new Mesh(new BoxGeometry(0.2, 1, 0.2), mat);
  m.position.set(x, y, z);
  return m;
}

/**
 * Boite englobante monde, l'oracle geometrique le plus simple.
 *
 * Arrondi a quatre decimales et non six : les positions fusionnees sont
 * stockees en Float32Array, donc a sept chiffres significatifs. Le test a
 * d'abord echoue sur 2,158802 contre 2,158803 -- l'arrondi du float32, pas
 * un sommet deplace. A l'echelle de la scene (le cerf mesure 2 unites),
 * quatre decimales valent un dixieme de millimetre.
 */
function boite(root: Group): { min: number[]; max: number[] } {
  root.updateMatrixWorld(true);
  const b = new Box3().setFromObject(root);
  return {
    min: [b.min.x, b.min.y, b.min.z].map((v) => +v.toFixed(4)),
    max: [b.max.x, b.max.y, b.max.z].map((v) => +v.toFixed(4)),
  };
}

function compterMaillages(root: Group): number {
  let n = 0;
  root.traverse((o) => {
    if ((o as Mesh).isMesh) n += 1;
  });
  return n;
}

function sommets(root: Group): number {
  let n = 0;
  root.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh) n += m.geometry.attributes.position.count;
  });
  return n;
}

describe("merge-meshes : fusionner ce qui partage un materiau", () => {
  it("fusionne les maillages d'un meme materiau sans deplacer un seul sommet", () => {
    const mat = new MeshStandardMaterial({ color: "#2f6b4a" });
    const root = new Group();
    for (const [x, y, z] of [
      [0, 0.5, 0],
      [1.2, 0.5, 0],
      [-0.8, 0.5, 0.6],
    ]) {
      root.add(feuille(x, y, z, mat));
    }
    const avant = boite(root);
    const somAvant = sommets(root);

    const rapport = mergeByMaterial(root);

    expect(rapport.maillagesAvant).toBe(3);
    expect(rapport.maillagesApres).toBe(1);
    expect(compterMaillages(root)).toBe(1);
    // Le seul invariant qui compte : la geometrie du monde est identique.
    expect(boite(root)).toEqual(avant);
    expect(sommets(root)).toBe(somAvant);
  });

  it("garde un groupe par materiau, jamais deux materiaux dans le meme", () => {
    const vert = new MeshStandardMaterial({ color: "#2f6b4a" });
    const rouge = new MeshStandardMaterial({ color: "#a33" });
    const root = new Group();
    root.add(feuille(0, 0.5, 0, vert), feuille(1, 0.5, 0, vert), feuille(2, 0.5, 0, rouge));
    const avant = boite(root);

    mergeByMaterial(root);

    const materiaux = new Set<string>();
    root.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) materiaux.add((m.material as MeshStandardMaterial).uuid);
    });
    expect(materiaux.size, "un maillage par materiau").toBe(2);
    expect(compterMaillages(root)).toBe(2);
    expect(boite(root)).toEqual(avant);
  });

  it("respecte les transformations des parents intermediaires", () => {
    // Le cas des GLB : les feuilles vivent sous des noeuds tournes et
    // deplaces. Si la fusion ignore ces matrices, la plante s'effondre au
    // centre -- et c'est le genre d'erreur qu'une capture montrerait, mais
    // trop tard.
    const mat = new MeshStandardMaterial();
    const root = new Group();
    const branche = new Group();
    branche.position.set(3, 0, 0);
    branche.rotation.set(0, Math.PI / 3, 0.2);
    branche.scale.setScalar(2);
    branche.add(feuille(0, 0.5, 0, mat), feuille(0.4, 0.5, 0, mat));
    root.add(branche, feuille(-1, 0.5, 0, mat));
    const avant = boite(root);

    mergeByMaterial(root);

    expect(compterMaillages(root)).toBe(1);
    expect(boite(root)).toEqual(avant);
  });

  it("ne touche pas un materiau qui n'a qu'un maillage", () => {
    const mat = new MeshStandardMaterial();
    const root = new Group();
    const seul = feuille(0, 0.5, 0, mat);
    root.add(seul);

    const rapport = mergeByMaterial(root);

    expect(rapport.groupes, "aucun groupe a fusionner").toBe(0);
    expect(root.children[0], "l'objet d'origine reste en place").toBe(seul);
  });

  it("laisse tranquille ce qu'on ne sait pas fusionner", () => {
    // Un maillage a plusieurs materiaux (groupes de dessin) ou porteur de
    // cibles de morphing : on ne le touche pas plutot que de risquer une
    // fusion fausse. Mieux vaut un appel de rendu de plus qu'une plante
    // deformee.
    const a = new MeshStandardMaterial();
    const b = new MeshStandardMaterial();
    const root = new Group();
    const multi = new Mesh(new BoxGeometry(1, 1, 1), [a, b]);
    root.add(multi, feuille(0, 0.5, 0, a), feuille(1, 0.5, 0, a));
    const avant = boite(root);

    mergeByMaterial(root);

    let multiTrouve = false;
    root.traverse((o) => {
      if (o === multi) multiTrouve = true;
    });
    expect(multiTrouve, "le maillage multi-materiaux est intact").toBe(true);
    expect(boite(root)).toEqual(avant);
  });

  it("preserve les attributs communs et abandonne le reste", () => {
    // Deux geometries qui n'ont pas les memes attributs ne se fusionnent
    // pas n'importe comment : on garde l'intersection, jamais un attribut
    // rempli de zeros (qui donnerait des normales ou des UV faux).
    const mat = new MeshStandardMaterial();
    const root = new Group();
    const a = feuille(0, 0.5, 0, mat);
    const b = feuille(1, 0.5, 0, mat);
    b.geometry.deleteAttribute("uv");
    root.add(a, b);
    const avant = boite(root);

    mergeByMaterial(root);

    let attributs: string[] = [];
    root.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) attributs = Object.keys(m.geometry.attributes).sort();
    });
    expect(attributs, "uv abandonne, position et normal gardes").toEqual(["normal", "position"]);
    expect(boite(root)).toEqual(avant);
  });

  it("compte juste, et ne se plaint pas d'un groupe vide", () => {
    const vide = new Group();
    const rapport = mergeByMaterial(vide);
    expect(rapport).toEqual({ groupes: 0, maillagesAvant: 0, maillagesApres: 0 });
  });

  it("est idempotente", () => {
    const mat = new MeshStandardMaterial();
    const root = new Group();
    root.add(feuille(0, 0.5, 0, mat), feuille(1, 0.5, 0, mat));
    mergeByMaterial(root);
    const apres = boite(root);
    const rapport = mergeByMaterial(root);
    expect(rapport.groupes).toBe(0);
    expect(boite(root)).toEqual(apres);
    expect(new Vector3().length()).toBe(0); // garde-fou d'import
  });
});
