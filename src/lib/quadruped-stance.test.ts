import { describe, expect, it } from "vitest";
import { bodyFromFeet, rollFromFeet } from "./quadruped-stance";

const WHEELBASE = 0.9;

describe("bodyFromFeet (l'assiette se deduit des appuis)", () => {
  it("sur du plat, le corps est de niveau a la hauteur du sol", () => {
    const s = bodyFromFeet(0.4, 0.4, WHEELBASE);
    expect(s.pitch).toBe(0);
    expect(s.y).toBeCloseTo(0.4, 12);
  });

  it("appuis avant sur la pierre, arriere au sol : museau haut (il monte)", () => {
    expect(bodyFromFeet(0.34, 0, WHEELBASE).pitch).toBeGreaterThan(0);
  });

  it("appuis avant au sol, arriere sur la pierre : museau bas (il descend)", () => {
    expect(bodyFromFeet(0, 0.34, WHEELBASE).pitch).toBeLessThan(0);
  });

  it("l'assiette est exactement l'angle de la marche", () => {
    // maxPitch large : on teste la geometrie, pas le garde-fou.
    expect(bodyFromFeet(0.9, 0, 0.9, Math.PI).pitch).toBeCloseTo(Math.PI / 4, 12);
  });

  it("le corps se place a mi-hauteur entre les deux appuis", () => {
    // C'est ce partage qui permet aux deux paires de toucher : chacune
    // s'ecarte de la moitie de la marche, pas de sa totalite.
    const step = 0.34;
    const s = bodyFromFeet(step, 0, WHEELBASE);
    expect(s.y).toBeCloseTo(step / 2, 12);
    expect(Math.abs(s.y - step)).toBeCloseTo(Math.abs(s.y - 0), 12);
  });

  it("monter puis descendre la meme marche donne des assiettes opposees", () => {
    expect(bodyFromFeet(0.3, 0.05, WHEELBASE).pitch).toBeCloseTo(-bodyFromFeet(0.05, 0.3, WHEELBASE).pitch, 12);
  });

  it("marche trop haute pour ce corps : l'assiette est bornee", () => {
    expect(bodyFromFeet(5, 0, WHEELBASE, 0.5).pitch).toBeCloseTo(0.5, 12);
    expect(bodyFromFeet(0, 5, WHEELBASE, 0.5).pitch).toBeCloseTo(-0.5, 12);
  });

  it("empattement nul : pas de division par zero", () => {
    const s = bodyFromFeet(0.3, 0, 0);
    expect(s.pitch).toBe(0);
    expect(Number.isFinite(s.y)).toBe(true);
  });
});

/** Rotation autour de +X, convention three.js : sert a verifier que le
 * signe rendu remonte bien le cote qui a l'appui le plus haut. */
function rotateAboutX(y: number, z: number, angle: number) {
  return { y: y * Math.cos(angle) - z * Math.sin(angle), z: y * Math.sin(angle) + z * Math.cos(angle) };
}

describe("rollFromFeet (le roulis se deduit du devers)", () => {
  it("appuis lateraux identiques : pas de roulis", () => {
    expect(rollFromFeet(0.2, 0.2, 0.4)).toBe(0);
  });

  it("le cote dont l'appui est le plus haut est bien celui qui remonte", () => {
    // Appui plus haut du cote +Z : un point du corps a +Z doit monter.
    const roll = rollFromFeet(0.3, 0, 0.4);
    expect(rotateAboutX(0, 1, roll).y).toBeGreaterThan(0);
    // Et symetriquement de l'autre cote.
    const other = rollFromFeet(0, 0.3, 0.4);
    expect(rotateAboutX(0, -1, other).y).toBeGreaterThan(0);
  });

  it("le corps s'incline de l'angle du devers", () => {
    expect(Math.abs(rollFromFeet(0.4, 0, 0.4, Math.PI))).toBeCloseTo(Math.PI / 4, 12);
  });

  it("devers trop fort pour ce corps : le roulis est borne", () => {
    expect(rollFromFeet(5, 0, 0.4, 0.4)).toBeCloseTo(-0.4, 12);
    expect(rollFromFeet(0, 5, 0.4, 0.4)).toBeCloseTo(0.4, 12);
  });

  it("voie nulle : pas de division par zero", () => {
    expect(rollFromFeet(0.3, 0, 0)).toBe(0);
  });

  it("symetrique : inverser les deux cotes inverse le roulis", () => {
    expect(rollFromFeet(0.25, 0.05, 0.4)).toBeCloseTo(-rollFromFeet(0.05, 0.25, 0.4), 12);
  });
});
