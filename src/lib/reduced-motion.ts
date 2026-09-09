/**
 * MOUVEMENT REDUIT : QUI DECIDE (09/09).
 *
 * Le site gele le canvas quand le systeme annonce
 * `prefers-reduced-motion: reduce` : plus de respiration du cerf, plus de
 * parallaxe, plus de particules, une scene statique et lisible. C'est un
 * choix defendable, et il est documente depuis le 28/08.
 *
 * Mais le site offre AUSSI un bouton « Contemplation : la scene deroule
 * seule », et sous mouvement reduit ce bouton ne faisait rien : mesure du
 * 09/09, page Projets, 0,0 % des pixels du canvas changeaient dans les
 * 4,5 s suivant le clic. Or c'est precisement le mecanisme qu'un critere
 * d'accessibilite demande quand on supprime le mouvement par defaut : il
 * doit exister un moyen de le retablir. Un bouton qui ne fait rien est
 * pire que pas de bouton -- l'utilisateur ne peut meme pas savoir que sa
 * demande a ete perdue.
 *
 * D'ou la regle, en un seul endroit parce que deux copies se
 * desynchroniseraient : la preference systeme gele tout, SAUF si
 * l'utilisateur a explicitement demande le contraire. Une demande
 * explicite gagne sur une preference generale ; c'est vrai ici comme
 * partout ailleurs.
 */

/**
 * Faut-il geler les animations de la scene (respiration, parallaxe,
 * particules, fondus progressifs) ?
 */
export function shouldReduceMotion(prefersReduced: boolean, cinematicRequested: boolean): boolean {
  return prefersReduced && !cinematicRequested;
}

/**
 * Le canvas doit-il rendre en continu ? « demand » gele l'image jusqu'au
 * prochain invalidate ; « always » tient une boucle d'animation.
 *
 * Un onglet cache ne rend JAMAIS, quoi qu'on demande : c'est la raison
 * d'etre premiere du mode « demand » (28/08), une boucle qui tourne dans
 * un onglet de fond vide la batterie pour personne.
 */
export function shouldRenderContinuously(etat: {
  prefersReduced: boolean;
  cinematicRequested: boolean;
  documentHidden: boolean;
}): boolean {
  if (etat.documentHidden) return false;
  return !shouldReduceMotion(etat.prefersReduced, etat.cinematicRequested);
}
