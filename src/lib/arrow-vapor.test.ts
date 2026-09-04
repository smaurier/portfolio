import { describe, expect, it } from "vitest";
import {
  isVaporAlive,
  PARTICLES_PER_ARROW,
  SHARDS_PER_ARROW,
  SMOKE_PER_ARROW,
  spawnVapor,
  stepVapor,
  VAPOR_MAX_LIFE,
  VAPOR_SHARD,
  VAPOR_SMOKE,
  vaporAlpha,
  vaporSize,
} from "./arrow-vapor";

const ORIGIN = { x: 1, y: 0.4, z: -0.5 };
const DOWN = { x: 0, y: -1, z: 0 }; // fleche plantee verticalement, pointe en bas : axe pointe -> talon = +Y
const UP = { x: 0, y: 1, z: 0 };
const LENGTH = 0.9;

describe("spawnVapor (une fleche plantee redevient vent d'obsidienne)", () => {
  it("le bon nombre de particules, deux familles", () => {
    const ps = spawnVapor(1, ORIGIN, UP, LENGTH);
    expect(ps).toHaveLength(PARTICLES_PER_ARROW);
    expect(ps.filter((p) => p.kind === VAPOR_SMOKE)).toHaveLength(SMOKE_PER_ARROW);
    expect(ps.filter((p) => p.kind === VAPOR_SHARD)).toHaveLength(SHARDS_PER_ARROW);
  });

  it("deterministe par graine", () => {
    expect(spawnVapor(3, ORIGIN, UP, LENGTH)).toEqual(spawnVapor(3, ORIGIN, UP, LENGTH));
    expect(spawnVapor(3, ORIGIN, UP, LENGTH)).not.toEqual(spawnVapor(4, ORIGIN, UP, LENGTH));
  });

  it("nait LE LONG de la hampe, pas en un point", () => {
    const ps = spawnVapor(2, ORIGIN, UP, LENGTH);
    const ys = ps.map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(LENGTH * 0.6);
    expect(Math.max(...ys)).toBeLessThanOrEqual(ORIGIN.y + LENGTH / 2 + 0.05);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(ORIGIN.y - LENGTH / 2 - 0.05);
    // Et serre autour de l'axe.
    for (const p of ps) expect(Math.hypot(p.x - ORIGIN.x, p.z - ORIGIN.z)).toBeLessThan(0.08);
  });

  it("l'axe est respecte : une fleche couchee etale ses particules en x", () => {
    const ps = spawnVapor(2, ORIGIN, { x: 1, y: 0, z: 0 }, LENGTH);
    const xs = ps.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(LENGTH * 0.6);
  });

  it("aucune vie ne depasse la borne du pool", () => {
    for (const p of spawnVapor(5, ORIGIN, DOWN, LENGTH)) expect(p.life).toBeLessThanOrEqual(VAPOR_MAX_LIFE);
  });
});

describe("stepVapor (la fumee monte, les eclats retombent)", () => {
  it("la fumee monte et ralentit lateralement", () => {
    const ps = spawnVapor(6, ORIGIN, UP, LENGTH).filter((p) => p.kind === VAPOR_SMOKE);
    const y0 = ps.reduce((s, p) => s + p.y, 0) / ps.length;
    const lat0 = ps.reduce((s, p) => s + Math.hypot(p.vx, p.vz), 0) / ps.length;
    for (let i = 0; i < 60; i++) stepVapor(ps, 1 / 60);
    const y1 = ps.reduce((s, p) => s + p.y, 0) / ps.length;
    const lat1 = ps.reduce((s, p) => s + Math.hypot(p.vx, p.vz), 0) / ps.length;
    expect(y1).toBeGreaterThan(y0 + 0.15);
    expect(lat1).toBeLessThan(lat0);
  });

  it("les eclats partent en gerbe puis retombent", () => {
    const ps = spawnVapor(7, ORIGIN, UP, LENGTH).filter((p) => p.kind === VAPOR_SHARD);
    expect(ps.every((p) => p.vy > 0)).toBe(true);
    for (let i = 0; i < 60; i++) stepVapor(ps, 1 / 60);
    expect(ps.every((p) => p.vy < 0)).toBe(true);
    // Et se sont ecartes de la hampe.
    const spread = ps.reduce((s, p) => s + Math.hypot(p.x - ORIGIN.x, p.z - ORIGIN.z), 0) / ps.length;
    expect(spread).toBeGreaterThan(0.3);
  });

  it("tout est mort apres la vie maximale", () => {
    const ps = spawnVapor(8, ORIGIN, UP, LENGTH);
    for (let i = 0; i < Math.ceil(VAPOR_MAX_LIFE * 60) + 6; i++) stepVapor(ps, 1 / 60);
    expect(ps.some(isVaporAlive)).toBe(false);
  });
});

describe("vaporAlpha / vaporSize", () => {
  it("opacite nulle avant la naissance et a la mort, dans [0, 1] entre", () => {
    const ps = spawnVapor(9, ORIGIN, UP, LENGTH);
    for (const p of ps) {
      const born = { ...p, age: -0.01 };
      expect(vaporAlpha(born)).toBe(0);
      expect(vaporAlpha({ ...p, age: p.life })).toBe(0);
      for (let k = 1; k < 10; k++) {
        const a = vaporAlpha({ ...p, age: (p.life * k) / 10 });
        expect(a).toBeGreaterThan(0);
        expect(a).toBeLessThanOrEqual(1);
      }
    }
  });

  it("la fumee s'eteint en s'elargissant, l'eclat garde sa taille", () => {
    const smoke = spawnVapor(10, ORIGIN, UP, LENGTH).find((p) => p.kind === VAPOR_SMOKE)!;
    const shard = spawnVapor(10, ORIGIN, UP, LENGTH).find((p) => p.kind === VAPOR_SHARD)!;
    expect(vaporSize({ ...smoke, age: smoke.life * 0.9 })).toBeGreaterThan(vaporSize({ ...smoke, age: smoke.life * 0.1 }) * 2);
    expect(vaporAlpha({ ...smoke, age: smoke.life * 0.9 })).toBeLessThan(vaporAlpha({ ...smoke, age: smoke.life * 0.2 }));
    expect(vaporSize({ ...shard, age: 0.1 })).toBe(vaporSize({ ...shard, age: 0.6 }));
  });
});
