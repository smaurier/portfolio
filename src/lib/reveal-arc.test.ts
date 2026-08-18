import { describe, expect, it } from "vitest";
import {
  getAmbientIntensity,
  getDirectionalIntensity,
  getIdleClipName,
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
  it("reste basse pendant toute la pénombre (le regard ne s'est pas encore posé)", () => {
    expect(getDirectionalIntensity(0)).toBeCloseTo(0.5);
    expect(getDirectionalIntensity(0.24)).toBeCloseTo(0.5);
  });

  it("monte pendant conscience→face-à-face et culmine au climax", () => {
    expect(getDirectionalIntensity(0.5)).toBeCloseTo(1.8);
    expect(getDirectionalIntensity(0.9)).toBeCloseTo(1.8);
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
