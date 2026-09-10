import { describe, expect, it } from "vitest";
import { Group, Mesh, Object3D } from "three";
import { freezeDecor } from "./freeze-decor";

/** Un petit decor : un groupe, deux enfants, un petit-enfant. */
function decor() {
  const racine = new Group();
  const a = new Mesh();
  a.position.set(1, 0, 0);
  const b = new Object3D();
  b.position.set(0, 2, 0);
  const c = new Object3D();
  c.position.set(0, 0, 3);
  b.add(c);
  racine.add(a, b);
  return { racine, a, b, c };
}

describe("freezeDecor (le decor pose une fois pour toutes)", () => {
  it("fige tout le sous-arbre, racine comprise", () => {
    const { racine, a, b, c } = decor();
    expect(freezeDecor(racine)).toBe(4);
    for (const o of [racine, a, b, c]) expect(o.matrixAutoUpdate).toBe(false);
  });

  it("gele des poses JUSTES : les matrices monde sont calculees avant", () => {
    const { racine, c } = decor();
    racine.position.set(10, 0, 0);
    // Sans le calcul prealable, la matrice monde de c serait restee a zero.
    freezeDecor(racine);
    expect(c.matrixWorld.elements[12]).toBeCloseTo(10, 12);
    expect(c.matrixWorld.elements[13]).toBeCloseTo(2, 12);
    expect(c.matrixWorld.elements[14]).toBeCloseTo(3, 12);
  });

  it("SUIT TOUJOURS SON PARENT : c'est ce qui permet a la boussole de tourner le decor", () => {
    const monde = new Group();
    const { racine, c } = decor();
    monde.add(racine);
    freezeDecor(racine);
    monde.rotation.y = Math.PI / 2;
    monde.updateMatrixWorld(false);
    // c etait a (0, 2, 3) ; un quart de tour l'amene a (3, 2, 0).
    expect(c.matrixWorld.elements[12]).toBeCloseTo(3, 6);
    expect(c.matrixWorld.elements[14]).toBeCloseTo(0, 6);
  });

  it("LE PIEGE : deplacer un objet fige ne fait plus rien sans updateMatrix", () => {
    const { racine, a } = decor();
    freezeDecor(racine);
    a.position.set(99, 0, 0);
    racine.updateMatrixWorld(true);
    expect(a.matrixWorld.elements[12]).toBeCloseTo(1, 12);
    // Le rattrapage, pour qui en aurait besoin.
    a.updateMatrix();
    racine.updateMatrixWorld(true);
    expect(a.matrixWorld.elements[12]).toBeCloseTo(99, 12);
  });
});
