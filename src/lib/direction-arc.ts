/**
 * Arc de reveal inverse pour le Nord (01/09, arbitrage Sylvain :
 * option A + arrivee). Sur la home et les autres pages, scroller =
 * le monde s'eveille (reveal-arc.ts). Au Mictlan c'est un contresens :
 * scroller = DESCENDRE les niveaux (axe systemique 3 du Codex), la
 * lumiere doit baisser, jamais s'eveiller.
 *
 * Mais la traversee du Mictlan SE TERMINE : le Chicunamictlan, le lieu
 * du repos ou l'ame arrive. En toute fin de scroll, un "moment
 * d'arrivee" violet distinct (retour Sylvain : "l'avoir quand meme en
 * toute fin, de facon differente") : ce n'est pas le monde qui
 * s'eveille, c'est la lueur du puits qui s'intensifie et accueille :
 * arrivalGlow pilote ce boost dans RevealLighting.
 */

const DESCENT_START = 0.06;
const DESCENT_END = 0.8;
/** Plancher de la descente : plus sombre que le haut de page. */
const DEPTH_FLOOR = 0.04;
const ARRIVAL_START = 0.82;
/** La lumiere remonte a l'arrivee, mais reste loin de l'eveil complet. */
const ARRIVAL_LIFT = 0.24;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function remapNorthArc(progress: number): { lightP: number; arrivalGlow: number } {
  const p = Math.min(1, Math.max(0, progress));
  // Descente : interpole du comportement neutre (haut de page intact)
  // vers le plancher sombre.
  const descent = smoothstep(DESCENT_START, DESCENT_END, p);
  let lightP = p * (1 - descent) + DEPTH_FLOOR * descent;
  // Arrivee : remontee douce portee par le glow.
  const arrivalGlow = smoothstep(ARRIVAL_START, 1, p);
  lightP += arrivalGlow * ARRIVAL_LIFT;
  return { lightP: Math.min(1, Math.max(0, lightP)), arrivalGlow };
}
