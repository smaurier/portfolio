import { describe, expect, it } from "vitest";
import { isEveningStar, venusElongation, VENUS_VISIBLE_ELONGATION } from "./venus";

/** Reperes 2026 (cf docs/da/ouest-sources.md, EarthSky) : plus grande
 * elongation EST le 15/08/2026 (etoile du soir), plus grand eclat le
 * 18/09, conjonction inferieure fin octobre, etoile du matin en novembre. */
function day(iso: string): Date {
  return new Date(iso + "T02:00:00Z"); // 20 h a Mexico, la veille au soir
}

describe("venusElongation : Venus a l'est (soir, > 0) ou a l'ouest (matin, < 0) du soleil", () => {
  it("le 15/08/2026, elongation est maximale, environ 46 deg", () => {
    const e = venusElongation(day("2026-08-15"));
    expect(e).toBeGreaterThan(43);
    expect(e).toBeLessThan(48);
  });

  it("le maximum de l'ete 2026 tombe a quelques jours du 15/08", () => {
    let best = -Infinity, bestDay = "";
    for (let d = 1; d <= 120; d++) {
      const date = new Date(Date.UTC(2026, 5, d, 2));
      const e = venusElongation(date);
      if (e > best) { best = e; bestDay = date.toISOString().slice(0, 10); }
    }
    const diffDays = Math.abs((Date.parse(bestDay) - Date.parse("2026-08-15")) / 86400000);
    expect(diffDays).toBeLessThanOrEqual(5);
  });

  it("le 18/09/2026 (plus grand eclat), toujours etoile du soir, ~40 deg", () => {
    const e = venusElongation(day("2026-09-18"));
    expect(e).toBeGreaterThan(33);
    expect(e).toBeLessThan(44);
  });

  it("fin octobre 2026, conjonction inferieure : elle passe devant le soleil", () => {
    // Le passage par zero se fait entre le 15/10 et le 05/11.
    expect(venusElongation(day("2026-10-15"))).toBeGreaterThan(0);
    expect(venusElongation(day("2026-11-05"))).toBeLessThan(0);
    expect(Math.abs(venusElongation(day("2026-10-25")))).toBeLessThan(12);
  });

  it("le 15/11/2026, etoile du matin : elongation negative et deja grande", () => {
    const e = venusElongation(day("2026-11-15"));
    expect(e).toBeLessThan(-20);
  });
});

describe("isEveningStar : visible apres le coucher du soleil", () => {
  it("vrai en septembre 2026, faux en novembre 2026", () => {
    expect(isEveningStar(day("2026-09-06"))).toBe(true);
    expect(isEveningStar(day("2026-11-15"))).toBe(false);
  });

  it("faux tout pres de la conjonction, meme du cote du soir", () => {
    expect(VENUS_VISIBLE_ELONGATION).toBeGreaterThan(5);
    expect(isEveningStar(day("2026-10-22"))).toBe(false);
  });
});
