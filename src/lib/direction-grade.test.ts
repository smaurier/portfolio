import { describe, expect, it } from "vitest";
import { approachGrade, DIRECTION_GRADE, getGradeRig, NEUTRAL_GRADE } from "./direction-grade";
import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

const DIRECTIONS = Object.keys(DIRECTION_GRADE) as DirectionKey[];

describe("DIRECTION_GRADE", () => {
  it("laisse jade/dore/cendre sur le grade neutre (fiches pas encore enrichies)", () => {
    expect(getGradeRig("jade")).toEqual(NEUTRAL_GRADE);
    expect(getGradeRig("dore")).toEqual(NEUTRAL_GRADE);
    expect(getGradeRig("cendre")).toEqual(NEUTRAL_GRADE);
  });

  it("ouvre le cadre au Sud : vignette allegee, saturation relevee, l'inverse du Nord", () => {
    const sud = getGradeRig("turquoise");
    const nord = getGradeRig("obsidienne");
    expect(sud.vignetteAdd).toBeLessThan(0);
    expect(sud.saturation).toBeGreaterThan(0);
    expect(sud.saturation).toBeLessThan(0.2); // discret
    expect(sud.vignetteAdd).toBeLessThan(nord.vignetteAdd);
    expect(sud.saturation).toBeGreaterThan(nord.saturation);
  });

  it("ferme le cadre au Nord : vignette renforcee, bloom sourd, desaturation legere", () => {
    const grade = getGradeRig("obsidienne");
    expect(grade.vignetteAdd).toBeGreaterThan(0);
    expect(grade.bloomScale).toBeLessThan(1);
    expect(grade.saturation).toBeLessThan(0);
  });

  it("reste dans les plages saines du postprocessing", () => {
    for (const dir of DIRECTIONS) {
      const grade = getGradeRig(dir);
      // darkness max historique 0.9 + add doit rester < 1.3 (au-dela le cadre bouche l'image)
      expect(0.9 + grade.vignetteAdd).toBeLessThan(1.3);
      expect(grade.bloomScale).toBeGreaterThan(0);
      expect(grade.bloomScale).toBeLessThanOrEqual(1);
      // saturation HueSaturationEffect : plage -1..1
      expect(grade.saturation).toBeGreaterThanOrEqual(-1);
      expect(grade.saturation).toBeLessThanOrEqual(1);
    }
  });
});

describe("approachGrade", () => {
  it("rapproche chaque canal de la cible proportionnellement a alpha", () => {
    const next = approachGrade(NEUTRAL_GRADE, getGradeRig("obsidienne"), 0.5);
    const target = getGradeRig("obsidienne");
    expect(next.vignetteAdd).toBeCloseTo(target.vignetteAdd / 2);
    expect(next.bloomScale).toBeCloseTo((1 + target.bloomScale) / 2);
    expect(next.saturation).toBeCloseTo(target.saturation / 2);
  });

  it("converge exactement sur la cible (snap epsilon)", () => {
    let grade = { ...NEUTRAL_GRADE };
    const target = getGradeRig("obsidienne");
    for (let i = 0; i < 400; i++) grade = approachGrade(grade, target, 0.06);
    expect(grade).toEqual(target);
  });
});
