import type { PerspectiveCamera } from "three";
import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * LE CADRE DECALE (10/09, arbitrage de Sylvain sur le rapport contenu /
 * scene : « la 1, colonne a gauche, sujet a droite »).
 *
 * Mesure du 09/09 : au Nord et au Sud, la colonne de texte, centree, tient
 * 50 % du cadre jusqu'a la fin, et ce qu'elle couvre est le sujet, puisque
 * la camera vise l'origine du monde. Reduire la colonne n'aurait rien
 * compose : le sujet serait reste derriere elle.
 *
 * Ce qu'on fait : on ne touche ni a la trajectoire, ni a la visee, ni a
 * rien de ce qui est regle autour de l'origine (le passage de Xolotl, la
 * frappe, la descente). On decale la PROJECTION : `filmOffset`, sur la
 * camera, glisse le cadre horizontalement, et l'origine tombe aux deux
 * tiers de l'ecran au lieu du milieu. Le texte prend le tiers libre.
 *
 * Nul au Centre, qui n'a pas de colonne : le Centre reste centre. Nul sur
 * mobile, ou la colonne est pleine largeur. Fondu par direction comme les
 * autres rigs.
 *
 * La formule vient de PerspectiveCamera.updateProjectionMatrix (three
 * r185) : `left += near * filmOffset / getFilmWidth()`. Le bord gauche du
 * tronc avance de cette quantite, donc un point du monde recule d autant
 * dans le cadre. On l'inverse pour que le sujet aille a DROITE. L'oracle
 * (frame-offset.test) ne verifie pas la formule, il projette l'origine et
 * exige qu'elle tombe en x = 1/3 du cadre normalise.
 */

/** Du milieu (1/2) aux deux tiers (2/3) : un sixieme de la largeur. */
export const FRAME_SHIFT = 1 / 6;

/**
 * Le `filmOffset` qui deplace le centre du cadre de `fraction` de sa
 * largeur vers la gauche, donc le sujet vers la droite.
 */
export function filmOffsetFor(fraction: number, camera: PerspectiveCamera): number {
  if (fraction === 0) return 0;
  const tan = Math.tan((camera.fov * Math.PI) / 360) / (camera.zoom || 1);
  return -2 * fraction * camera.getFilmWidth() * tan * camera.aspect;
}

/** Qui a droit au decalage : les quatre directions au bureau. */
export function frameShiftFor(direction: DirectionKey, isMobile: boolean): number {
  if (isMobile || direction === "jade") return 0;
  return FRAME_SHIFT;
}
