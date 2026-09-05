import { describe, expect, it } from "vitest";
import { arcForElevation, mexicoClock, solarElevation, TENOCHTITLAN, tenochtitlanNow } from "./solar";
import { sunDirection } from "./direction-light";

/** Midi solaire vrai a Mexico (lon -99.13) : ~12 h 37 heure locale UTC-6,
 * plus ou moins l'equation du temps ; on prend 18:40 UTC. */
const NOON_UTC = "T18:40:00Z";

describe("solarElevation (NOAA simplifie) a Tenochtitlan, latitude 19.43 N", () => {
  it("equinoxe de mars, midi : elevation ~ 90 - 19.4 = 70.6 deg", () => {
    const e = solarElevation(new Date("2026-03-20" + NOON_UTC), TENOCHTITLAN.lat, TENOCHTITLAN.lon);
    expect(Math.abs(e - 70.6)).toBeLessThan(1.5);
  });

  it("solstice de juin, midi : le soleil passe au nord du zenith, ~86 deg", () => {
    const e = solarElevation(new Date("2026-06-21" + NOON_UTC), TENOCHTITLAN.lat, TENOCHTITLAN.lon);
    expect(Math.abs(e - 86)).toBeLessThan(1.5);
  });

  it("solstice de decembre, midi : ~47 deg", () => {
    const e = solarElevation(new Date("2026-12-21" + NOON_UTC), TENOCHTITLAN.lat, TENOCHTITLAN.lon);
    expect(Math.abs(e - 47.1)).toBeLessThan(1.5);
  });

  it("minuit local : bien sous l'horizon", () => {
    const e = solarElevation(new Date("2026-03-20T06:40:00Z"), TENOCHTITLAN.lat, TENOCHTITLAN.lon);
    expect(e).toBeLessThan(-50);
  });

  it("le matin le soleil monte, l'apres-midi il descend", () => {
    const a = solarElevation(new Date("2026-03-20T14:00:00Z"), TENOCHTITLAN.lat, TENOCHTITLAN.lon);
    const b = solarElevation(new Date("2026-03-20T16:00:00Z"), TENOCHTITLAN.lat, TENOCHTITLAN.lon);
    const c = solarElevation(new Date("2026-03-20T22:00:00Z"), TENOCHTITLAN.lat, TENOCHTITLAN.lon);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeLessThan(b);
  });
});

describe("mexicoClock : l'heure de Mexico, UTC-6 sans changement d'heure", () => {
  it("18:40 UTC = 12:40 a Mexico, toute l'annee", () => {
    expect(mexicoClock(new Date("2026-03-20T18:40:00Z"))).toEqual({ hours: 12, minutes: 40 });
    expect(mexicoClock(new Date("2026-07-20T18:40:00Z"))).toEqual({ hours: 12, minutes: 40 });
    expect(mexicoClock(new Date("2026-07-20T03:05:00Z"))).toEqual({ hours: 21, minutes: 5 });
  });
});

describe("arcForElevation : l'elevation reelle ramenee au progres de notre arc", () => {
  it("retrouve la meme hauteur de soleil que sunDirection", () => {
    for (const e of [0, 10, 30, 55, 80, 86]) {
      const t = arcForElevation(e);
      expect(Math.abs(Math.asin(sunDirection(t).y) * (180 / Math.PI) - e)).toBeLessThan(0.5);
    }
  });

  it("nuit : 0 ; au-dela du zenith de la scene : 1", () => {
    expect(arcForElevation(-30)).toBe(0);
    expect(arcForElevation(-8)).toBe(0);
    expect(arcForElevation(89)).toBe(1);
  });
});

describe("tenochtitlanNow : tout ce que la contemplation a besoin de savoir", () => {
  it("un apres-midi de mars : jour, apres-midi, heure locale", () => {
    const n = tenochtitlanNow(new Date("2026-03-20T22:00:00Z"));
    expect(n.clock).toEqual({ hours: 16, minutes: 0 });
    expect(n.afternoon).toBe(true);
    expect(n.elevation).toBeGreaterThan(20);
    expect(n.arc).toBeGreaterThan(0.3);
  });

  it("une nuit : arc a 0, pas d'apres-midi", () => {
    const n = tenochtitlanNow(new Date("2026-03-20T07:00:00Z"));
    expect(n.arc).toBe(0);
    expect(n.afternoon).toBe(false);
  });
});
