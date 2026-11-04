/**
 * LA VEILLE DU CHARGEMENT BLOQUE (04/11).
 *
 * `useProgress` n'est que le ratio du `DefaultLoadingManager` de three :
 * `loaded / total`. Une requete qui ne se resout JAMAIS (ni reponse, ni
 * erreur) laisse `loaded < total` pour toujours. Le voile de chargement
 * attend `progress >= 100` et c'est la seule de ses trois portes qui n'a
 * pas de minuteur de secours : le visiteur reste devant « Chargement de la
 * scene » sans fin, et la porte « Entrer » ne l'en sort pas non plus
 * puisqu'elle ne saute que la choregraphie.
 *
 * Observe le 03/11 par la barre de perf : apres trois jugements verts, un
 * quatrieme a attendu `data-foyer=done` pendant 120 s, voile entier dans
 * l'instantane.
 *
 * CE QU'ON SURVEILLE, ET POURQUOI PAS UN MINUTEUR. Un delai depuis le
 * montage devrait depasser le pire chargement legitime, donc il ferait
 * attendre tout le monde pour sauver un cas rare. Le MOUVEMENT separe les
 * deux : un chargement lent avance, un chargement bloque ne bouge plus.
 *
 * ET POURQUOI LE SEUIL EST LARGE. `progress` ne bouge qu'a la FIN d'un
 * asset, jamais pendant son telechargement : une valeur figee n'est donc
 * pas une preuve de blocage tant qu'un gros fichier peut etre en vol. Le
 * plus lourd du site pese 407 Ko (`cihuateotl.glb`), soit ~2,5 s en Fast 3G
 * et ~9 s sur un 3G vraiment mauvais. Le seuil doit rester au-dessus.
 *
 * Pur, avec graine et progres en entree (harnais, ligne 2) : l'horloge est
 * passee, jamais lue ici.
 */

export type VeilleProgres = {
  /** La derniere valeur de `progress` observee. */
  readonly valeur: number;
  /** Quand cette valeur a ete vue pour la premiere fois. */
  readonly depuis: number;
  /** Le dernier recours est ouvert : on entre sans attendre `progress`. */
  readonly bloque: boolean;
};

export function veilleInitiale(valeur: number, maintenant: number): VeilleProgres {
  return { valeur, depuis: maintenant, bloque: false };
}

export function avancerVeille(
  etat: VeilleProgres,
  valeur: number,
  maintenant: number,
  seuilMs: number,
): VeilleProgres {
  // Une fois entre, on n'y revient pas : le voile ne se refermerait pas,
  // mais le reste de la sequence repartirait de zero.
  if (etat.bloque) return { ...etat, valeur };
  // Un chargement fini n'a rien a sauver : c'est la porte normale.
  if (valeur >= 100) return { valeur, depuis: maintenant, bloque: false };
  if (valeur !== etat.valeur) return { valeur, depuis: maintenant, bloque: false };
  return { ...etat, bloque: maintenant - etat.depuis >= seuilMs };
}
