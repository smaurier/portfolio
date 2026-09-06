import { describe, expect, it } from "vitest";
import { initShard, SHARDS, stepShard } from "./shards";

const impact = { x: 0, y: 1, z: 0 };
const flat = () => 0;

describe("shards : les eclats de la coque de glace", () => {
  it("un eclat part de son point d'origine, loin de l'impact, avec une vitesse qui s'en eloigne", () => {
    const s = initShard({ x: 1, y: 1, z: 0 }, impact, 3);
    expect(s.x).toBe(1);
    expect(s.vx).toBeGreaterThan(0);
    expect(Math.hypot(s.vx, s.vy, s.vz)).toBeGreaterThan(SHARDS.minSpeed);
    expect(s.life).toBe(1);
  });

  it("un eclat pose sur le sol part surtout vers le haut", () => {
    const s = initShard({ x: 2, y: 0.05, z: 0 }, { x: 0, y: 0, z: 0 }, 5);
    expect(s.vy).toBeGreaterThan(1);
  });

  it("la gravite le ramene au sol, ou il s'arrete et fond", () => {
    const s = initShard({ x: 1, y: 1, z: 0 }, impact, 7);
    let maxY = s.y;
    for (let t = 0; t < 6; t += 1 / 60) {
      stepShard(s, 1 / 60, flat);
      maxY = Math.max(maxY, s.y);
      expect(s.y).toBeGreaterThanOrEqual(-1e-9);
    }
    expect(maxY).toBeGreaterThan(1);
    expect(s.y).toBeLessThan(0.2);
    expect(s.life).toBeLessThan(0.05);
  });

  it("il tourne en volant", () => {
    const s = initShard({ x: 1, y: 1, z: 0 }, impact, 9);
    const r0 = s.rx;
    stepShard(s, 1 / 60, flat);
    expect(s.rx).not.toBe(r0);
  });

  it("deux graines donnent deux trajectoires", () => {
    const a = initShard({ x: 1, y: 1, z: 0 }, impact, 1);
    const b = initShard({ x: 1, y: 1, z: 0 }, impact, 2);
    expect(a.vx === b.vx && a.vy === b.vy && a.vz === b.vz).toBe(false);
  });
});
