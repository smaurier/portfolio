import { describe, expect, it } from "vitest";
import {
  NEPANTLA_TIMING,
  enterOffset,
  exitOffset,
  type NepantlaDirection,
} from "./nepantla";

const SLIDE_DIRECTIONS: NepantlaDirection[] = ["dore", "turquoise", "cendre", "obsidienne"];

describe("nepantla : offsets du contenu pendant le passage", () => {
  it("Est (dore) : le contenu sortant part a gauche, l'entrant arrive de droite", () => {
    expect(exitOffset("dore")).toEqual({ x: -1, y: 0, scale: 1 });
    expect(enterOffset("dore")).toEqual({ x: 1, y: 0, scale: 1 });
  });

  it("Sud (turquoise) : sortie vers le haut, entree par le bas", () => {
    expect(exitOffset("turquoise")).toEqual({ x: 0, y: -1, scale: 1 });
    expect(enterOffset("turquoise")).toEqual({ x: 0, y: 1, scale: 1 });
  });

  it("Ouest (cendre) : sortie a droite, entree de gauche", () => {
    expect(exitOffset("cendre")).toEqual({ x: 1, y: 0, scale: 1 });
    expect(enterOffset("cendre")).toEqual({ x: -1, y: 0, scale: 1 });
  });

  it("Nord (obsidienne) : sortie vers le bas, entree par le haut", () => {
    expect(exitOffset("obsidienne")).toEqual({ x: 0, y: 1, scale: 1 });
    expect(enterOffset("obsidienne")).toEqual({ x: 0, y: -1, scale: 1 });
  });

  it("chaque direction de glissement : l'entree est le miroir exact de la sortie", () => {
    for (const direction of SLIDE_DIRECTIONS) {
      const out = exitOffset(direction);
      const inn = enterOffset(direction);
      // Somme nulle plutot que negation stricte : Object.is(+0, -0) est faux.
      expect(inn.x + out.x).toBe(0);
      expect(inn.y + out.y).toBe(0);
      expect(out.scale).toBe(1);
      expect(inn.scale).toBe(1);
    }
  });

  it("Centre (jade) : implosion, pas de glissement : sortie retrecit, entree arrive plus grande", () => {
    const out = exitOffset("jade");
    const inn = enterOffset("jade");
    expect(out.x).toBe(0);
    expect(out.y).toBe(0);
    expect(out.scale).toBeLessThan(1);
    expect(inn.x).toBe(0);
    expect(inn.y).toBe(0);
    expect(inn.scale).toBeGreaterThan(1);
  });

  it("les offsets de glissement sont unitaires (fractions de viewport, jamais plus d'un ecran)", () => {
    for (const direction of SLIDE_DIRECTIONS) {
      for (const o of [exitOffset(direction), enterOffset(direction)]) {
        expect(Math.abs(o.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(o.y)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("nepantla : tempo partage du passage", () => {
  it("la sortie commence apres un temps de latence et finit avant la fin du progress (la nav se fait au coeur du mouvement)", () => {
    const exitEnd = NEPANTLA_TIMING.exitDelay + NEPANTLA_TIMING.exitDuration;
    expect(NEPANTLA_TIMING.exitDelay).toBeGreaterThan(0);
    expect(exitEnd).toBeLessThan(NEPANTLA_TIMING.progressDuration);
  });

  it("l'entree decelere plus longtemps que la sortie n'accelere (arrivee posee)", () => {
    expect(NEPANTLA_TIMING.enterDuration).toBeGreaterThan(NEPANTLA_TIMING.exitDuration);
  });

  it("les easings signent le changement de vitesse : acceleration a la sortie, deceleration a l'entree", () => {
    expect(NEPANTLA_TIMING.exitEase).toMatch(/\.in$/);
    expect(NEPANTLA_TIMING.enterEase).toMatch(/\.out$/);
  });
});
