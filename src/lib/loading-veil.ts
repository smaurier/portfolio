// Voile de chargement de la scène du cerf (palier "Usability", cf memory
// project-nahual-da — retour de Sylvain le 19/08 : c'est là qu'ira la
// phrase en nahuatl, premier vrai beat de la scène plutôt qu'un simple
// indicateur de progression). Fonction pure, découplée du rendu — même
// principe que reveal-arc.ts/camera-path.ts.

/** Durée minimale d'affichage du voile, en ms — sans ce plancher, un
 * chargement depuis le cache navigateur ferait passer les assets à 100%
 * en quelques dizaines de ms : la phrase en nahuatl ne serait qu'un flash
 * illisible plutôt qu'un moment qu'on a le temps de lire. Valeur choisie à
 * l'œil (le temps de lire "In xochitl, in cuicatl" + sa traduction une
 * fois), à ajuster si Sylvain la trouve trop longue/courte en usage réel. */
export const MIN_VEIL_DURATION_MS = 1400;

/**
 * Le voile ne se lève que quand les DEUX conditions sont réunies : les
 * assets de la scène sont chargés (progress >= 100, cf useProgress de
 * @react-three/drei) ET la durée minimale d'affichage est passée. Les deux
 * sont indépendantes l'une de l'autre — un chargement lent ne doit jamais
 * être raccourci par ce plancher, un chargement instantané ne doit jamais
 * le contourner.
 */
export function isLoadingDone(progress: number, minDurationElapsed: boolean): boolean {
  return progress >= 100 && minDurationElapsed;
}
