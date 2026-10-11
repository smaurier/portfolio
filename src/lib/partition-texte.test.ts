import { describe, expect, it } from "vitest";
import {
  PARTITION_CENTRE,
  PART_ENTREE,
  PART_SORTIE,
  SILENCES_CENTRE,
  TENUE_MIN,
  etatBloc,
  partitionValide,
  tenueDe,
  type Fenetre,
} from "./partition-texte";

/**
 * LA PARTITION DU TEXTE (11/10/2026, spec 2026-10-10-partition-texte-design).
 * Sylvain, sur l'audit visuel du 10/10 : « un seul panneau a la fois, mais
 * surtout on doit aussi enlever du texte [...] C'est l'image qui prevaut. »
 * Ces oracles remplacent « les chapitres du Centre : assez longtemps pour
 * etre lus » (13/09) : la tenue minimale et « jamais deux ensemble » vivent
 * desormais dans partitionValide ; « au plus 5 % de vide » est abandonne a
 * dessein, c'est l'inverse de la regle du jour (des silences reserves).
 */
describe("partitionValide : la regle d'une partition", () => {
  const base = { a: { debut: 0.1, fin: 0.3 }, cloture: { debut: 0.9, fin: 1 } };
  const sansTenueCloture = { ignorerTenue: ["cloture"] };

  it("accepte la partition du Centre", () => {
    expect(partitionValide(PARTITION_CENTRE, SILENCES_CENTRE, { ignorerTenue: ["hero", "cloture"] })).toEqual([]);
  });

  it("refuse deux fenetres qui se chevauchent", () => {
    const v = partitionValide({ ...base, b: { debut: 0.25, fin: 0.5 } }, [], sansTenueCloture);
    expect(v.some((m) => m.includes("chevauchent"))).toBe(true);
  });

  it("refuse un ecart de 0,01 entre deux fenetres", () => {
    const v = partitionValide({ ...base, b: { debut: 0.31, fin: 0.5 } }, [], sansTenueCloture);
    expect(v.some((m) => m.includes("ecart"))).toBe(true);
  });

  it("refuse une fenetre qui touche un silence", () => {
    const v = partitionValide(base, [{ debut: 0.2, fin: 0.4 }], sansTenueCloture);
    expect(v.some((m) => m.includes("silence"))).toBe(true);
  });

  it("refuse une tenue de 7 %", () => {
    // 0,10 d'arc, moins 15 % d'entree et 15 % de sortie : 7 % de tenue.
    expect(tenueDe({ debut: 0.5, fin: 0.6 })).toBeCloseTo(0.07);
    const v = partitionValide({ ...base, b: { debut: 0.5, fin: 0.6 } }, [], sansTenueCloture);
    expect(v.some((m) => m.startsWith("b : tenue"))).toBe(true);
  });

  it("refuse une cloture suivie d'un autre bloc", () => {
    const v = partitionValide(
      { a: { debut: 0.1, fin: 0.3 }, cloture: { debut: 0.5, fin: 0.7 }, b: { debut: 0.8, fin: 1 } },
      [],
      sansTenueCloture,
    );
    expect(v.some((m) => m.includes("dernier"))).toBe(true);
  });

  it("sur le Centre, chaque tenue vaut au moins 8 % de l'arc, hero et cloture mis a part", () => {
    for (const [nom, f] of Object.entries(PARTITION_CENTRE)) {
      if (nom === "hero" || nom === "cloture") continue;
      expect(tenueDe(f), nom).toBeGreaterThanOrEqual(TENUE_MIN);
    }
  });

  it("le climax 0,75 du Centre est dans un silence", () => {
    expect(SILENCES_CENTRE.some((s) => s.debut <= 0.75 && 0.75 <= s.fin)).toBe(true);
  });
});

describe("etatBloc : la grammaire d'apparition", () => {
  const f: Fenetre = { debut: 0.2, fin: 0.4 };

  it("est a 0 avant et apres la fenetre", () => {
    expect(etatBloc(0, f)).toEqual({ opacite: 0, phase: "avant", avancement: 0 });
    expect(etatBloc(0.19, f).phase).toBe("avant");
    expect(etatBloc(0.4, f)).toEqual({ opacite: 0, phase: "apres", avancement: 1 });
    expect(etatBloc(0.9, f).phase).toBe("apres");
  });

  it("entre sur les premiers 15 % de la fenetre", () => {
    expect(etatBloc(0.2, f)).toEqual({ opacite: 0, phase: "entree", avancement: 0 });
    const mi = etatBloc(0.2 + (0.2 * PART_ENTREE) / 2, f);
    expect(mi.phase).toBe("entree");
    expect(mi.opacite).toBeCloseTo(0.5);
    expect(mi.avancement).toBeCloseTo(0.5);
  });

  it("tient a 1 au milieu", () => {
    const m = etatBloc(0.3, f);
    expect(m.opacite).toBe(1);
    expect(m.phase).toBe("tenue");
    expect(m.avancement).toBeCloseTo(0.5);
  });

  it("sort sur les derniers 15 %, et finit a 0 exactement a la fin", () => {
    const debutSortie = 0.2 + 0.2 * (1 - PART_SORTIE);
    expect(etatBloc(debutSortie, f).phase).toBe("sortie");
    expect(etatBloc(debutSortie, f).opacite).toBeCloseTo(1);
    expect(etatBloc(0.4 - 1e-6, f).opacite).toBeCloseTo(0, 4);
    expect(etatBloc(0.4, f).opacite).toBe(0);
  });

  it("une fenetre qui commence a 0 n'a pas d'entree : le hero est la a l'arrivee", () => {
    expect(etatBloc(0, PARTITION_CENTRE.hero)).toEqual({ opacite: 1, phase: "tenue", avancement: 0 });
  });

  it("une fenetre qui finit a 1 ne sort jamais : la cloture reste posee pendant l'acte de sortie", () => {
    expect(etatBloc(1, PARTITION_CENTRE.cloture)).toEqual({ opacite: 1, phase: "tenue", avancement: 1 });
    expect(etatBloc(2, PARTITION_CENTRE.cloture).opacite).toBe(1);
  });

  it("borne le progres et ne rend jamais NaN", () => {
    expect(etatBloc(-1, f).phase).toBe("avant");
    expect(etatBloc(NaN, f).phase).toBe("avant");
    expect(Number.isNaN(etatBloc(NaN, PARTITION_CENTRE.hero).opacite)).toBe(false);
  });
});

describe("la partition du Centre : un seul bloc a la fois", () => {
  it("a aucun progres deux blocs n'ont une opacite non nulle", () => {
    for (let p = 0; p <= 1; p += 0.001) {
      const visibles = Object.values(PARTITION_CENTRE).filter((f) => etatBloc(p, f).opacite > 0).length;
      expect(visibles, `a p=${p.toFixed(3)}`).toBeLessThanOrEqual(1);
    }
  });

  it("rien n'est visible au climax 0,75", () => {
    expect(Object.values(PARTITION_CENTRE).every((f) => etatBloc(0.75, f).opacite === 0)).toBe(true);
  });
});
