import { describe, expect, it } from "vitest";
import { initialWander, skyBand, stepWander, wanderTangent, xHalf, XIUHCOATL_WANDER, type WanderState } from "./xiuhcoatl-wander";

const SPEC = XIUHCOATL_WANDER;

function run(seed: number, seconds: number, dt = 1 / 60): WanderState[] {
  const out: WanderState[] = [];
  let s = initialWander(seed, SPEC);
  for (let i = 0; i < seconds / dt; i++) {
    s = stepWander(s, dt, SPEC);
    out.push(s);
  }
  return out;
}

describe("skyBand (la bande de ciel entre la crete et le bandeau, vue de la camera)", () => {
  it("monte avec la distance : plus loin, la bande est plus haute et plus large", () => {
    const near = skyBand(SPEC.zMax, SPEC);
    const far = skyBand(SPEC.zMin, SPEC);
    expect(far.yMin).toBeGreaterThan(near.yMin);
    expect(far.yMax - far.yMin).toBeGreaterThan(near.yMax - near.yMin);
    expect(near.yMax).toBeGreaterThan(near.yMin + 1);
  });

  it("le plancher est au-dessus de la crete mesuree (~3 deg d'elevation)", () => {
    for (const z of [SPEC.zMin, (SPEC.zMin + SPEC.zMax) / 2, SPEC.zMax]) {
      const { yMin } = skyBand(z, SPEC);
      const elev = (Math.atan2(yMin - SPEC.camY, SPEC.camZ - z) * 180) / Math.PI;
      expect(elev).toBeGreaterThanOrEqual(3.2);
    }
  });
});

describe("stepWander (le serpent vit dans le ciel toute la scene)", () => {
  it("reste dans la boite de ciel pendant 5 minutes, pour plusieurs graines", () => {
    const e = 1e-6;
    for (const seed of [1, 7, 42]) {
      let violations = 0;
      for (const s of run(seed, 300)) {
        const band = skyBand(s.z, SPEC);
        const xh = xHalf(s.z, SPEC);
        if (s.x < -xh - e || s.x > xh + e || s.z < SPEC.zMin - e || s.z > SPEC.zMax + e || s.y < band.yMin - e || s.y > band.yMax + e) violations++;
      }
      expect(violations).toBe(0);
    }
  });

  it("avance a vitesse constante, sans saut", () => {
    const states = run(3, 30);
    for (let i = 1; i < states.length; i++) {
      const a = states[i - 1], b = states[i];
      const d = Math.hypot(b.x - a.x, b.z - a.z);
      // 1.5 : la boite se resserre quand il se rapproche (perspective), le
      // rabattement en x peut ajouter jusqu'a une demi-longueur de pas.
      expect(d).toBeLessThanOrEqual((SPEC.speed / 60) * 1.5);
      expect(d).toBeGreaterThan(0);
    }
  });

  it("tourne doucement : le cap ne saute jamais", () => {
    const states = run(5, 60);
    for (let i = 1; i < states.length; i++) {
      let dh = states[i].heading - states[i - 1].heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      expect(Math.abs(dh)).toBeLessThanOrEqual((SPEC.turnRate / 60) * 2 + 1e-9);
    }
  });

  it("explore vraiment : il ne tourne pas en rond au meme endroit", () => {
    const states = run(11, 120);
    const xs = states.map((s) => s.x), zs = states.map((s) => s.z);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(xHalf(SPEC.zMax, SPEC));
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan((SPEC.zMax - SPEC.zMin) * 0.4);
  });

  it("la boite est plus etroite pres de la camera (perspective) et bornee au loin", () => {
    expect(xHalf(SPEC.zMax, SPEC)).toBeLessThan(xHalf(SPEC.zMin, SPEC));
    expect(xHalf(SPEC.zMin, SPEC)).toBeLessThanOrEqual(SPEC.xMax);
  });

  it("deterministe par graine, different d'une graine a l'autre", () => {
    const a = run(9, 5), b = run(9, 5), c = run(10, 5);
    expect(a[a.length - 1]).toEqual(b[b.length - 1]);
    expect(a[a.length - 1]).not.toEqual(c[c.length - 1]);
  });
});

describe("wanderTangent", () => {
  it("unitaire et oriente comme le deplacement", () => {
    const states = run(2, 5);
    const a = states[states.length - 2], b = states[states.length - 1];
    const t = wanderTangent(b);
    expect(Math.hypot(t.x, t.y, t.z)).toBeCloseTo(1, 10);
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
    expect(t.x / Math.hypot(t.x, t.z)).toBeCloseTo(dx / l, 2);
    expect(t.z / Math.hypot(t.x, t.z)).toBeCloseTo(dz / l, 2);
  });
});
