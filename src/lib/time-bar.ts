/**
 * La barre du temps (05/09, controles de scene). L'arc de chaque page ne
 * se pilotait qu'au scroll : un utilisateur clavier ou lecteur d'ecran
 * n'avait aucune prise sur la nuit qui devient midi. Un curseur (input
 * range) suit le scroll et le pilote en retour, avec le moment du jour
 * en mots (aria-valuetext). Pur : la correspondance curseur <-> progres
 * et le nom du moment.
 */

export type ArcPhase = "night" | "dawn" | "morning" | "noon";

/** Seuils de progres (0..1) : le lever de la scene est vers 0.27
 * (direction-light : sunDirection.y > 0 pour day > ~0.26). */
export const ARC_PHASES = { dawn: 0.24, morning: 0.42, noon: 0.78 } as const;

export function arcPhase(t: number): ArcPhase {
  if (t < ARC_PHASES.dawn) return "night";
  if (t < ARC_PHASES.morning) return "dawn";
  if (t < ARC_PHASES.noon) return "morning";
  return "noon";
}

export const SLIDER_MAX = 1000;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function sliderFromProgress(t: number): number {
  return Math.round(clamp01(t) * SLIDER_MAX);
}

export function progressFromSlider(v: number): number {
  return clamp01(v / SLIDER_MAX);
}
