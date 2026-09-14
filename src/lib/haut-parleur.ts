/**
 * LE HAUT-PARLEUR DU TELEPHONE (14/09, retour de Sylvain : « j'ai fini par
 * couper a une [page] qui etait desagreable car elle me donnait
 * l'impression de saturer »).
 *
 * Mesure faite avant de toucher : en sortie, rien n'ecrete. Les cretes
 * plafonnent a 0,46 sur la page la plus forte, et le limiteur ne travaille
 * presque jamais. Ce n'est donc pas la chaine qui sature, c'est le
 * HAUT-PARLEUR.
 *
 * La nappe du site est faite de trois sinus a 87, 110 et 131 Hz ; le
 * souffle du miroir descend a 48 Hz ; une sous-basse passe a 70 Hz. Un
 * haut-parleur de telephone fait quelques millimetres carres : sous
 * environ 150 Hz il ne produit presque pas de fondamentale, mais il bouge
 * quand meme, et ce mouvement fabrique de la distorsion d'intermodulation
 * sur TOUT le reste. C'est exactement ce qu'on entend comme « ca sature ».
 *
 * Un filtre passe-haut ne sert a rien ici : un sinus pur n'a pas
 * d'harmoniques, le couper revient a le supprimer. On MONTE donc la note
 * d'une ou deux octaves : meme accord, meme intention, mais dans une
 * bande que l'appareil sait rendre. Sur un vrai systeme, le plancher vaut
 * zero et rien ne bouge.
 *
 * Pur et teste.
 */

/** En dessous, un haut-parleur de telephone distord plus qu'il ne joue. */
export const PLANCHER_TELEPHONE = 150;

/**
 * Monte `hz` d'autant d'octaves qu'il faut pour atteindre `plancher`. La
 * note reste la meme (on double), seul le registre change. Un plancher nul
 * ou une frequence deja assez haute rendent la valeur telle quelle.
 */
export function monterAuPlancher(hz: number, plancher: number): number {
  if (!Number.isFinite(hz) || hz <= 0 || !Number.isFinite(plancher) || plancher <= 0) return hz;
  let f = hz;
  // Borne de securite : jamais plus de six octaves, on ne siffle pas.
  for (let i = 0; i < 6 && f < plancher; i++) f *= 2;
  return f;
}

/**
 * L'appareil a-t-il un petit haut-parleur ? On ne peut pas le savoir, mais
 * un ecran etroit a pointeur grossier en est un dans l'immense majorite
 * des cas, et se tromper ne coute qu'une octave sur une nappe.
 */
export function petitHautParleur(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(max-width: 900px)").matches;
}

/** Le plancher a appliquer sur cet appareil. */
export function plancherDuLieu(): number {
  return petitHautParleur() ? PLANCHER_TELEPHONE : 0;
}
