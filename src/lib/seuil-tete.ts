/**
 * LA LIGNE DE SEUIL EN TETE DE PAGE, DANS LE CALQUE FIXE (13/09, X2).
 *
 * Mesure de l'audit : sur les quatre pages echo la ligne vivait au bas du
 * premier ecran (le <main> reserve 90vh au cerf), exactement sous le
 * bouton du mode recit, et sous la boussole sur telephone. Sa place est en
 * haut a gauche, sous le bandeau, le temps du premier quart de l'arc : la
 * ou un lecteur cherche le titre d'un chapitre, puis elle s'efface pour
 * laisser la scene.
 */
export const SEUIL_TETE = {
  /** Pleine jusqu'ici. */
  holdUntil: 0.18,
  /** Effacee a partir d'ici. */
  goneAt: 0.3,
} as const;

/** Opacite de la ligne selon la progression de l'arc, 0..1. */
export function seuilTeteOpacity(progress: number, spec = SEUIL_TETE): number {
  if (!Number.isFinite(progress) || progress <= spec.holdUntil) return 1;
  if (progress >= spec.goneAt) return 0;
  const t = (progress - spec.holdUntil) / (spec.goneAt - spec.holdUntil);
  return 1 - t * t * (3 - 2 * t);
}
