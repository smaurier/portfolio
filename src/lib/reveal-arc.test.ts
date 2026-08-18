import { describe, expect, it } from "vitest";
import {
  getAmbientIntensity,
  getDirectionalIntensity,
  getIdleClipName,
  getMilpaGrowth,
  getNavEmphasis,
  getRevealPhase,
} from "./reveal-arc";

describe("getRevealPhase", () => {
  it("commence en pénombre", () => {
    expect(getRevealPhase(0)).toBe("penombre");
    expect(getRevealPhase(0.1)).toBe("penombre");
  });

  it("passe en prise de conscience au quart", () => {
    expect(getRevealPhase(0.25)).toBe("conscience");
    expect(getRevealPhase(0.4)).toBe("conscience");
  });

  it("atteint le face-à-face à la moitié", () => {
    expect(getRevealPhase(0.5)).toBe("face-a-face");
    expect(getRevealPhase(0.7)).toBe("face-a-face");
  });

  it("révèle les chemins sur le dernier quart", () => {
    expect(getRevealPhase(0.75)).toBe("chemins-reveles");
    expect(getRevealPhase(1)).toBe("chemins-reveles");
  });

  it("écrête une progression hors [0,1]", () => {
    expect(getRevealPhase(-0.5)).toBe("penombre");
    expect(getRevealPhase(1.5)).toBe("chemins-reveles");
  });
});

describe("getAmbientIntensity", () => {
  it("est au plus bas en tout début de pénombre", () => {
    expect(getAmbientIntensity(0)).toBeCloseTo(0.35);
  });

  it("est au plafond dès le début des chemins révélés", () => {
    expect(getAmbientIntensity(0.75)).toBeCloseTo(0.85);
  });

  it("ne redescend jamais après le climax (chemins révélés = plafond tenu)", () => {
    expect(getAmbientIntensity(0.9)).toBeCloseTo(0.85);
    expect(getAmbientIntensity(1)).toBeCloseTo(0.85);
  });

  it("croît de façon monotone entre 0 et 0.75", () => {
    const samples = [0, 0.2, 0.4, 0.6, 0.75].map(getAmbientIntensity);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
  });
});

describe("getDirectionalIntensity", () => {
  it("part au plancher en tout début de pénombre", () => {
    expect(getDirectionalIntensity(0)).toBeCloseTo(0.5);
  });

  it("atteint le plafond au climax (fin du face-à-face) et le tient ensuite", () => {
    expect(getDirectionalIntensity(0.75)).toBeCloseTo(1.8);
    expect(getDirectionalIntensity(0.9)).toBeCloseTo(1.8);
  });

  it("monte en continu, sans palier plat au milieu (retour direct de Sylvain : deux paliers nets à l'ancienne version plat→rampe→plat)", () => {
    const samples = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75].map(getDirectionalIntensity);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
  });

  it("suit un easing (smoothstep) plutôt qu'une simple droite : dérivée quasi nulle tout près des deux bornes", () => {
    const nearStart = getDirectionalIntensity(0.02) - getDirectionalIntensity(0);
    const nearMiddle = getDirectionalIntensity(0.39) - getDirectionalIntensity(0.37);
    expect(nearStart).toBeLessThan(nearMiddle);
  });
});

describe("getIdleClipName", () => {
  it("joue Idle_Headlow tant que le cerf n'a pas remarqué le visiteur", () => {
    expect(getIdleClipName(0)).toBe("Idle_Headlow");
    expect(getIdleClipName(0.24)).toBe("Idle_Headlow");
  });

  it("passe à Idle dès la prise de conscience, et n'y revient jamais", () => {
    expect(getIdleClipName(0.25)).toBe("Idle");
    expect(getIdleClipName(0.6)).toBe("Idle");
    expect(getIdleClipName(1)).toBe("Idle");
  });
});

describe("getNavEmphasis", () => {
  it("est nulle avant le dernier quart (la nav reste cliquable mais visuellement neutre)", () => {
    expect(getNavEmphasis(0)).toBe(0);
    expect(getNavEmphasis(0.74)).toBe(0);
  });

  it("monte linéairement sur le dernier quart jusqu'à 1", () => {
    expect(getNavEmphasis(0.75)).toBeCloseTo(0);
    expect(getNavEmphasis(0.875)).toBeCloseTo(0.5);
    expect(getNavEmphasis(1)).toBeCloseTo(1);
  });
});

describe("getMilpaGrowth", () => {
  it("n'a pas encore poussé au tout début", () => {
    expect(getMilpaGrowth(0)).toBeCloseTo(0);
  });

  it("a fini de pousser avant le climax du face-à-face, pas pendant", () => {
    expect(getMilpaGrowth(0.5)).toBeCloseTo(1);
    expect(getMilpaGrowth(0.6)).toBeCloseTo(1);
    expect(getMilpaGrowth(1)).toBeCloseTo(1);
  });

  it("grandit en continu, jamais ne rétrécit", () => {
    const samples = [0, 0.1, 0.2, 0.3, 0.4, 0.5].map(getMilpaGrowth);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
  });
});
