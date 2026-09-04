/**
 * La fleche de Temiminaloyan modelisee (04/09, Sylvain : "un vrai modele
 * de fleche avec pointe en obsidienne ... on doit se rapprocher de cette
 * reference ... pense beaucoup a cet endroit").
 *
 * Ce que dit l'histoire (Mexicolore, History Skills, History on the Net,
 * verifie le 04/09) : les Mexicas avaient l'arc de guerre, tlahuitolli,
 * environ 1,5 m corde en tendon, et des fleches, mitl, a pointe
 * d'obsidienne, de silex, d'os ou d'arete, empennees de plumes de dinde,
 * portees dans un carquois. Les batailles s'ouvraient par des volees de
 * fleches et de dards. Temiminaloyan, le septieme passage du Mictlan, est
 * "le lieu ou l'on est crible de fleches" : la reference est juste.
 *
 * Anatomie retenue, du talon a la pointe, le long de +Y (la pointe en
 * haut, convention du composant qui oriente l'instance) :
 *  - l'ENCOCHE et l'EMPENNAGE : trois plumes fendues, radiales a 120
 *    degres, ligaturees ;
 *  - la HAMPE : roseau (carrizo) a NOEUDS, quatre renflements le long du
 *    fut, ce qui distingue une fleche de canne d'un baton ;
 *  - l'AVANT-FUT : segment de bois dur plus fonce et un peu plus epais,
 *    dans lequel la pointe est fichee ;
 *  - la LIGATURE de fibre qui fixe la pointe ;
 *  - la POINTE : biface d'obsidienne en feuille, arete mediane et bords
 *    en zigzag court, le negatif des eclats de taille.
 *
 * Une geometrie fusionnee avec GROUPES de materiaux (InstancedMesh les
 * accepte) : obsidienne polie pour la pointe, roseau mat pour la hampe,
 * fibre sombre pour les ligatures, plume mate double face. Pur,
 * deterministe, testable.
 */

import { BufferGeometry, Float32BufferAttribute } from "three";

/** Index des materiaux, dans l'ordre du tableau passe au mesh. */
export const ARROW_MATERIAL = {
  obsidian: 0,
  reed: 1,
  binding: 2,
  feather: 3,
} as const;

export type ArrowSpec = {
  /** Longueur totale, talon a pointe. */
  length: number;
  /** Rayon de la hampe. */
  shaftRadius: number;
  /** Longueur de la pointe d'obsidienne. */
  pointLength: number;
  /** Largeur maximale de la pointe. */
  pointWidth: number;
  /** Nombre de noeuds du roseau. */
  nodes: number;
  /** Longueur des plumes. */
  featherLength: number;
  /** Hauteur des plumes. */
  featherHeight: number;
};

// Proportions un peu plus fortes que nature (04/09, capture) : vue de la
// camera du Nord, une hampe a l'echelle se lisait comme un trait. Le
// rapport pointe/hampe/plumes reste celui d'une vraie fleche.
export const ARROW_SPEC: ArrowSpec = {
  length: 0.9,
  shaftRadius: 0.011,
  pointLength: 0.14,
  pointWidth: 0.042,
  nodes: 4,
  featherLength: 0.16,
  featherHeight: 0.032,
};

type Tri = [number, number, number][];

/** Anneau de `sides` sommets a la hauteur `y`. */
function ring(y: number, radius: number, sides: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    out.push([Math.cos(a) * radius, y, Math.sin(a) * radius]);
  }
  return out;
}

/** Bande de quads entre deux anneaux de meme cardinalite. */
function tube(a: [number, number, number][], b: [number, number, number][]): Tri {
  const tris: Tri = [];
  const n = a.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tris.push(a[i], b[i], b[j], a[i], b[j], a[j]);
  }
  return tris;
}

