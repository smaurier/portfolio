import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { FRAME_SHIFT, filmOffsetFor, frameShiftFor } from "./frame-offset";

/**
 * LE CADRE DECALE (10/09, arbitrage de Sylvain : colonne a gauche, sujet a
 * droite). L'oracle n'est pas un nombre de millimetres de pellicule, c'est
 * une position a l'ecran : le sujet, a l'origine du monde, doit tomber aux
 * DEUX TIERS du cadre, sans qu'on touche ni a la trajectoire ni a la visee.
 */
function cameraQuiViseLOrigine(fov: number, aspect: number): PerspectiveCamera {
  const c = new PerspectiveCamera(fov, aspect, 0.1, 100);
  c.position.set(0, 2, 5.5);
  c.lookAt(0, 1, 0);
  c.updateMatrixWorld(true);
  return c;
}

describe("filmOffsetFor (le sujet aux deux tiers du cadre)", () => {
  it("sans decalage, le sujet est au milieu", () => {
    const c = cameraQuiViseLOrigine(45, 16 / 9);
    c.filmOffset = filmOffsetFor(0, c);
    c.updateProjectionMatrix();
    const p = new Vector3(0, 1, 0).project(c);
    expect(p.x).toBeCloseTo(0, 6);
  });

  it("avec le decalage plein, le sujet tombe aux deux tiers, a droite", () => {
    for (const [fov, aspect] of [[45, 16 / 9], [58, 9 / 16], [40, 4 / 3]] as const) {
      const c = cameraQuiViseLOrigine(fov, aspect);
      c.filmOffset = filmOffsetFor(FRAME_SHIFT, c);
      c.updateProjectionMatrix();
      const p = new Vector3(0, 1, 0).project(c);
      // Le cadre va de -1 a 1 : les deux tiers, c'est x = 1/3.
      expect(p.x, "fov " + fov + " aspect " + aspect).toBeCloseTo(2 * FRAME_SHIFT, 4);
      expect(p.y).toBeCloseTo(0, 6);
    }
  });

  it("est lineaire dans la fraction : la moitie du decalage, la moitie du chemin", () => {
    const c = cameraQuiViseLOrigine(45, 16 / 9);
    c.filmOffset = filmOffsetFor(FRAME_SHIFT / 2, c);
    c.updateProjectionMatrix();
    expect(new Vector3(0, 1, 0).project(c).x).toBeCloseTo(FRAME_SHIFT, 4);
  });

  it("ne change pas la visee : le sujet ne monte ni ne descend", () => {
    const c = cameraQuiViseLOrigine(45, 16 / 9);
    const avant = new Vector3(0, 1, 0).project(c.clone()).y;
    c.filmOffset = filmOffsetFor(FRAME_SHIFT, c);
    c.updateProjectionMatrix();
    expect(new Vector3(0, 1, 0).project(c).y).toBeCloseTo(avant, 6);
  });
});

describe("frameShiftFor (qui a droit au decalage)", () => {
  it("nul au Centre, qui n'a pas de colonne, et sur mobile, ou elle est pleine largeur", () => {
    expect(frameShiftFor("jade", false)).toBe(0);
    for (const d of ["dore", "turquoise", "cendre", "obsidienne"] as const) {
      expect(frameShiftFor(d, true), d + " mobile").toBe(0);
    }
  });

  it("plein sur les quatre directions, au bureau", () => {
    for (const d of ["dore", "turquoise", "cendre", "obsidienne"] as const) {
      expect(frameShiftFor(d, false), d).toBe(FRAME_SHIFT);
    }
  });

  it("le sixieme : du milieu aux deux tiers", () => {
    expect(FRAME_SHIFT).toBeCloseTo(1 / 6, 12);
  });
});
