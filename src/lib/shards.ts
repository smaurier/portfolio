/**
 * Les eclats de la coque de glace (06/09, Est, etape B : « toute la scene
 * explose »). Au premier dard du soleil, la coque du cerf et la glace de la
 * Piedra volent en eclats depuis le point d'impact : chaque eclat part de
 * l'endroit ou il etait, s'eloigne de l'impact, tourne, retombe, et fond au
 * sol. Partie pure.
 */

export const SHARDS = {
  minSpeed: 1.5,
  /** Vitesse d'ejection selon la distance a l'impact (u/s). */
  speedNear: 7,
  speedFar: 3,
  gravity: 7,
  /** Duree de vie avant fonte complete (s). */
  life: 3.2,
  bounce: 0.25,
};

export type Shard = {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  rx: number; ry: number; rz: number;
  wx: number; wy: number; wz: number;
  /** 1 entier, 0 fondu. */
  life: number;
  size: number;
  onGround: boolean;
};

function hash(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233 + 3.1) * 43758.5453;
  return v - Math.floor(v);
}

export function initShard(origin: { x: number; y: number; z: number }, impact: { x: number; y: number; z: number }, seed: number): Shard {
  let dx = origin.x - impact.x, dy = origin.y - impact.y, dz = origin.z - impact.z;
  const d = Math.hypot(dx, dy, dz);
  if (d < 1e-4) { dx = 1; dy = 0; dz = 0; } else { dx /= d; dy /= d; dz /= d; }
  // Pres de l'impact ca part fort ; loin, moins ; toujours un peu vers le haut.
  const speed = SHARDS.speedFar + (SHARDS.speedNear - SHARDS.speedFar) * Math.exp(-d * 0.6);
  const jitter = 0.35;
  let vx = (dx + (hash(seed, 1) - 0.5) * jitter) * speed;
  let vy = (dy + 0.55 + (hash(seed, 2) - 0.5) * jitter) * speed;
  let vz = (dz + (hash(seed, 3) - 0.5) * jitter) * speed;
  // Un eclat au sol ne peut que monter.
  if (origin.y < 0.15) vy = Math.abs(vy) + 1.5;
  const s = Math.hypot(vx, vy, vz);
  if (s < SHARDS.minSpeed) { const k = SHARDS.minSpeed / Math.max(1e-6, s); vx *= k; vy *= k; vz *= k; }
  return {
    x: origin.x, y: origin.y, z: origin.z,
    vx, vy, vz,
    rx: hash(seed, 4) * 6.28, ry: hash(seed, 5) * 6.28, rz: hash(seed, 6) * 6.28,
    wx: (hash(seed, 7) - 0.5) * 12, wy: (hash(seed, 8) - 0.5) * 12, wz: (hash(seed, 9) - 0.5) * 12,
    life: 1,
    size: 0.6 + hash(seed, 10) * 0.8,
    onGround: false,
  };
}

export function stepShard(s: Shard, dt: number, ground: (x: number, z: number) => number): void {
  if (s.life <= 0) return;
  if (!s.onGround) {
    s.vy -= SHARDS.gravity * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    s.rx += s.wx * dt; s.ry += s.wy * dt; s.rz += s.wz * dt;
    const g = ground(s.x, s.z);
    if (s.y <= g) {
      s.y = g;
      if (Math.abs(s.vy) > 1.2) {
        s.vy = -s.vy * SHARDS.bounce;
        s.vx *= 0.6; s.vz *= 0.6;
        s.wx *= 0.5; s.wy *= 0.5; s.wz *= 0.5;
      } else {
        s.onGround = true;
        s.vx = s.vy = s.vz = 0;
      }
    }
    // En vol, il fond lentement ; au sol, plus vite.
    s.life -= dt / (SHARDS.life * 1.6);
  } else {
    s.life -= dt / (SHARDS.life * 0.55);
  }
  if (s.life < 0) s.life = 0;
}
