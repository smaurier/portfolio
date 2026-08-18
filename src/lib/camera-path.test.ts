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

describe("getOrbitCameraPosition — azimuth et hauteur (rayon constant)", () => {
  // Rayon constant (startRadius = endRadius) pour isoler l'azimuth/hauteur
  // du rapprochement testé séparément plus bas.
  const options = { startRadius: 6, endRadius: 6, startHeight: 4, endHeight: 1.4 };

  it("part face au modèle (azimuth 0) à la hauteur de départ", () => {
    const pos = getOrbitCameraPosition(0, options);
    expect(pos.x).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(6);
    expect(pos.y).toBeCloseTo(4);
  });

  it("a bouclé un tour complet à progress=1 (même azimuth que 0) mais à la hauteur de fin", () => {
    const pos = getOrbitCameraPosition(1, options);
    expect(pos.x).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(6);
    expect(pos.y).toBeCloseTo(1.4);
  });

  it("est à un quart de tour à progress=0.25", () => {
    const pos = getOrbitCameraPosition(0.25, options);
    expect(pos.x).toBeCloseTo(6);
    expect(pos.z).toBeCloseTo(0);
  });

  it("interpole la hauteur linéairement à mi-scroll", () => {
    const pos = getOrbitCameraPosition(0.5, options);
    expect(pos.y).toBeCloseTo((4 + 1.4) / 2);
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

describe("getOrbitCameraPosition — rapprochement (startRadius -> endRadius)", () => {
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
