import { describe, expect, it } from "vitest";
import { remapNorthArc } from "./direction-arc";

describe("remapNorthArc (option A + arrivee, arbitrage Sylvain 01/09)", () => {
  it("en haut de page, ne change presque rien (etat valide du pilote)", () => {
    const { lightP, arrivalGlow } = remapNorthArc(0.02);
    expect(lightP).toBeCloseTo(0.02, 1);
    expect(arrivalGlow).toBe(0);
  });

  it("descend : plus on scrolle, plus la lumiere baisse (jamais d'eveil du monde)", () => {
    const mid = remapNorthArc(0.45).lightP;
    const deep = remapNorthArc(0.8).lightP;
    expect(mid).toBeLessThan(0.3);
    expect(deep).toBeLessThan(mid);
    expect(deep).toBeLessThanOrEqual(0.08);
  });

  it("l'arrivee : en toute fin, une remontee VIOLETTE distincte (glow), pas l'arc de la home", () => {
    expect(remapNorthArc(0.82).arrivalGlow).toBeCloseTo(0, 1);
    expect(remapNorthArc(1).arrivalGlow).toBe(1);
    // la lumiere remonte un peu a l'arrivee, mais reste sous l'eveil complet
    const arrival = remapNorthArc(1).lightP;
    expect(arrival).toBeGreaterThan(remapNorthArc(0.8).lightP);
    expect(arrival).toBeLessThan(0.45);
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
