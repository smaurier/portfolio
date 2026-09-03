import { describe, expect, it } from "vitest";
import { cempasuchilFlowers, CEMPASUCHIL_COUNT } from "./cempasuchil-path";

describe("cempasuchilFlowers (la couronne de fleurs autour de la Piedra del Sol, 03/09)", () => {
  it("deterministe pour un meme temps et une meme profondeur", () => {
    expect(cempasuchilFlowers(0.7, 12)).toEqual(cempasuchilFlowers(0.7, 12));
  });

  it("la couronne se complete en descendant : plus de fleurs visibles en bas qu'en haut", () => {
    const top = cempasuchilFlowers(0, 5).filter((f) => f.visible).length;
    const mid = cempasuchilFlowers(0.5, 5).filter((f) => f.visible).length;
    const deep = cempasuchilFlowers(1, 5).filter((f) => f.visible).length;
    expect(top).toBeGreaterThan(CEMPASUCHIL_COUNT * 0.15);
    expect(mid).toBeGreaterThan(top);
    expect(deep).toBeGreaterThan(mid);
    expect(deep).toBe(CEMPASUCHIL_COUNT);
  });

  it("encercle la Piedra (rayon 3) : toutes les fleurs entre 2.9 et 4.2 du centre, dans les quatre quadrants", () => {
    const flowers = cempasuchilFlowers(1, 3);
    const quadrants = new Set<string>();
    for (const f of flowers) {
      const r = Math.hypot(f.x, f.z);
      expect(r).toBeGreaterThan(2.9);
      expect(r).toBeLessThan(4.2);
      quadrants.add(`${f.x >= 0 ? "+" : "-"}${f.z >= 0 ? "+" : "-"}`);
    }
    expect(quadrants.size).toBe(4);
  });

  it("contour irregulier : les rayons varient d'au moins 0.5 entre fleurs", () => {
    const radii = cempasuchilFlowers(1, 0).map((f) => Math.hypot(f.x, f.z));
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(0.5);
  });

  it("les fleurs derivent doucement avec le temps (jamais immobiles, jamais loin de leur place)", () => {
    const a = cempasuchilFlowers(1, 0);
    const b = cempasuchilFlowers(1, 2);
    let moved = 0;
    for (let i = 0; i < a.length; i++) {
      const d = Math.hypot(a[i].x - b[i].x, a[i].z - b[i].z);
      if (d > 0.005) moved++;
      expect(d).toBeLessThan(0.4);
    }
    expect(moved).toBeGreaterThan(a.length / 2);
  });
});
