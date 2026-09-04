import { describe, expect, it } from "vitest";
import { emberBudget, flightPosition, flightRoll, flightTangent, XIUHCOATL_FLIGHT } from "./xiuhcoatl-flight";

describe("flightPosition (le serpent de feu porte le soleil a travers le ciel)", () => {
  it("part hors champ a l'est, arrive hors champ a l'ouest", () => {
    expect(flightPosition(0).x).toBe(XIUHCOATL_FLIGHT.fromX);
    expect(flightPosition(1).x).toBe(XIUHCOATL_FLIGHT.toX);
    expect(Math.abs(flightPosition(0).x)).toBeGreaterThan(10);
  });

  it("vole haut : jamais sous l'altitude de base, sommet au milieu", () => {
    let minY = Infinity, maxY = -Infinity, argmax = 0;
    for (let i = 0; i <= 100; i++) {
      const y = flightPosition(i / 100).y;
      if (y < minY) minY = y;
      if (y > maxY) { maxY = y; argmax = i / 100; }
    }
    expect(minY).toBeGreaterThanOrEqual(XIUHCOATL_FLIGHT.baseY - 1e-9);
    expect(maxY).toBeCloseTo(XIUHCOATL_FLIGHT.peakY, 6);
    expect(argmax).toBeCloseTo(0.5, 1);
  });

  it("reste derriere le cerf (z negatif), en diagonale de loin vers pres, ondulation bornee", () => {
    const { fromZ, toZ, swayAmp } = XIUHCOATL_FLIGHT;
    expect(fromZ).toBeLessThan(toZ); // arrive de loin, passe plus pres
    for (let i = 0; i <= 50; i++) {
      const u = i / 50;
      const z = flightPosition(u).z;
      expect(z).toBeLessThan(0);
      expect(Math.abs(z - (fromZ + (toZ - fromZ) * u))).toBeLessThanOrEqual(swayAmp + 1e-9);
    }
  });

  it("t est borne : avant 0 et apres 1 il ne bouge plus", () => {
    expect(flightPosition(-1)).toEqual(flightPosition(0));
    expect(flightPosition(2)).toEqual(flightPosition(1));
  });
});

describe("flightTangent / flightRoll", () => {
  it("tangente unitaire, orientee vers l'ouest, montante au depart et descendante a l'arrivee", () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const d = flightTangent(t);
      expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 10);
      expect(d.x).toBeGreaterThan(0);
    }
    expect(flightTangent(0.05).y).toBeGreaterThan(0);
    expect(flightTangent(0.95).y).toBeLessThan(0);
  });

  it("la tangente est la derivee de la position (difference finie)", () => {
    const t = 0.3, h = 1e-4;
    const a = flightPosition(t - h), b = flightPosition(t + h);
    const fd = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const l = Math.hypot(fd.x, fd.y, fd.z);
    const d = flightTangent(t);
    expect(fd.x / l).toBeCloseTo(d.x, 5);
    expect(fd.y / l).toBeCloseTo(d.y, 5);
    expect(fd.z / l).toBeCloseTo(d.z, 5);
  });

  it("le roulis est borne et change de signe avec les virages", () => {
    let pos = 0, neg = 0;
    for (let i = 0; i <= 100; i++) {
      const r = flightRoll(i / 100);
      expect(Math.abs(r)).toBeLessThanOrEqual(0.35);
      if (r > 0.01) pos += 1;
      if (r < -0.01) neg += 1;
    }
    expect(pos).toBeGreaterThan(0);
    expect(neg).toBeGreaterThan(0);
  });
});

describe("emberBudget (le feu monte avec le soleil)", () => {
  it("proportionnel au temps ecoule, plus dense au sommet de l'arc", () => {
    expect(emberBudget(0.5, 1 / 60)).toBeCloseTo(emberBudget(0.5, 1 / 30) / 2, 10);
    expect(emberBudget(0.5, 1)).toBeGreaterThan(emberBudget(0.02, 1));
    expect(emberBudget(0.02, 1)).toBeGreaterThan(0);
  });
});
