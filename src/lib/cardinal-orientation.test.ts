import { describe, expect, it } from "vitest";
import { DECOR_COMPASS, orientationAngle, rotateY, stepAngle, toDecorLocal } from "./cardinal-orientation";
import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/** La camera de tete de page regarde vers -z. */
const GAZE = { x: 0, z: -1 };

function near(a: { x: number; z: number }, b: { x: number; z: number }) {
  expect(a.x).toBeCloseTo(b.x, 9);
  expect(a.z).toBeCloseTo(b.z, 9);
}

describe("orientationAngle (chaque page regarde vers sa direction cardinale)", () => {
  it("le centre garde la disposition actuelle, ou la camera regarde le sud du decor", () => {
    expect(orientationAngle("jade")).toBe(0);
    near(rotateY(DECOR_COMPASS.south, orientationAngle("jade")), GAZE);
  });

  it("le Sud garde la disposition du centre (deja face au sud)", () => {
    expect(orientationAngle("turquoise")).toBe(0);
  });

  const cases: [DirectionKey, keyof typeof DECOR_COMPASS][] = [
    ["dore", "east"],
    ["turquoise", "south"],
    ["cendre", "west"],
    ["obsidienne", "north"],
  ];
  it.each(cases)("%s : le decor tourne pour que son %s vienne face a la camera", (direction, cardinal) => {
    near(rotateY(DECOR_COMPASS[cardinal], orientationAngle(direction)), GAZE);
  });

  it("le decor est face au sud : l'est est a gauche (-x), l'ouest a droite (+x)", () => {
    near(DECOR_COMPASS.east, { x: -1, z: 0 });
    near(DECOR_COMPASS.west, { x: 1, z: 0 });
  });
});

describe("toDecorLocal (requetes monde -> repere du decor tourne)", () => {
  it("est l'inverse de rotateY", () => {
    for (const angle of [0, Math.PI / 2, -Math.PI / 2, Math.PI, 0.7]) {
      const p = { x: 3.2, z: -1.4 };
      near(rotateY(toDecorLocal(p.x, p.z, angle), angle), p);
    }
  });
});

describe("stepAngle (lissage par le plus court chemin)", () => {
  it("converge vers la cible et s'arrete dessus", () => {
    let a = 0;
    for (let i = 0; i < 200; i++) a = stepAngle(a, Math.PI / 2, 0.1);
    expect(a).toBeCloseTo(Math.PI / 2, 6);
  });

  it("prend le plus court chemin a travers +/- pi", () => {
    // De 170 deg vers -170 deg : 20 deg par la droite, pas 340 par la gauche.
    const from = (170 * Math.PI) / 180;
    const to = (-170 * Math.PI) / 180;
    const next = stepAngle(from, to, 0.5);
    expect(Math.abs(next) > from).toBe(true); // a depasse 170 deg vers pi
    expect(Math.cos(next - to)).toBeGreaterThan(Math.cos(from - to));
  });

  it("k = 1 saute directement (reduced motion)", () => {
    expect(Math.cos(stepAngle(0.3, Math.PI, 1) - Math.PI)).toBeCloseTo(1, 9);
  });

  it("le resultat reste dans ]-pi, pi]", () => {
    let a = 3;
    for (let i = 0; i < 50; i++) {
      a = stepAngle(a, -3, 0.2);
      expect(a).toBeGreaterThan(-Math.PI - 1e-9);
      expect(a).toBeLessThanOrEqual(Math.PI + 1e-9);
    }
  });
});
