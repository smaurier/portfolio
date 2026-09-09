import { describe, expect, it } from "vitest";
import { SUD_ARC, remapSouthArc } from "./sud-arc";

/**
 * L'arc du Sud : la nuit de Coatepec, puis midi. Arbitrage de Sylvain du
 * 08/09, et le piege de coherence qui va avec : Coatepec est un lever de
 * soleil, or l'Est en est deja un, et deux scenes sur cinq ne peuvent pas
 * etre une aurore. Ces tests encodent la distinction.
 */
describe("remapSouthArc : la nuit de Coatepec, puis le zenith", () => {
  it("commence dans la nuit : la lune et les quatre cents sont encore la", () => {
    const a = remapSouthArc(0);
    expect(a.day).toBeLessThan(0.05);
    expect(a.night).toBeGreaterThan(0.95);
    expect(a.battle).toBe(0);
  });

  it("finit au zenith, plein midi", () => {
    const a = remapSouthArc(1);
    expect(a.day).toBeGreaterThan(0.98);
    expect(a.night).toBeLessThan(0.02);
    expect(a.battle).toBe(1);
  });

  it("le soleil ne fait que MONTER, jamais l'inverse", () => {
    let last = -1;
    for (let p = 0; p <= 1.0001; p += 0.02) {
      const d = remapSouthArc(p).day;
      expect(d).toBeGreaterThanOrEqual(last - 1e-9);
      last = d;
    }
  });

  it("NE PASSE PAS PAR UNE AUBE : la bande des soleils bas est traversee vite", () => {
    // C'est l'invariant central. L'Est est l'aurore du site : la lumiere qui
    // arrive, Venus avant le soleil, un soleil rasant qui teinte tout
    // d'orange. Le Sud est la BATAILLE : le soleil est deja ne, arme, et il
    // frappe. Il ne doit donc pas s'attarder aux elevations basses, sans
    // quoi le Sud deviendrait une seconde aurore et l'Est perdrait ce qui
    // le rend unique.
    let span = 0;
    const step = 0.002;
    for (let p = 0; p <= 1; p += step) {
      const d = remapSouthArc(p).day;
      if (d > SUD_ARC.dawnBand[0] && d < SUD_ARC.dawnBand[1]) span += step;
    }
    expect(span, "duree passee dans la bande d'aube").toBeLessThan(0.09);
  });

  it("la bataille se joue APRES la nuit et AVANT le zenith", () => {
    expect(remapSouthArc(SUD_ARC.battleStart - 0.01).battle).toBe(0);
    expect(remapSouthArc((SUD_ARC.battleStart + SUD_ARC.battleEnd) / 2).battle).toBeGreaterThan(0.2);
    expect(remapSouthArc((SUD_ARC.battleStart + SUD_ARC.battleEnd) / 2).battle).toBeLessThan(0.8);
    expect(remapSouthArc(SUD_ARC.battleEnd + 0.01).battle).toBe(1);
  });

  it("le soleil arrive PENDANT la bataille, pas avant : c'est lui qui la gagne", () => {
    expect(remapSouthArc(SUD_ARC.battleStart).day).toBeLessThan(0.1);
    expect(remapSouthArc(SUD_ARC.battleEnd).day).toBeGreaterThan(0.5);
  });

  it("la lumiere de reveal-arc part bas et finit haut", () => {
    expect(remapSouthArc(0).lightP).toBeLessThan(0.25);
    expect(remapSouthArc(1).lightP).toBeGreaterThan(0.95);
  });

  it("borne les progres hors plage sans jamais rendre autre chose qu'un nombre", () => {
    for (const p of [-2, 0, 0.5, 1, 3, Number.NaN]) {
      const a = remapSouthArc(p);
      for (const v of [a.day, a.night, a.battle, a.lightP]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
