import { describe, expect, it } from "vitest";
import { dawnAtArc, eastSunDirection, EST_ARC, morningStarDirection } from "./est-arc";
import { FROST } from "./frost";
import { getOrbitCameraPosition } from "./camera-path";
import { isMorningStar } from "./venus";

function elevationDeg(d: { x: number; y: number; z: number }): number {
  return (Math.asin(d.y / Math.hypot(d.x, d.y, d.z)) * 180) / Math.PI;
}
function azimuthDeg(d: { x: number; z: number }): number {
  return (Math.atan2(d.x, d.z) * 180) / Math.PI;
}
function gazeDeg(p: number): number {
  const c = getOrbitCameraPosition(p);
  return (Math.atan2(-c.x, -c.z) * 180) / Math.PI;
}

describe("est-arc : le soleil se leve face au regard, au moment ou tout eclate", () => {
  it("sous l'horizon avant, au bord a l'instant de l'explosion, haut a la fin", () => {
    expect(elevationDeg(eastSunDirection(0))).toBeLessThan(-3);
    expect(elevationDeg(eastSunDirection(0.4))).toBeLessThan(-3);
    expect(Math.abs(elevationDeg(eastSunDirection(FROST.shatterAt)))).toBeLessThan(1.5);
    expect(elevationDeg(eastSunDirection(1))).toBeGreaterThan(35);
  });

  it("monte sans redescendre", () => {
    let prev = -90;
    for (let p = 0; p <= 1; p += 0.02) {
      const e = elevationDeg(eastSunDirection(p));
      expect(e).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = e;
    }
  });

  it("est dans le champ (demi-champ 36 deg) quand il parait et pendant l'explosion ; ensuite la camera tourne", () => {
    for (const p of [FROST.shatterAt, 0.62]) {
      const d = azimuthDeg(eastSunDirection(p)) - gazeDeg(p);
      const wrapped = Math.atan2(Math.sin((d * Math.PI) / 180), Math.cos((d * Math.PI) / 180)) * (180 / Math.PI);
      expect(Math.abs(wrapped)).toBeLessThan(36);
    }
  });
});

describe("dawnAtArc : la bande rouge de l'aube", () => {
  it("nulle en pleine nuit, pleine au lever, retombe au plein jour", () => {
    expect(dawnAtArc(0)).toBe(0);
    expect(dawnAtArc(FROST.shatterAt)).toBeGreaterThan(0.8);
    expect(dawnAtArc(1)).toBeLessThan(0.25);
  });
});

describe("morningStarDirection : Venus du matin au-dessus du lever, dans le champ avant le jour", () => {
  it("au-dessus de l'horizon, pres de l'azimut du soleil, visible a p 0.45", () => {
    const v = morningStarDirection();
    expect(elevationDeg(v)).toBeGreaterThan(3);
    expect(elevationDeg(v)).toBeLessThan(30);
    const d = azimuthDeg(v) - gazeDeg(0.45);
    expect(Math.abs(d)).toBeLessThan(36);
    expect(Math.abs(azimuthDeg(v) - EST_ARC.sunAzimuthDeg)).toBeLessThan(40);
  });

  it("isMorningStar : vrai en novembre 2026, faux en septembre 2026", () => {
    expect(isMorningStar(new Date("2026-11-15T12:00:00Z"))).toBe(true);
    expect(isMorningStar(new Date("2026-09-06T12:00:00Z"))).toBe(false);
  });
});
