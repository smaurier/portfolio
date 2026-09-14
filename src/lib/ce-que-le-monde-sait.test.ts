import { describe, expect, it } from "vitest";
import { ceQueLeMondeSait, type EtatDuMonde } from "./ce-que-le-monde-sait";

const BASE: EtatDuMonde = {
  maintenant: new Date("2026-09-14T20:00:00Z"),
  fuseauMinutes: -120,
  premiereVisite: null,
  foyerDejaAllume: false,
  locale: "fr",
};

describe("ce que le monde sait", () => {
  it("le foyer ne se dit que s'il etait DEJA allume a l'arrivee", () => {
    expect(ceQueLeMondeSait(BASE).map((f) => f.cle)).not.toContain("foyer");
    expect(ceQueLeMondeSait({ ...BASE, foyerDejaAllume: true }).map((f) => f.cle)).toContain("foyer");
  });

  it("dit toujours l'annee, et de quel cote du midi on est", () => {
    const faits = ceQueLeMondeSait(BASE);
    const cles = faits.map((f) => f.cle);
    expect(cles).toContain("annee");
    expect(cles.filter((c) => c === "apresMidi" || c === "matin")).toHaveLength(1);
    expect(faits.find((f) => f.cle === "annee")?.valeurs?.annee).toMatch(/\d/);
  });

  it("le cote du midi suit le fuseau du visiteur", () => {
    const matin = ceQueLeMondeSait({ ...BASE, maintenant: new Date("2026-09-14T08:00:00Z"), fuseauMinutes: 0 });
    const apres = ceQueLeMondeSait({ ...BASE, maintenant: new Date("2026-09-14T16:00:00Z"), fuseauMinutes: 0 });
    expect(matin.map((f) => f.cle)).toContain("matin");
    expect(apres.map((f) => f.cle)).toContain("apresMidi");
  });

  it("le jour du visiteur n'apparait que si on connait sa premiere venue", () => {
    expect(ceQueLeMondeSait(BASE).map((f) => f.cle)).not.toContain("jour");
    const avec = ceQueLeMondeSait({ ...BASE, premiereVisite: Date.UTC(2026, 8, 1) });
    const jour = avec.find((f) => f.cle === "jour");
    expect(jour?.valeurs?.jour).toMatch(/^\d+ [A-Z]/);
    expect(jour?.valeurs?.glose).toBeTruthy();
  });

  it("Venus ne parle que d'une voix : jamais du soir ET du matin", () => {
    for (let j = 0; j < 400; j += 7) {
      const d = new Date(Date.UTC(2026, 0, 1 + j));
      const cles = ceQueLeMondeSait({ ...BASE, maintenant: d }).map((f) => f.cle);
      expect(cles.filter((c) => c === "venusSoir" || c === "venusMatin").length).toBeLessThanOrEqual(1);
    }
  });

  it("c'est une confidence, pas une fiche : jamais plus de cinq lignes", () => {
    const tout = ceQueLeMondeSait({
      ...BASE,
      premiereVisite: Date.UTC(2026, 8, 1),
      foyerDejaAllume: true,
    });
    expect(tout.length).toBeLessThanOrEqual(5);
    expect(tout.length).toBeGreaterThanOrEqual(3);
  });
});
