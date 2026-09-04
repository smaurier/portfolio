import { describe, expect, it } from "vitest";
import { amatePattern, bakeAmate } from "./amate-texture";

const NO_SPATTER = { spatters: 0, fray: 0.12 };

function mean(values: number[]) {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

describe("amatePattern (le papier d'ecorce, pas une feuille blanche)", () => {
  it("deterministe par graine", () => {
    expect(amatePattern(0.3, 0.5, 4)).toEqual(amatePattern(0.3, 0.5, 4));
    expect(amatePattern(0.3, 0.5, 4)).not.toEqual(amatePattern(0.3, 0.5, 5));
  });

  it("jamais blanc : creme-ocre tirant vers le brun, rouge > vert > bleu", () => {
    let whiteish = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      const px = amatePattern((i % 20) / 20 + 0.025, Math.floor(i / 20) / 20 + 0.025, 1, NO_SPATTER);
      expect(px.r).toBeGreaterThan(px.g);
      expect(px.g).toBeGreaterThan(px.b);
      if (px.r > 0.95 && px.g > 0.95 && px.b > 0.9) whiteish += 1;
    }
    expect(whiteish).toBe(0);
  });

  it("strie dans le sens des fibres : varie bien plus en travers (v) que le long (u)", () => {
    const alongU: number[] = [];
    const acrossV: number[] = [];
    for (let i = 0; i < 200; i++) {
      const t = i / 200;
      alongU.push(amatePattern(t, 0.5, 2, NO_SPATTER).r);
      acrossV.push(amatePattern(0.5, 0.2 + t * 0.6, 2, NO_SPATTER).r);
    }
    const roughness = (s: number[]) => mean(s.slice(1).map((v, i) => Math.abs(v - s[i])));
    expect(roughness(acrossV)).toBeGreaterThan(roughness(alongU) * 1.5);
  });

  it("le hule : des gouttes presque noires, absentes du papier nu", () => {
    const dark = (opts: { spatters: number; fray: number }) => {
      let n = 0;
      for (let y = 0; y < 40; y++) for (let x = 0; x < 120; x++) {
        const px = amatePattern((x + 0.5) / 120, (y + 0.5) / 40, 3, opts);
        if (px.r < 0.2 && px.g < 0.2) n += 1;
      }
      return n;
    };
    expect(dark(NO_SPATTER)).toBe(0);
    const withRubber = dark({ spatters: 7, fray: 0.12 });
    expect(withRubber).toBeGreaterThan(20);
    expect(withRubber).toBeLessThan(120 * 40 * 0.25);
  });

  it("bords effiloches : opaque au milieu, dechire pres des bords et au bout libre", () => {
    expect(amatePattern(0.4, 0.5, 6).a).toBeCloseTo(1, 6);
    expect(amatePattern(0.4, 0.005, 6).a).toBeLessThan(0.3);
    expect(amatePattern(0.4, 0.995, 6).a).toBeLessThan(0.3);
    expect(amatePattern(0.998, 0.5, 6).a).toBeLessThan(0.3);
    // Le bord n'est pas une ligne droite : l'alpha a une meme distance du
    // bord varie le long de la bande.
    const edge = Array.from({ length: 50 }, (_, i) => amatePattern(i / 50, 0.06, 6).a);
    expect(Math.max(...edge) - Math.min(...edge)).toBeGreaterThan(0.2);
  });

  it("bakeAmate : tampon RGBA de la bonne taille, alpha plein au centre", () => {
    const w = 64, h = 16;
    const data = bakeAmate(w, h, 9);
    expect(data.length).toBe(w * h * 4);
    const o = ((h >> 1) * w + (w >> 2)) * 4;
    expect(data[o + 3]).toBe(255);
    expect(data[o]).toBeGreaterThan(data[o + 2]);
  });
});
