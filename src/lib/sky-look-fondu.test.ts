import { describe, expect, it } from "vitest";
import { Color } from "three";
import { croiserLooks, lookCroiseVide, melangerAzimut, type SkyLook } from "./sky-look-fondu";

const SUD: SkyLook = { tint: new Color(0.78, 1.0, 0.97), tintMix: 0.65, sunAzimuthDeg: 300, dusk: new Color("#000000") };
const EST: SkyLook = { tint: new Color(1.0, 0.9, 0.72), tintMix: 0.5, sunAzimuthDeg: 18, dusk: new Color("#8a2a24"), night: new Color("#1e3069") };

describe("melangerAzimut (le plus court chemin)", () => {
  it("de 350 a 10 passe par zero, pas par 180", () => {
    expect(melangerAzimut(350, 10, 0.5)).toBeCloseTo(0, 9);
  });
  it("aux bornes, rend exactement chaque cote", () => {
    expect(melangerAzimut(300, 18, 0)).toBe(300);
    expect(melangerAzimut(300, 18, 1)).toBe(18);
  });
});

describe("croiserLooks (le look du ciel traverse)", () => {
  it("aux deux bouts, c'est exactement l'un puis l'autre", () => {
    const c = lookCroiseVide();
    croiserLooks(SUD, EST, 0, c);
    expect(c.tintMix).toBe(SUD.tintMix);
    expect(c.dusk.getHexString()).toBe("000000");
    croiserLooks(SUD, EST, 1, c);
    expect(c.tintMix).toBe(EST.tintMix);
    expect(c.dusk.getHexString()).toBe("8a2a24");
  });

  it("AU MILIEU, RIEN NE SE REMPLACE : chaque champ est entre les deux", () => {
    const c = lookCroiseVide();
    croiserLooks(SUD, EST, 0.5, c);
    expect(c.tintMix).toBeCloseTo(0.575, 9);
    expect(c.dusk.r).toBeGreaterThan(0);
    expect(c.dusk.r).toBeLessThan(EST.dusk.r);
    expect(c.tint.r).toBeGreaterThan(SUD.tint.r);
    expect(c.tint.r).toBeLessThan(EST.tint.r);
  });

  it("l'avant-jour de l'Est ARRIVE avec l'Est au lieu de s'allumer d'un coup", () => {
    const c = lookCroiseVide();
    croiserLooks(SUD, EST, 0.25, c);
    expect(c.night).not.toBeNull();
    expect(c.poidsNuit).toBeCloseTo(0.25, 9);
    croiserLooks(EST, SUD, 0.25, c);
    expect(c.poidsNuit).toBeCloseTo(0.75, 9);
  });

  it("un seul cote a une photo : son look est garde tel quel, l'opacite fait le reste", () => {
    const c = lookCroiseVide();
    expect(croiserLooks(undefined, EST, 0.3, c)).toBe(c);
    expect(c.sunAzimuthDeg).toBe(18);
    expect(c.poidsNuit).toBeCloseTo(0.3, 9);
    expect(croiserLooks(SUD, undefined, 0.3, c)).toBe(c);
    expect(c.sunAzimuthDeg).toBe(300);
  });

  it("aucune photo d'aucun cote : rien", () => {
    expect(croiserLooks(undefined, undefined, 0.5, lookCroiseVide())).toBeUndefined();
  });

  it("n'alloue rien dans la boucle : la cible est rendue, pas recreee", () => {
    const c = lookCroiseVide();
    const r1 = croiserLooks(SUD, EST, 0.2, c);
    const r2 = croiserLooks(SUD, EST, 0.4, c);
    expect(r1).toBe(c);
    expect(r2).toBe(c);
  });
});
