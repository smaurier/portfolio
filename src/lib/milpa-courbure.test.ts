import { describe, expect, it } from "vitest";
import { angleCourbure, EAST_MILPA } from "./milpa-frost";

describe("angleCourbure (la courbe, et non la perche)", () => {
  it("la base ne bouge pas : le plant est plante", () => {
    expect(angleCourbure(0, EAST_MILPA.frozenBend)).toBe(0);
  });

  it("la pointe porte toute la flexion", () => {
    expect(angleCourbure(1, EAST_MILPA.frozenBend)).toBeCloseTo(EAST_MILPA.frozenBend, 9);
  });

  it("PAS DE COUDE AU RAS DU SOL : la courbure part de zero", () => {
    // Une rampe lineaire donnerait la meme pente en bas qu'au milieu, donc
    // un angle net a l'endroit ou la tige sort de terre. C'est ce qui
    // distingue une courbe d'une charniere.
    const enBas = angleCourbure(0.02, 1) - angleCourbure(0, 1);
    const auMilieu = angleCourbure(0.51, 1) - angleCourbure(0.49, 1);
    expect(enBas).toBeLessThan(auMilieu / 10);
  });

  it("monte sans jamais redescendre le long de la tige", () => {
    let precedent = -1;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const a = angleCourbure(t, 1.15);
      expect(a).toBeGreaterThanOrEqual(precedent);
      precedent = a;
    }
  });

  it("borne ses entrees : au-dela de la pointe, rien de plus", () => {
    expect(angleCourbure(1.4, 1.15)).toBeCloseTo(1.15, 9);
    expect(angleCourbure(-0.3, 1.15)).toBe(0);
  });

  it("une flexion nulle laisse la tige droite sur toute sa hauteur", () => {
    for (const t of [0, 0.3, 0.7, 1]) expect(angleCourbure(t, 0)).toBe(0);
  });
});
