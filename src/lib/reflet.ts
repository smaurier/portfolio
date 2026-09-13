import type { FogRange } from "./direction-fog";
import type { GradeRig } from "./direction-grade";
import type { Theme } from "./theme";

/**
 * LE REFLET (13/09, le miroir fumant, lot 2) : la scene vue dans le
 * tezcatl. Pas un « mode jour » : le monde entier passe dans le miroir et
 * en ressort a l'envers de sa lumiere. La nuit du site est un theatre
 * eclaire par ses sources (le foyer, la lune, le puits) ; le reflet est un
 * dessin a l'encre sur amate : le fond est du papier, l'air est une brume
 * claire qui mange l'horizon de plus pres, la lumiere vient de partout,
 * les couleurs se rabattent, rien ne brille, les etoiles s'effacent.
 *
 * Un seul nombre pilote tout : k, la part de reflet (0 la nuit, 1 la face
 * claire), lissee par approachReflet a la cadence des autres rigs (~800 ms)
 * pendant que la fumee couvre l'ecran. Chaque fonction ci-dessous compose
 * le reflet PAR-DESSUS le rig de la direction (brouillard, lumiere, grade)
 * : a k = 0 c'est l'identite, la nuit ne bouge pas d'un poil (teste).
 *
 * Ce rig est COMMUN aux cinq directions ; ce que chaque monde devient dans
 * le miroir (le zenith du Sud, le ciel du Nord) est le lot 3, avec l'oeil
 * de Sylvain. Sources et lecture : docs/da/miroir-fumant.md.
 */
export type ColorRgb255 = { r: number; g: number; b: number };

/** Le papier d'amate de la face claire (= --background light, globals.css). */
export const REFLET_PAPER: ColorRgb255 = { r: 243, g: 236, b: 224 };

export const REFLET = {
  /** Part de papier dans la couleur du brouillard a plein reflet : le reste
   * est la teinte de la direction, un souvenir dans l'horizon. */
  fogPaper: 0.88,
  /** Le monde se dissout un peu plus pres dans la brume claire (facteur
   * sur le far de la direction). Le near ne bouge PAS : la regle du 20/08
   * (le brouillard ne touche jamais la scene proche, near > rayon d'orbite)
   * tient dans le miroir ; a 0,8 le cerf se delavait dans le papier en
   * tete de page (premiere capture du 13/09). */
  fogNear: 1,
  fogFar: 0.85,
  /** La lumiere vient de partout : l'ambiante monte, la directionnelle a
   * peine (les ombres restent lisibles, le modele ne s'aplatit pas). */
  ambient: 2.2,
  directional: 1.15,
  /** L'ambiante prend la teinte du papier. */
  ambientPaper: 0.5,
  /** Grade : les couleurs se rabattent, le cadre s'ouvre (pas de coins
   * sombres sur du papier), rien ne brille. */
  saturation: -0.2,
  vignetteAdd: -0.3,
  bloomScale: 0.45,
} as const;

export function refletK(theme: Theme): number {
  return theme === "light" ? 1 : 0;
}

const SNAP_EPSILON = 0.002;
/** Meme convention que approachFog/approachRig/approachGrade. */
export function approachReflet(current: number, target: number, alpha: number): number {
  const next = current + (target - current) * alpha;
  return Math.abs(target - next) < SNAP_EPSILON ? target : next;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function refletFogColor(night: ColorRgb255, k: number): ColorRgb255 {
  const t = REFLET.fogPaper * k;
  return { r: lerp(night.r, REFLET_PAPER.r, t), g: lerp(night.g, REFLET_PAPER.g, t), b: lerp(night.b, REFLET_PAPER.b, t) };
}

export function refletFogRange(range: FogRange, k: number): FogRange {
  return { near: range.near * lerp(1, REFLET.fogNear, k), far: range.far * lerp(1, REFLET.fogFar, k) };
}

export function refletLight(k: number): { ambientScale: number; directionalScale: number; paperMix: number } {
  return {
    ambientScale: lerp(1, REFLET.ambient, k),
    directionalScale: lerp(1, REFLET.directional, k),
    paperMix: REFLET.ambientPaper * k,
  };
}

export function refletGrade(grade: GradeRig, k: number): GradeRig {
  return {
    vignetteAdd: grade.vignetteAdd + REFLET.vignetteAdd * k,
    bloomScale: grade.bloomScale * lerp(1, REFLET.bloomScale, k),
    saturation: grade.saturation + REFLET.saturation * k,
  };
}

export function refletStarOpacity(k: number): number {
  return 1 - k;
}
