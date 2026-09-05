import { describe, expect, it } from "vitest";
import {
  applyRadialImpulse,
  cellCenter,
  createGrassGrid,
  GRASS_SIM,
  GRASS_WIND_BY_DIRECTION,
  gridEnergy,
  stepGrassGrid,
  windAt,
  type WindSpec,
} from "./grass-sim";

const CALM: WindSpec = { dirX: 1, dirZ: 0, strength: 0.4, gustAmp: 0, gustSpeed: 2, gustScale: 0.3 };
const GUSTY: WindSpec = { dirX: 0.6, dirZ: 0.8, strength: 0.3, gustAmp: 0.5, gustSpeed: 3, gustScale: 0.25 };

describe("windAt (un champ de vent qui vit : brise de fond + rafales en nappes)", () => {
  it("sans rafale, c'est la brise de fond, partout et toujours", () => {
    const a = windAt(0, 0, 0, CALM);
    const b = windAt(7, -3, 12.5, CALM);
    expect(a).toEqual({ x: 0.4, z: 0 });
    expect(b).toEqual({ x: 0.4, z: 0 });
  });

  it("avec rafales, le vent reste borne par brise + rafale et varie dans l'espace", () => {
    let maxLen = 0;
    let varies = false;
    const ref = windAt(0, 0, 1, GUSTY);
    for (let i = 0; i < 200; i++) {
      const w = windAt((i % 20) - 10, Math.floor(i / 20) - 5, 1, GUSTY);
      maxLen = Math.max(maxLen, Math.hypot(w.x, w.z));
      if (Math.abs(w.x - ref.x) > 1e-6) varies = true;
    }
    expect(maxLen).toBeLessThanOrEqual(GUSTY.strength + GUSTY.gustAmp + 1e-9);
    expect(varies).toBe(true);
  });

  it("les rafales VOYAGENT dans le sens du vent : la nappe vue en p a t se retrouve plus loin a t + dt", () => {
    const dt = 0.7;
    for (const [x, z] of [[0, 0], [3, -2], [-5, 4]]) {
      const here = windAt(x, z, 2, GUSTY);
      const downwind = windAt(x + GUSTY.dirX * GUSTY.gustSpeed * dt, z + GUSTY.dirZ * GUSTY.gustSpeed * dt, 2 + dt, GUSTY);
      expect(downwind.x).toBeCloseTo(here.x, 6);
      expect(downwind.z).toBeCloseTo(here.z, 6);
    }
  });

  it("chaque direction a son vent, l'Ouest (Ehecatl) est le plus fort", () => {
    const w = GRASS_WIND_BY_DIRECTION;
    expect(w.cendre.strength).toBeGreaterThan(w.dore.strength);
    expect(w.cendre.strength).toBeGreaterThan(w.turquoise.strength);
    expect(w.cendre.strength).toBeGreaterThan(w.jade.strength);
    for (const spec of Object.values(w)) expect(Math.hypot(spec.dirX, spec.dirZ)).toBeCloseTo(1, 9);
  });
});

describe("la grille de simulation (ressort + amortissement par cellule)", () => {
  it("les centres de cellules couvrent [-extent, extent] et sont bien indexes", () => {
    const g = createGrassGrid(4, 8);
    expect(g.size).toBe(4);
    expect(cellCenter(g, 0)).toEqual({ x: -6, z: -6 });
    expect(cellCenter(g, 15)).toEqual({ x: 6, z: 6 });
    expect(cellCenter(g, 1)).toEqual({ x: -2, z: -6 }); // i = z * size + x
  });

  it("sans vent ni impulsion, tout reste a zero", () => {
    const g = createGrassGrid(8, 10);
    for (let i = 0; i < 100; i++) stepGrassGrid(g, 1 / 60, () => ({ x: 0, z: 0 }), GRASS_SIM);
    expect(gridEnergy(g)).toBe(0);
  });

  it("sous un vent constant, la flexion converge vers gain x vent, sans jamais depasser 1", () => {
    const g = createGrassGrid(4, 4);
    const wind = { x: 0.5, z: -0.25 };
    let maxLen = 0;
    for (let i = 0; i < 600; i++) {
      stepGrassGrid(g, 1 / 60, () => wind, GRASS_SIM);
      for (let c = 0; c < g.size * g.size; c++) maxLen = Math.max(maxLen, Math.hypot(g.bend[2 * c], g.bend[2 * c + 1]));
    }
    expect(maxLen).toBeLessThanOrEqual(GRASS_SIM.maxBend + 1e-9);
    expect(g.bend[0]).toBeCloseTo(wind.x * GRASS_SIM.windGain, 2);
    expect(g.bend[1]).toBeCloseTo(wind.z * GRASS_SIM.windGain, 2);
  });

  it("un vent trop fort couche l'herbe a maxBend, pas au-dela", () => {
    const g = createGrassGrid(2, 2);
    for (let i = 0; i < 600; i++) stepGrassGrid(g, 1 / 60, () => ({ x: 10, z: 0 }), GRASS_SIM);
    expect(Math.hypot(g.bend[0], g.bend[1])).toBeCloseTo(GRASS_SIM.maxBend, 6);
  });

  it("l'herbe REVIENT : apres une impulsion et sans vent, l'energie decroit vers zero", () => {
    const g = createGrassGrid(16, 8);
    applyRadialImpulse(g, 0, 0, 4, 3);
    const e0 = gridEnergy(g);
    expect(e0).toBeGreaterThan(0);
    for (let i = 0; i < 240; i++) stepGrassGrid(g, 1 / 60, () => ({ x: 0, z: 0 }), GRASS_SIM);
    expect(gridEnergy(g)).toBeLessThan(e0 * 0.01);
  });

  it("l'impulsion radiale pousse vers l'exterieur, dans le rayon seulement, sans NaN au centre", () => {
    const g = createGrassGrid(16, 8);
    applyRadialImpulse(g, 0, 0, 3, 2);
    for (let c = 0; c < g.size * g.size; c++) {
      const p = cellCenter(g, c);
      const vx = g.vel[2 * c], vz = g.vel[2 * c + 1];
      expect(Number.isNaN(vx) || Number.isNaN(vz)).toBe(false);
      const r = Math.hypot(p.x, p.z);
      if (r > 3) expect(vx * vx + vz * vz).toBe(0);
      else if (r > 0.1) expect(vx * p.x + vz * p.z).toBeGreaterThan(0);
    }
  });

  it("un pas de temps enorme reste stable (dt borne)", () => {
    const g = createGrassGrid(4, 4);
    for (let i = 0; i < 50; i++) stepGrassGrid(g, 5, () => ({ x: 0.8, z: 0 }), GRASS_SIM);
    for (let c = 0; c < 16; c++) {
      expect(Number.isFinite(g.bend[2 * c])).toBe(true);
      expect(Math.hypot(g.bend[2 * c], g.bend[2 * c + 1])).toBeLessThanOrEqual(GRASS_SIM.maxBend + 1e-9);
    }
  });
});
