import { describe, expect, it } from "vitest";
import { acquerir, verdict, type Ligne } from "./cliquet";

/**
 * LE CLIQUET DE LA BARRE : une ENVELOPPE par compte (images au-dela du
 * budget, images perdues), jamais une duree.
 *
 * Le 03/10, un cliquet « rouge = pire que le meilleur connu » a rougi quatre
 * fois sur quatre sur le voile sans qu'une ligne de code ait bouge (au-dela
 * 6/8/10/9, perdues 18/25/28/20, meilleur retenu 6/18) : sur un compte
 * bruite, la barre ne peut que descendre a chaque passe chanceuse. Puis un
 * plafond au MAX observe de 3 jugements (6-8 / 19-21) a ete depasse par 4
 * des 9 jugements de la soiree (au-dela 5 a 10, perdues 17 a 28) : un max
 * de K echantillons est depasse par le suivant une fois sur K+1, par
 * construction. Donc la ligne tient le MIN et le MAX observes, et le
 * plafond juge = max + (max - min) : la marge est l'ecart MESURE, pas un
 * nombre choisi. Rouge = pire que le plafond ; progres a acquerir = mieux
 * que le min ; la cible est ecrite a cote et ne bouge pas.
 */
const ligne: Ligne = {
  meilleur: { auDela: 6, perdues: 19 },
  maximum: { auDela: 8, perdues: 21 },
  plafond: { auDela: 10, perdues: 23 },
  cible: { auDela: 0, perdues: 0 },
  pire: 34.3,
  date: "2026-10-03",
};

describe("le verdict", () => {
  it("sans ligne de base, rien n'est rouge et tout est a acquerir", () => {
    const v = verdict({ auDela: 9, perdues: 20 }, undefined);
    expect(v.rouge).toBe(false);
    expect(v.progres).toBe(true);
    expect(v.message).toMatch(/aucune ligne de base/);
  });
  it("tenu : dans l'enveloppe, et aussi entre le maximum observe et le plafond (la marge)", () => {
    expect(verdict({ auDela: 7, perdues: 20 }, ligne)).toMatchObject({ rouge: false, progres: false });
    expect(verdict({ auDela: 9, perdues: 22 }, ligne)).toMatchObject({ rouge: false, progres: false });
    expect(verdict({ auDela: 10, perdues: 23 }, ligne)).toMatchObject({ rouge: false, progres: false });
    expect(verdict({ auDela: 7, perdues: 20 }, ligne).message).toMatch(/^tenu/);
  });
  it("rouge des qu'un compte depasse son plafond, meme si l'autre est meilleur", () => {
    expect(verdict({ auDela: 11, perdues: 0 }, ligne).rouge).toBe(true);
    expect(verdict({ auDela: 0, perdues: 24 }, ligne).rouge).toBe(true);
    expect(verdict({ auDela: 11, perdues: 0 }, ligne).message).toMatch(/^RECUL/);
  });
  it("progres a acquerir quand un compte passe sous le meilleur connu et l'autre reste sous le plafond", () => {
    const v = verdict({ auDela: 5, perdues: 22 }, ligne);
    expect(v).toMatchObject({ rouge: false, progres: true });
    expect(v.message).toMatch(/perf:baseline/);
  });
  it("le message dit le meilleur, le maximum, le plafond et la cible de chaque compte", () => {
    expect(verdict({ auDela: 9, perdues: 20 }, ligne).message).toMatch(/au-dela 9 \(meilleur connu 6, maximum connu 8, plafond 10, cible 0\)/);
  });
});

describe("l'acquisition", () => {
  it("sans ligne, la mesure devient meilleur, maximum et plafond (ecart nul), la cible est celle donnee", () => {
    expect(acquerir(undefined, { auDela: 6, perdues: 19, pire: 34.3 }, { auDela: 0, perdues: 0 }, "2026-10-03")).toEqual({
      ...ligne,
      maximum: { auDela: 6, perdues: 19 },
      plafond: { auDela: 6, perdues: 19 },
    });
  });
  it("en mode progres, le meilleur descend ; maximum et plafond ne bougent pas : un recul ne s'inscrit pas, une passe chanceuse n'elargit pas la porte", () => {
    expect(acquerir(ligne, { auDela: 4, perdues: 30, pire: 40 }, { auDela: 0, perdues: 0 }, "2026-10-04", "progres")).toEqual({
      meilleur: { auDela: 4, perdues: 19 },
      maximum: { auDela: 8, perdues: 21 },
      plafond: { auDela: 10, perdues: 23 },
      cible: { auDela: 0, perdues: 0 },
      pire: 34.3,
      date: "2026-10-04",
    });
  });
  it("en mode enveloppe, le meilleur descend, le maximum monte, et le plafond = maximum + (maximum - meilleur)", () => {
    expect(acquerir(ligne, { auDela: 4, perdues: 30, pire: 40 }, { auDela: 0, perdues: 0 }, "2026-10-04", "enveloppe")).toEqual({
      meilleur: { auDela: 4, perdues: 19 },
      maximum: { auDela: 8, perdues: 30 },
      plafond: { auDela: 12, perdues: 41 },
      cible: { auDela: 0, perdues: 0 },
      pire: 34.3,
      date: "2026-10-04",
    });
  });
  it("le mode par defaut est progres", () => {
    expect(acquerir(ligne, { auDela: 12, perdues: 30, pire: 40 }, { auDela: 0, perdues: 0 }, "2026-10-04").plafond).toEqual({ auDela: 10, perdues: 23 });
  });
  it("la cible vient du code a chaque acquisition, la pire duree reste au mieux des deux", () => {
    // Deux sources de verite ou le code perdrait serait dans le mauvais sens (relecture du 22/09).
    const l = acquerir(ligne, { auDela: 6, perdues: 19, pire: 900 }, { auDela: 5, perdues: 5 }, "2026-10-04");
    expect(l.cible).toEqual({ auDela: 5, perdues: 5 });
    expect(l.pire).toBe(34.3);
  });
});
