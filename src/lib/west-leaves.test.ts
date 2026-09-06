import { describe, expect, it } from "vitest";
import { initLeaf, stepLeaf, WEST_LEAVES } from "./west-leaves";

const wind = { x: 0.6, z: -0.15 }; // vers l'ouest du decor (+x), comme l'herbe et les chevelures
const flatGround = () => 0;

function run(seed: number, seconds: number, ground = flatGround) {
  const leaf = initLeaf(seed);
  for (let t = 0; t < seconds; t += 1 / 60) stepLeaf(leaf, 1 / 60, wind, t, ground);
  return leaf;
}

describe("west-leaves : feuilles et cendres balayees au sol vers l'Ouest", () => {
  it("chaque graine donne une feuille differente, toujours dans l'etendue", () => {
    const a = initLeaf(1), b = initLeaf(2);
    expect(a.x).not.toBe(b.x);
    for (const l of [a, b]) {
      expect(Math.abs(l.x)).toBeLessThanOrEqual(WEST_LEAVES.extent);
      expect(Math.abs(l.z)).toBeLessThanOrEqual(WEST_LEAVES.extent);
      expect(l.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("le vent les emporte dans son sens : en moyenne elles avancent en x", () => {
    let dx = 0;
    for (let s = 0; s < 20; s++) {
      const leaf = initLeaf(s);
      const x0 = leaf.x;
      for (let t = 0; t < 3; t += 1 / 60) stepLeaf(leaf, 1 / 60, wind, t, flatGround);
      // Une feuille recyclee repart de l'amont : on ne compte que celles qui n'ont pas saute.
      if (leaf.x > x0 - WEST_LEAVES.extent) dx += leaf.x - x0;
    }
    expect(dx).toBeGreaterThan(0);
  });

  it("elles ne passent jamais sous le sol et retombent toujours", () => {
    const hill = (x: number) => 0.3 + 0.1 * Math.sin(x);
    for (let s = 0; s < 8; s++) {
      const leaf = initLeaf(s);
      for (let t = 0; t < 6; t += 1 / 60) {
        stepLeaf(leaf, 1 / 60, wind, t, hill);
        expect(leaf.y).toBeGreaterThanOrEqual(hill(leaf.x) - 1e-9);
        expect(leaf.y - hill(leaf.x)).toBeLessThan(WEST_LEAVES.maxLift + 0.5);
      }
    }
  });

  it("sorties sous le vent, elles reviennent par l'amont, jamais hors de l'etendue", () => {
    const leaf = run(3, 120);
    expect(Math.abs(leaf.x)).toBeLessThanOrEqual(WEST_LEAVES.extent);
    expect(Math.abs(leaf.z)).toBeLessThanOrEqual(WEST_LEAVES.extent);
  });

  it("elles tournent sur elles-memes en avancant", () => {
    const leaf = initLeaf(4);
    const r0 = leaf.spin;
    stepLeaf(leaf, 1 / 60, wind, 0, flatGround);
    expect(leaf.spin).not.toBe(r0);
  });
});
