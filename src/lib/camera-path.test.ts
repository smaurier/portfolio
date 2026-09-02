import { describe, expect, it } from "vitest";
import { clampProgress, getOrbitCameraPosition, getOrbitCameraTarget } from "./camera-path";

describe("clampProgress", () => {
  it("laisse passer une valeur déjà dans [0,1]", () => {
    expect(clampProgress(0.42)).toBe(0.42);
  });

  it("écrête en dessous de 0 (le scroll peut légèrement déborder)", () => {
    expect(clampProgress(-0.1)).toBe(0);
  });

  it("écrête au-dessus de 1", () => {
    expect(clampProgress(1.5)).toBe(1);
  });

  it("traite NaN comme 0 plutôt que de propager une position invalide", () => {
    expect(clampProgress(NaN)).toBe(0);
  });
});

describe("getOrbitCameraPosition : azimuth et hauteur (rayon constant)", () => {
  // Rayon constant (startRadius = endRadius) pour isoler l'azimuth/hauteur
  // du rapprochement testé séparément plus bas.
  const options = { startRadius: 6, endRadius: 6, startHeight: 4, endHeight: 1.4 };

  it("part face au modèle (azimuth 0) à la hauteur de départ", () => {
    const pos = getOrbitCameraPosition(0, options);
    expect(pos.x).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(6);
    expect(pos.y).toBeCloseTo(4);
  });

  it("gèle la hauteur à climaxProgress (défaut 0.75) plutôt que de continuer jusqu'à progress=1", () => {
    const optionsNoDrift = { ...options, finalDrift: 0 };
    const atClimax = getOrbitCameraPosition(0.75, optionsNoDrift);
    const atOne = getOrbitCameraPosition(1, optionsNoDrift);
    expect(atOne.y).toBeCloseTo(atClimax.y);
    expect(atClimax.y).toBeCloseTo(1.4);
    // Avec turns=1 et finalDrift=0, azimuth à climaxProgress=0.75 -> 0.75*2π
    // = 270° (pas 360°/0° comme si l'orbite continuait jusqu'au bout).
    expect(atClimax.x).toBeCloseTo(-6, 1); // sin(270°) = -1
    expect(atClimax.z).toBeCloseTo(0, 1); // cos(270°) ≈ 0
  });

  it("continue de tourner légèrement après climaxProgress si finalDrift est fourni, jusqu'à l'angle de repos exact", () => {
    const driftOptions = { ...options, finalDrift: Math.PI / 2 }; // +90°
    const atClimax = getOrbitCameraPosition(0.75, driftOptions);
    const atOne = getOrbitCameraPosition(1, driftOptions);
    // atClimax: azimuth 270° (x=-6,z≈0). atOne: azimuth 270+90=360°=0° (x≈0,z=6).
    expect(atClimax.x).toBeCloseTo(-6, 1);
    expect(atOne.x).toBeCloseTo(0, 1);
    expect(atOne.z).toBeCloseTo(6, 1);
    // La hauteur, elle, reste gelée quel que soit finalDrift.
    expect(atOne.y).toBeCloseTo(atClimax.y);
  });

  it("la dérive finale ne redescend jamais en arrière (azimuth croissant en continu après climaxProgress)", () => {
    const driftOptions = { ...options, finalDrift: Math.PI / 2 };
    const azimuths = [0.75, 0.8, 0.85, 0.9, 0.95, 1].map((p) => {
      const pos = getOrbitCameraPosition(p, driftOptions);
      return Math.atan2(pos.x, pos.z);
    });
    for (let i = 1; i < azimuths.length; i++) {
      expect(azimuths[i]).toBeGreaterThanOrEqual(azimuths[i - 1]);
    }
  });

  it("est à un quart de tour à progress=0.25", () => {
    const pos = getOrbitCameraPosition(0.25, options);
    expect(pos.x).toBeCloseTo(6);
    expect(pos.z).toBeCloseTo(0);
  });

  it("la hauteur suit le même easing que le rayon (climaxT), pas une interpolation linéaire sur tout le scroll", () => {
    // options n'indique pas climaxProgress -> valeur par défaut 0.75.
    // À mi-chemin de climaxProgress (p=0.375, climaxT=0.5 après easing),
    // la hauteur doit être exactement à mi-chemin entre start/end.
    const pos = getOrbitCameraPosition(0.375, options);
    expect(pos.y).toBeCloseTo((4 + 1.4) / 2);
  });

  it("monte en continu vers endHeight jusqu'à climaxProgress, jamais ne redescend", () => {
    const heights = [0, 0.1, 0.25, 0.4, 0.6, 0.75].map((p) => getOrbitCameraPosition(p, options).y);
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeLessThanOrEqual(heights[i - 1]); // startHeight > endHeight ici
    }
  });

  it("écrête une progression hors [0,1] plutôt que d'extrapoler au-delà d'un tour", () => {
    const overshoot = getOrbitCameraPosition(1.2, options);
    const atOne = getOrbitCameraPosition(1, options);
    expect(overshoot).toEqual(atOne);
  });

  it("respecte plusieurs tours quand turns est fourni", () => {
    const pos = getOrbitCameraPosition(0.5, { ...options, turns: 2 });
    // 0.5 progress * 2 turns = 1 tour complet = retour à l'azimuth de départ
    expect(pos.x).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(6);
  });
});

