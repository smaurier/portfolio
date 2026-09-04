/**
 * La cempasuchil modelisee (04/09, retour Sylvain : "on ne les identifie
 * pas du tout comme telles", puis "va pour le modele que tu controles").
 *
 * Tagetes erecta, la fleur des morts : un capitule DOUBLE, une boule dense
 * de dizaines de ligules froissees, orange a coeur plus sombre, portee par
 * un calice vert court. Ce qui la rend reconnaissable de loin, ce n'est
 * pas le detail d'un petale mais la DENSITE : des couches concentriques
 * de petales courts et gondoles qui ferment une sphere, les couches
 * externes plus ouvertes et plus longues, les internes dressees. C'est
 * donc une boule de petales que l'on construit, pas une marguerite.
 *
 * Construction : les petales sont places par phyllotaxie (angle d'or)
 * sur une calotte, chaque petale est une bande de quelques segments
 * courbee vers l'exterieur et ondulee sur ses bords, coloree par vertex
 * (base plus sombre, bout plus clair, legere variation par petale). Une
 * seule geometrie fusionnee par variante, destinee a un InstancedMesh.
 *
 * Deterministe par graine : testable, et deux variantes suffisent a
 * casser la repetition.
 */

import { BufferGeometry, Color, Float32BufferAttribute } from "three";

export type CempasuchilSpec = {
  /** Nombre de petales de la boule. */
  petals: number;
  /** Rayon de la boule (unites monde). */
  radius: number;
  /** Segments le long du petale (2 = plat, 4 = bien courbe). */
  segments: number;
  /** Hauteur du calice sous la boule. */
  calyx: number;
};

export const CEMPASUCHIL_SPEC: CempasuchilSpec = {
  petals: 96,
  // 0.055 -> 0.075 (04/09) : a la distance de la camera, en dessous la
  // boule se lisait comme un bouton, pas comme une fleur.
  radius: 0.075,
  segments: 4,
  calyx: 0.02,
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const ORANGE_BASE = new Color("#c2470a");
const ORANGE_TIP = new Color("#ffa030");
const CALYX_GREEN = new Color("#3f6b2a");

function hash(seed: number, i: number, k: number): number {
  const v = Math.sin(seed * 91.7 + i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Geometrie fusionnee d'une cempasuchil : boule de petales + calice, pied
 *  du calice a y = 0, axe Y vers le haut, centree en xz. Deterministe. */
export function makeCempasuchilGeometry(seed: number, spec: CempasuchilSpec = CEMPASUCHIL_SPEC): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const centerY = spec.calyx + spec.radius * 0.85; // la boule repose sur le calice
  const tmp = new Color();

  // ---- Boule de petales : phyllotaxie sur une calotte (du sommet vers
  // l'equateur, un peu en dessous), les derniers petales places sont les
  // plus bas et les plus ouverts.
  for (let i = 0; i < spec.petals; i++) {
    const t = (i + 0.5) / spec.petals; // 0 = sommet, 1 = bord inferieur
    const polar = t * Math.PI * 0.62; // calotte : jusqu'a ~112 deg
    const azimuth = i * GOLDEN_ANGLE + hash(seed, i, 1) * 0.35;
    // Direction radiale de l'insertion du petale sur la boule.
    const dx = Math.sin(polar) * Math.cos(azimuth);
    const dy = Math.cos(polar);
    const dz = Math.sin(polar) * Math.sin(azimuth);
    // Longueur : les petales externes (bas) sont plus longs et plus ouverts.
    const length = spec.radius * (0.55 + 0.5 * t) * (0.85 + 0.3 * hash(seed, i, 2));
    const width = spec.radius * 0.42 * (0.8 + 0.4 * hash(seed, i, 3));
    // Repere local du petale : `up` = direction radiale (le petale pousse
    // vers l'exterieur), `side` = tangente horizontale.
    const sideX = -Math.sin(azimuth);
    const sideZ = Math.cos(azimuth);
    // Le petale s'incline vers le haut par rapport a la radiale (les
    // ligules se dressent), davantage au sommet.
    const lift = 0.55 - 0.35 * t;
    const shade = hash(seed, i, 4);
    const rootX = dx * spec.radius * 0.55;
    const rootY = centerY + dy * spec.radius * 0.55;
    const rootZ = dz * spec.radius * 0.55;
    const ruffle = hash(seed, i, 5) * Math.PI * 2;
    const rows: number[][] = [];
    for (let s = 0; s <= spec.segments; s++) {
      const u = s / spec.segments; // le long du petale
      // Courbure : le petale se recourbe vers l'exterieur puis vers le bas
      // en son bout (froisse), amplitude croissante avec t.
      const curl = u * u * (0.35 + 0.45 * t);
      const px = rootX + (dx + sideX * 0) * length * u - dy * dx * curl * length * 0.6;
      const py = rootY + (dy * (1 - curl) + lift * (1 - u) * 0.6) * length * u;
      const pz = rootZ + dz * length * u - dy * dz * curl * length * 0.6;
      // Largeur : effilee a la base, large puis arrondie au bout, bord ondule.
      const w = width * Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.5) * (1 + 0.18 * Math.sin(ruffle + u * 9));
      rows.push([px - sideX * w, py + 0.15 * w * Math.sin(ruffle + u * 7), pz - sideZ * w, px + sideX * w, py - 0.15 * w * Math.sin(ruffle + u * 7), pz + sideZ * w, u]);
    }
    for (let s = 0; s < spec.segments; s++) {
      const a = rows[s];
      const b = rows[s + 1];
      const quad = [
        [a[0], a[1], a[2], a[6]],
        [a[3], a[4], a[5], a[6]],
        [b[3], b[4], b[5], b[6]],
        [a[0], a[1], a[2], a[6]],
        [b[3], b[4], b[5], b[6]],
        [b[0], b[1], b[2], b[6]],
      ];
      for (const v of quad) {
        positions.push(v[0], v[1], v[2]);
        // Normale : la radiale (les deux faces sont rendues), suffisante
        // pour une boule aussi dense.
        normals.push(dx, dy, dz);
        tmp.copy(ORANGE_BASE).lerp(ORANGE_TIP, Math.min(1, v[3] * 1.2)).offsetHSL((shade - 0.5) * 0.02, 0, (shade - 0.5) * 0.08);
        colors.push(tmp.r, tmp.g, tmp.b);
      }
    }
  }

  // ---- Calice : petit tronc de cone vert sous la boule.
  const calyxSides = 10;
  const rTop = spec.radius * 0.42;
  const rBottom = spec.radius * 0.3;
  for (let s = 0; s < calyxSides; s++) {
    const a0 = (s / calyxSides) * Math.PI * 2;
    const a1 = ((s + 1) / calyxSides) * Math.PI * 2;
    const ring = (a: number, r: number, y: number) => [Math.cos(a) * r, y, Math.sin(a) * r];
    const p0 = ring(a0, rBottom, 0);
    const p1 = ring(a1, rBottom, 0);
    const p2 = ring(a1, rTop, spec.calyx);
    const p3 = ring(a0, rTop, spec.calyx);
    for (const v of [p0, p1, p2, p0, p2, p3]) {
      positions.push(v[0], v[1], v[2]);
      const n = Math.hypot(v[0], v[2]) || 1;
      normals.push(v[0] / n, 0.2, v[2] / n);
      colors.push(CALYX_GREEN.r, CALYX_GREEN.g, CALYX_GREEN.b);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  return geo;
}
