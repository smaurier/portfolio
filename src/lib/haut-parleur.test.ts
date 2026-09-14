import { describe, expect, it } from "vitest";
import { PLANCHER_TELEPHONE, monterAuPlancher, plancherDuLieu } from "./haut-parleur";

describe("le haut-parleur du telephone", () => {
  it("monte la note par OCTAVES : c'est le meme accord, plus haut", () => {
    expect(monterAuPlancher(87.31, PLANCHER_TELEPHONE)).toBeCloseTo(174.62, 2);
    expect(monterAuPlancher(110, PLANCHER_TELEPHONE)).toBeCloseTo(220, 5);
    expect(monterAuPlancher(130.81, PLANCHER_TELEPHONE)).toBeCloseTo(261.62, 2);
    // Deux octaves quand il le faut : le souffle du miroir part de 48 Hz.
    expect(monterAuPlancher(48, PLANCHER_TELEPHONE)).toBeCloseTo(192, 5);
  });

  it("ne touche a rien au-dessus du plancher", () => {
    expect(monterAuPlancher(220, PLANCHER_TELEPHONE)).toBe(220);
    expect(monterAuPlancher(1400, PLANCHER_TELEPHONE)).toBe(1400);
  });

  it("plancher nul : la chaine d'origine, au hertz pres", () => {
    for (const f of [48, 55, 70, 87.31, 110, 130.81, 440]) expect(monterAuPlancher(f, 0)).toBe(f);
  });

  it("rien d'absurde en entree", () => {
    expect(monterAuPlancher(0, 150)).toBe(0);
    expect(monterAuPlancher(-5, 150)).toBe(-5);
    expect(monterAuPlancher(Number.NaN, 150)).toBeNaN();
    // Borne : meme une frequence minuscule ne part pas dans les aigus.
    expect(monterAuPlancher(0.5, 150)).toBeLessThan(64);
  });

  it("le rapport reste une puissance de deux : l'oreille entend la meme note", () => {
    for (const f of [48, 55, 70, 87.31, 110]) {
      const r = monterAuPlancher(f, PLANCHER_TELEPHONE) / f;
      expect(Math.abs(Math.log2(r) - Math.round(Math.log2(r)))).toBeLessThan(1e-9);
    }
  });

  it("hors navigateur, aucun plancher", () => {
    expect(plancherDuLieu()).toBe(0);
  });
});
