import { describe, expect, it } from "vitest";
import { approachAngle, capDepuisEvenement, etatBoussole, rotationRose, type LectureOrientation } from "./boussole";

describe("la boussole vraie : le cap du telephone", () => {
  it("iOS : le cap de la boussole est pris tel quel (degres horaires depuis le nord)", () => {
    expect(capDepuisEvenement({ webkitCompassHeading: 90 })).toBe(90);
    expect(capDepuisEvenement({ webkitCompassHeading: 359.5, alpha: 10, absolute: true })).toBe(359.5);
  });

  it("orientation absolue : alpha est la rotation anti-horaire autour de la verticale, le cap en est le complement", () => {
    // Telephone a plat, haut vers le nord : alpha 0 -> cap 0.
    expect(capDepuisEvenement({ alpha: 0, absolute: true })).toBe(0);
    // Tourne de 90 deg anti-horaire (alpha 90) : le haut pointe l'ouest -> cap 270.
    expect(capDepuisEvenement({ alpha: 90, absolute: true })).toBe(270);
    expect(capDepuisEvenement({ alpha: 270, absolute: true })).toBe(90);
    // L'inclinaison ne change pas le cap du haut du telephone tant qu'il
    // n'est pas retourne (rotation ZXY : le haut projete garde son azimut).
    expect(capDepuisEvenement({ alpha: 90, beta: 45, gamma: 10, absolute: true })).toBe(270);
  });

  it("sans reference absolue ni cap iOS, pas de cap", () => {
    expect(capDepuisEvenement({ alpha: 90, absolute: false })).toBeNull();
    expect(capDepuisEvenement({ alpha: null, absolute: true })).toBeNull();
    expect(capDepuisEvenement({})).toBeNull();
  });

  it("la rose tourne a l'inverse du cap pour que son nord pointe le vrai nord", () => {
    expect(rotationRose(0)).toBe(0);
    expect(rotationRose(90)).toBe(-90);
    // Toujours le plus court chemin, dans ]-180, 180].
    expect(rotationRose(270)).toBe(90);
    expect(rotationRose(180)).toBe(180);
  });

  it("le lissage suit le plus court arc et converge (snap sous epsilon)", () => {
    // De 350 vers 10 : par 0, pas par 180.
    const pas = approachAngle(350, 10, 0.5);
    expect(pas).toBeCloseTo(0);
    let a = 350;
    for (let i = 0; i < 100; i++) a = approachAngle(a, 10, 0.15);
    expect(a).toBe(10);
    expect(approachAngle(10, 10, 0.15)).toBe(10);
  });

  it("l'etat : absente sans capteur, incertaine si la precision iOS est mauvaise, vive sinon", () => {
    expect(etatBoussole(null)).toBe("absente");
    expect(etatBoussole({ cap: 30, precision: 40 })).toBe("incertaine");
    expect(etatBoussole({ cap: 30, precision: -1 })).toBe("incertaine");
    expect(etatBoussole({ cap: 30, precision: 10 })).toBe("vive");
    // Android ne donne pas de precision : on la tient pour vive.
    expect(etatBoussole({ cap: 30 })).toBe("vive");
  });
});

// Le type est exporte pour les hooks : on verifie juste qu'il accepte les
// champs optionnels du monde reel.
const _l: LectureOrientation = { alpha: null, beta: null, gamma: null, absolute: false };
void _l;
