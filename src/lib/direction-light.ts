import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * Rig lumiere par direction (01/09, etage 2 du sprint identites de
 * scene, cf Codex Nahual : "lumiere motivee", doctrine 2). Au cinema
 * on ne teinte pas une scene : on la re-eclaire. Chaque heure cosmique
 * a sa source diegetique nommable : l'aube, le zenith, le couchant, la
 * lueur du puits, le foyer.
 *
 * Seul le NORD a un rig non-neutre pour l'instant (pilote du sprint,
 * fiche Mictlampa enrichie le 01/09). Les autres directions recevront
 * le leur quand leur fiche sera enrichie au meme niveau (doctrine 1
 * amendee : lead / contre-chant / tissu par scene) : ne pas remplir
 * ces slots par symetrie, chaque rig doit sortir de sa fiche.
 */
export type LightRig = {
  /** Position de la directionnelle (world units). */
  position: [number, number, number];
  /** Teinte cible de la lumiere : dosee par colorMix, portee telle quelle. */
  color: string;
  /** Multiplicateur applique a l'intensite ambient issue du reveal-arc. */
  ambientScale: number;
  /** Multiplicateur applique a l'intensite directionnelle issue du reveal-arc. */
  directionalScale: number;
  /** Dose de la teinte rig dans la couleur finale (0 = logique historique seule). */
  colorMix: number;
};

/** Comportement historique exact : directionnelle [4,6,4], pas de
 * teinte rig, intensites reveal-arc inchangees. */
export const NEUTRAL_RIG: LightRig = {
  position: [4, 6, 4],
  color: "#ffffff",
  ambientScale: 1,
  directionalScale: 1,
  colorMix: 0,
};

export const DIRECTION_LIGHT_RIG: Record<DirectionKey, LightRig> = {
  jade: NEUTRAL_RIG,
  dore: NEUTRAL_RIG,
  turquoise: NEUTRAL_RIG,
  cendre: NEUTRAL_RIG,
  /** Nord/minuit : la lueur du puits. Top light froide quasi zenithale
   * (l'ouverture du Mictlan vue depuis l'interieur), contre-jour :
   * ambient tres bas, directionnelle affaiblie et teintee froide
   * (#8a7fb0, palette colorscript Mictlampa valide par Sylvain). */
  obsidienne: {
    position: [0, 8, 0],
    color: "#8a7fb0",
    ambientScale: 0.4,
    directionalScale: 0.55,
    colorMix: 0.8,
  },
};

export function getLightRig(direction: DirectionKey): LightRig {
  return DIRECTION_LIGHT_RIG[direction];
}

/** Meme convention que approachFog (direction-fog.ts) : easing
 * exponentiel frame-based, snap sous epsilon pour converger vraiment. */
const SNAP_EPSILON = 0.005;

function approachValue(current: number, target: number, alpha: number): number {
  const next = current + (target - current) * alpha;
  return Math.abs(target - next) < SNAP_EPSILON ? target : next;
}

/**
 * Rapproche le rig courant de la cible. La couleur ne s'interpole pas
 * ici (pas de lerp de string hex) : elle bascule sur la couleur cible
 * et c'est colorMix, lui interpole, qui dose son poids reel dans la
 * couleur finale : transition continue sans parser de hex par frame.
 */
export function approachRig(current: LightRig, target: LightRig, alpha: number): LightRig {
  return {
    position: [
      approachValue(current.position[0], target.position[0], alpha),
      approachValue(current.position[1], target.position[1], alpha),
      approachValue(current.position[2], target.position[2], alpha),
    ],
    color: target.color,
    ambientScale: approachValue(current.ambientScale, target.ambientScale, alpha),
    directionalScale: approachValue(current.directionalScale, target.directionalScale, alpha),
    colorMix: approachValue(current.colorMix, target.colorMix, alpha),
  };
}
