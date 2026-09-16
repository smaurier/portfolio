import { describe, expect, it } from "vitest";
import {
  BoxGeometry,
  Bone,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PointLight,
  Vector3,
} from "three";
import { elaguerDecor, porteUnRole } from "./elaguer-decor";

function maille(nom = "maille") {
  const m = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  m.name = nom;
  return m;
}

describe("porteUnRole", () => {
  it("reconnait ce qui produit quelque chose", () => {
    expect(porteUnRole(maille())).toBe(true);
    expect(porteUnRole(new PointLight())).toBe(true);
    expect(porteUnRole(new Bone())).toBe(true);
  });

  it("ne reconnait pas un groupe nu", () => {
    expect(porteUnRole(new Group())).toBe(false);
    expect(porteUnRole(new Object3D())).toBe(false);
  });
});

describe("elaguerDecor", () => {
  it("retire une feuille morte", () => {
    const racine = new Group();
    racine.add(maille());
    racine.add(new Group());
    const r = elaguerDecor(racine);
    expect(r.feuilles).toBe(1);
    expect(racine.children).toHaveLength(1);
  });

  it("retire les feuilles mortes EN CASCADE", () => {
    const racine = new Group();
    const a = new Group();
    const b = new Group();
    const c = new Group();
    a.add(b);
    b.add(c);
    racine.add(a);
    racine.add(maille());
    const r = elaguerDecor(racine);
    expect(r.feuilles).toBe(3);
    expect(racine.children).toHaveLength(1);
  });

  it("ne retire jamais un os, meme vide : un squelette le cherche par son nom", () => {
    const racine = new Group();
    const os = new Bone();
    os.name = "Wolf_Spine";
    racine.add(os);
    elaguerDecor(racine);
    expect(racine.getObjectByName("Wolf_Spine")).toBe(os);
  });

  it("ne retire jamais la racine elle-meme", () => {
    const racine = new Group();
    const r = elaguerDecor(racine);
    expect(r.apres).toBe(1);
  });

  it("effondre un chainon SANS DEPLACER LE MONDE", () => {
    const racine = new Group();
    const chainon = new Group();
    chainon.position.set(3, 0, 0);
    chainon.scale.setScalar(2);
    const m = maille();
    m.position.set(0, 1, 0);
    chainon.add(m);
    racine.add(chainon);
    racine.updateMatrixWorld(true);
    const avant = m.getWorldPosition(new Vector3()).clone();

    const r = elaguerDecor(racine);

    expect(r.chainons).toBe(1);
    expect(racine.children).toEqual([m]);
    racine.updateMatrixWorld(true);
    const apres = m.getWorldPosition(new Vector3());
    expect(apres.x).toBeCloseTo(avant.x, 10);
    expect(apres.y).toBeCloseTo(avant.y, 10);
    expect(apres.z).toBeCloseTo(avant.z, 10);
  });

  it("effondre une chaine entiere de chainons sans deplacer le monde", () => {
    const racine = new Group();
    const a = new Group();
    a.position.set(1, 2, 3);
    const b = new Group();
    b.rotation.set(0.3, 0.7, -0.2);
    const c = new Group();
    c.scale.set(2, 0.5, 3);
    const m = maille();
    m.position.set(0.4, -1, 2);
    c.add(m);
    b.add(c);
    a.add(b);
    racine.add(a);
    racine.updateMatrixWorld(true);
    const avant = m.getWorldPosition(new Vector3()).clone();

    elaguerDecor(racine);

    racine.updateMatrixWorld(true);
    const apres = m.getWorldPosition(new Vector3());
    expect(apres.x).toBeCloseTo(avant.x, 8);
    expect(apres.y).toBeCloseTo(avant.y, 8);
    expect(apres.z).toBeCloseTo(avant.z, 8);
    expect(racine.children).toEqual([m]);
  });

  it("garde un groupe qui porte PLUSIEURS enfants : il n'est pas un chainon", () => {
    const racine = new Group();
    const g = new Group();
    g.position.set(5, 0, 0);
    g.add(maille("a"));
    g.add(maille("b"));
    racine.add(g);
    const r = elaguerDecor(racine);
    expect(r.chainons).toBe(0);
    expect(racine.children).toEqual([g]);
  });

  it("laisse les positions du monde intactes sur un decor mixte", () => {
    const racine = new Group();
    const vivants: Mesh[] = [];
    for (let i = 0; i < 4; i += 1) {
      const chainon = new Group();
      chainon.position.set(i, i * 0.5, -i);
      chainon.scale.setScalar(1 + i * 0.1);
      const m = maille(`m${i}`);
      m.position.set(0.2 * i, 1, 0);
      chainon.add(m);
      chainon.add(new Group()); // une feuille morte a cote
      racine.add(chainon);
      vivants.push(m);
    }
    racine.updateMatrixWorld(true);
    const avant = vivants.map((m) => m.getWorldPosition(new Vector3()).clone());

    const r = elaguerDecor(racine);

    expect(r.feuilles).toBe(4);
    expect(r.chainons).toBe(4);
    expect(r.apres).toBe(5); // la racine plus quatre maillages
    racine.updateMatrixWorld(true);
    vivants.forEach((m, i) => {
      const p = m.getWorldPosition(new Vector3());
      expect(p.x).toBeCloseTo(avant[i].x, 10);
      expect(p.y).toBeCloseTo(avant[i].y, 10);
      expect(p.z).toBeCloseTo(avant[i].z, 10);
    });
  });

  it("est idempotente : un second passage ne trouve plus rien", () => {
    const racine = new Group();
    const chainon = new Group();
    chainon.position.set(2, 0, 0);
    chainon.add(maille());
    racine.add(chainon);
    racine.add(new Group());
    elaguerDecor(racine);
    const second = elaguerDecor(racine);
    expect(second.feuilles).toBe(0);
    expect(second.chainons).toBe(0);
  });
});
