import { describe, expect, it } from "vitest";
import {
  presencePorteuses,
  reculPorteuses,
  relaxations,
  CIHUATETEO,
  HAIR_STRANDS,
  LANDING,
  bearerHair,
  bearerOpacity,
  bearerPose,
  landingState,
  litterPose,
  wispRate,
} from "./cihuateteo";
import { getOrbitCameraPosition } from "./camera-path";

const sun = { x: 0.6, y: 0.25, z: 0.76 }; // soleil bas, a l'ouest du decor (+x)
const len = Math.hypot(sun.x, sun.y, sun.z);
const sunN = { x: sun.x / len, y: sun.y / len, z: sun.z / len };
const c = CIHUATETEO;

/** Azimut d'un point par rapport au regard de la camera (degres). */
function relativeAzimuth(p: { x: number; z: number }, progress: number): number {
  const cam = getOrbitCameraPosition(progress);
  const gaze = Math.atan2(-cam.x, -cam.z);
  const d = Math.atan2(p.x, p.z) - gaze;
  return (Math.atan2(Math.sin(d), Math.cos(d)) * 180) / Math.PI;
}

describe("relaxations : moins de relachements au loin (11/09)", () => {
  it("de pres, la valeur de base", () => {
    expect(relaxations(4, 3)).toBe(4);
    expect(relaxations(3, 7)).toBe(3);
  });
  it("de loin, la moitie, jamais moins de deux", () => {
    expect(relaxations(4, 8)).toBe(2);
    expect(relaxations(3, 8)).toBe(2);
    expect(relaxations(5, 8)).toBe(3);
  });
});

describe("bearerPose : les porteuses descendent avec le soleil puis attendent au carrefour", () => {
  it("avant le coucher, elles flottent du cote du soleil, en eventail", () => {
    for (let i = 0; i < c.count; i++) {
      const p = bearerPose(i, c.count, 0, sunN, 0);
      const d = Math.hypot(p.x, p.y, p.z);
      const dot = (p.x * sunN.x + p.y * sunN.y + p.z * sunN.z) / d;
      expect(dot).toBeGreaterThan(0.9);
      expect(d).toBeGreaterThan(c.escortRadius * 0.8);
      expect(p.y).toBeGreaterThan(1);
    }
    const a = bearerPose(0, c.count, 0, sunN, 0);
    const b = bearerPose(c.count - 1, c.count, 0, sunN, 0);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(c.escortSpread * (c.count - 1) * 0.9);
  });

  it("le soleil entre dans la terre : elles se posent en arc, face au cerf, TOUTES dans le champ de fin de page", () => {
    const seen = new Set<string>();
    for (let i = 0; i < c.count; i++) {
      const p = bearerPose(i, c.count, 1, sunN, 0);
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(c.crossroadsRadius, 6);
      // Posees (13/09) : au sol, un bob discret.
      expect(p.y).toBeGreaterThan(c.landHeight - c.bobAmplitude * 0.34 - 1e-9);
      expect(p.y).toBeLessThan(c.landHeight + c.bobAmplitude * 0.34 + 1e-9);
      const toCentre = Math.atan2(-p.x, -p.z);
      const d = Math.atan2(Math.sin(p.yaw - toCentre), Math.cos(p.yaw - toCentre));
      expect(Math.abs(d)).toBeLessThan(1e-6);
      expect(Math.abs(relativeAzimuth(p, 1))).toBeLessThan(36);
      seen.add(`${p.x.toFixed(2)},${p.z.toFixed(2)}`);
    }
    expect(seen.size).toBe(c.count);
  });

  it("entre les deux, une descente continue, sans saut", () => {
    let prev = bearerPose(1, c.count, 0, sunN, 0);
    for (let dusk = 0.02; dusk <= 1; dusk += 0.02) {
      const p = bearerPose(1, c.count, dusk, sunN, 0);
      expect(Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)).toBeLessThan(1.4);
      prev = p;
    }
  });

  it("elles respirent : un lent flottement vertical, jamais un saut", () => {
    const a = bearerPose(0, c.count, 1, sunN, 0).y;
    const b = bearerPose(0, c.count, 1, sunN, 1 / (4 * c.bobHz)).y;
    expect(Math.abs(a - b)).toBeGreaterThan(0.02);
    expect(Math.abs(a - b)).toBeLessThanOrEqual(c.bobAmplitude + 1e-9);
  });
});

describe("litterPose : la litiere de plumes de quetzal", () => {
  it("portee au milieu d'elles avec le soleil dessus, puis posee au sol, eteinte", () => {
    const carried = litterPose(c.count, 0, sunN, 0);
    const bearers = Array.from({ length: c.count }, (_, i) => bearerPose(i, c.count, 0, sunN, 0));
    const cx = bearers.reduce((s, p) => s + p.x, 0) / c.count;
    expect(carried.x).toBeCloseTo(cx, 9);
    expect(carried.y).toBeGreaterThan(bearers[0].y);
    expect(carried.sunGlow).toBeGreaterThan(0.5);
    const set = litterPose(c.count, 1, sunN, 0);
    expect(set.y).toBeLessThan(0.2);
    expect(set.sunGlow).toBe(0);
  });
});

describe("bearerOpacity et wispRate : a peine la, puis presentes dans la nuit", () => {
  it("faibles quand elles portent le soleil, franches au carrefour", () => {
    expect(bearerOpacity(0)).toBeCloseTo(c.opacityEscort, 9);
    expect(bearerOpacity(1)).toBeCloseTo(c.opacityCrossroads, 9);
    expect(bearerOpacity(0.5)).toBeGreaterThan(bearerOpacity(0));
  });

  it("les papillons s'echappent d'elles davantage a la nuit", () => {
    expect(wispRate(0)).toBeGreaterThan(0);
    expect(wispRate(1)).toBeGreaterThan(wispRate(0));
  });
});

