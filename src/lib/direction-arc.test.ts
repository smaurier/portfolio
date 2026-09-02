import { describe, expect, it } from "vitest";
import { remapNorthArc } from "./direction-arc";

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
