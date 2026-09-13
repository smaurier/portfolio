import { describe, expect, it } from "vitest";
import {
  ANCRE,
  INDEX_MAZATL,
  LONGUEUR_CYCLE,
  SIGNES,
  estJourDuCerf,
  jourDe,
  jourDeDate,
  nomCourt,
} from "./tonalpohualli";

describe("le tonalpohualli : le compte des destins", () => {
  it("vingt signes, dans l'ordre de Sahagun, le cerf en septieme", () => {
    expect(SIGNES).toHaveLength(20);
    expect(SIGNES[0].nahuatl).toBe("Cipactli");
    expect(SIGNES[19].nahuatl).toBe("Xochitl");
    expect(INDEX_MAZATL).toBe(6);
    expect(SIGNES[INDEX_MAZATL].nahuatl).toBe("Mazatl");
    expect(SIGNES[INDEX_MAZATL].fr).toBe("le cerf");
  });

  it("l'ancre de Caso : la chute de Tenochtitlan est 1 Coatl", () => {
    const j = jourDeDate(ANCRE.annee, ANCRE.mois, ANCRE.jour);
    expect(nomCourt(j)).toBe("1 Coatl");
    expect(j.nombre).toBe(1);
    expect(j.signe.nahuatl).toBe("Coatl");
  });

  it("le lendemain avance d'un nombre ET d'un signe", () => {
    const veille = jourDeDate(2026, 9, 13);
    const lendemain = jourDeDate(2026, 9, 14);
    expect(lendemain.nombre).toBe((veille.nombre % 13) + 1);
    expect(lendemain.index).toBe((veille.index + 1) % 20);
  });

  it("la trecena : 1 Cipactli ouvre, 13 Acatl ferme, 1 Ocelotl ouvre la suivante", () => {
    // On cherche un 1 Cipactli, puis on deroule treize jours.
    let base = new Date(Date.UTC(2026, 0, 1));
    for (let i = 0; i < LONGUEUR_CYCLE; i++) {
      const j = jourDe(base);
      if (j.nombre === 1 && j.signe.nahuatl === "Cipactli") break;
      base = new Date(base.getTime() + 86_400_000);
    }
    expect(nomCourt(jourDe(base))).toBe("1 Cipactli");
    const douzeApres = new Date(base.getTime() + 12 * 86_400_000);
    expect(nomCourt(jourDe(douzeApres))).toBe("13 Acatl");
    const treizeApres = new Date(base.getTime() + 13 * 86_400_000);
    expect(nomCourt(jourDe(treizeApres))).toBe("1 Ocelotl");
  });

  it("le couple nombre + signe ne revient qu'au bout de 260 jours", () => {
    const debut = new Date(Date.UTC(2026, 5, 10));
    const j = jourDe(debut);
    const vus = new Set<string>();
    for (let i = 0; i < LONGUEUR_CYCLE; i++) {
      vus.add(nomCourt(jourDe(new Date(debut.getTime() + i * 86_400_000))));
    }
    expect(vus.size).toBe(LONGUEUR_CYCLE);
    const unCycle = new Date(debut.getTime() + LONGUEUR_CYCLE * 86_400_000);
    expect(nomCourt(jourDe(unCycle))).toBe(nomCourt(j));
    // Et 259 jours plus tard, non.
    const presque = new Date(debut.getTime() + (LONGUEUR_CYCLE - 1) * 86_400_000);
    expect(nomCourt(jourDe(presque))).not.toBe(nomCourt(j));
  });

  it("la position dans le cycle est cohérente avec le couple", () => {
    const debut = new Date(Date.UTC(2026, 2, 3));
    for (let i = 0; i < 40; i++) {
      const d = new Date(debut.getTime() + i * 86_400_000);
      const j = jourDe(d);
      expect(j.position % 13).toBe((j.nombre - 1) % 13);
      expect(j.position % 20).toBe(j.index);
    }
  });

  it("avant l'ancre aussi : le compte remonte sans se casser", () => {
    const avant = jourDeDate(1519, 11, 8); // l'entree de Cortes dans la ville
    expect(avant.nombre).toBeGreaterThanOrEqual(1);
    expect(avant.nombre).toBeLessThanOrEqual(13);
    expect(avant.index).toBeGreaterThanOrEqual(0);
    expect(avant.index).toBeLessThan(20);
  });

  it("le jour du cerf se reconnait", () => {
    const cerf = SIGNES.findIndex((s) => s.nahuatl === "Mazatl");
    let d = new Date(Date.UTC(2026, 0, 1));
    while (jourDe(d).index !== cerf) d = new Date(d.getTime() + 86_400_000);
    expect(estJourDuCerf(jourDe(d))).toBe(true);
    expect(estJourDuCerf(jourDe(new Date(d.getTime() + 86_400_000)))).toBe(false);
  });
});
