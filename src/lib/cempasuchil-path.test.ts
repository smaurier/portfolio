import { describe, expect, it } from "vitest";
import { cempasuchilFlowers, CEMPASUCHIL_COUNT } from "./cempasuchil-path";

describe("cempasuchilFlowers (le chemin de fleurs qui guide les ames, 02/09)", () => {
  it("deterministe pour un meme temps et une meme profondeur", () => {
    expect(cempasuchilFlowers(0.7, 12)).toEqual(cempasuchilFlowers(0.7, 12));
  });

  it("le chemin s'allonge en descendant : plus de fleurs visibles en bas de page qu'en haut", () => {
    const top = cempasuchilFlowers(0, 5).filter((f) => f.visible).length;
    const mid = cempasuchilFlowers(0.5, 5).filter((f) => f.visible).length;
    const deep = cempasuchilFlowers(1, 5).filter((f) => f.visible).length;
    expect(top).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(top);
    expect(deep).toBeGreaterThan(mid);
    expect(deep).toBe(CEMPASUCHIL_COUNT);
  });

  it("part a cote du cerf (jamais dessus) et file vers le Nord (-z), dans le bassin", () => {
    const flowers = cempasuchilFlowers(1, 3);
    for (const f of flowers) {
      expect(Math.hypot(f.x, f.z)).toBeGreaterThan(1.1);
      expect(Math.hypot(f.x, f.z)).toBeLessThan(6);
    }
    const first = flowers[0];
    const last = flowers[flowers.length - 1];
    expect(last.z).toBeLessThan(first.z - 3);
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
