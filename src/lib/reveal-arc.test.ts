import { describe, expect, it } from "vitest";
import {
  getAmbientIntensity,
  getDirectionalIntensity,
  getIdleClipName,
  getMilpaGrowth,
  getNavEmphasis,
  getRevealPhase,
  getWalkCyclePhase,
  getWalkOffsetZ,
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
  it("marche (Walk) tout au début, tant qu'il n'a pas remarqué le visiteur", () => {
    expect(getIdleClipName(0, false)).toBe("Walk");
    expect(getIdleClipName(0.17, false)).toBe("Walk");
  });

  it("se pose et broute (Eating) une fois arrivé, avant de remarquer le visiteur", () => {
    expect(getIdleClipName(0.18, false)).toBe("Eating");
    expect(getIdleClipName(0.21, false)).toBe("Eating");
  });

  it("passe par Idle_2 juste avant de remarquer le visiteur", () => {
    expect(getIdleClipName(0.22, false)).toBe("Idle_2");
    expect(getIdleClipName(0.24, false)).toBe("Idle_2");
  });

  it("passe à Idle dès qu'il a remarqué le visiteur, quel que soit le scroll ou l'étape de la séquence — jamais de retour en arrière", () => {
    expect(getIdleClipName(0, true)).toBe("Idle");
    expect(getIdleClipName(0.05, true)).toBe("Idle"); // surprend le cerf en pleine marche
    expect(getIdleClipName(0.6, true)).toBe("Idle");
    expect(getIdleClipName(1, true)).toBe("Idle");
  });
});

describe("getWalkOffsetZ", () => {
  it("part avec un décalage net, pas déjà à sa position de repos", () => {
    expect(getWalkOffsetZ(0)).toBeGreaterThan(2);
  });

  it("atteint exactement 0 (position de repos) à la fin de la marche, et le reste après", () => {
    expect(getWalkOffsetZ(0.18)).toBeCloseTo(0);
    expect(getWalkOffsetZ(0.5)).toBeCloseTo(0);
    expect(getWalkOffsetZ(1)).toBeCloseTo(0);
  });

  it("se rapproche de 0 en continu, jamais ne s'en éloigne", () => {
    const samples = [0, 0.05, 0.1, 0.14, 0.18].map(getWalkOffsetZ);
    for (let i = 1; i < samples.length; i++) {
      expect(Math.abs(samples[i])).toBeLessThanOrEqual(Math.abs(samples[i - 1]));
    }
  });
});

describe("getWalkCyclePhase", () => {
  it("est déterministe : même progress -> même phase (pas de temps réel impliqué)", () => {
    expect(getWalkCyclePhase(0.05)).toBe(getWalkCyclePhase(0.05));
  });

  it("reste dans [0, 1)", () => {
    for (const p of [0, 0.02, 0.06, 0.1, 0.15, 0.18, 0.5, 1]) {
      const phase = getWalkCyclePhase(p);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    }
  });

  it("part à 0 tout au début de la marche", () => {
    expect(getWalkCyclePhase(0)).toBeCloseTo(0);
  });

  it("boucle plusieurs fois sur la fenêtre de marche (plusieurs foulées, pas une seule enjambée étirée)", () => {
    // Avec WALK_STRIDE_COUNT foulées sur la fenêtre, la phase doit repasser
    // près de 0 plus d'une fois avant la fin de la marche (WALK_END=0.18).
    const samples = [0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16].map(getWalkCyclePhase);
    let wraps = 0;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i] < samples[i - 1]) wraps++;
    }
    expect(wraps).toBeGreaterThan(1);
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

  it("avec un stagger, démarre plus tard (rien poussé à un progress où stagger=0 aurait déjà commencé)", () => {
    expect(getMilpaGrowth(0.05, 1)).toBeCloseTo(0);
    expect(getMilpaGrowth(0.05, 0)).toBeGreaterThan(0);
  });

  it("quel que soit le stagger, a quand même fini avant le climax du face-à-face", () => {
    for (const stagger of [0, 0.3, 0.7, 1]) {
      expect(getMilpaGrowth(0.5, stagger)).toBeCloseTo(1);
    }
  });
});
