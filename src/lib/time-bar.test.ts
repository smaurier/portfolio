import { describe, expect, it } from "vitest";
import { arcPhase, ARC_PHASES, progressFromSlider, sliderFromProgress, SLIDER_MAX } from "./time-bar";

describe("arcPhase : le moment du jour en mots, pour le lecteur d'ecran", () => {
  it("nuit, aube, matin, midi, dans cet ordre le long de l'arc", () => {
    expect(arcPhase(0)).toBe("night");
    expect(arcPhase(0.2)).toBe("night");
    expect(arcPhase(0.3)).toBe("dawn");
    expect(arcPhase(0.55)).toBe("morning");
    expect(arcPhase(0.85)).toBe("noon");
    expect(arcPhase(1)).toBe("noon");
  });

  it("les seuils suivent le lever du soleil de la scene (sunDirection > 0 vers 0.27)", () => {
    expect(ARC_PHASES.dawn).toBeGreaterThan(0.2);
    expect(ARC_PHASES.dawn).toBeLessThan(0.3);
  });

  it("hors bornes : nuit en dessous, midi au-dessus", () => {
    expect(arcPhase(-1)).toBe("night");
    expect(arcPhase(5)).toBe("noon");
  });
});

describe("le curseur : entier 0..SLIDER_MAX <-> progres 0..1", () => {
  it("aller-retour exact", () => {
    for (const t of [0, 0.25, 0.5, 0.999, 1]) {
      const v = sliderFromProgress(t);
      expect(Number.isInteger(v)).toBe(true);
      expect(Math.abs(progressFromSlider(v) - t)).toBeLessThanOrEqual(0.5 / SLIDER_MAX + 1e-12);
    }
  });

  it("borne", () => {
    expect(sliderFromProgress(-2)).toBe(0);
    expect(sliderFromProgress(9)).toBe(SLIDER_MAX);
    expect(progressFromSlider(-5)).toBe(0);
    expect(progressFromSlider(SLIDER_MAX * 2)).toBe(1);
  });
});
