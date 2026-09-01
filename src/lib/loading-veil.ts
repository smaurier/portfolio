// Constante du voile de chargement : MIN_VEIL_DURATION_MS reste utile
// pour LoadingSync (le petit client component qui pose data-loaded sur
// <html> quand assets + duree min atteintes). Les fonctions easeToward
// et isLoadingDone ont ete retirees le 30/08 avec le refactor
// PiedraSkeleton (LoadingVeil supprime, plus de rAF ease progress ni
// de logique done complexe : le voile est un Server Component SSR pur
// qui fade out sur html[data-loaded="true"]).

/** Duree minimale historique : plancher de securite au cas ou le calcul
 * dynamique echouerait. Retour Sylvain 30/08 : 1400 → 2500 → 3500ms
 * pour lire confortablement phrase + trad. */
export const MIN_VEIL_DURATION_MS = 3500;

/** Duree que le voile reste visible APRES que le dernier char de texte
 * soit revele : englobe :
 *   - dots cardinaux burst sequentiel : ~1220ms
 *   - cercle d'union : 1320 → 2220ms
 *   - logo Nahual signature : 2420 → 3220ms
 *   - respiration finale : ~800ms
 * = 4000ms. Cf `piedra-skeleton.module.css` (timing hardcode dans les
 * animation-delay) et `piedra-skeleton.tsx` (sequence DOM). Si tu
 * modifies un timing la-bas, ajuste ici en consequence. Retour
 * Sylvain 31/08 : "compter 3s apres l'affichage total des mots"
 * elargi pour couvrir la sequence complete dots + cercle + logo. */
export const HOLD_AFTER_REVEAL_MS = 4000;

/** Timing exact du reveal char-by-char, doit rester en sync avec
 * `piedra-skeleton.module.css` (keyframes phraseCharReveal /
 * translationCharReveal + animation-delay). Change les deux ensemble. */
export const REVEAL_TIMING = {
  phrase: {
    /** Delai entre chaque char pour la phrase nahuatl. */
    staggerMs: 45,
    /** Duree de l'animation charReveal par char. */
    animMs: 700,
  },
  translation: {
    /** La trad demarre APRES la phrase : offset absolu depuis mount. */
    startMs: 1800,
    /** Delai entre chaque char pour la traduction (plus rapide). */
    staggerMs: 20,
    /** Duree de l'animation charReveal par char. */
    animMs: 550,
  },
} as const;

/** Compte les chars non-espace d'un texte (les espaces sont revelees
 * sans animation propre : elles s'affichent avec le char suivant). */
function nonSpaceCharCount(text: string): number {
  return Array.from(text).filter((ch) => ch !== " " && ch !== " ").length;
}

/** Calcule quand le DERNIER char (phrase ou trad) finit son animation
 * de reveal, en ms depuis le mount du voile. Le voile doit rester
 * visible jusqu'a `computeRevealEndMs(...) + HOLD_AFTER_REVEAL_MS` pour
 * laisser le temps de lire. */
export function computeRevealEndMs(phrase: string, translation: string): number {
  const phraseChars = nonSpaceCharCount(phrase);
  const translationChars = nonSpaceCharCount(translation);
  const phraseEnd = phraseChars * REVEAL_TIMING.phrase.staggerMs + REVEAL_TIMING.phrase.animMs;
  const translationEnd =
    REVEAL_TIMING.translation.startMs +
    translationChars * REVEAL_TIMING.translation.staggerMs +
    REVEAL_TIMING.translation.animMs;
  return Math.max(phraseEnd, translationEnd);
}

/** Combien de ms le voile doit rester visible au total avant de
 * pouvoir fade out (une fois assets 3D charges) : reveal complet + 3s
 * de lecture confortable, avec plancher MIN_VEIL_DURATION_MS au cas
 * ou un texte tres court passerait sous le seuil raisonnable. */
export function computeMinVeilDuration(phrase: string, translation: string): number {
  const dynamic = computeRevealEndMs(phrase, translation) + HOLD_AFTER_REVEAL_MS;
  return Math.max(dynamic, MIN_VEIL_DURATION_MS);
}
