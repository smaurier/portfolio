import { describe, expect, it } from "vitest";
import { IZMICTLAN, remapNorthArc, strippedWarmth } from "./direction-arc";

describe("remapNorthArc (option A + arrivee, arbitrage Sylvain 01/09)", () => {
  it("en haut de page, le Nord commence ECLAIRE (arc inverse : on part de la lumiere, 02/09)", () => {
    const { lightP, arrivalGlow } = remapNorthArc(0.02);
    expect(lightP).toBeGreaterThanOrEqual(0.5);
    expect(arrivalGlow).toBe(0);
  });

  it("descend : plus on scrolle, plus la lumiere baisse (jamais d'eveil du monde)", () => {
    const top = remapNorthArc(0.02).lightP;
    const mid = remapNorthArc(0.45).lightP;
    const deep = remapNorthArc(0.8).lightP;
    expect(mid).toBeLessThan(top);
    expect(deep).toBeLessThan(mid);
    // Plancher LISIBLE (arbitrage Sylvain 02/09 "on ne voit rien") : plus
    // sombre que le haut de page, jamais le noir.
    expect(deep).toBeGreaterThanOrEqual(0.25);
    expect(deep).toBeLessThanOrEqual(0.4);
  });

  it("l'arrivee : en toute fin, une remontee VIOLETTE distincte (glow), pas l'arc de la home", () => {
    expect(remapNorthArc(0.82).arrivalGlow).toBeCloseTo(0, 1);
    expect(remapNorthArc(1).arrivalGlow).toBe(1);
    // la lumiere remonte un peu a l'arrivee, mais reste sous l'eveil complet
    const arrival = remapNorthArc(1).lightP;
    expect(arrival).toBeGreaterThan(remapNorthArc(0.8).lightP);
    expect(arrival).toBeLessThan(0.7);
  });

  it("est continue : pas de saut entre descente et arrivee", () => {
    let prev = remapNorthArc(0).lightP;
    for (let p = 0.02; p <= 1.001; p += 0.02) {
      const cur = remapNorthArc(Math.min(1, p)).lightP;
      expect(Math.abs(cur - prev)).toBeLessThan(0.06);
      prev = cur;
    }
  });

  it("borne les sorties dans [0,1]", () => {
    for (let p = 0; p <= 1.001; p += 0.05) {
      const { lightP, arrivalGlow } = remapNorthArc(Math.min(1, p));
      expect(lightP).toBeGreaterThanOrEqual(0);
      expect(lightP).toBeLessThanOrEqual(1);
      expect(arrivalGlow).toBeGreaterThanOrEqual(0);
      expect(arrivalGlow).toBeLessThanOrEqual(1);
    }
  });
});

describe("strippedWarmth : le huitieme niveau de Mictlan", () => {
  it("rien avant le huitieme niveau : on descend encore", () => {
    expect(strippedWarmth(0)).toBe(0);
    expect(strippedWarmth(IZMICTLAN.start - 0.01)).toBe(0);
  });

  it("acquis au fond : la chaleur est restee dans l'eau", () => {
    expect(strippedWarmth(IZMICTLAN.end)).toBe(1);
    expect(strippedWarmth(1)).toBe(1);
  });

  it("progresse sans a-coup entre les deux", () => {
    const mid = strippedWarmth((IZMICTLAN.start + IZMICTLAN.end) / 2);
    expect(mid).toBeGreaterThan(0.35);
    expect(mid).toBeLessThan(0.65);
    let last = -1;
    for (let d = 0; d <= 1.0001; d += 0.02) {
      const v = strippedWarmth(d);
      expect(v).toBeGreaterThanOrEqual(last - 1e-9);
      last = v;
    }
  });

  it("le depouillement occupe le dernier tiers de la descente", () => {
    // Il commencait au dernier quart (0,76), mais la mesure du 09/09 a
    // montre que la chaleur n'atteignait alors son plein qu'une fois le pied
    // de page a l'ecran : le geste ne se voyait pas.
    expect(IZMICTLAN.start).toBeGreaterThan(0.55);
    expect(IZMICTLAN.start).toBeLessThan(0.7);
    expect(IZMICTLAN.end).toBeLessThanOrEqual(0.95);
  });

  it("tolere une profondeur absurde", () => {
    expect(strippedWarmth(Number.NaN)).toBe(0);
    expect(strippedWarmth(-5)).toBe(0);
    expect(strippedWarmth(9)).toBe(1);
  });
});