describe("bearerHair : chacune sa chevelure, massive", () => {
  it("deux graines donnent deux chevelures differentes, chaque meche unique", () => {
    const a = bearerHair(0);
    const b = bearerHair(1);
    expect(a.length).toBe(HAIR_STRANDS);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    const phases = new Set(a.map((s) => s.phase.toFixed(4)));
    expect(phases.size).toBe(a.length);
  });

  it("plante les meches a l'arriere et sur les cotes du crane, jamais sur le visage", () => {
    for (const s of bearerHair(2)) {
      const front = Math.cos(s.azimuth); // +1 = plein visage, -1 = nuque
      expect(front).toBeLessThan(0.1);
      expect(s.tilt).toBeGreaterThan(0);
      expect(s.tilt).toBeLessThan(Math.PI / 2 + 0.1);
      expect(s.length).toBeGreaterThan(0.4);
      expect(s.damping).toBeGreaterThan(0.95);
      expect(s.damping).toBeLessThan(1);
    }
  });

  it("est deterministe : la meme graine, la meme chevelure", () => {
    expect(bearerHair(3)).toEqual(bearerHair(3));
  });
});

describe("landingState : l'atterrissage est un evenement, pas un fondu", () => {
  it("rien avant le contact", () => {
    expect(landingState(-1)).toEqual({ flare: 0, gust: 0 });
    expect(landingState(0).flare).toBe(0);
  });

  it("les offrandes prennent tout de suite, puis retombent a leur braise", () => {
    expect(landingState(LANDING.flareUp).flare).toBeGreaterThan(0.95);
    expect(landingState(LANDING.flareUp + LANDING.flareTau).flare).toBeLessThan(0.45);
    expect(landingState(4).flare).toBeLessThan(0.02);
  });

  it("le souffle au sol part fort et s'eteint", () => {
    expect(landingState(0).gust).toBeGreaterThan(0.95);
    expect(landingState(3).gust).toBeLessThan(0.05);
  });

  it("la decroissance est monotone apres le pic", () => {
    let last = 2;
    for (let t = LANDING.flareUp; t < 4; t += 0.05) {
      const f = landingState(t).flare;
      expect(f).toBeLessThanOrEqual(last + 1e-9);
      last = f;
    }
  });

  it("le seuil de rearmement est franchement sous celui du contact", () => {
    expect(LANDING.rearmAt).toBeLessThan(LANDING.touchAt);
    expect(LANDING.touchAt - LANDING.rearmAt).toBeGreaterThan(0.25);
  });

  it("tolere des valeurs absurdes", () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, -1e9]) {
      const s = landingState(v);
      expect(Number.isFinite(s.flare)).toBe(true);
      expect(Number.isFinite(s.gust)).toBe(true);
    }
  });
});

describe("presencePorteuses (la venue, 16/09)", () => {
  it("AU ZENITH, ELLES NE SONT PAS LA : exactement zero", () => {
    // C'est tout le correctif. Depuis la descente du 16/09 on arrive
    // toujours en haut de l'arc de l'Ouest, donc au zenith : si cette
    // valeur n'est pas nulle, la marche de luminance revient.
    expect(presencePorteuses(0)).toBe(0);
    expect(presencePorteuses(CIHUATETEO.venueStart)).toBe(0);
  });

  it("elles sont entierement la bien avant le carrefour", () => {
    // Leur descente au carrefour commence a `descendStart` : la venue doit
    // etre finie avant, sinon elles arriveraient en se posant deja.
    expect(CIHUATETEO.venueEnd).toBeLessThan(CIHUATETEO.descendStart + 0.1);
    expect(presencePorteuses(CIHUATETEO.venueEnd)).toBe(1);
    expect(presencePorteuses(1)).toBe(1);
  });

  it("ne recule jamais quand le soleil tombe", () => {
    let precedent = -1;
    for (let d = 0; d <= 1.0001; d += 0.02) {
      const p = presencePorteuses(d);
      expect(p).toBeGreaterThanOrEqual(precedent);
      precedent = p;
    }
  });

  it("commence en douceur : pas de marche a l'entree de la fenetre", () => {
    // Un seuil dur rendrait le defaut a l'identique, deplace de quelques
    // images. La derivee doit etre nulle aux deux bornes (smoothstep).
    const juste = presencePorteuses(CIHUATETEO.venueStart + 0.002);
    expect(juste).toBeGreaterThan(0);
    expect(juste).toBeLessThan(0.01);
  });
});

describe("reculPorteuses (elles viennent de Cihuatlampa)", () => {
  it("au plus loin quand elles ne sont pas venues, et AU-DELA DE LA BRUME", () => {
    // 26 unites, c'est le `far` du brouillard de l'Ouest : au-dela, il les
    // a entierement mangees. C'est la brume qui fait le fondu.
    expect(reculPorteuses(0)).toBe(CIHUATETEO.reculMax);
    expect(CIHUATETEO.reculMax).toBeGreaterThanOrEqual(26);
  });

  it("nul quand elles sont en place", () => {
    expect(reculPorteuses(1)).toBe(0);
  });

  it("decroit sans jamais repasser derriere", () => {
    let precedent = Infinity;
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const r = reculPorteuses(p);
      expect(r).toBeLessThanOrEqual(precedent);
      precedent = r;
    }
  });

  it("borne les presences aberrantes", () => {
    expect(reculPorteuses(1.5)).toBe(0);
    expect(reculPorteuses(-0.4)).toBe(CIHUATETEO.reculMax);
  });
});
