import { describe, expect, it } from "vitest";
import { Group, Mesh, Object3D } from "three";
import { endormirDecor, freezeDecor, reveillerDecor } from "./freeze-decor";

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

/**
 * LE DECOR QUI DORT (17/09). Un sous-arbre monte a l'avance et invisible
 * recompose sa matrice a chaque image pour personne : mesure du 17/09,
 * Contact 41 objets dormants sur 54 figeables, accueil 18 sur 32.
 */
describe("endormirDecor / reveillerDecor (le decor pre-monte et invisible)", () => {
  it("endort tout ce qui se recompose, et rend la liste de ce qu'il a endormi", () => {
    const { racine, a, b, c } = decor();
    const endormis = endormirDecor(racine);
    expect(endormis).toHaveLength(4);
    for (const o of [racine, a, b, c]) expect(o.matrixAutoUpdate).toBe(false);
  });

  it("NE TOUCHE PAS ce qui etait deja fige, pour ne jamais le reveiller", () => {
    const { racine, a } = decor();
    // Le sol et la flore sont figes pour de bon depuis le 10/09 : les
    // reveiller en quittant le sommeil annulerait ce gain en silence.
    a.matrixAutoUpdate = false;
    const endormis = endormirDecor(racine);
    expect(endormis).not.toContain(a);
    reveillerDecor(endormis);
    expect(a.matrixAutoUpdate).toBe(false);
  });

  it("rattrape les enfants arrives apres coup, sans compter deux fois les autres", () => {
    const { racine } = decor();
    endormirDecor(racine);
    // Un modele charge en retard (Suspense) monte deja endormi autour de lui.
    const tardif = new Mesh();
    racine.add(tardif);
    const seconde = endormirDecor(racine);
    expect(seconde).toEqual([tardif]);
    expect(tardif.matrixAutoUpdate).toBe(false);
  });

  it("au reveil, recompose la pose ecrite pendant le sommeil", () => {
    const { racine, a } = decor();
    const endormis = endormirDecor(racine);
    // Une boucle d'animation a continue d'ecrire dans la position.
    a.position.set(0, 5, 0);
    expect(a.matrix.elements[13]).toBe(0);
    reveillerDecor(endormis);
    expect(a.matrixAutoUpdate).toBe(true);
    expect(a.matrix.elements[13]).toBe(5);
  });
});
