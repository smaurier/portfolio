import { describe, expect, it } from "vitest";
import { aztecYear, AZTEC_YEAR_BEARERS, dotRows, mexicaYearOf } from "./aztec-year";

describe("mexicaYearOf (l'annee mexica bascule le 13 fevrier)", () => {
  it("avant le 13 fevrier, on est encore dans l'annee precedente", () => {
    expect(mexicaYearOf(new Date(2026, 0, 15))).toBe(2025);
    expect(mexicaYearOf(new Date(2026, 1, 12))).toBe(2025);
    expect(mexicaYearOf(new Date(2026, 1, 13))).toBe(2026);
    expect(mexicaYearOf(new Date(2026, 8, 4))).toBe(2026);
  });
});

describe("aztecYear (nombre 1..13 + porteur, correlation 1519 = 1 Acatl)", () => {
  it("1519, l'arrivee de Cortes : 1 Acatl", () => {
    expect(aztecYear(new Date(1519, 6, 1))).toMatchObject({ number: 1, bearer: "acatl", mexicaYear: 1519 });
  });

  it("1521, la chute de Tenochtitlan : 3 Calli", () => {
    expect(aztecYear(new Date(1521, 7, 13))).toMatchObject({ number: 3, bearer: "calli" });
  });

  it("2026 : 1 Tochtli ; 2027 : 2 Acatl ; 2028 : 3 Tecpatl", () => {
    expect(aztecYear(new Date(2026, 8, 4))).toMatchObject({ number: 1, bearer: "tochtli" });
    expect(aztecYear(new Date(2027, 8, 4))).toMatchObject({ number: 2, bearer: "acatl" });
    expect(aztecYear(new Date(2028, 8, 4))).toMatchObject({ number: 3, bearer: "tecpatl" });
  });

  it("le cycle se referme en 52 ans (xiuhmolpilli)", () => {
    const a = aztecYear(new Date(2026, 8, 4));
    const b = aztecYear(new Date(2078, 8, 4));
    expect(b.number).toBe(a.number);
    expect(b.bearer).toBe(a.bearer);
    // et ne se referme pas avant
    for (let k = 1; k < 52; k++) {
      const c = aztecYear(new Date(2026 + k, 8, 4));
      expect(c.number === a.number && c.bearer === a.bearer).toBe(false);
    }
  });

  it("le nombre reste dans 1..13 et le porteur dans les quatre, y compris avant 1519", () => {
    for (let y = 1400; y < 2200; y += 7) {
      const r = aztecYear(new Date(y, 8, 4));
      expect(r.number).toBeGreaterThanOrEqual(1);
      expect(r.number).toBeLessThanOrEqual(13);
      expect(AZTEC_YEAR_BEARERS).toContain(r.bearer);
    }
  });
});

describe("dotRows (les points du nombre, en rangees de 5 comme dans les codex)", () => {
  it("1..5 sur une rangee, 6..10 sur deux, 11..13 sur trois", () => {
    expect(dotRows(1)).toEqual([1]);
    expect(dotRows(5)).toEqual([5]);
    expect(dotRows(6)).toEqual([5, 1]);
    expect(dotRows(10)).toEqual([5, 5]);
    expect(dotRows(13)).toEqual([5, 5, 3]);
  });
});
