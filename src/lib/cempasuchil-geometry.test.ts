import { describe, expect, it } from "vitest";
import {
  CALYX_SIDES,
  CEMPASUCHIL_SPEC,
  RECEPTACLE_MERIDIENS,
  RECEPTACLE_PARALLELES,
  demiLargeurLigule,
  makeCempasuchilGeometry,
} from "./cempasuchil-geometry";

function positionsOf(seed: number) {
  const geo = makeCempasuchilGeometry(seed);
  const pos = geo.getAttribute("position");
  const out: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < pos.count; i++) out.push({ x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i) });
  return { geo, points: out };
}

describe("demiLargeurLigule (le profil d'un ligule sur sa longueur)", () => {
  it("part de rien a la base", () => {
    expect(demiLargeurLigule(0)).toBeCloseTo(0, 6);
  });

  it("atteint sa pleine largeur sur le corps", () => {
    expect(demiLargeurLigule(0.5)).toBeCloseTo(1, 6);
    expect(demiLargeurLigule(0.7)).toBeCloseTo(1, 6);
  });

  it("NE SE FERME PAS EN POINTE : le bout est arrondi, pas un fer de lance", () => {
    // Le dernier segment couvre un tiers de la longueur : une fermeture a
    // zero donnait un triangle pointu la ou un ligule a un bout large.
    expect(demiLargeurLigule(1)).toBeGreaterThan(0.35);
    expect(demiLargeurLigule(1)).toBeLessThan(0.55);
  });

  it("ne remonte jamais : la largeur est croissante puis decroissante", () => {
    let sommetVu = false;
    let precedent = demiLargeurLigule(0);
    for (let u = 0.02; u <= 1.0001; u += 0.02) {
      const w = demiLargeurLigule(u);
      if (w < precedent - 1e-9) sommetVu = true;
      else if (sommetVu) expect(w).toBeLessThanOrEqual(precedent + 1e-9);
      precedent = w;
    }
    expect(sommetVu).toBe(true);
  });
});