describe("getOrbitCameraPosition : rapprochement (startRadius -> endRadius)", () => {
  // Loin puis proche vers le climax (retour direct de Sylvain, 17/08) :
  // l'inverse (proche puis loin) allait contre le sens de l'arc de reveal.
  const options = { startRadius: 9, endRadius: 4, startHeight: 2.6, endHeight: 1.4, climaxProgress: 0.75 };

  function distance(progress: number) {
    const pos = getOrbitCameraPosition(progress, options);
    return Math.sqrt(pos.x ** 2 + pos.z ** 2);
  }

  it("part au rayon le plus loin en tout début de scroll", () => {
    expect(distance(0)).toBeCloseTo(9);
  });

  it("atteint le rayon le plus proche au climax et le tient ensuite (pas de retour en arrière)", () => {
    expect(distance(0.75)).toBeCloseTo(4);
    expect(distance(0.9)).toBeCloseTo(4);
    expect(distance(1)).toBeCloseTo(4);
  });

  it("se rapproche en continu, jamais ne s'éloigne, jusqu'au climax", () => {
    const samples = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75].map(distance);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThanOrEqual(samples[i - 1]);
    }
  });
});

describe("getOrbitCameraTarget", () => {
  it("vise un point fixe légèrement au-dessus du sol, pas les sabots", () => {
    expect(getOrbitCameraTarget()).toEqual({ x: 0, y: 1, z: 0 });
  });
});

describe("getOrbitCameraPosition : azimuthOffset (le Nord part du point oppose, 02/09)", () => {
  it("avec un decalage de pi, part exactement a l'oppose du depart par defaut", () => {
    const base = getOrbitCameraPosition(0);
    const opposite = getOrbitCameraPosition(0, { azimuthOffset: Math.PI });
    expect(opposite.x).toBeCloseTo(-base.x, 6);
    expect(opposite.z).toBeCloseTo(-base.z, 6);
    expect(opposite.y).toBeCloseTo(base.y, 6);
  });

  it("reste une helice : meme rayon et meme hauteur que sans decalage, azimuth simplement tourne", () => {
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      const a = getOrbitCameraPosition(p);
      const b = getOrbitCameraPosition(p, { azimuthOffset: Math.PI });
      expect(Math.hypot(b.x, b.z)).toBeCloseTo(Math.hypot(a.x, a.z), 6);
      expect(b.y).toBeCloseTo(a.y, 6);
    }
  });

  it("sans decalage, rien ne change (defaut 0)", () => {
    const a = getOrbitCameraPosition(0.4);
    const b = getOrbitCameraPosition(0.4, { azimuthOffset: 0 });
    expect(b).toEqual(a);
  });
});
