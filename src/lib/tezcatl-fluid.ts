// Logique pure de la fumee du tezcatl (02/09, Nord, sprint identites :
// "faire comme sur igloo.inc, des volutes, avec un vrai simulateur de
// fluide"). La simulation elle-meme (Navier-Stokes sur GPU, ping-pong de
// render targets) vit dans tezcatl-fluid-sim.ts, non testable sans WebGL.
// Ici : tout ce qui se decide sans GPU, testable comme camera-path.ts ou
// direction-arc.ts : projection disque -> grille, emetteurs, souris, gate.

export type SimUv = { u: number; v: number };
export type Splat = SimUv & { du: number; dv: number };

/** Projette un point du sol (x, z monde) sur la grille de simulation qui
 * couvre le carre circonscrit au disque (rayon = PiedraGround). */
export function worldToSimUv(x: number, z: number, radius: number): SimUv & { inside: boolean } {
  const u = x / (2 * radius) + 0.5;
  const v = z / (2 * radius) + 0.5;
  return { u, v, inside: Math.hypot(x, z) <= radius };
}

/** Emetteurs de fumee : nes de la ligne de contact du reflet, autour du
 * cerf, jamais au bord. Chacun derive lentement en orbite (le tezcatl
 * respire) et pousse vers l'EXTERIEUR : la fumee s'ecarte du cerf et
 * remplit le disque en filets. Vitesses en unites de grille (0..1/s). */
export function emitterSplats(time: number, count: number, ringRadius: number, radius: number): Splat[] {
  const out: Splat[] = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 2.399963; // angle d'or : repartition sans motif
    const angle = seed + time * (0.05 + 0.02 * Math.sin(seed));
    const wobble = 1 + 0.25 * Math.sin(time * 0.37 + seed * 3.1);
    const r = ringRadius * wobble;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const { u, v } = worldToSimUv(x, z, radius);
    // Poussee radiale + une composante tangente qui tourne dans le temps
    // (les volutes s'enroulent au lieu de partir en rayons droits).
    const tangent = 0.35 * Math.sin(time * 0.5 + seed);
    const nx = Math.cos(angle);
    const nz = Math.sin(angle);
    const du = (nx - nz * tangent) * 0.08;
    const dv = (nz + nx * tangent) * 0.08;
    out.push({ u, v, du, dv });
  }
  return out;
}

const POINTER_MAX_SPEED = 1; // unites de grille / s
const POINTER_GAIN = 0.6;

/** La souris pousse la fumee : splat de vitesse le long du deplacement du
 * pointeur projete sur le disque. Null sans mouvement ou hors grille. */
export function pointerSplat(prev: SimUv, next: SimUv, dt: number): Splat | null {
  if (next.u < 0 || next.u > 1 || next.v < 0 || next.v > 1) return null;
  const dx = next.u - prev.u;
  const dy = next.v - prev.v;
  if (dt <= 0 || (dx === 0 && dy === 0)) return null;
  let du = (dx / dt) * POINTER_GAIN;
  let dv = (dy / dt) * POINTER_GAIN;
  const speed = Math.hypot(du, dv);
  if (speed > POINTER_MAX_SPEED) {
    du *= POINTER_MAX_SPEED / speed;
    dv *= POINTER_MAX_SPEED / speed;
  }
  return { u: next.u, v: next.v, du, dv };
}

const GATE_FLOOR = 0.3;

/** Meme regle que le reflet menteur : Nord seulement, et le Mictlan se
 * revele en descendant (axe systemique 3 du Codex). Reduced-motion ne
 * coupe pas la fumee (elle sera figee par le composant), elle reste
 * visible : un voile immobile est lisible, une absence ne l'est pas. */
export function smokeGate(input: { direction: string; scrollDepth: number; reducedMotion: boolean }): number {
  if (input.direction !== "obsidienne") return 0;
  const depth = Math.min(1, Math.max(0, input.scrollDepth));
  return GATE_FLOOR + (1 - GATE_FLOOR) * depth;
}
