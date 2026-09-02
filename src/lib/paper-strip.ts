/**
 * Simulateur de papier (02/09, Nord : bandelettes d'amate aux bois et sur
 * le dos du cerf, demande Sylvain "est-ce que tu as un simulateur de
 * papier ?"). Mythologie : les morts etaient enterres avec des vetements
 * de papier pour se proteger du vent d'obsidienne d'Itzehecayan (cf
 * lib/obsidian-wind.ts) : ces bandelettes sont cette protection.
 *
 * Modele : chaine de points en integration de Verlet (position + position
 * precedente, pas de vitesse explicite), premier point epingle a l'ancre,
 * gravite legere (papier), vent en acceleration, amortissement, puis
 * contraintes de distance resolues par relaxation (Jakobsen). Pur, sans
 * three : testable, et rendu a part (ruban) par le composant.
 */

export type P3 = { x: number; y: number; z: number };

export type Strip = {
  points: P3[];
  prev: P3[];
  /** Longueur d'un segment. */
  segment: number;
};

export type StripOptions = {
  /** Gravite effective (papier : legere). */
  gravity: number;
  /** Amortissement de la vitesse par pas (0..1). */
  damping: number;
  /** Iterations de relaxation des contraintes. */
  iterations: number;
  /** Reponse au vent (acceleration = vent * windResponse). */
  windResponse: number;
};

const DEFAULTS: StripOptions = { gravity: 3.5, damping: 0.985, iterations: 6, windResponse: 1.2 };
const MAX_DT = 1 / 30;

export function createStrip(count: number, length: number, anchor: P3): Strip {
  const n = Math.max(2, Math.floor(count));
  const segment = length / (n - 1);
  const points: P3[] = [];
  const prev: P3[] = [];
  for (let i = 0; i < n; i++) {
    const p = { x: anchor.x, y: anchor.y - i * segment, z: anchor.z };
    points.push(p);
    prev.push({ ...p });
  }
  return { points, prev, segment };
}

/** Un pas de simulation. `anchor` : position monde de l'epingle (peut
 * bouger, la bandelette suit). `wind` : vent monde (unites/s). */
export function stepStrip(strip: Strip, dt: number, anchor: P3, wind: P3, options: Partial<StripOptions> = {}): void {
  const { gravity, damping, iterations, windResponse } = { ...DEFAULTS, ...options };
  const h = Math.min(MAX_DT, Math.max(0, dt));
  const h2 = h * h;
  const { points, prev, segment } = strip;
  const n = points.length;

  // Epingle.
  points[0].x = anchor.x;
  points[0].y = anchor.y;
  points[0].z = anchor.z;
  prev[0].x = anchor.x;
  prev[0].y = anchor.y;
  prev[0].z = anchor.z;

  // Verlet sur les points libres.
  for (let i = 1; i < n; i++) {
    const p = points[i];
    const q = prev[i];
    const vx = (p.x - q.x) * damping;
    const vy = (p.y - q.y) * damping;
    const vz = (p.z - q.z) * damping;
    q.x = p.x;
    q.y = p.y;
    q.z = p.z;
    p.x += vx + wind.x * windResponse * h2;
    p.y += vy + (wind.y * windResponse - gravity) * h2;
    p.z += vz + wind.z * windResponse * h2;
  }

  // Contraintes de distance (le premier point ne bouge jamais).
  for (let it = 0; it < iterations; it++) {
    for (let i = 1; i < n; i++) {
      const a = points[i - 1];
      const b = points[i];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dz = b.z - a.z;
      let len = Math.hypot(dx, dy, dz);
      if (len < 1e-6) {
        dy = -1e-6;
        len = 1e-6;
      }
      const diff = (len - segment) / len;
      if (i === 1) {
        b.x -= dx * diff;
        b.y -= dy * diff;
        b.z -= dz * diff;
      } else {
        const half = diff * 0.5;
        a.x += dx * half;
        a.y += dy * half;
        a.z += dz * half;
        b.x -= dx * half;
        b.y -= dy * half;
        b.z -= dz * half;
      }
    }
  }
}
