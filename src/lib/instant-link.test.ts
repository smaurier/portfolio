import { describe, expect, it } from "vitest";
import { buildInstantSearch, parseInstant, shouldOfferResume, type LastVisit } from "./instant-link";

describe("le lien de l'instant : encoder / lire le moment de l'arc dans l'URL", () => {
  it("encode le progres a trois decimales et l'etat scene seule", () => {
    expect(buildInstantSearch({ t: 0.61234, sceneOnly: true })).toBe("?t=0.612&scene=1");
    expect(buildInstantSearch({ t: 0, sceneOnly: false })).toBe("?t=0");
  });

  it("borne le progres dans [0, 1]", () => {
    expect(buildInstantSearch({ t: -1, sceneOnly: false })).toBe("?t=0");
    expect(buildInstantSearch({ t: 3, sceneOnly: false })).toBe("?t=1");
  });

  it("lit l'URL, tolere l'absence et les valeurs cassees", () => {
    expect(parseInstant("?t=0.5&scene=1")).toEqual({ t: 0.5, sceneOnly: true });
    expect(parseInstant("?t=0.5")).toEqual({ t: 0.5, sceneOnly: false });
    expect(parseInstant("?scene=1")).toEqual({ t: null, sceneOnly: true });
    expect(parseInstant("")).toEqual({ t: null, sceneOnly: false });
    expect(parseInstant("?t=abc")).toEqual({ t: null, sceneOnly: false });
    expect(parseInstant("?t=9")).toEqual({ t: 1, sceneOnly: false });
    expect(parseInstant("?xiuhcoatl=1&t=0.25")).toEqual({ t: 0.25, sceneOnly: false });
  });
});

describe("reprendre ou j'etais", () => {
  const visit: LastVisit = { path: "/fr/projets", t: 0.42, at: 1000 };

  it("propose de reprendre sur l'accueil, si la derniere visite etait ailleurs et deja engagee", () => {
    expect(shouldOfferResume(visit, "/fr", 2000)).toBe(true);
  });

  it("ne propose rien sur la page de la visite elle-meme, ni si l'arc n'avait pas commence", () => {
    expect(shouldOfferResume(visit, "/fr/projets", 2000)).toBe(false);
    expect(shouldOfferResume({ ...visit, t: 0.02 }, "/fr", 2000)).toBe(false);
  });

  it("ne propose rien sans visite, ni au-dela de 30 jours", () => {
    expect(shouldOfferResume(null, "/fr", 2000)).toBe(false);
    expect(shouldOfferResume(visit, "/fr", 1000 + 31 * 24 * 3600 * 1000)).toBe(false);
  });
});
