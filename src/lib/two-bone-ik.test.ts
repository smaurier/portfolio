import { describe, expect, it } from "vitest";
import { twoBoneIK, type Vec3 } from "./two-bone-ik";

/** Rotation de Rodrigues : sert a verifier qu'appliquer la solution amene
 * bien la cheville sur la cible (le test refait le travail du composant). */
function rotate(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dot = v.x * axis.x + v.y * axis.y + v.z * axis.z;
  return {
    x: v.x * c + (axis.y * v.z - axis.z * v.y) * s + axis.x * dot * (1 - c),
    y: v.y * c + (axis.z * v.x - axis.x * v.z) * s + axis.y * dot * (1 - c),
    z: v.z * c + (axis.x * v.y - axis.y * v.x) * s + axis.z * dot * (1 - c),
  };
}

function len(v: Vec3) {
  return Math.hypot(v.x, v.y, v.z);
}

// Membre plie a angle droit dans le plan XY : hanche a l'origine, genou a
// une unite devant, cheville une unite au-dessus du genou. Allonge 2,
// distance actuelle hanche-cheville racine de 2.
const HIP: Vec3 = { x: 0, y: 0, z: 0 };
const KNEE: Vec3 = { x: 1, y: 0, z: 0 };
const ANKLE: Vec3 = { x: 1, y: 1, z: 0 };

/** Rejoue la solution comme le fait le composant : on plie, puis on vise. */
function apply(target: Vec3) {
  const s = twoBoneIK(HIP, KNEE, ANKLE, target);
  // Pliage : la hanche tourne le membre entier, le genou tourne le bas.
  let upper = rotate({ x: KNEE.x - HIP.x, y: KNEE.y - HIP.y, z: KNEE.z - HIP.z }, s.bendAxis, s.hipBend);
  const lowerStart = { x: ANKLE.x - KNEE.x, y: ANKLE.y - KNEE.y, z: ANKLE.z - KNEE.z };
  let lower = rotate(rotate(lowerStart, s.bendAxis, s.hipBend), s.bendAxis, s.kneeBend);
  // Visee : le membre entier pivote autour de l'axe de visee.
  upper = rotate(upper, s.aimAxis, s.aimAngle);
  lower = rotate(lower, s.aimAxis, s.aimAngle);
  return { solution: s, ankle: { x: upper.x + lower.x, y: upper.y + lower.y, z: upper.z + lower.z } };
}

describe("twoBoneIK (poser la patte sur son appui)", () => {
  it("cible deja atteinte : aucune correction", () => {
    const s = twoBoneIK(HIP, KNEE, ANKLE, ANKLE);
    // 1e-7 et pas 1e-11 : pres de la solution exacte, acos perd de la
    // precision (sa derivee diverge en +-1). Sans effet visible.
    expect(s.hipBend).toBeCloseTo(0, 7);
    expect(s.kneeBend).toBeCloseTo(0, 7);
    expect(s.aimAngle).toBeCloseTo(0, 7);
    expect(s.reachable).toBe(true);
  });

  it("cible plus loin : le membre se tend (le genou s'ouvre)", () => {
    const s = twoBoneIK(HIP, KNEE, ANKLE, { x: 1.9, y: 0, z: 0 });
    expect(s.kneeBend).toBeGreaterThan(0);
  });

  it("cible plus proche : le membre se plie davantage", () => {
    const s = twoBoneIK(HIP, KNEE, ANKLE, { x: 0.5, y: 0, z: 0 });
    expect(s.kneeBend).toBeLessThan(0);
  });

  it("amene reellement la cheville sur une cible atteignable", () => {
    for (const target of [
      { x: 1.4, y: 0.6, z: 0 },
      { x: 0.2, y: -1.2, z: 0.4 },
      { x: -0.8, y: 0.9, z: 0.6 },
      { x: 0, y: -1.7, z: 0 },
    ]) {
      const { solution, ankle } = apply(target);
      expect(solution.reachable).toBe(true);
      expect(Math.hypot(ankle.x - target.x, ankle.y - target.y, ankle.z - target.z)).toBeLessThan(1e-6);
    }
  });

  it("cible hors d'allonge : signalee, et le membre se tend au maximum sans s'inverser", () => {
    const target = { x: 12, y: 0, z: 0 };
    const { solution, ankle } = apply(target);
    expect(solution.reachable).toBe(false);
    // Il pointe vers la cible, a l'allonge exacte du membre (2), jamais plus.
    expect(len(ankle)).toBeLessThanOrEqual(2);
    expect(len(ankle)).toBeGreaterThan(1.99);
    const cosAlignment = (ankle.x * target.x) / (len(ankle) * len(target));
    expect(cosAlignment).toBeCloseTo(1, 6);
  });

  it("cible sur la hanche : repli maximal, pas de division par zero", () => {
    const s = twoBoneIK(HIP, KNEE, ANKLE, HIP);
    expect(s.reachable).toBe(false);
    expect(Number.isFinite(s.hipBend)).toBe(true);
    expect(Number.isFinite(s.kneeBend)).toBe(true);
  });

  it("le genou plie dans son plan : l'axe de flexion est normal aux deux segments", () => {
    const s = twoBoneIK(HIP, KNEE, ANKLE, { x: 1.5, y: 0.5, z: 0 });
    const upper = { x: 1, y: 0, z: 0 };
    const lower = { x: 0, y: 1, z: 0 };
    expect(s.bendAxis.x * upper.x + s.bendAxis.y * upper.y + s.bendAxis.z * upper.z).toBeCloseTo(0, 10);
    expect(s.bendAxis.x * lower.x + s.bendAxis.y * lower.y + s.bendAxis.z * lower.z).toBeCloseTo(0, 10);
    expect(len(s.bendAxis)).toBeCloseTo(1, 10);
  });

  it("membre parfaitement tendu : un plan de flexion est quand meme choisi", () => {
    const s = twoBoneIK({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }, { x: 0, y: -2, z: 0 }, { x: 0.5, y: -1.5, z: 0 });
    expect(len(s.bendAxis)).toBeCloseTo(1, 10);
    expect(Number.isFinite(s.kneeBend)).toBe(true);
  });

  it("deterministe", () => {
    const t = { x: 1.2, y: 0.4, z: -0.3 };
    expect(twoBoneIK(HIP, KNEE, ANKLE, t)).toEqual(twoBoneIK(HIP, KNEE, ANKLE, t));
  });
});
