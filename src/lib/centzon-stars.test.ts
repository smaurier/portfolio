import { describe, expect, it } from "vitest";
import { CENTZON_COUNT, CENTZON_SPEC, makeStarField, starState } from "./centzon-stars";

const FIELD = makeStarField(7);

describe("makeStarField (les Centzon Huitznahua, les 400 du Sud)", () => {
  it("quatre cents etoiles, deterministes par graine", () => {
    expect(FIELD).toHaveLength(CENTZON_COUNT);
    expect(CENTZON_COUNT).toBe(400);
    expect(makeStarField(7)).toEqual(FIELD);
    expect(makeStarField(8)[0]).not.toEqual(FIELD[0]);
  });

  it("toutes dans le ciel : direction unitaire, au-dessus de la crete et pas au zenith exact", () => {
    for (const s of FIELD) {
      expect(Math.hypot(s.dir.x, s.dir.y, s.dir.z)).toBeCloseTo(1, 9);
      const elev = (Math.asin(s.dir.y) * 180) / Math.PI;
      expect(elev).toBeGreaterThanOrEqual(CENTZON_SPEC.minElevDeg);
      expect(elev).toBeLessThanOrEqual(CENTZON_SPEC.maxElevDeg);
    }
  });

  it("tailles et scintillements varies, une part d'etoiles qui tombent", () => {
    const sizes = FIELD.map((s) => s.size);
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(2);
    const falling = FIELD.filter((s) => s.falls).length;
    expect(falling / CENTZON_COUNT).toBeGreaterThan(0.15);
    expect(falling / CENTZON_COUNT).toBeLessThan(0.4);
    for (const s of FIELD) {
      expect(s.deathAt).toBeGreaterThanOrEqual(CENTZON_SPEC.firstDeath);
      expect(s.deathAt).toBeLessThanOrEqual(CENTZON_SPEC.lastDeath);
      // une chute va vers le bas
      expect(s.fall.y).toBeLessThan(0);
    }
  });

  it("les morts s'etalent sur l'arc : pas toutes au meme moment", () => {
    const deaths = FIELD.map((s) => s.deathAt).sort((a, b) => a - b);
    const q1 = deaths[Math.floor(deaths.length * 0.25)];
    const q3 = deaths[Math.floor(deaths.length * 0.75)];
    expect(q3 - q1).toBeGreaterThan(0.2);
  });
});

describe("starState (vivre, scintiller, mourir, tomber)", () => {
  const star = FIELD.find((s) => s.falls)!;
  const still = FIELD.find((s) => !s.falls)!;

  it("en haut de page toutes brillent et scintillent", () => {
    for (const s of FIELD) {
      const a = starState(s, 0, 0).alpha;
      expect(a).toBeGreaterThan(0.3);
      expect(a).toBeLessThanOrEqual(1);
    }
    const a0 = starState(still, 0, 0).alpha;
    const a1 = starState(still, 0, 0.7).alpha;
    expect(a0).not.toBeCloseTo(a1, 3);
  });

  it("en bas de page, plus aucune : le midi les a toutes prises", () => {
    for (const s of FIELD) expect(starState(s, 1, 3).alpha).toBe(0);
  });

  it("une etoile fixe s'eteint vite apres sa mort, sans bouger", () => {
    const before = starState(still, still.deathAt - 0.01, 1);
    const after = starState(still, still.deathAt + CENTZON_SPEC.fadeSpan + 0.001, 1);
    expect(before.alpha).toBeGreaterThan(0);
    expect(after.alpha).toBe(0);
    expect(before.offset).toEqual({ x: 0, y: 0, z: 0 });
    expect(after.offset).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("une etoile qui tombe glisse le long de sa chute pendant qu'elle s'eteint, puis disparait", () => {
    const mid = starState(star, star.deathAt + CENTZON_SPEC.fallSpan * 0.5, 1);
    expect(mid.alpha).toBeGreaterThan(0);
    expect(mid.streak).toBeGreaterThan(0);
    expect(mid.offset.y).toBeLessThan(0);
    const end = starState(star, star.deathAt + CENTZON_SPEC.fallSpan + 0.001, 1);
    expect(end.alpha).toBe(0);
    expect(end.streak).toBe(0);
  });

  it("le lever du jour affaiblit meme les vivantes : alpha decroit avec la lumiere", () => {
    const late = FIELD.filter((s) => s.deathAt > 0.6)[0];
    expect(starState(late, 0.5, 2).alpha).toBeLessThan(starState(late, 0.0, 2).alpha + 1e-9);
  });
});
