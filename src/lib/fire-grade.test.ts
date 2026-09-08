import { describe, expect, it } from "vitest";
import { FIRE_GRADE, blendGrade, fireDesaturation } from "./fire-grade";

describe("fire-grade : la couleur est le tonalli que le feu donne", () => {
  it("au foyer meme, rien n'est desature", () => {
    expect(fireDesaturation(0)).toBe(0);
    expect(fireDesaturation(FIRE_GRADE.near)).toBe(0);
  });

  it("la Piedra reste coloree : le seuil est au-dela de son disque (3 u)", () => {
    expect(FIRE_GRADE.near).toBeGreaterThanOrEqual(3);
  });

  it("plus on s'eloigne du feu, plus la couleur se retire", () => {
    let previous = -1;
    for (let d = 0; d <= FIRE_GRADE.far + 4; d += 0.5) {
      const v = fireDesaturation(d);
      expect(v).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = v;
    }
  });

  it("la peripherie ne vire JAMAIS au gris complet : elle se lirait comme un bug", () => {
    expect(FIRE_GRADE.cap).toBeLessThan(1);
    expect(fireDesaturation(FIRE_GRADE.far)).toBeCloseTo(FIRE_GRADE.cap, 6);
    expect(fireDesaturation(1000)).toBeCloseTo(FIRE_GRADE.cap, 6);
  });

  it("le plafond n'est jamais depasse, a aucune distance", () => {
    for (let d = -10; d <= 200; d += 0.25) {
      expect(fireDesaturation(d)).toBeLessThanOrEqual(FIRE_GRADE.cap + 1e-9);
    }
  });

  it("le seuil est bien avant la limite", () => {
    expect(FIRE_GRADE.near).toBeLessThan(FIRE_GRADE.far);
  });
});

describe("fire-grade : au Centre, le feu REMPLACE la camera (il ne s'y ajoute pas)", () => {
  it("hors du Centre, rien ne change : c'est la desaturation par la camera", () => {
    expect(blendGrade(0.3, 0.9, 0)).toBeCloseTo(0.3, 6);
  });

  it("au Centre, c'est celle du feu, et elle SEULE", () => {
    expect(blendGrade(0.3, 0.9, 1)).toBeCloseTo(0.9, 6);
  });

  it("les deux ne s'additionnent jamais : le resultat reste entre les deux", () => {
    for (let b = 0; b <= 1; b += 0.1) {
      const v = blendGrade(0.3, 0.9, b);
      expect(v).toBeGreaterThanOrEqual(0.3 - 1e-9);
      expect(v).toBeLessThanOrEqual(0.9 + 1e-9);
    }
    // Et dans l'autre sens : si le feu desature MOINS que la camera, le
    // fondu descend, il ne cumule pas davantage de gris.
    expect(blendGrade(0.8, 0.2, 1)).toBeCloseTo(0.2, 6);
  });

  it("le fondu est borne : un blend hors [0,1] ne fabrique pas de valeur folle", () => {
    expect(blendGrade(0.3, 0.9, -2)).toBeCloseTo(0.3, 6);
    expect(blendGrade(0.3, 0.9, 5)).toBeCloseTo(0.9, 6);
  });
});
