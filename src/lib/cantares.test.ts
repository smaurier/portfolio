import { describe, expect, it } from "vitest";
import { CANTARES, CANTARES_EDITION_URL, cantarFor } from "./cantares";

const DIRECTIONS = ["jade", "dore", "turquoise", "cendre", "obsidienne"] as const;

describe("les cantares (M4, 11/09)", () => {
  it("un chant par direction, avec ses trois couches et sa reference", () => {
    for (const dir of DIRECTIONS) {
      const c = cantarFor(dir);
      expect(c.nahuatl.length, `${dir} : nahuatl`).toBeGreaterThan(0);
      expect(c.es.length, `${dir} : espagnol`).toBeGreaterThan(0);
      expect(c.fr.length, `${dir} : francais`).toBeGreaterThan(0);
      expect(c.en.length, `${dir} : anglais`).toBeGreaterThan(0);
      expect(c.chant, `${dir} : chant`).toMatch(/^[IVXLC]+$/);
      expect(c.folio, `${dir} : folio`).toMatch(/^\d+[rv](-\d+[rv])?$/);
      expect(c.strophe).toBeGreaterThan(0);
    }
    expect(CANTARES_EDITION_URL).toMatch(/^https:\/\/historicas\.unam\.mx\//);
  });

  it("une strophe par page, jamais plus de huit vers : la courte citation", () => {
    for (const dir of DIRECTIONS) {
      const c = cantarFor(dir);
      expect(c.es.length, `${dir}`).toBeLessThanOrEqual(8);
      expect(c.nahuatl.length, `${dir}`).toBeLessThanOrEqual(8);
    }
  });

  it("aucun tiret cadratin, aucun dieu nomme comme present", () => {
    for (const dir of DIRECTIONS) {
      const c = cantarFor(dir);
      const tout = [...c.nahuatl, ...c.es, ...c.fr, ...c.en].join(" ");
      expect(tout, `${dir} : tiret cadratin`).not.toContain("—");
      // Les noms que l'edition traduit par Dios, Dador de la vida, Dueno del
      // cerca y del junto : aucune strophe retenue ne les porte.
      expect(tout, `${dir}`).not.toMatch(/\bDios\b|Dador de la vida|Dueño del cerca|Tloque|Ipalnemohua/i);
    }
  });

  it("les traductions gardent le nombre de vers de l'espagnol, a un pres", () => {
    // Notre FR et notre EN suivent l'espagnol vers a vers ; un ecart d'un
    // vers est tolere (l'edition coupe parfois un vers long en deux).
    for (const dir of DIRECTIONS) {
      const c = cantarFor(dir);
      expect(Math.abs(c.fr.length - c.es.length), `${dir} : fr`).toBeLessThanOrEqual(1);
      expect(Math.abs(c.en.length - c.es.length), `${dir} : en`).toBeLessThanOrEqual(1);
    }
  });
});
