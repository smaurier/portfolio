import { describe, expect, it } from "vitest";
import { distributePitch, STAG_NECK_LIMITS, totalLimit } from "./neck-look";

const LIMITS = STAG_NECK_LIMITS.map((j) => j.maxPitch);

describe("STAG_NECK_LIMITS (butees par articulation, Neck1 -> Head)", () => {
  it("quatre articulations, butees croissantes vers la tete, total sous 70 degres", () => {
    expect(STAG_NECK_LIMITS.map((j) => j.name)).toEqual(["Neck1", "Neck2", "Neck3", "Head"]);
    for (let i = 1; i < LIMITS.length; i++) expect(LIMITS[i]).toBeGreaterThanOrEqual(LIMITS[i - 1]);
    expect(totalLimit(STAG_NECK_LIMITS)).toBeLessThan((70 * Math.PI) / 180);
    expect(totalLimit(STAG_NECK_LIMITS)).toBeGreaterThan((45 * Math.PI) / 180);
  });
});

describe("distributePitch (repartir un cabre sur la chaine, sans jamais depasser une butee)", () => {
  it("zero -> rien ne bouge", () => {
    expect(distributePitch(0, STAG_NECK_LIMITS)).toEqual([0, 0, 0, 0]);
  });

  it("un petit cabre est reparti au prorata des butees et somme exactement", () => {
    const want = 0.3;
    const out = distributePitch(want, STAG_NECK_LIMITS);
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(want, 9);
    const total = totalLimit(STAG_NECK_LIMITS);
    out.forEach((v, i) => expect(v).toBeCloseTo((want * LIMITS[i]) / total, 9));
  });

  it("au-dela du total, chaque articulation s'arrete a sa butee : jamais de deformation", () => {
    const out = distributePitch(3, STAG_NECK_LIMITS);
    out.forEach((v, i) => expect(v).toBeCloseTo(LIMITS[i], 9));
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(totalLimit(STAG_NECK_LIMITS), 9);
  });

  it("un cabre negatif (baisser la tete) respecte les memes butees en miroir", () => {
    const out = distributePitch(-3, STAG_NECK_LIMITS);
    out.forEach((v, i) => expect(v).toBeCloseTo(-LIMITS[i], 9));
  });

  it("monotone : plus on demande, plus chaque articulation tourne (jusqu'a sa butee)", () => {
    let prev = distributePitch(0, STAG_NECK_LIMITS);
    for (let k = 1; k <= 20; k++) {
      const cur = distributePitch(k * 0.1, STAG_NECK_LIMITS);
      cur.forEach((v, i) => expect(v).toBeGreaterThanOrEqual(prev[i] - 1e-12));
      prev = cur;
    }
  });
});
