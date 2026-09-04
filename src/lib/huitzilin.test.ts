import { describe, expect, it } from "vitest";
import { birdTangent, HUITZILIN_SPECIES, HUITZILIN_SPEC, initialBird, stepBird, type BirdState } from "./huitzilin";

const SPEC = HUITZILIN_SPEC;

function run(seed: number, seconds: number, p: number, dt = 1 / 60): BirdState[] {
  const out: BirdState[] = [];
  let s = initialBird(seed, SPEC);
  for (let i = 0; i < seconds / dt; i++) {
    s = stepBird(s, dt, p, SPEC);
    out.push(s);
  }
  return out;
}

describe("HUITZILIN_SPECIES (les especes, une couleur chacune)", () => {
  it("au moins quatre especes, teintes toutes differentes, noms nahuatl et francais", () => {
    expect(HUITZILIN_SPECIES.length).toBeGreaterThanOrEqual(4);
    const hues = new Set(HUITZILIN_SPECIES.map((s) => s.hueShift));
    expect(hues.size).toBe(HUITZILIN_SPECIES.length);
    for (const s of HUITZILIN_SPECIES) {
      expect(s.fr.length).toBeGreaterThan(3);
      expect(s.name.length).toBeGreaterThan(3);
    }
  });
});

describe("stepBird (vol stationnaire, fleche, vol stationnaire)", () => {
  it("reste dans la boite de ciel des colibris, de nuit comme a midi", () => {
    for (const p of [0, 0.5, 1]) {
      for (const seed of [1, 5]) {
        let violations = 0;
        for (const s of run(seed, 120, p)) {
          if (Math.abs(s.x) > SPEC.xHalf + 1e-6 || s.z < SPEC.zMin - 1e-6 || s.z > SPEC.zMax + 1e-6) violations++;
          if (s.y < SPEC.yMinNoon - 1e-6 || s.y > SPEC.yMaxNight + 1e-6) violations++;
        }
        expect(violations).toBe(0);
      }
    }
  });

  it("alterne des phases stationnaires (lent, vibrant) et des fleches (rapide)", () => {
    const states = run(3, 60, 0);
    let hover = 0, dart = 0, fast = 0;
    for (let i = 1; i < states.length; i++) {
      const a = states[i - 1], b = states[i];
      const v = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) * 60;
      if (b.mode === "hover") hover++;
      else dart++;
      if (v > SPEC.dartSpeed * 0.5) fast++;
    }
    expect(hover).toBeGreaterThan(0);
    expect(dart).toBeGreaterThan(0);
    expect(fast).toBeGreaterThan(0);
    expect(hover / (hover + dart)).toBeGreaterThan(0.5); // il plane plus qu'il ne file
  });

  it("de nuit il vole haut (vers les etoiles), a midi il descend vers les fleurs", () => {
    const night = run(4, 90, 0).slice(1800);
    const noon = run(4, 90, 1).slice(1800);
    const mean = (xs: BirdState[]) => xs.reduce((a, s) => a + s.y, 0) / xs.length;
    expect(mean(night)).toBeGreaterThan(mean(noon) + 1);
  });

  it("deterministe par graine, graines differentes = vols differents", () => {
    const a = run(9, 10, 0.3), b = run(9, 10, 0.3), c = run(10, 10, 0.3);
    expect(a[a.length - 1]).toEqual(b[b.length - 1]);
    expect(a[a.length - 1]).not.toEqual(c[c.length - 1]);
  });

  it("birdTangent : unitaire, et pendant une fleche oriente comme le deplacement", () => {
    const states = run(2, 40, 0);
    for (let i = 1; i < states.length; i++) {
      const b = states[i];
      const t = birdTangent(b);
      expect(Math.hypot(t.x, t.y, t.z)).toBeCloseTo(1, 9);
      const a = states[i - 1];
      if (b.mode === "dart" && a.mode === "dart") {
        const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
        if (l > 1e-4) expect(t.x * dx + t.z * dz).toBeGreaterThan(0);
      }
    }
  });
});
