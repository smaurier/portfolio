/**
 * L'assiette d'un quadrupede DEDUITE de ses appuis (03/09, retour Sylvain :
 * "lorsque Xolotl descend la margelle, les pattes avant doivent toucher le
 * sol, comme lorsqu'il la monte, les pattes arriere doivent encore
 * toucher").
 *
 * Pourquoi il faut un basculement, et pourquoi celui-ci n'a rien a voir
 * avec celui qui a ete retire ce matin : un chien a cheval sur une marche
 * a ses appuis avant et arriere a des hauteurs differentes. Si le corps
 * reste horizontal, une des deux paires doit s'etirer de toute la hauteur
 * de la marche, ce qui depasse l'allonge d'un membre : la patte decolle.
 * En inclinant le corps de l'angle de la marche, chaque paire retrouve
 * une extension normale et les quatre pattes touchent.
 *
 * Le basculement n'est donc pas un effet ajoute : c'est la condition
 * geometrique pour que les pattes puissent atteindre le sol. Il se DEDUIT
 * des appuis, il ne se regle pas.
 *
 * Pur et testable : le composant echantillonne le sol et pose le resultat.
 */

export type Stance = {
  /** Hauteur du corps : la moyenne des deux appuis. */
  y: number;
  /** Assiette en radians, positif = museau haut (il grimpe). */
  pitch: number;
};

/**
 * @param frontSupport hauteur du sol sous les appuis avant
 * @param rearSupport  hauteur du sol sous les appuis arriere
 * @param wheelbase    distance entre appui avant et appui arriere
 * @param maxPitch     garde-fou : au-dela, la marche est trop haute pour
 *                     ce corps et on prefere une patte qui s'etire a un
 *                     chien a la verticale.
 */
export function bodyFromFeet(
  frontSupport: number,
  rearSupport: number,
  wheelbase: number,
  maxPitch = 0.5
): Stance {
  const rise = frontSupport - rearSupport;
  const angle = rise === 0 || wheelbase <= 0 ? 0 : Math.atan2(rise, wheelbase);
  return {
    y: (frontSupport + rearSupport) / 2,
    pitch: Math.max(-maxPitch, Math.min(maxPitch, angle)),
  };
}
