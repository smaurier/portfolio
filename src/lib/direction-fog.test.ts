import { describe, expect, it } from "vitest";
import { approachFog, approachTint, DIRECTION_FOG_RANGE, FOG_TINT_OVERRIDE, getFogRange, getFogTint } from "./direction-fog";
import type { DirectionKey } from "@/lib/direction";

const DIRECTIONS = Object.keys(DIRECTION_FOG_RANGE) as DirectionKey[];

describe("DIRECTION_FOG_RANGE", () => {
  it("garde la reference historique 10/34 pour le jade (home, decision 20/08)", () => {
    expect(getFogRange("jade")).toEqual({ near: 10, far: 34 });
  });

  it("donne au Nord le fog le plus dense du site (derogation actee 01/09)", () => {
    const obsidienne = getFogRange("obsidienne");
    for (const dir of DIRECTIONS) {
      if (dir === "obsidienne") continue;
      const range = getFogRange(dir);
      expect(obsidienne.near).toBeLessThan(range.near);
      expect(obsidienne.far).toBeLessThan(range.far);
    }
  });

  it("donne a l'Est l'air le plus limpide (aube claire)", () => {
    const dore = getFogRange("dore");
    for (const dir of DIRECTIONS) {
      if (dir === "dore") continue;
      const range = getFogRange(dir);
      expect(dore.far).toBeGreaterThanOrEqual(range.far);
    }
  });

  it("a near < far pour toutes les directions", () => {
    for (const dir of DIRECTIONS) {
      const { near, far } = getFogRange(dir);
      expect(near).toBeLessThan(far);
      expect(near).toBeGreaterThan(0);
    }
  });
});

describe("approachFog", () => {
  it("rapproche near et far de la cible proportionnellement a alpha", () => {
    const next = approachFog({ near: 10, far: 34 }, { near: 5, far: 18 }, 0.5);
    expect(next.near).toBeCloseTo(7.5);
    expect(next.far).toBeCloseTo(26);
  });

  it("atteint exactement la cible avec alpha 1", () => {
    const next = approachFog({ near: 10, far: 34 }, { near: 5, far: 18 }, 1);
    expect(next).toEqual({ near: 5, far: 18 });
  });

  it("snap sur la cible sous l'epsilon (pas d'asymptote infinie)", () => {
    const next = approachFog({ near: 5.004, far: 18.004 }, { near: 5, far: 18 }, 0.06);
    expect(next).toEqual({ near: 5, far: 18 });
  });

  it("ne depasse jamais la cible", () => {
    let range = { near: 10, far: 34 };
    const target = { near: 5, far: 18 };
    for (let i = 0; i < 300; i++) range = approachFog(range, target, 0.06);
    expect(range.near).toBeGreaterThanOrEqual(target.near);
    expect(range.far).toBeGreaterThanOrEqual(target.far);
    expect(range).toEqual(target);
  });
});

describe("getFogTint (le ciel de midi du Sud)", () => {
  it("rend la teinte derivee partout sauf au Sud", () => {
    const derived = { r: 10, g: 20, b: 30 };
    expect(getFogTint("jade", derived)).toEqual(derived);
    expect(getFogTint("obsidienne", derived)).toEqual(derived);
    expect(getFogTint("turquoise", derived)).not.toEqual(derived);
  });

  it("au Sud, un ciel de midi : turquoise clair, nettement plus lumineux que la derivation", () => {
    const derived = { r: 11, g: 80, b: 138 }; // 75 % de #0f6bb8
    const sud = getFogTint("turquoise", derived);
    expect(sud.g + sud.b).toBeGreaterThan((derived.g + derived.b) * 1.5);
    expect(sud.b).toBeGreaterThan(sud.r); // turquoise, pas ocre
    expect(sud.g).toBeGreaterThan(sud.r);
    expect(FOG_TINT_OVERRIDE.turquoise).toEqual(sud);
  });
});

describe("approachTint (le passage d'une direction a l'autre)", () => {
  // LE DEFAUT GARDE ICI (mesure du 15/09). Sud vers Ouest sautait de 20 a
  // 72 de luminance moyenne EN UNE IMAGE : la portee du brouillard etait
  // lissee par approachFog, sa teinte non, et elle basculait d'un coup au
  // commit de la route. Est vers Sud et Ouest vers Nord passaient
  // inapercus parce que leur ecart est faible : le defaut etait la depuis
  // le debut, seul l'ecart Sud/Ouest le rendait visible.
  const SUD = { r: 62, g: 168, b: 196 };
  const OUEST = { r: 150, g: 88, b: 70 };

  it("rapproche chaque composante proportionnellement a alpha", () => {
    const next = approachTint({ r: 0, g: 100, b: 200 }, { r: 100, g: 0, b: 0 }, 0.5);
    expect(next.r).toBeCloseTo(50);
    expect(next.g).toBeCloseTo(50);
    expect(next.b).toBeCloseTo(100);
  });

  it("atteint exactement la cible avec alpha 1", () => {
    expect(approachTint(SUD, OUEST, 1)).toEqual(OUEST);
  });

  it("snap sur la cible sous l'epsilon, donc la teinte se pose vraiment", () => {
    const next = approachTint({ r: 150.004, g: 88.004, b: 70.004 }, OUEST, 0.06);
    expect(next).toEqual(OUEST);
  });

  it("AUCUNE IMAGE NE FRANCHIT PLUS DE 6 % DE L'ECART : c'est tout l'objet", () => {
    // Un snap franchit 100 % en une image, et c'est ce qu'on a mesure.
    let tint = { ...SUD };
    let plusGrandPas = 0;
    const ecart = Math.abs(OUEST.g - SUD.g);
    for (let i = 0; i < 300; i++) {
      const suivant = approachTint(tint, OUEST, 0.06);
      plusGrandPas = Math.max(plusGrandPas, Math.abs(suivant.g - tint.g));
      tint = suivant;
    }
    expect(plusGrandPas / ecart).toBeLessThan(0.07);
  });

  it("converge vraiment, et sans depasser", () => {
    let tint = { ...SUD };
    for (let i = 0; i < 300; i++) tint = approachTint(tint, OUEST, 0.06);
    expect(tint).toEqual(OUEST);
  });

  it("tient la meme cadence que la portee : les deux arrivent ensemble", () => {
    // approachFog et approachTint partagent alpha et epsilon : une teinte
    // qui se poserait apres sa portee ferait un second mouvement visible.
    let tint = { ...SUD };
    let range = { near: 11, far: 36 };
    let imagesTeinte = 0;
    let imagesPortee = 0;
    for (let i = 1; i <= 400; i++) {
      tint = approachTint(tint, OUEST, 0.06);
      range = approachFog(range, { near: 8, far: 26 }, 0.06);
      if (imagesTeinte === 0 && tint.r === OUEST.r && tint.g === OUEST.g && tint.b === OUEST.b) imagesTeinte = i;
      if (imagesPortee === 0 && range.near === 8 && range.far === 26) imagesPortee = i;
    }
    expect(imagesTeinte).toBeGreaterThan(0);
    expect(imagesPortee).toBeGreaterThan(0);
    expect(Math.abs(imagesTeinte - imagesPortee)).toBeLessThan(60);
  });
});
