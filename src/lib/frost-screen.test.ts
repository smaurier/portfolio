import { describe, expect, it } from "vitest";
import { coverage, createFrostGrid, growFrost, meltFrost, seedFrost } from "./frost-screen";

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("frost-screen : le givre qui gagne l'ecran depuis les bords", () => {
  it("part vide, puis les graines sont sur les bords", () => {
    const g = createFrostGrid(64, 40);
    expect(coverage(g)).toBe(0);
    seedFrost(g, rng(1));
    expect(coverage(g)).toBeGreaterThan(0);
    expect(coverage(g)).toBeLessThan(0.1);
    // Le centre reste libre.
    expect(g.cells[20 * 64 + 32]).toBe(0);
  });

  it("grandit de facon monotone jusqu'a couvrir presque tout", () => {
    const g = createFrostGrid(64, 40);
    const r = rng(2);
    seedFrost(g, r);
    let prev = coverage(g);
    for (let i = 0; i < 60; i++) {
      growFrost(g, 1, r);
      const c = coverage(g);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
    expect(prev).toBeGreaterThan(0.9);
  });

  it("le centre gele apres les bords", () => {
    const g = createFrostGrid(64, 40);
    const r = rng(3);
    seedFrost(g, r);
    let centreFrozenAt = -1, borderFrozenAt = -1;
    for (let i = 0; i < 80; i++) {
      growFrost(g, 1, r);
      if (borderFrozenAt < 0 && g.cells[2 * 64 + 10] > 0) borderFrozenAt = i;
      if (centreFrozenAt < 0 && g.cells[20 * 64 + 32] > 0) centreFrozenAt = i;
    }
    expect(borderFrozenAt).toBeGreaterThanOrEqual(0);
    expect(centreFrozenAt).toBeGreaterThan(borderFrozenAt);
  });

  it("deux graines differentes donnent deux givres differents ; la meme graine, le meme", () => {
    const a = createFrostGrid(32, 20), b = createFrostGrid(32, 20), c = createFrostGrid(32, 20);
    const ra = rng(5), rb = rng(6), rc = rng(5);
    seedFrost(a, ra); seedFrost(b, rb); seedFrost(c, rc);
    for (let i = 0; i < 15; i++) { growFrost(a, 1, ra); growFrost(b, 1, rb); growFrost(c, 1, rc); }
    expect(Array.from(a.cells)).not.toEqual(Array.from(b.cells));
    expect(Array.from(a.cells)).toEqual(Array.from(c.cells));
  });

  it("fond dans l'ordre inverse : les cellules les plus recentes partent d'abord", () => {
    const g = createFrostGrid(64, 40);
    const r = rng(7);
    seedFrost(g, r);
    for (let i = 0; i < 40; i++) growFrost(g, 1, r);
    const full = coverage(g);
    meltFrost(g, 0.5);
    const half = coverage(g);
    expect(half).toBeLessThan(full);
    expect(half).toBeGreaterThan(0);
    // Ce qui reste est plus ancien que ce qui est parti : l'age max restant < age max d'avant.
    let maxAge = 0;
    for (const v of g.cells) if (v > maxAge) maxAge = v;
    expect(maxAge).toBeLessThan(g.tick);
    meltFrost(g, 0);
    expect(coverage(g)).toBe(0);
  });
});
