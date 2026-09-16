import { describe, expect, it } from "vitest";
import { Bone, BoxGeometry, Group, Mesh, MeshBasicMaterial, Skeleton, SkinnedMesh } from "three";

import { libererSquelettes } from "./liberer-squelettes";

function os(n: number): Bone[] {
  const bones: Bone[] = [];
  for (let i = 0; i < n; i += 1) {
    const b = new Bone();
    b.name = `os${i}`;
    if (i > 0) bones[i - 1].add(b);
    bones.push(b);
  }
  return bones;
}

function figure(nbOs = 8, nbParties = 3) {
  const racine = new Group();
  const bones = os(nbOs);
  racine.add(bones[0]);
  const squelette = new Skeleton(bones);
  const parties: SkinnedMesh[] = [];
  for (let i = 0; i < nbParties; i += 1) {
    const m = new SkinnedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
    m.bind(squelette);
    racine.add(m);
    parties.push(m);
  }
  return { racine, squelette, parties };
}

describe("libererSquelettes", () => {
  it("libere le squelette d'une figure", () => {
    const { racine, squelette } = figure();
    squelette.computeBoneTexture();
    expect(squelette.boneTexture).not.toBeNull();

    expect(libererSquelettes(racine)).toBe(1);
    expect(squelette.boneTexture).toBeNull();
  });

  it("NE LE COMPTE QU'UNE FOIS quand plusieurs parties le partagent", () => {
    // C'est le cas reel : `share-skeletons` fait justement partager un
    // squelette entre la tete, le corps et les pieds d'une meme porteuse.
    const { racine } = figure(8, 5);
    expect(libererSquelettes(racine)).toBe(1);
  });

  it("libere chaque squelette distinct d'un groupe de figures", () => {
    const groupe = new Group();
    const squelettes = [];
    for (let i = 0; i < 4; i += 1) {
      const f = figure();
      f.squelette.computeBoneTexture();
      squelettes.push(f.squelette);
      groupe.add(f.racine);
    }
    expect(libererSquelettes(groupe)).toBe(4);
    for (const s of squelettes) expect(s.boneTexture).toBeNull();
  });

  it("ne touche a rien quand il n'y a pas de peau", () => {
    const racine = new Group();
    racine.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial()));
    racine.add(new Group());
    expect(libererSquelettes(racine)).toBe(0);
  });

  it("supporte d'etre appele deux fois : la seconde ne trouve plus de texture", () => {
    const { racine, squelette } = figure();
    squelette.computeBoneTexture();
    libererSquelettes(racine);
    expect(() => libererSquelettes(racine)).not.toThrow();
    expect(squelette.boneTexture).toBeNull();
  });

  it("laisse les os en place : c'est la texture qu'on rend, pas le squelette", () => {
    // Un squelette libere peut encore servir a three, qui refabriquera sa
    // texture si on le rend : ce qu'on veut, c'est ne rien laisser sur la
    // carte quand la figure part, pas casser l'objet.
    const { racine, squelette } = figure(8, 2);
    libererSquelettes(racine);
    expect(squelette.bones).toHaveLength(8);
    expect(racine.children.filter((c) => (c as SkinnedMesh).isSkinnedMesh)).toHaveLength(2);
  });
});
