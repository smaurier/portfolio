/**
 * Le givre qui gagne l'ecran (06/09, Est, marche arriere : Sylvain « ca
 * regele et gele pendant quelques instants l'ecran, utilise un
 * simulateur »). Un automate de croissance sur une grille : les cellules
 * gelees contaminent leurs voisines avec une probabilite qui depend d'un
 * champ d'orientation (les cristaux poussent en branches, pas en tache),
 * depuis les bords de l'ecran et quelques graines. Chaque cellule garde
 * l'instant ou elle a gele : le rendu eclaire les bords recents, et la
 * fonte retire les cellules dans l'ordre inverse. Pur, teste, sans DOM.
 */

export type FrostGrid = {
  w: number;
  h: number;
  /** 0 = libre, sinon le tick ou la cellule a gele (>= 1). */
  cells: Uint32Array;
  /** Orientation locale des cristaux (rad), par cellule. */
  angle: Float32Array;
  tick: number;
  /** Frontiere : cellules gelees ayant encore un voisin libre. */
  front: number[];
};

function hash2(x: number, y: number, k: number): number {
  const v = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453;
  return v - Math.floor(v);
}

export function createFrostGrid(w: number, h: number): FrostGrid {
  const angle = new Float32Array(w * h);
  // Champ d'orientation lisse : bruit de valeur a grosse maille, hexagonal
  // par morceaux (six directions), d'ou des fougeres de givre.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = Math.floor(x / 12), cy = Math.floor(y / 12);
      const fx = (x / 12) % 1, fy = (y / 12) % 1;
      const a = hash2(cx, cy, 1), b = hash2(cx + 1, cy, 1), c = hash2(cx, cy + 1, 1), d = hash2(cx + 1, cy + 1, 1);
      const n = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
      angle[y * w + x] = Math.round(n * 6) * (Math.PI / 3);
    }
  }
  return { w, h, cells: new Uint32Array(w * h), angle, tick: 0, front: [] };
}

function freeze(g: FrostGrid, i: number): void {
  if (g.cells[i] !== 0) return;
  g.cells[i] = g.tick;
  g.front.push(i);
}

/** Graines : tout le bord de l'ecran, clairseme, plus quelques cristaux isoles. */
export function seedFrost(g: FrostGrid, random: () => number): void {
  g.tick = 1;
  const { w, h } = g;
  for (let x = 0; x < w; x++) {
    if (random() < 0.35) freeze(g, x);
    if (random() < 0.35) freeze(g, (h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    if (random() < 0.35) freeze(g, y * w);
    if (random() < 0.35) freeze(g, y * w + w - 1);
  }
  const seeds = Math.max(2, Math.floor((w * h) / 900));
  for (let k = 0; k < seeds; k++) {
    // Jamais au centre : le centre gele en dernier.
    const x = Math.floor(random() * w), y = Math.floor(random() * h);
    const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
    if (dx * dx + dy * dy > 0.45) freeze(g, y * w + x);
  }
}

const NEIGHBOURS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];

/** `steps` generations de croissance. */
export function growFrost(g: FrostGrid, steps: number, random: () => number): void {
  const { w, h, cells, angle } = g;
  for (let s = 0; s < steps; s++) {
    g.tick += 1;
    const front = g.front;
    const next: number[] = [];
    for (let f = 0; f < front.length; f++) {
      const i = front[f];
      const x = i % w, y = (i - x) / w;
      const a = angle[i];
      const ca = Math.cos(a), sa = Math.sin(a);
      let stillFront = false;
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (cells[j] !== 0) continue;
        stillFront = true;
        // Le long de l'axe du cristal (et de ses branches a 60 deg) ca pousse
        // vite ; en travers, lentement : des fougeres.
        const len = Math.hypot(dx, dy);
        const along = Math.abs((dx * ca + dy * sa) / len);
        const branch = Math.abs(Math.cos(Math.atan2(dy, dx) - a - Math.PI / 3)) + Math.abs(Math.cos(Math.atan2(dy, dx) - a + Math.PI / 3));
        const p = 0.03 + 0.2 * along * along + 0.06 * (branch - 1);
        if (random() < p) freeze(g, j);
      }
      if (stillFront) next.push(i);
    }
    g.front = next;
  }
}

/** Ne garde que les cellules gelees avant la fraction `keep` (0..1) de
 * l'histoire : les plus recentes fondent d'abord. keep = 0 : tout fond. */
export function meltFrost(g: FrostGrid, keep: number): void {
  const { cells } = g;
  // L'histoire reelle : le dernier tick ou une cellule a gele (la grille
  // peut etre pleine bien avant g.tick).
  let last = 1;
  for (let i = 0; i < cells.length; i++) if (cells[i] > last) last = cells[i];
  const limit = keep <= 0 ? 0 : 1 + keep * (last - 1);
  for (let i = 0; i < cells.length; i++) if (cells[i] > limit) cells[i] = 0;
  g.front = [];
  if (keep <= 0) g.tick = 0;
}

export function coverage(g: FrostGrid): number {
  let n = 0;
  for (const v of g.cells) if (v !== 0) n++;
  return n / g.cells.length;
}
