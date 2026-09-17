import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";
import { dayAtArc, lightPAtArc } from "./arc-day";

/**
 * LE FONDU D'UN ARC A L'AUTRE (16/09).
 *
 * Chaque direction lit le meme defilement a sa facon : le Centre monte de
 * la penombre au plein jour, l'Ouest INVERSE l'arc (le soleil tombe), le
 * Nord descend le Mictlan, le Sud passe de la nuit de Coatepec au zenith.
 * `lightPAtArc` et `dayAtArc` (arc-day) donnent cette lecture.
 *
 * LE DEFAUT QUE CE MODULE CORRIGE. Ces deux fonctions prennent la
 * direction de la ROUTE, qui bascule d'un coup au commit. Tout le reste de
 * l'atmosphere, lui, traverse : la portee du brouillard (approachFog), le
 * rig de lumiere (approachRig), sa teinte (approachTint) et meme l'heure
 * (useAtmosphereHour, « l'heure traversee du voyage du soleil »). L'arc
 * etait le seul a sauter, et comme il commande l'ambiante, la
 * directionnelle et le plancher de revelation, c'est lui qu'on voyait.
 *
 * Mesure du 16/09, oracle `passage-continu` : Sud vers Ouest franchissait
 * 50,7 de luminance EN UNE IMAGE sur un ecart total de 54,6, et Nord vers
 * Centre 30,7 sur 47,2, alors que la teinte traversait deja proprement. Au
 * meme defilement, deux directions opposees lisent deux heures opposees :
 * l'ecart est maximal exactement au moment du passage.
 *
 * CE QU'ON N'EASE SURTOUT PAS : le defilement. On ne lisse pas `p`, qui
 * est la molette sous le doigt du visiteur ; on lisse la BASCULE d'un arc
 * a l'autre. Une fois le fondu pose, `sortante` redevient nulle et la
 * lecture est celle de la direction, au pixel et sans la moindre inertie.
 * C'est la difference entre un passage qui traverse et un scroll qui
 * traine.
 *
 * MEME ALPHA que les trois autres traversees de `reveal-lighting`, pour
 * qu'elles arrivent ensemble : un etage qui se poserait apres les autres
 * ferait un second mouvement la ou on en veut un seul.
 */
/**
 * L'ALPHA DE TOUTES LES TRAVERSEES (17/09).
 *
 * Trois modules juraient deja « MEME ALPHA que les autres » en commentaire,
 * et l'ecrivaient chacun en clair : `reveal-lighting` cinq fois, ce module
 * une, `direction-fog` dans sa documentation. Un chiffre recopie ne garde
 * pas une convention, il l'affirme. Les traversees qui doivent arriver
 * ensemble le lisent maintenant ici -- un etage qui se poserait apres les
 * autres ferait un second mouvement la ou on en veut un seul.
 *
 * ~800 ms de fondu a soixante images par seconde.
 */
export const TRAVERSEE_ALPHA = 0.06;

export type FonduArc = {
  /** L'arc qu'on quitte, nul au repos. */
  sortante: DirectionKey | null;
  /** L'arc de la route. */
  affichee: DirectionKey;
  /** 0 = encore entierement l'arc sortant, 1 = entierement celui de la route. */
  melange: number;
};

/** Meme seuil que `approachFog` : sans lui, l'easing exponentiel n'atteint
 *  jamais sa cible et `sortante` ne serait jamais oubliee. */
const SNAP_EPSILON = 0.01;

export function fonduArcInitial(direction: DirectionKey): FonduArc {
  return { sortante: null, affichee: direction, melange: 1 };
}

/**
 * Un pas de fondu. A appeler une fois par image avec la direction de la
 * route ; `alpha` a 1 pose la cible tout de suite (mouvement reduit).
 *
 * Une seconde navigation en plein fondu reprend le fondu depuis l'arc
 * intermediaire plutot que depuis l'arc d'origine : le saut restant est
 * plus petit que celui qu'on corrige, et le cas est de toute facon barre
 * en amont (`startTransition` ignore un passage pendant un passage).
 */
export function avancerFonduArc(etat: FonduArc, direction: DirectionKey, alpha: number): FonduArc {
  if (direction !== etat.affichee) {
    if (alpha >= 1) return { sortante: null, affichee: direction, melange: 1 };
    return { sortante: etat.affichee, affichee: direction, melange: 0 };
  }
  if (etat.melange >= 1) return etat;
  const melange = etat.melange + (1 - etat.melange) * alpha;
  if (1 - melange < SNAP_EPSILON) return { sortante: null, affichee: direction, melange: 1 };
  return { sortante: etat.sortante, affichee: direction, melange };
}

function melanger(etat: FonduArc, lecture: (d: DirectionKey) => number): number {
  const arrivee = lecture(etat.affichee);
  if (!etat.sortante) return arrivee;
  const depart = lecture(etat.sortante);
  return depart + (arrivee - depart) * etat.melange;
}

/** Le progres a donner aux courbes de lumiere, fondu pendant un passage. */
export function pDuFondu(etat: FonduArc, progress: number): number {
  return melanger(etat, (d) => lightPAtArc(d, progress));
}

/** La hauteur du soleil (ciel, astres, camera solaire), fondue de meme. */
export function jourDuFondu(etat: FonduArc, progress: number): number {
  return melanger(etat, (d) => dayAtArc(d, progress));
}
