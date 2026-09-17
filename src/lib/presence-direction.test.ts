import { beforeEach, describe, expect, it } from "vitest";
import { fonduStore, poserFondu, presenceDirection, presenceParmi } from "./presence-direction";

beforeEach(() => {
  fonduStore.sortante = null;
  fonduStore.affichee = null;
  fonduStore.melange = 1;
});

describe("presenceDirection (la direction s'en va au lieu d'etre eteinte)", () => {
  it("sans depot, retombe sur la route : le repli ne vaut pas zero", () => {
    expect(presenceDirection("jade", "jade")).toBe(1);
    expect(presenceDirection("dore", "jade")).toBe(0);
  });

  it("au repos, la direction affichee est entiere et les autres nulles", () => {
    poserFondu(null, "jade", 1);
    expect(presenceDirection("jade", "jade")).toBe(1);
    expect(presenceDirection("dore", "jade")).toBe(0);
  });

  it("PENDANT UN PASSAGE, LES DEUX EXISTENT, et leur somme fait un", () => {
    poserFondu("jade", "dore", 0.3);
    expect(presenceDirection("dore", "dore")).toBeCloseTo(0.3, 9);
    expect(presenceDirection("jade", "dore")).toBeCloseTo(0.7, 9);
    expect(presenceDirection("cendre", "dore")).toBe(0);
  });

  it("la sortante s'eteint sans jamais sauter", () => {
    let precedent = 1;
    for (let m = 0; m <= 1.0001; m += 0.05) {
      poserFondu("jade", "dore", m);
      const p = presenceDirection("jade", "dore");
      expect(p).toBeLessThanOrEqual(precedent + 1e-9);
      expect(Math.abs(p - precedent)).toBeLessThan(0.1);
      precedent = p;
    }
    expect(precedent).toBeCloseTo(0, 9);
  });
});

describe("presenceParmi (un ensemble de directions)", () => {
  it("passer d'une direction de l'ensemble a une autre n'eteint rien", () => {
    const ensemble = ["jade", "dore"] as const;
    poserFondu("jade", "dore", 0.4);
    expect(presenceParmi(ensemble, "dore")).toBe(1);
  });

  it("sortir de l'ensemble fait descendre la presence en douceur", () => {
    const ensemble = ["jade"] as const;
    poserFondu("jade", "dore", 0.25);
    expect(presenceParmi(ensemble, "dore")).toBeCloseTo(0.75, 9);
  });
});