describe("makeCempasuchilGeometry (la boule de ligules de la fleur des morts)", () => {
  it("deterministe par graine, et deux graines different", () => {
    const a = makeCempasuchilGeometry(1).getAttribute("position").array;
    const b = makeCempasuchilGeometry(1).getAttribute("position").array;
    const c = makeCempasuchilGeometry(2).getAttribute("position").array;
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a)).not.toEqual(Array.from(c));
  });

  it("chaque ligule est une gouttiere de `segments` rangees a DEUX versants, plus le receptacle et le calice", () => {
    const geo = makeCempasuchilGeometry(3);
    // Deux quads par segment (le versant gauche et le versant droit du pli),
    // donc quatre triangles : c'est le pli qui double la facture, et c'est
    // lui qui fait la fleur.
    const ligules = CEMPASUCHIL_SPEC.petals * CEMPASUCHIL_SPEC.segments * 4;
    const receptacle = RECEPTACLE_MERIDIENS * RECEPTACLE_PARALLELES * 2;
    const calice = CALYX_SIDES * 2;
    expect(geo.getAttribute("position").count).toBe((ligules + receptacle + calice) * 3);
  });

  it("pied du calice a y = 0, rien sous le sol", () => {
    const { points } = positionsOf(4);
    const minY = Math.min(...points.map((p) => p.y));
    expect(minY).toBeCloseTo(0, 6);
  });

  it("une BOULE : les ligules tiennent dans une sphere proche du rayon, centree en xz", () => {
    const { points } = positionsOf(5);
    const r = CEMPASUCHIL_SPEC.radius;
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cz = points.reduce((s, p) => s + p.z, 0) / points.length;
    expect(Math.abs(cx)).toBeLessThan(r * 0.15);
    expect(Math.abs(cz)).toBeLessThan(r * 0.15);
    const maxXZ = Math.max(...points.map((p) => Math.hypot(p.x, p.z)));
    expect(maxXZ).toBeLessThan(r * 2.0);
    expect(maxXZ).toBeGreaterThan(r * 0.7);
  });

  it("UNE BOULE ET NON UN OVOIDE : aussi haute que large, a un quart pres", () => {
    // Le defaut du 16/09 : les ligules externes se rabattaient a la
    // verticale et faisaient une jupe qui pendait sous le calice. Une fleur
    // deux fois plus haute que large ne se lit plus comme un pompon.
    const { points } = positionsOf(9);
    const largeur = 2 * Math.max(...points.map((p) => Math.hypot(p.x, p.z)));
    const hauteur = Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));
    expect(hauteur / largeur).toBeGreaterThan(0.75);
    expect(hauteur / largeur).toBeLessThan(1.25);
  });

  it("dense : les ligules couvrent tout le tour, aucun secteur vide", () => {
    const { points } = positionsOf(6);
    const sectors = new Array(12).fill(0);
    for (const p of points) {
      if (p.y < CEMPASUCHIL_SPEC.calyx * 1.5) continue; // hors calice
      const a = Math.atan2(p.z, p.x) + Math.PI;
      sectors[Math.min(11, Math.floor((a / (Math.PI * 2)) * 12))] += 1;
    }
    for (const n of sectors) expect(n).toBeGreaterThan(points.length / 12 / 4);
  });

  it("UN LIGULE EST UNE GOUTTIERE : ses deux bords ne sont pas alignes avec son fond", () => {
    // Sans le pli, les trois sommets d'une rangee sont colineaires et le
    // ligule est une lamelle plate : c'etait le defaut d'origine. Le pli se
    // lit comme une aire non nulle du triangle (bord, fond, bord).
    const { points } = positionsOf(3);
    const aires: number[] = [];
    // Un segment emet douze sommets : six pour le versant gauche, six pour
    // le droit. On lit la rangee du LOIN de chaque segment (decalages 5, 2
    // et 8) : celle du pres, au tout premier segment, est la base du ligule,
    // ou la largeur vaut zero par construction et ou les trois sommets se
    // confondent legitimement.
    for (let i = 0; i + 8 < CEMPASUCHIL_SPEC.petals * CEMPASUCHIL_SPEC.segments * 4 * 3; i += 12) {
      const a = points[i + 5], b = points[i + 2], c = points[i + 8];
      const ab = [b.x - a.x, b.y - a.y, b.z - a.z];
      const ac = [c.x - a.x, c.y - a.y, c.z - a.z];
      const n = [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
      ];
      aires.push(Math.hypot(n[0], n[1], n[2]));
    }
    const plats = aires.filter((a) => a < 1e-9).length;
    expect(plats).toBe(0);
  });

  it("les normales sont unitaires et varient : ce sont des normales de SURFACE", () => {
    // Le defaut d'origine : toutes les normales valaient la direction
    // d'insertion du ligule, donc une couche entiere s'eclairait d'un bloc.
    const geo = makeCempasuchilGeometry(3);
    const nor = geo.getAttribute("normal");
    const vues = new Set<string>();
    for (let i = 0; i < nor.count; i++) {
      const l = Math.hypot(nor.getX(i), nor.getY(i), nor.getZ(i));
      expect(l).toBeCloseTo(1, 5);
      vues.add(`${nor.getX(i).toFixed(2)},${nor.getY(i).toFixed(2)},${nor.getZ(i).toFixed(2)}`);
    }
    // Trois sommets d'un meme triangle partagent rarement leur normale : il
    // doit y en avoir bien plus qu'une par ligule.
    expect(vues.size).toBeGreaterThan(CEMPASUCHIL_SPEC.petals * 4);
  });

  it("UN RECEPTACLE bouche le coeur : on ne voit jamais le fond a travers la fleur", () => {
    const { points } = positionsOf(3);
    const r = CEMPASUCHIL_SPEC.radius;
    const centreY = points.reduce((s, p) => Math.max(s, p.y), 0) * 0.5;
    const auCoeur = points.filter((p) => Math.hypot(p.x, p.y - centreY, p.z) < r * 0.6).length;
    expect(auCoeur).toBeGreaterThan(RECEPTACLE_MERIDIENS * RECEPTACLE_PARALLELES);
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
    expect(green).toBe(CALYX_SIDES * 2 * 3);
    expect(orange).toBeGreaterThan(col.count * 0.9);
  });

  it("a une sphere englobante calculee (pret pour l'instanciation)", () => {
    const geo = makeCempasuchilGeometry(8);
    expect(geo.boundingSphere).not.toBeNull();
    expect(geo.boundingSphere!.radius).toBeGreaterThan(0);
  });
});
