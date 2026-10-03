import { describe, expect, it } from "vitest";
import { acquerir, verdict, type Ligne } from "./cliquet";

/**
 * LE CLIQUET DE LA BARRE : rouge = pire que le meilleur connu, sur un
 * COMPTE (images au-dela du budget, images perdues), jamais sur une duree.
 * Un progres s'acquiert (`pnpm run perf:baseline`) ; la cible est ecrite a
 * cote et ne bouge pas ; une acquisition ne recule jamais.
 */
const ligne: Ligne = { meilleur: { auDela: 9, perdues: 20 }, cible: { auDela: 0, perdues: 0 }, pire: 767, date: "2026-09-22" };

describe("le verdict", () => {
  it("sans ligne de base, rien n'est rouge et tout est a acquerir", () => {
    const v = verdict({ auDela: 9, perdues: 20 }, undefined);
    expect(v.rouge).toBe(false);
    expect(v.progres).toBe(true);
    expect(v.message).toMatch(/aucune ligne de base/);
  });
  it("tenu : ni pire ni mieux", () => {
    const v = verdict({ auDela: 9, perdues: 20 }, ligne);
    expect(v).toMatchObject({ rouge: false, progres: false });
    expect(v.message).toMatch(/^tenu/);
  });
  it("rouge des qu'un compte est pire, meme si l'autre est meilleur", () => {
    expect(verdict({ auDela: 10, perdues: 0 }, ligne).rouge).toBe(true);
    expect(verdict({ auDela: 0, perdues: 21 }, ligne).rouge).toBe(true);
    expect(verdict({ auDela: 10, perdues: 0 }, ligne).message).toMatch(/^RECUL/);
  });
  it("progres a acquerir quand un compte est meilleur et l'autre tenu", () => {
    const v = verdict({ auDela: 3, perdues: 20 }, ligne);
    expect(v).toMatchObject({ rouge: false, progres: true });
    expect(v.message).toMatch(/perf:baseline/);
  });
});

describe("l'acquisition", () => {
  it("sans ligne, la mesure devient le meilleur connu, la cible est celle donnee", () => {
    expect(acquerir(undefined, { auDela: 9, perdues: 20, pire: 767 }, { auDela: 0, perdues: 0 }, "2026-09-22")).toEqual(ligne);
  });
  it("avec une ligne, chaque compte au mieux des deux, la pire au mieux des deux, la cible du code, la date de la mesure", () => {
    // La cible vient du code a chaque acquisition : deux sources de verite
    // ou le code perdrait serait dans le mauvais sens (relecture du 22/09).
    expect(acquerir(ligne, { auDela: 3, perdues: 25, pire: 300 }, { auDela: 5, perdues: 5 }, "2026-09-23")).toEqual({
      meilleur: { auDela: 3, perdues: 20 },
      cible: { auDela: 5, perdues: 5 },
      pire: 300,
      date: "2026-09-23",
    });
    expect(acquerir(ligne, { auDela: 3, perdues: 20, pire: 900 }, { auDela: 0, perdues: 0 }, "2026-09-23").pire).toBe(767);
  });
});
