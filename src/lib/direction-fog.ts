import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * Fog par direction (01/09, etage 1 du sprint identites de scene, cf
 * memory project-nahual-da + Codex Nahual section 04 "les cinq heures
 * du monde"). La densite du fog EST le mood : chaque heure cosmique a
 * son air. Jusqu'ici near/far etaient identiques partout (10/34,
 * decision du 20/08 "le fog ne touche jamais la scene proche") : cette
 * regle reste vraie au Centre/Est/Sud, l'Ouest s'en approche, et le
 * Nord y DEROGE explicitement (arbitrage Sylvain 01/09) : on ne voit
 * pas loin au Mictlan, c'est son identite.
 */
export type FogRange = { near: number; far: number };

export const DIRECTION_FOG_RANGE: Record<DirectionKey, FogRange> = {
  /** Centre/home : la reference historique du 20/08, inchangee. */
  jade: { near: 10, far: 34 },
  /** Est/aube : l'air le plus limpide du site, l'aube est claire. */
  dore: { near: 12, far: 38 },
  /** Sud/zenith : sec et clair, a peine moins ouvert que l'aube. */
  turquoise: { near: 11, far: 36 },
  /** Ouest/crepuscule : l'air s'epaissit, le seuil approche. */
  cendre: { near: 8, far: 26 },
  /** Nord/minuit : le fog mange l'horizon des le second plan. */
  obsidienne: { near: 5, far: 18 },
};

export function getFogRange(direction: DirectionKey): FogRange {
  return DIRECTION_FOG_RANGE[direction];
}

/** Seuil sous lequel on snap sur la cible (evite l'asymptote infinie
 * de l'easing exponentiel, meme logique que le lerp alpha de
 * CardinalAmbience). */
const SNAP_EPSILON = 0.01;

function approachValue(current: number, target: number, alpha: number): number {
  const next = current + (target - current) * alpha;
  return Math.abs(target - next) < SNAP_EPSILON ? target : next;
}

/**
 * Rapproche le range courant de la cible par easing exponentiel
 * frame-based (~800ms de crossfade a alpha 0.06 / 60fps, calé sur le
 * FADE_SPEED des ambiances cardinales). Retourne un nouveau range,
 * l'appelant garde l'etat dans sa ref.
 */
export function approachFog(current: FogRange, target: FogRange, alpha: number): FogRange {
  return {
    near: approachValue(current.near, target.near, alpha),
    far: approachValue(current.far, target.far, alpha),
  };
}
