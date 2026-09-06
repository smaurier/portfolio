/**
 * Les feuilles et les cendres de l'Ouest (06/09, etape 5 du chantier
 * Cihuatlampa) : Ehecatl « balaie la route » (Sahagun, livre I). Au sol,
 * des feuilles seches et des flocons de cendre filent dans le sens du
 * vent, rasent l'herbe, sautent sur une rafale, retombent, et reviennent
 * par l'amont quand elles sortent de l'etendue. Partie pure.
 */

export const WEST_LEAVES = {
  count: 240,
  /** Demi-largeur de l'etendue balayee (u), meme ordre que la prairie. */
  extent: 16,
  /** Hauteur maximale d'un saut (u). */
  maxLift: 1.1,
  /** Poids : comment vite elles retombent. */
  gravity: 2.6,
  /** Reponse au vent horizontal (feuille legere > cendre). */
  drag: 2.2,
};

export type Leaf = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Rotation propre (rad) et sa vitesse. */
  spin: number;
  spinRate: number;
  /** 0 = cendre (petite, sombre), 1 = feuille (plus grande, brune). */
  kind: number;
  /** Taille relative. */
  size: number;
  /** Phase de la rafale propre. */
  phase: number;
};

function hash(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233 + 7.7) * 43758.5453;
  return v - Math.floor(v);
}

export function initLeaf(seed: number): Leaf {
  const e = WEST_LEAVES.extent;
  return {
    x: (hash(seed, 1) * 2 - 1) * e,
    y: hash(seed, 2) * 0.15,
    z: (hash(seed, 3) * 2 - 1) * e,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: hash(seed, 4) * Math.PI * 2,
    spinRate: (hash(seed, 5) - 0.5) * 8,
    kind: hash(seed, 6) < 0.6 ? 0 : 1,
    size: 0.7 + hash(seed, 7) * 0.6,
    phase: hash(seed, 8) * Math.PI * 2,
  };
}

/** Une image : le vent horizontal `wind` (u/s, deja module par les
 * rafales), le sol `ground(x, z)`, l'instant `t`. */
export function stepLeaf(leaf: Leaf, dt: number, wind: { x: number; z: number }, t: number, ground: (x: number, z: number) => number): void {
  const c = WEST_LEAVES;
  const gy = ground(leaf.x, leaf.z);
  const onGround = leaf.y - gy < 0.02;
  // Le vent pousse ; une feuille reagit plus vite qu'un flocon de cendre.
  const drag = c.drag * (0.8 + 0.5 * leaf.kind);
  leaf.vx += (wind.x * (1.3 + 0.4 * Math.sin(t * 1.7 + leaf.phase)) - leaf.vx) * drag * dt;
  leaf.vz += (wind.z * 1.3 + 0.35 * Math.sin(t * 2.3 + leaf.phase * 2) - leaf.vz) * drag * dt;
  // Une rafale la souleve de temps en temps ; sinon elle retombe.
  const gust = Math.max(0, Math.sin(t * 0.9 + leaf.phase) + Math.sin(t * 2.9 + leaf.phase * 1.7) - 1.2);
  const speed = Math.hypot(leaf.vx, leaf.vz);
  if (onGround && gust > 0 && speed > 0.2) leaf.vy = Math.min(c.maxLift, gust * 2.4 * (0.6 + 0.4 * leaf.kind));
  leaf.vy -= c.gravity * dt;
  leaf.x += leaf.vx * dt;
  leaf.y += leaf.vy * dt;
  leaf.z += leaf.vz * dt;
  const g2 = ground(leaf.x, leaf.z);
  if (leaf.y < g2) {
    leaf.y = g2;
    leaf.vy = 0;
  }
  // Elle tourne d'autant plus qu'elle va vite.
  leaf.spin += leaf.spinRate * dt * (0.4 + speed) + dt * 0.5;
  // Recyclage par l'amont, dans le sens du vent.
  const e = c.extent;
  if (leaf.x > e || leaf.x < -e || leaf.z > e || leaf.z < -e) {
    const wx = Math.sign(wind.x || 1), wz = Math.sign(wind.z || 0);
    const k = hash(Math.floor(t * 60) + leaf.phase * 100, 9);
    if (Math.abs(leaf.x) > e) {
      leaf.x = -wx * e * 0.98;
      leaf.z = (k * 2 - 1) * e;
    } else {
      leaf.z = -(wz || (k > 0.5 ? 1 : -1)) * e * 0.98;
      leaf.x = (k * 2 - 1) * e;
    }
    leaf.y = ground(leaf.x, leaf.z) + hash(k * 977, 10) * 0.3;
    leaf.vy = 0;
  }
}
