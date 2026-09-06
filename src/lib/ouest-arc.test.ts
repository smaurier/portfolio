import { describe, expect, it } from "vitest";
import { OUEST_ARC, remapWestArc, westFogTint, WEST_FOG } from "./ouest-arc";
import { sunDirection } from "./direction-light";
import { getOrbitCameraPosition } from "./camera-path";

/** Azimut du soleil par rapport au regard de la camera (degres), comme dans
 * direction-light.test. */
function relativeAzimuth(dir: { x: number; z: number }, progress: number): number {
  const cam = getOrbitCameraPosition(progress);
  const gaze = Math.atan2(-cam.x, -cam.z);
  const d = Math.atan2(dir.x, dir.z) - gaze;
  return (Math.atan2(Math.sin(d), Math.cos(d)) * 180) / Math.PI;
}
const HALF_FIELD_DEG = 36;

describe("remapWestArc : l'Ouest va du clair au sombre, le soleil tombe", () => {
  it("part d'un apres-midi clair et finit dans le crepuscule", () => {
    const top = remapWestArc(0);
    const bottom = remapWestArc(1);
    expect(top.day).toBeCloseTo(OUEST_ARC.dayTop, 9);
    expect(top.lightP).toBeCloseTo(OUEST_ARC.lightTop, 9);
    expect(top.dusk).toBe(0);
    expect(bottom.day).toBeCloseTo(OUEST_ARC.dayNight, 9);
    expect(bottom.lightP).toBeCloseTo(OUEST_ARC.lightFloor, 9);
    expect(bottom.dusk).toBe(1);
  });

  it("ne remonte jamais : jour, lumiere descendent, le crepuscule monte", () => {
    let prev = remapWestArc(0);
    for (let p = 0.02; p <= 1; p += 0.02) {
      const s = remapWestArc(p);
      expect(s.day).toBeLessThanOrEqual(prev.day + 1e-9);
      expect(s.lightP).toBeLessThanOrEqual(prev.lightP + 1e-9);
      expect(s.dusk).toBeGreaterThanOrEqual(prev.dusk - 1e-9);
      prev = s;
    }
  });

  it("le soleil est au-dessus de l'horizon en haut de page, couche en bas", () => {
    expect(sunDirection(remapWestArc(0).day, true).y).toBeGreaterThan(0.4);
    expect(sunDirection(remapWestArc(0.5).day, true).y).toBeGreaterThan(0);
    expect(sunDirection(remapWestArc(OUEST_ARC.setAt).day, true).y).toBeLessThan(0.03);
    expect(sunDirection(remapWestArc(1).day, true).y).toBeLessThan(0);
  });

  it("le soleil de l'Ouest est a l'ouest du decor (+x, le miroir de l'arc du Sud qui se leve a l'est, -x)", () => {
    expect(sunDirection(remapWestArc(0).day, true).x).toBeGreaterThan(0);
    expect(sunDirection(remapWestArc(0).day, false).x).toBeLessThan(0);
  });

  it("borne le progres", () => {
    expect(remapWestArc(-1)).toEqual(remapWestArc(0));
    expect(remapWestArc(2)).toEqual(remapWestArc(1));
  });

  it("le brouillard va de l'abricot de l'apres-midi au mauve du crepuscule", () => {
    expect(westFogTint(0)).toEqual(WEST_FOG.afternoon);
    expect(westFogTint(1)).toEqual(WEST_FOG.dusk);
    expect(westFogTint(0.5).b).toBeGreaterThan(westFogTint(0.5).g);
  });

  it("le coucher se voit : le soleil est dans le champ et sur l'horizon quand il tombe", () => {
    for (const p of [0.6, 0.66, OUEST_ARC.setAt]) {
      const sd = sunDirection(remapWestArc(p).day, true);
      const elevDeg = (Math.asin(sd.y) * 180) / Math.PI;
      expect(Math.abs(relativeAzimuth(sd, p))).toBeLessThan(HALF_FIELD_DEG);
      expect(elevDeg).toBeGreaterThan(-3);
      expect(elevDeg).toBeLessThan(10);
    }
  });
});
