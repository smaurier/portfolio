/**
 * La vaporisation des fleches (04/09, Sylvain : "les fleches doivent etre
 * totalement d'obsidienne et, au bout de quelques secondes plantees, elles
 * se vaporisent en fumee noire et particules").
 *
 * Une fleche du Mictlan n'est pas un objet, c'est une apparition : elle
 * se plante, tient quelques secondes, puis redevient ce dont elle est
 * faite, le vent d'obsidienne. Deux familles de particules naissent le
 * long de la hampe :
 *  - la FUMEE : lente, elle monte (flottabilite), s'elargit et s'eteint
 *    en s'etirant, noire comme la pierre ;
 *  - les ECLATS : petits fragments durs projetes en gerbe, qui retombent
 *    sous la gravite et s'eteignent vite.
 *
 * Pur et deterministe : l'emission, le pas de temps et l'opacite sont des
 * fonctions ; le composant ne fait que copier dans les attributs.
 */

export type VaporKind = 0 | 1;
export const VAPOR_SMOKE: VaporKind = 0;
export const VAPOR_SHARD: VaporKind = 1;

export type VaporParticle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  /** Taille de reference (unites monde, diametre au pic pour la fumee). */
  size: number;
  kind: VaporKind;
};

export type Vec3 = { x: number; y: number; z: number };

export const SMOKE_PER_ARROW = 22;
export const SHARDS_PER_ARROW = 14;
export const PARTICLES_PER_ARROW = SMOKE_PER_ARROW + SHARDS_PER_ARROW;
/** Vie maximale d'une particule, toutes familles : la borne du pool. */
export const VAPOR_MAX_LIFE = 2.4;

const SMOKE_RISE = 0.35; // flottabilite (u/s^2)
const SMOKE_DRAG = 1.1; // /s
const SHARD_GRAVITY = 4.5;
const SHARD_DRAG = 0.6;

function hash(seed: number, i: number, k: number): number {
  const v = Math.sin(seed * 91.7 + i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Deux vecteurs unitaires perpendiculaires a `axis`. */
function frame(axis: Vec3): [Vec3, Vec3] {
  const ref = Math.abs(axis.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const ux = axis.y * ref.z - axis.z * ref.y;
  const uy = axis.z * ref.x - axis.x * ref.z;
  const uz = axis.x * ref.y - axis.y * ref.x;
  const l = Math.hypot(ux, uy, uz) || 1;
  const u = { x: ux / l, y: uy / l, z: uz / l };
  const v = {
    x: axis.y * u.z - axis.z * u.y,
    y: axis.z * u.x - axis.x * u.z,
    z: axis.x * u.y - axis.y * u.x,
  };
  return [u, v];
}

/**
 * Les particules d'une fleche qui se vaporise.
 * @param origin centre de la hampe (monde)
 * @param axis   axe unitaire de la hampe, de la pointe vers le talon
 * @param length longueur de la hampe
 */
export function spawnVapor(seed: number, origin: Vec3, axis: Vec3, length: number): VaporParticle[] {
  const out: VaporParticle[] = [];
  const [u, v] = frame(axis);
  for (let i = 0; i < SMOKE_PER_ARROW; i++) {
    const t = hash(seed, i, 1) - 0.5; // le long de la hampe
    const a = hash(seed, i, 2) * Math.PI * 2;
    const r = 0.02 + 0.04 * hash(seed, i, 3);
    const lateral = 0.06 + 0.1 * hash(seed, i, 4);
    out.push({
      x: origin.x + axis.x * t * length + (u.x * Math.cos(a) + v.x * Math.sin(a)) * r,
      y: origin.y + axis.y * t * length + (u.y * Math.cos(a) + v.y * Math.sin(a)) * r,
      z: origin.z + axis.z * t * length + (u.z * Math.cos(a) + v.z * Math.sin(a)) * r,
      vx: (u.x * Math.cos(a) + v.x * Math.sin(a)) * lateral,
      vy: 0.2 + 0.3 * hash(seed, i, 5),
      vz: (u.z * Math.cos(a) + v.z * Math.sin(a)) * lateral,
      age: -0.06 * hash(seed, i, 6), // naissance echelonnee
      life: 1.4 + 0.8 * hash(seed, i, 7),
      size: 0.22 + 0.22 * hash(seed, i, 8),
      kind: VAPOR_SMOKE,
    });
  }
  for (let i = 0; i < SHARDS_PER_ARROW; i++) {
    const t = hash(seed, i, 11) - 0.5;
    const a = hash(seed, i, 12) * Math.PI * 2;
    const speed = 0.6 + 0.9 * hash(seed, i, 13);
    out.push({
      x: origin.x + axis.x * t * length,
      y: origin.y + axis.y * t * length,
      z: origin.z + axis.z * t * length,
      vx: (u.x * Math.cos(a) + v.x * Math.sin(a)) * speed,
      vy: 0.4 + 0.9 * hash(seed, i, 14),
      vz: (u.z * Math.cos(a) + v.z * Math.sin(a)) * speed,
      age: 0,
      life: 0.7 + 0.4 * hash(seed, i, 15),
      size: 0.018 + 0.02 * hash(seed, i, 16),
      kind: VAPOR_SHARD,
    });
  }
  return out;
}

/** Un pas de simulation, en place. */
export function stepVapor(particles: VaporParticle[], dt: number): void {
  for (const p of particles) {
    p.age += dt;
    if (p.age < 0) continue;
    if (p.kind === VAPOR_SMOKE) {
      p.vy += SMOKE_RISE * dt;
      const k = Math.exp(-SMOKE_DRAG * dt);
      p.vx *= k;
      p.vz *= k;
    } else {
      p.vy -= SHARD_GRAVITY * dt;
      const k = Math.exp(-SHARD_DRAG * dt);
      p.vx *= k;
      p.vz *= k;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
  }
}

export function isVaporAlive(p: VaporParticle): boolean {
  return p.age < p.life;
}

/** Opacite dans [0, 1] : la fumee nait vite et s'eteint longuement, un
 *  eclat reste net puis s'eteint d'un coup. Zero avant la naissance et
 *  apres la mort. */
export function vaporAlpha(p: VaporParticle): number {
  if (p.age <= 0 || p.age >= p.life) return 0;
  const t = p.age / p.life;
  if (p.kind === VAPOR_SMOKE) {
    const birth = Math.min(1, t / 0.12);
    return birth * Math.pow(1 - t, 1.5) * 0.7;
  }
  return 1 - Math.pow(t, 3);
}

/** Taille rendue : la fumee s'elargit en vieillissant, l'eclat ne change pas. */
export function vaporSize(p: VaporParticle): number {
  if (p.kind === VAPOR_SMOKE) {
    const t = Math.max(0, Math.min(1, p.age / p.life));
    return p.size * (0.35 + 1.4 * t);
  }
  return p.size;
}
