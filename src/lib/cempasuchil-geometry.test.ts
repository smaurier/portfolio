import { describe, expect, it } from "vitest";
import { CEMPASUCHIL_SPEC, makeCempasuchilGeometry } from "./cempasuchil-geometry";

function positionsOf(seed: number) {
  const geo = makeCempasuchilGeometry(seed);
  const pos = geo.getAttribute("position");
  const out: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < pos.count; i++) out.push({ x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i) });
  return { geo, points: out };
}

describe("makeCempasuchilGeometry (la boule de petales de la fleur des morts)", () => {
  it("deterministe par graine, et deux graines different", () => {
    const a = makeCempasuchilGeometry(1).getAttribute("position").array;
    const b = makeCempasuchilGeometry(1).getAttribute("position").array;
    const c = makeCempasuchilGeometry(2).getAttribute("position").array;
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a)).not.toEqual(Array.from(c));
  });

  it("chaque petale est une bande de `segments` quads, plus le calice", () => {
    const geo = makeCempasuchilGeometry(3);
    const petalTris = CEMPASUCHIL_SPEC.petals * CEMPASUCHIL_SPEC.segments * 2;
    const calyxTris = 10 * 2;
    expect(geo.getAttribute("position").count).toBe((petalTris + calyxTris) * 3);
  });

  it("pied du calice a y = 0, rien sous le sol", () => {
    const { points } = positionsOf(4);
    const minY = Math.min(...points.map((p) => p.y));
    expect(minY).toBeCloseTo(0, 6);
  });

  it("une BOULE : les petales tiennent dans une sphere proche du rayon, centree en xz", () => {
    const { points } = positionsOf(5);
    const r = CEMPASUCHIL_SPEC.radius;
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cz = points.reduce((s, p) => s + p.z, 0) / points.length;
    expect(Math.abs(cx)).toBeLessThan(r * 0.15);
    expect(Math.abs(cz)).toBeLessThan(r * 0.15);
    const maxXZ = Math.max(...points.map((p) => Math.hypot(p.x, p.z)));
    // Les petales externes debordent de la boule d'insertion : la fleur
    // finie fait pres du double du rayon nominal.
    expect(maxXZ).toBeLessThan(r * 2.0);
    expect(maxXZ).toBeGreaterThan(r * 0.7);
  });

  it("dense : les petales couvrent tout le tour, aucun secteur vide", () => {
    const { points } = positionsOf(6);
    const sectors = new Array(12).fill(0);
    for (const p of points) {
      if (p.y < CEMPASUCHIL_SPEC.calyx * 1.5) continue; // hors calice
      const a = Math.atan2(p.z, p.x) + Math.PI;
      sectors[Math.min(11, Math.floor((a / (Math.PI * 2)) * 12))] += 1;
    }
    for (const n of sectors) expect(n).toBeGreaterThan(points.length / 12 / 4);
  });

  it("orange, plus sombre au coeur qu'au bout, calice vert", () => {
    const geo = makeCempasuchilGeometry(7);
    const col = geo.getAttribute("color");
    const pos = geo.getAttribute("position");
    let orange = 0;
    let green = 0;
    for (let i = 0; i < col.count; i++) {
      const r = col.getX(i), g = col.getY(i), b = col.getZ(i);
      if (pos.getY(i) <= CEMPASUCHIL_SPEC.calyx + 1e-6 && g > r) green += 1;
      else if (r > g && g > b) orange += 1;
    }
    expect(green).toBe(10 * 2 * 3);
    expect(orange).toBeGreaterThan(col.count * 0.9);
  });

  it("a une sphere englobante calculee (pret pour l'instanciation)", () => {
    const geo = makeCempasuchilGeometry(8);
    expect(geo.boundingSphere).not.toBeNull();
    expect(geo.boundingSphere!.radius).toBeGreaterThan(0);
  });
});
