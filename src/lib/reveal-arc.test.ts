import { describe, expect, it } from "vitest";
import {
  getAmbientIntensity,
  getDirectionalIntensity,
  getFogColor,
  getHeadTurnAmount,
  getIdleClipName,
  getIntroOpacity,
  getMilpaGrowth,
  getNavEmphasis,
  getRevealFloor,
  getRevealPhase,
} from "./reveal-arc";

/** "#rrggbb" -> {r,g,b} pour comparer numériquement plutôt que sur une
 * chaîne exacte (fragile face à l'arrondi). */
function hexToRgb(hex: string) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`hex invalide: ${hex}`);
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

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

describe("getRevealFloor", () => {
  it("nul en tout début de pénombre", () => {
    expect(getRevealFloor(0)).toBeCloseTo(0);
  });

  it("plein dès le climax et le reste ensuite (pas de retour en arrière)", () => {
    expect(getRevealFloor(0.75)).toBeCloseTo(1);
    expect(getRevealFloor(0.9)).toBeCloseTo(1);
    expect(getRevealFloor(1)).toBeCloseTo(1);
  });

  it("croît de façon monotone entre 0 et 0.75", () => {
    const samples = [0, 0.2, 0.4, 0.6, 0.75].map(getRevealFloor);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
  });
});

describe("getFogColor", () => {
  it("est noir pur en tout début de pénombre", () => {
    expect(getFogColor(0)).toBe("#000000");
  });

  it("atteint le noir-jade au climax et le tient ensuite (pas de retour en arrière)", () => {
    const atClimax = hexToRgb(getFogColor(0.75));
    const atOne = hexToRgb(getFogColor(1));
    expect(atClimax).toEqual(atOne);
    // Jade assombri (--jade-bg #00a86b à 15%) : dominante verte, jamais de
    // rouge (le fond doit rester une nuance de noir-jade, pas virer brun).
    expect(atClimax.r).toBe(0);
    expect(atClimax.g).toBeGreaterThan(0);
    expect(atClimax.b).toBeGreaterThan(0);
    expect(atClimax.g).toBeGreaterThan(atClimax.b); // dominante verte du jade
  });

  it("se teinte en continu, jamais ne redevient plus noir", () => {
    const samples = [0, 0.2, 0.4, 0.6, 0.75].map((p) => hexToRgb(getFogColor(p)).g);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
  });
});

describe("getIdleClipName", () => {
  it("se pose et broute (Eating) dès le départ, avant de remarquer le visiteur", () => {
    // Le temps "Walk" a été retiré le 20/08 (cf reveal-arc.ts). Le cerf
    // apparaît directement à sa position de repos, en train de manger.
    expect(getIdleClipName(0, false)).toBe("Eating");
    expect(getIdleClipName(0.03, false)).toBe("Eating");
  });

  it("passe par Idle_2 juste avant de remarquer le visiteur", () => {
    expect(getIdleClipName(0.04, false)).toBe("Idle_2");
    expect(getIdleClipName(0.1, false)).toBe("Idle_2");
  });

  it("passe à Idle dès qu'il a remarqué le visiteur, quel que soit le scroll ou l'étape de la séquence ; jamais de retour en arrière", () => {
    expect(getIdleClipName(0, true)).toBe("Idle");
    expect(getIdleClipName(0.02, true)).toBe("Idle"); // surprend le cerf en train de manger
    expect(getIdleClipName(0.6, true)).toBe("Idle");
    expect(getIdleClipName(1, true)).toBe("Idle");
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

describe("getIntroOpacity", () => {
  it("est pleinement visible en tout début de pénombre (l'accroche doit se lire avant tout scroll)", () => {
    expect(getIntroOpacity(0)).toBeCloseTo(1);
  });

  it("a disparu dès la prise de conscience, et le reste ensuite", () => {
    expect(getIntroOpacity(0.25)).toBeCloseTo(0);
    expect(getIntroOpacity(0.5)).toBeCloseTo(0);
    expect(getIntroOpacity(1)).toBeCloseTo(0);
  });

  it("s'efface en continu, jamais ne redevient plus visible", () => {
    const samples = [0, 0.05, 0.1, 0.15, 0.2, 0.25].map(getIntroOpacity);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThanOrEqual(samples[i - 1]);
    }
  });
});

describe("getHeadTurnAmount", () => {
  it("est nul avant le face-à-face", () => {
    expect(getHeadTurnAmount(0)).toBeCloseTo(0);
    expect(getHeadTurnAmount(0.49)).toBeCloseTo(0);
  });

  it("est plein dès la fin du face-à-face, et le reste ensuite (pas de retour en arrière)", () => {
    expect(getHeadTurnAmount(0.75)).toBeCloseTo(1);
    expect(getHeadTurnAmount(0.9)).toBeCloseTo(1);
    expect(getHeadTurnAmount(1)).toBeCloseTo(1);
  });

  it("monte pendant la fenêtre face-à-face elle-même (0.5 -> 0.75), pas avant ni dilué sur toute la plage", () => {
    expect(getHeadTurnAmount(0.5)).toBeCloseTo(0);
    expect(getHeadTurnAmount(0.625)).toBeGreaterThan(0);
    expect(getHeadTurnAmount(0.625)).toBeLessThan(1);
  });

  it("croît de façon monotone", () => {
    const samples = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75].map(getHeadTurnAmount);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
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
