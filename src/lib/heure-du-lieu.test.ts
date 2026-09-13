import { describe, expect, it } from "vitest";
import { apresMidiDuLieu, apresMidiIci, longitudeDepuisFuseau } from "./heure-du-lieu";

describe("l'heure du lieu : de quel cote du midi est le visiteur", () => {
  it("le fuseau donne une longitude approchee, quinze degres par heure", () => {
    expect(longitudeDepuisFuseau(0)).toBe(0); // Greenwich
    expect(longitudeDepuisFuseau(-60)).toBe(15); // UTC+1, Paris en hiver
    expect(longitudeDepuisFuseau(-120)).toBe(30); // UTC+2, Paris en ete
    expect(longitudeDepuisFuseau(360)).toBe(-90); // UTC-6, Mexico
  });

  it("a Greenwich, le matin est le matin et l'apres-midi l'apres-midi", () => {
    expect(apresMidiDuLieu(new Date("2026-09-13T09:00:00Z"), 0)).toBe(false);
    expect(apresMidiDuLieu(new Date("2026-09-13T15:00:00Z"), 0)).toBe(true);
  });

  it("a Mexico (UTC-6), la meme heure UTC ne dit pas la meme chose", () => {
    // 15 h UTC = 9 h a Mexico : le matin la-bas, l'apres-midi a Londres.
    expect(apresMidiDuLieu(new Date("2026-09-13T15:00:00Z"), 360)).toBe(false);
    expect(apresMidiDuLieu(new Date("2026-09-13T21:00:00Z"), 360)).toBe(true);
  });

  it("la longitude tiree du fuseau revient a lire l'horloge du visiteur", () => {
    // A Paris en ete (UTC+2), 09 h 59 UTC = 11 h 59 locales : avant midi.
    expect(apresMidiDuLieu(new Date("2026-07-01T09:59:00Z"), -120)).toBe(false);
    // 10 h 01 UTC = 12 h 01 locales : apres. Le vrai midi solaire parisien
    // tombe plus tard (le fuseau est large) : c'est l'approximation dite
    // dans la lib, et elle ne se trompe qu'autour de midi.
    expect(apresMidiDuLieu(new Date("2026-07-01T10:01:00Z"), -120)).toBe(true);
  });

  it("la nuit compte comme apres-midi ou matin selon le cote du meridien", () => {
    // 23 h a Greenwich : on est apres le midi solaire du jour.
    expect(apresMidiDuLieu(new Date("2026-09-13T23:00:00Z"), 0)).toBe(true);
    // 2 h du matin : on est avant le midi solaire du jour qui commence.
    expect(apresMidiDuLieu(new Date("2026-09-13T02:00:00Z"), 0)).toBe(false);
  });

  it("la version qui lit l'horloge de la machine rend un booleen", () => {
    expect(typeof apresMidiIci()).toBe("boolean");
  });
});
