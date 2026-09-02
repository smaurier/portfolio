import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * Grade PostFX par direction (01/09, etage 3 du sprint identites de
 * scene). Le grade est LA difference entre "des particules colorees"
 * et "un plan de film etalonne" (Codex Nahual, doctrine + axes de mise
 * en scene). Il se compose PAR-DESSUS la logique historique de
 * post-fx.tsx (vignette breathing scroll, bloom sound-reactive/burst) :
 * il ne remplace rien, il module.
 *
 * Seul le NORD a un grade non-neutre (pilote, fiche Mictlampa) :
 * vignette fermee (le cadre du Mictlan), bloom sourd (rien ne brille
 * chez les morts sauf les lames), desaturation legere (leçon Coco :
 * l'air rabat les couleurs). Les autres directions attendent leur
 * fiche enrichie : pas de remplissage par symetrie.
 */
export type GradeRig = {
  /** Ajout a la darkness de la vignette historique (0.9 - p*0.25). */
  vignetteAdd: number;
  /** Multiplicateur de l'intensite bloom calculee (base+burst+audio+pin). */
  bloomScale: number;
  /** Saturation HueSaturationEffect (-1..1, 0 = neutre). */
  saturation: number;
};

export const NEUTRAL_GRADE: GradeRig = {
  vignetteAdd: 0,
  bloomScale: 1,
  saturation: 0,
};

export const DIRECTION_GRADE: Record<DirectionKey, GradeRig> = {
  jade: NEUTRAL_GRADE,
  dore: NEUTRAL_GRADE,
  turquoise: NEUTRAL_GRADE,
  cendre: NEUTRAL_GRADE,
  obsidienne: {
    // 0.2 -> 0.1 (02/09, sous-exposition) : cadre ferme, pas bouche.
    vignetteAdd: 0.1,
    bloomScale: 0.7,
    saturation: -0.15,
  },
};

export function getGradeRig(direction: DirectionKey): GradeRig {
  return DIRECTION_GRADE[direction];
}

/** Meme convention que approachFog/approachRig : easing exponentiel
 * frame-based, snap sous epsilon. */
const SNAP_EPSILON = 0.002;

function approachValue(current: number, target: number, alpha: number): number {
  const next = current + (target - current) * alpha;
  return Math.abs(target - next) < SNAP_EPSILON ? target : next;
}

export function approachGrade(current: GradeRig, target: GradeRig, alpha: number): GradeRig {
  return {
    vignetteAdd: approachValue(current.vignetteAdd, target.vignetteAdd, alpha),
    bloomScale: approachValue(current.bloomScale, target.bloomScale, alpha),
    saturation: approachValue(current.saturation, target.saturation, alpha),
  };
}
