import { describe, expect, it } from "vitest";
import type { Mesh as MeshType } from "three";
import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Vector3,
} from "three";
import { preparerPieces } from "./pieces-modele";

function boite(largeur: number, hauteur: number, profondeur: number) {
  return new Mesh(new BoxGeometry(largeur, hauteur, profondeur), new MeshBasicMaterial());
}

/** Applique la pose d'une piece a son maillage, comme le ferait une instance. */
function poser(piece: { geometry: BoxGeometry | unknown; pose: import("three").Matrix4 }, source: Mesh) {
  const copie = new Mesh(source.geometry, source.material as MeshBasicMaterial);
  copie.matrixAutoUpdate = false;
  copie.matrix.copy(piece.pose);
  copie.updateMatrixWorld(true);
  return new Box3().setFromObject(copie);
}

describe("preparerPieces", () => {
  it("met le modele a la hauteur demandee", () => {
    const racine = new Group();
    const m = boite(1, 4, 1);
    racine.add(m);
    const [piece] = preparerPieces(racine, 2);
    const b = poser(piece, m);
    expect(b.getSize(new Vector3()).y).toBeCloseTo(2, 6);
  });

  it("pose le modele sur son socle, y minimum a zero", () => {
    const racine = new Group();
    const m = boite(1, 4, 1);
    m.position.set(0, 10, 0); // flotte tres haut dans le GLB
    racine.add(m);
    const [piece] = preparerPieces(racine, 2);
    const b = poser(piece, m);
    expect(b.min.y).toBeCloseTo(0, 6);
  });

  it("centre le modele en x et en z", () => {
    const racine = new Group();
    const m = boite(1, 4, 1);
    m.position.set(7, 0, -3);
    racine.add(m);
    const [piece] = preparerPieces(racine, 2);
    const b = poser(piece, m);
    expect(b.getCenter(new Vector3()).x).toBeCloseTo(0, 6);
    expect(b.getCenter(new Vector3()).z).toBeCloseTo(0, 6);
  });

  it("TIENT COMPTE DES NOEUDS INTERMEDIAIRES, sinon la plante s'effondre", () => {
    const racine = new Group();
    const intermediaire = new Object3D();
    intermediaire.scale.setScalar(3);
    intermediaire.position.set(2, 0, 0);
    const m = boite(1, 2, 1);
    intermediaire.add(m);
    racine.add(intermediaire);
    const [piece] = preparerPieces(racine, 6);
    const b = poser(piece, m);
    // Le cube fait 2 de haut, mis a l'echelle 3 par son parent : 6 dans le
    // modele. Hauteur cible 6, donc echelle 1 : la boite doit faire 6.
    expect(b.getSize(new Vector3()).y).toBeCloseTo(6, 6);
  });

  it("rend une piece par maillage", () => {
    const racine = new Group();
    racine.add(boite(1, 1, 1));
    racine.add(boite(1, 1, 1));
    racine.add(new Group());
    expect(preparerPieces(racine, 1)).toHaveLength(2);
  });

  it("partage la geometrie et le materiau de la source : c'est ce qui rend l'instanciation possible", () => {
    const racine = new Group();
    const m = boite(1, 1, 1);
    racine.add(m);
    const [piece] = preparerPieces(racine, 1);
    expect(piece.geometry).toBe(m.geometry);
    expect(piece.material).toBe(m.material);
  });

  it("refuse une maille a materiau multiple : une instance ne sait pas la rendre", () => {
    const racine = new Group();
    const m = boite(1, 1, 1);
    (m as MeshType).material = [new MeshBasicMaterial(), new MeshBasicMaterial()];
    racine.add(m);
    expect(preparerPieces(racine, 1)).toHaveLength(0);
  });

  it("laisse le modele a sa taille native si la hauteur cible est nulle", () => {
    const racine = new Group();
    const m = boite(1, 5, 1);
    racine.add(m);
    const [piece] = preparerPieces(racine, 0);
    const b = poser(piece, m);
    expect(b.getSize(new Vector3()).y).toBeCloseTo(5, 6);
  });
});
