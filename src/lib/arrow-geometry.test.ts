import { describe, expect, it } from "vitest";
import { ARROW_MATERIAL, ARROW_SPEC, makeArrowGeometry } from "./arrow-geometry";

function pointsOf(geo: ReturnType<typeof makeArrowGeometry>, start = 0, count?: number) {
  const pos = geo.getAttribute("position");
  const end = count === undefined ? pos.count : start + count;
  const out: { x: number; y: number; z: number }[] = [];
  for (let i = start; i < end; i++) out.push({ x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i) });
  return out;
}

describe("makeArrowGeometry (la fleche de Temiminaloyan)", () => {
  const geo = makeArrowGeometry();
  const groups = Object.fromEntries(geo.groups.map((g) => [g.materialIndex, g]));

  it("deterministe", () => {
    expect(Array.from(makeArrowGeometry().getAttribute("position").array)).toEqual(
      Array.from(geo.getAttribute("position").array)
    );
  });

  it("quatre groupes de materiaux, dans l'ordre obsidienne / roseau / ligature / plume", () => {
    expect(geo.groups).toHaveLength(4);
    for (const idx of Object.values(ARROW_MATERIAL)) expect(groups[idx]).toBeDefined();
    const all = geo.groups.reduce((s, g) => s + g.count, 0);
    expect(all).toBe(geo.getAttribute("position").count);
  });

  it("longueur totale = spec, centree sur l'origine, pointe en +Y", () => {
    const pts = pointsOf(geo);
    const ys = pts.map((p) => p.y);
    expect(Math.max(...ys)).toBeCloseTo(ARROW_SPEC.length / 2, 6);
    expect(Math.min(...ys)).toBeCloseTo(-ARROW_SPEC.length / 2, 6);
    const obsidian = groups[ARROW_MATERIAL.obsidian];
    const tipYs = pointsOf(geo, obsidian.start, obsidian.count).map((p) => p.y);
    expect(Math.max(...tipYs)).toBeCloseTo(ARROW_SPEC.length / 2, 6);
  });

  it("la pointe est une feuille : plus large que la hampe, bord en zigzag, mince", () => {
    const g = groups[ARROW_MATERIAL.obsidian];
    const pts = pointsOf(geo, g.start, g.count);
    const halfWidths = pts.map((p) => Math.abs(p.z));
    expect(Math.max(...halfWidths)).toBeGreaterThan(ARROW_SPEC.shaftRadius * 1.5);
    expect(Math.max(...halfWidths)).toBeLessThanOrEqual(ARROW_SPEC.pointWidth * 0.6);
    const thickness = Math.max(...pts.map((p) => Math.abs(p.x)));
    expect(thickness).toBeLessThan(Math.max(...halfWidths) * 0.6);
    // Zigzag : les demi-largeurs successives du contour ne sont pas monotones.
    const edge = pts.filter((p) => Math.abs(p.x) < 1e-9 && p.z > 0).map((p) => [p.y, p.z]).sort((a, b) => a[0] - b[0]);
    const uniq = edge.filter((e, i) => i === 0 || Math.abs(e[0] - edge[i - 1][0]) > 1e-6);
    let turns = 0;
    for (let i = 2; i < uniq.length; i++) {
      const d1 = uniq[i - 1][1] - uniq[i - 2][1];
      const d2 = uniq[i][1] - uniq[i - 1][1];
      if (d1 * d2 < 0) turns += 1;
    }
    expect(turns).toBeGreaterThanOrEqual(3);
  });

  it("la hampe a des noeuds : le rayon du roseau n'est pas constant", () => {
    const g = groups[ARROW_MATERIAL.reed];
    const radii = pointsOf(geo, g.start, g.count).map((p) => Math.hypot(p.x, p.z));
    const shaft = radii.filter((r) => r > 1e-6);
    expect(Math.max(...shaft) / Math.min(...shaft)).toBeGreaterThan(1.3);
  });

  it("trois plumes radiales au talon, jamais du cote de la pointe", () => {
    const g = groups[ARROW_MATERIAL.feather];
    const pts = pointsOf(geo, g.start, g.count);
    expect(Math.max(...pts.map((p) => p.y))).toBeLessThan(0);
    const angles = new Set(pts.filter((p) => Math.hypot(p.x, p.z) > ARROW_SPEC.shaftRadius * 1.5).map((p) => Math.round(((Math.atan2(p.z, p.x) + Math.PI * 2) % (Math.PI * 2)) * 10)));
    expect(angles.size).toBe(3);
  });

  it("tout tient sur l'axe : rien ne depasse l'empennage, la partie la plus large", () => {
    const pts = pointsOf(geo);
    const widest = Math.max(ARROW_SPEC.pointWidth * 0.6, ARROW_SPEC.shaftRadius + ARROW_SPEC.featherHeight);
    expect(Math.max(...pts.map((p) => Math.hypot(p.x, p.z)))).toBeLessThanOrEqual(widest + 1e-6);
  });

  it("normales unitaires et boite englobante calculee", () => {
    const n = geo.getAttribute("normal");
    for (let i = 0; i < n.count; i += 97) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 6);
    expect(geo.boundingBox).not.toBeNull();
  });
});
