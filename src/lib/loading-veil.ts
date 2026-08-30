// Constante du voile de chargement — MIN_VEIL_DURATION_MS reste utile
// pour LoadingSync (le petit client component qui pose data-loaded sur
// <html> quand assets + duree min atteintes). Les fonctions easeToward
// et isLoadingDone ont ete retirees le 30/08 avec le refactor
// PiedraSkeleton (LoadingVeil supprime, plus de rAF ease progress ni
// de logique done complexe — le voile est un Server Component SSR pur
// qui fade out sur html[data-loaded="true"]).

/** Duree minimale d'affichage du voile, en ms — sans ce plancher, un
 * chargement depuis le cache navigateur ferait passer les assets a 100%
 * en quelques dizaines de ms : la phrase en nahuatl ne serait qu'un
 * flash illisible plutot qu'un moment qu'on a le temps de lire. Retour
 * Sylvain 30/08 : "On n'a pas le temps de lire" avec 1400ms → 2500ms
 * (encore trop juste) → 3500ms pour lire confortablement phrase + trad
 * dans une langue etrangere (nahuatl). */
export const MIN_VEIL_DURATION_MS = 3500;
