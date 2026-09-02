import { describe, expect, it } from "vitest";
import { createStrip, stepStrip } from "./paper-strip";

const NO_WIND = { x: 0, y: 0, z: 0 };
const PIN = { x: 0, y: 2, z: 0 };

function segmentLengths(points: { x: number; y: number; z: number }[]) {
  const out: number[] = [];
  for (let i = 1; i < points.length; i++) {
    out.push(Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y, points[i].z - points[i - 1].z));
  }
  return out;
}

describe("createStrip (une bandelette de papier amate : chaine de points Verlet)", () => {
  it("cree N points, le premier epingle a l'ancre, de longueur totale demandee", () => {
    const strip = createStrip(8, 0.7, PIN);
    expect(strip.points).toHaveLength(8);
    expect(strip.points[0]).toMatchObject(PIN);
    expect(strip.segment).toBeCloseTo(0.1, 6);
  });
});

describe("stepStrip (gravite, vent, contraintes de distance)", () => {
  it("le point epingle suit l'ancre, meme si elle bouge", () => {
    const strip = createStrip(6, 0.5, PIN);
    const moved = { x: 0.3, y: 2.1, z: -0.2 };
    stepStrip(strip, 1 / 60, moved, NO_WIND);
    expect(strip.points[0]).toMatchObject(moved);
  });

  it("sans vent, la bandelette pend sous l'ancre apres une seconde", () => {
    const strip = createStrip(6, 0.5, PIN);
    for (let i = 0; i < 60; i++) stepStrip(strip, 1 / 60, PIN, NO_WIND);
    const last = strip.points[strip.points.length - 1];
    expect(last.y).toBeLessThan(PIN.y - 0.3);
    expect(Math.abs(last.x)).toBeLessThan(0.05);
  });

  it("les segments gardent leur longueur (contrainte satisfaite a 5 % pres)", () => {
    const strip = createStrip(8, 0.7, PIN);
    for (let i = 0; i < 120; i++) stepStrip(strip, 1 / 60, PIN, { x: -3, y: 0, z: 1 });
    for (const len of segmentLengths(strip.points)) {
      expect(len).toBeGreaterThan(strip.segment * 0.95);
      expect(len).toBeLessThan(strip.segment * 1.05);
    }
  });

  it("dans le vent d'Est en Ouest (-x), la bandelette s'oriente vers -x", () => {
    const strip = createStrip(8, 0.7, PIN);
    for (let i = 0; i < 180; i++) stepStrip(strip, 1 / 60, PIN, { x: -6, y: 0, z: 0 });
    const last = strip.points[strip.points.length - 1];
    expect(last.x).toBeLessThan(-0.3);
  });

  it("reste stable : pas de NaN ni d'explosion sur un gros pas de temps", () => {
    const strip = createStrip(8, 0.7, PIN);
    for (let i = 0; i < 30; i++) stepStrip(strip, 0.1, PIN, { x: -8, y: 2, z: -3 });
    for (const p of strip.points) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
      expect(Math.hypot(p.x - PIN.x, p.y - PIN.y, p.z - PIN.z)).toBeLessThan(0.7 + 0.05);
    }
  });
});
