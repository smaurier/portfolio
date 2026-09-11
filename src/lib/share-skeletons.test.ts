import { describe, expect, it } from "vitest";
import { Bone, BufferGeometry, Group, Matrix4, MeshBasicMaterial, Skeleton, SkinnedMesh } from "three";
import { shareSkeletons } from "./share-skeletons";

function figure(parts: number, bones = 3) {
  const root = new Group();
  const os = Array.from({ length: bones }, () => new Bone());
  for (let i = 1; i < bones; i++) os[i - 1].add(os[i]);
  root.add(os[0]);
  const inverses = os.map(() => new Matrix4());
  const meshes = Array.from({ length: parts }, () => {
    const m = new SkinnedMesh(new BufferGeometry(), new MeshBasicMaterial());
    // Comme SkeletonUtils.clone : un Skeleton PAR maillage, memes os.
    m.bind(new Skeleton(os, inverses.map((x) => x.clone())), new Matrix4());
    root.add(m);
    return m;
  });
  return { root, meshes, os };
}

describe("shareSkeletons", () => {
  it("les maillages d'une meme figure partagent un seul squelette", () => {
    const { root, meshes } = figure(4);
    expect(new Set(meshes.map((m) => m.skeleton)).size).toBe(4);
    const retires = shareSkeletons(root);
    expect(retires).toBe(3);
    expect(new Set(meshes.map((m) => m.skeleton)).size).toBe(1);
    expect(meshes[1].skeleton).toBe(meshes[0].skeleton);
  });

  it("deux figures (os differents) gardent chacune leur squelette", () => {
    const a = figure(2);
    const b = figure(2);
    const root = new Group();
    root.add(a.root, b.root);
    expect(shareSkeletons(root)).toBe(2);
    expect(a.meshes[0].skeleton).toBe(a.meshes[1].skeleton);
    expect(b.meshes[0].skeleton).toBe(b.meshes[1].skeleton);
    expect(a.meshes[0].skeleton).not.toBe(b.meshes[0].skeleton);
  });

  it("des inverses de liaison differents ne sont jamais partages", () => {
    const { root, meshes } = figure(2);
    meshes[1].skeleton.boneInverses[0].makeTranslation(1, 0, 0);
    expect(shareSkeletons(root)).toBe(0);
    expect(meshes[0].skeleton).not.toBe(meshes[1].skeleton);
  });

  it("deux familles d'inverses donnent deux squelettes, chacun partage dans sa famille", () => {
    const { root, meshes } = figure(5);
    for (const k of [1, 3]) meshes[k].skeleton.boneInverses[0].makeTranslation(1, 0, 0);
    expect(shareSkeletons(root)).toBe(3);
    expect(meshes[0].skeleton).toBe(meshes[2].skeleton);
    expect(meshes[2].skeleton).toBe(meshes[4].skeleton);
    expect(meshes[1].skeleton).toBe(meshes[3].skeleton);
    expect(meshes[0].skeleton).not.toBe(meshes[1].skeleton);
  });

  it("la matrice de liaison de chaque maillage est conservee", () => {
    const { root, meshes } = figure(2);
    meshes[1].bindMatrix.makeTranslation(0, 2, 0);
    meshes[1].bindMatrixInverse.copy(meshes[1].bindMatrix).invert();
    shareSkeletons(root);
    expect(meshes[1].bindMatrix.elements[13]).toBe(2);
    expect(meshes[1].bindMatrixInverse.elements[13]).toBe(-2);
  });
});
