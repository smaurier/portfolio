import { describe, expect, it } from "vitest";
import { arcProgress, arcScrollHeight, EXIT_SCROLL_VIEWPORTS, exitProgress } from "./reveal-arc";

/**
 * L'ACTE DE SORTIE (F2).
 *
 * Trois proprietes comptent, et la deuxieme vient d'un defaut que la mesure
 * a attrape avant la livraison : les pages n'ont pas la meme longueur. Une
 * sortie calee sur la fin de l'arc se serait jouee au tiers de Memoire,
 * camera qui monte pendant qu'on lit encore.
 */
const H = 800;
/** L'accueil, mesure le 10/09 : l'arc y occupe 75 % du defilement. */
const COURTE = 2119;
/** Memoire, la page la plus longue : l'arc n'y occupe que 36 %. */
const LONGUE = 4466;

describe("exitProgress (l'acte de sortie)", () => {
  it("ne commence jamais avant la fin de l'arc", () => {
    for (const max of [COURTE, LONGUE]) {
      for (const s of [0, 200, 800, 1500, arcScrollHeight(H)]) {
        expect(exitProgress(s, H, max), "a " + s + " sur " + max).toBe(0);
      }
    }
  });

  it("SUR UNE PAGE LONGUE, ne se joue qu'a la toute fin", () => {
    // Le defaut evite : a mi-page, sur Memoire, il ne doit rien se passer.
    expect(exitProgress(LONGUE * 0.5, H, LONGUE)).toBe(0);
    expect(exitProgress(LONGUE * 0.8, H, LONGUE)).toBe(0);
    // La fenetre fait bien la longueur voulue, prise depuis le bas.
    const debut = LONGUE - H * EXIT_SCROLL_VIEWPORTS;
    expect(exitProgress(debut, H, LONGUE)).toBe(0);
    expect(exitProgress(debut + 1, H, LONGUE)).toBeGreaterThan(0);
  });

  it("finit exactement en bas de page, sur les deux longueurs", () => {
    for (const max of [COURTE, LONGUE]) {
      expect(exitProgress(max, H, max), "bas de page sur " + max).toBeCloseTo(1, 12);
      expect(exitProgress(max + 500, H, max)).toBe(1);
    }
  });

  it("sur une page courte, il commence a la fin de l'arc et pas avant", () => {
    // Ici la fenetre nominale mordrait sur l'arc : elle est rognee, jamais
    // avancee. L'arc garde la priorite.
    const court = arcScrollHeight(H) + 100;
    expect(arcProgress(arcScrollHeight(H), H)).toBe(1);
    expect(exitProgress(arcScrollHeight(H), H, court)).toBe(0);
    expect(exitProgress(court, H, court)).toBeCloseTo(1, 12);
  });

  it("monte sans redescendre", () => {
    let prev = -1;
    for (let i = 0; i <= 300; i++) {
      const v = exitProgress((i / 300) * COURTE, H, COURTE);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("se joue en un seul geste de defilement", () => {
    // Moins d'une hauteur d'ecran : le visiteur voit l'acte en entier sans
    // avoir a s'y reprendre. Mais pas le minimum non plus : Sylvain veut
    // qu'il reste un moment ou la scene se voit seule, sans texte.
    expect(EXIT_SCROLL_VIEWPORTS).toBeLessThan(1);
    expect(EXIT_SCROLL_VIEWPORTS).toBeGreaterThan(0.5);
  });

  it("ne casse pas sur des entrees absurdes", () => {
    expect(exitProgress(1000, 0, 2000)).toBe(0);
    expect(exitProgress(Number.NaN, H, COURTE)).toBe(0);
    expect(exitProgress(500, H, Number.NaN)).toBe(0);
    expect(exitProgress(500, H, 0)).toBe(0);
  });
});
