import { describe, expect, it } from "vitest";
import { streakAzimuth, streakIntensity, streakSpec } from "./ehecatl-wind";
import { swingAzimuth } from "./nepantla";
import type { NepantlaDirection } from "./nepantla";

const ORBIT_DIRECTIONS: NepantlaDirection[] = ["dore", "turquoise", "cendre", "obsidienne"];
const SEEDS = Array.from({ length: 100 }, (_, i) => (i + 0.5) / 100);

describe("ehecatl : les filaments du vent (etage 4)", () => {
  it("spec deterministe et bornee : chaque graine donne toujours le meme filament, dans l'enveloppe de la scene", () => {
    for (const seed of SEEDS) {
      const a = streakSpec(seed);
      const b = streakSpec(seed);
      expect(a).toEqual(b);
      expect(a.azimuth0).toBeGreaterThanOrEqual(0);
      expect(a.azimuth0).toBeLessThan(Math.PI * 2);
      expect(a.radius).toBeGreaterThanOrEqual(3);
      expect(a.radius).toBeLessThanOrEqual(7);
      expect(a.height).toBeGreaterThanOrEqual(0.3);
      expect(a.height).toBeLessThanOrEqual(3.4);
      expect(a.length).toBeGreaterThan(0.8);
      expect(a.length).toBeLessThanOrEqual(3);
      expect(a.laps).toBeGreaterThan(1);
    }
  });

  it("au depart du voyage, chaque filament est a son azimut de repos", () => {
    for (const direction of ORBIT_DIRECTIONS) {
      const spec = streakSpec(0.37);
      expect(streakAzimuth(0, spec, direction)).toBeCloseTo(spec.azimuth0, 10);
    }
  });

  it("le vent souffle dans le sens du voyage et ne revient jamais en arriere", () => {
    for (const direction of ORBIT_DIRECTIONS) {
      const sign = Math.sign(swingAzimuth(1, direction));
      const spec = streakSpec(0.61);
      let previous = 0;
      for (let i = 1; i <= 100; i++) {
        const travel = streakAzimuth(i / 100, spec, direction) - spec.azimuth0;
        expect(travel * sign).toBeGreaterThanOrEqual(previous * sign);
        previous = travel;
      }
    }
  });

  it("le vent va PLUS VITE que la camera : Ehecatl emporte, la camera suit", () => {
    for (const direction of ORBIT_DIRECTIONS) {
      for (const seed of [0.1, 0.5, 0.9]) {
        const spec = streakSpec(seed);
        for (const t of [0.25, 0.5, 0.75, 1]) {
          const windTravel = Math.abs(streakAzimuth(t, spec, direction) - spec.azimuth0);
          const cameraTravel = Math.abs(swingAzimuth(t, direction));
          expect(windTravel).toBeGreaterThan(cameraTravel);
        }
      }
    }
  });

  it("Centre (jade) : pas de voyage, pas de vent : les filaments ne bougent pas et restent invisibles", () => {
    const spec = streakSpec(0.5);
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(streakAzimuth(t, spec, "jade")).toBe(spec.azimuth0);
      expect(streakIntensity(t, "jade")).toBe(0);
    }
  });

  it("intensite : rien aux deux bouts du voyage, pic au coeur du passage (la ou la nav se fait)", () => {
    for (const direction of ORBIT_DIRECTIONS) {
      expect(streakIntensity(0, direction)).toBeCloseTo(0, 5);
      expect(streakIntensity(1, direction)).toBeCloseTo(0, 5);
      expect(streakIntensity(0.5, direction)).toBeCloseTo(1, 5);
      expect(streakIntensity(0.25, direction)).toBeGreaterThan(0);
    }
  });
});