export function makeArrowGeometry(spec: ArrowSpec = ARROW_SPEC): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const groups: { start: number; count: number; material: number }[] = [];
  const startOf = () => positions.length / 3;
  const closeGroup = (start: number, material: number) => {
    const count = startOf() - start;
    if (count > 0) groups.push({ start, count, material });
  };
  const pushTris = (tris: Tri) => {
    for (let t = 0; t < tris.length; t += 3) {
      const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      for (const p of [a, b, c]) {
        positions.push(p[0], p[1], p[2]);
        normals.push(nx, ny, nz);
      }
    }
  };

  const half = spec.length / 2;
  const tipY = half;
  const nockY = -half;
  const sides = 8;
  const r = spec.shaftRadius;
  const pointBaseY = tipY - spec.pointLength;
  const foreshaftLen = spec.pointLength * 0.9;
  const foreshaftY = pointBaseY - foreshaftLen;
  const bindingLen = spec.pointLength * 0.22;
  const featherStart = nockY + spec.length * 0.03;

  // ---- Hampe de roseau : du talon a l'avant-fut, avec des noeuds
  // (renflements courts). Groupe roseau.
  {
    const start = startOf();
    const ys: { y: number; r: number }[] = [{ y: nockY, r: r * 0.85 }];
    const usable = foreshaftY - nockY;
    for (let k = 1; k <= spec.nodes; k++) {
      const yNode = nockY + (usable * k) / (spec.nodes + 1);
      const w = spec.length * 0.012;
      ys.push({ y: yNode - w, r: r }, { y: yNode - w * 0.4, r: r * 1.35 }, { y: yNode + w * 0.4, r: r * 1.35 }, { y: yNode + w, r: r });
    }
    ys.push({ y: foreshaftY, r: r });
    // Avant-fut de bois dur : un peu plus epais, jusqu'a la base de la pointe.
    ys.push({ y: foreshaftY + 0.002, r: r * 1.25 }, { y: pointBaseY, r: r * 1.1 });
    let prev = ring(ys[0].y, ys[0].r, sides);
    for (let i = 1; i < ys.length; i++) {
      const cur = ring(ys[i].y, ys[i].r, sides);
      pushTris(tube(prev, cur));
      prev = cur;
    }
    // Bouchon du talon.
    const cap = ring(nockY, r * 0.85, sides);
    const c: [number, number, number] = [0, nockY, 0];
    const tris: Tri = [];
    for (let i = 0; i < sides; i++) tris.push(c, cap[(i + 1) % sides], cap[i]);
    pushTris(tris);
    closeGroup(start, ARROW_MATERIAL.reed);
  }

  // ---- Ligatures de fibre : a la base de la pointe et au pied des plumes.
  {
    const start = startOf();
    for (const [y0, y1] of [
      [pointBaseY - bindingLen, pointBaseY + bindingLen * 0.35],
      [featherStart - spec.length * 0.008, featherStart + spec.length * 0.012],
      [featherStart + spec.featherLength - spec.length * 0.006, featherStart + spec.featherLength + spec.length * 0.012],
    ]) {
      const a = ring(y0, r * 1.5, sides);
      const b = ring(y1, r * 1.5, sides);
      pushTris(tube(a, b));
    }
    closeGroup(start, ARROW_MATERIAL.binding);
  }

  // ---- Pointe d'obsidienne : biface en feuille. Deux faces (x > 0 et
  // x < 0) tendues entre une arete mediane (dans le plan yz, epaisseur)
  // et un contour en zigzag court (les eclats de taille). Groupe obsidienne.
  {
    const start = startOf();
    const steps = 7;
    const thick = spec.pointWidth * 0.36;
    const outline: [number, number][] = []; // (y, demi-largeur) du talon de pointe au sommet
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      // Feuille : large au premier tiers, effilee vers la pointe.
      const w = spec.pointWidth * 0.5 * Math.sin(Math.min(1, 0.15 + u * 0.95) * Math.PI) ** 0.8;
      // Zigzag de taille : une dent sur deux.
      const notch = i === 0 || i === steps ? 0 : (i % 2 === 0 ? 1 : -1) * spec.pointWidth * 0.045;
      outline.push([pointBaseY + u * spec.pointLength, Math.max(0.0005, w + notch)]);
    }
    const tris: Tri = [];
    for (let i = 0; i < steps; i++) {
      const [y0, w0] = outline[i];
      const [y1, w1] = outline[i + 1];
      const t0 = i === 0 ? thick * 0.35 : thick * 0.5 * (1 - (i / steps) ** 2);
      const t1 = thick * 0.5 * (1 - ((i + 1) / steps) ** 2);
      // Arete mediane (epaisseur en x), bords en z.
      const ridge0p: [number, number, number] = [t0, y0, 0];
      const ridge0n: [number, number, number] = [-t0, y0, 0];
      const ridge1p: [number, number, number] = [t1, y1, 0];
      const ridge1n: [number, number, number] = [-t1, y1, 0];
      const edge0a: [number, number, number] = [0, y0, w0];
      const edge0b: [number, number, number] = [0, y0, -w0];
      const edge1a: [number, number, number] = [0, y1, w1];
      const edge1b: [number, number, number] = [0, y1, -w1];
      // Face +x, cote +z et cote -z ; face -x idem (ordre inverse).
      tris.push(ridge0p, edge0a, edge1a, ridge0p, edge1a, ridge1p);
      tris.push(ridge0p, ridge1p, edge1b, ridge0p, edge1b, edge0b);
      tris.push(ridge0n, edge1a, edge0a, ridge0n, ridge1n, edge1a);
      tris.push(ridge0n, edge0b, edge1b, ridge0n, edge1b, ridge1n);
    }
    pushTris(tris);
    closeGroup(start, ARROW_MATERIAL.obsidian);
  }

  // ---- Empennage : trois plumes fendues, radiales, effilees vers le
  // talon, legerement decalees (une vraie plume n'est pas un rectangle).
  {
    const start = startOf();
    const tris: Tri = [];
    const segs = 5;
    for (let f = 0; f < 3; f++) {
      const a = (f / 3) * Math.PI * 2;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      let prevIn: [number, number, number] | null = null;
      let prevOut: [number, number, number] | null = null;
      for (let i = 0; i <= segs; i++) {
        const u = i / segs; // du talon (0) vers la pointe (1)
        const y = featherStart + u * spec.featherLength;
        // Profil : monte vite, redescend en douceur vers l'avant.
        const h = spec.featherHeight * Math.sin(Math.min(1, u * 1.1) * Math.PI) ** 0.6;
        const inner: [number, number, number] = [dx * r * 1.05, y, dz * r * 1.05];
        const outer: [number, number, number] = [dx * (r + h), y + h * 0.15, dz * (r + h)];
        if (prevIn && prevOut) tris.push(prevIn, prevOut, outer, prevIn, outer, inner);
        prevIn = inner;
        prevOut = outer;
      }
    }
    pushTris(tris);
    closeGroup(start, ARROW_MATERIAL.feather);
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  for (const g of groups) geo.addGroup(g.start, g.count, g.material);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}
