import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * LA PRESENCE D'UNE DIRECTION (17/09).
 *
 * TROISIEME OCCURRENCE DU MEME MOTIF EN DEUX JOURS, apres le ciel et les
 * Cihuateteo : un composant multiplie son geste par un BOOLEEN DE ROUTE
 * (`copalShows(direction) ? x : 0`, `west ? 1 : 0`), donc son monde ne part
 * pas, il est SUPPRIME. Et le regard lit une suppression, pas un depart --
 * c'est la phrase de `dispersion-etat-de-l-art.md`, section 0, et c'est
 * exactement ce que la decision du 17/09 corrige : le depart se fait par un
 * geste continu, partout.
 *
 * `RevealLighting` fait deja traverser l'arc d'une direction a l'autre
 * pendant un passage (`lib/arc-fondu`) ; il depose ici l'etat de ce fondu, et
 * n'importe quel composant peut demander « a quel point cette direction
 * est-elle presente », avec le MEME melange que l'arc, la lumiere, la brume
 * et la teinte. Un etage qui se poserait apres les autres ferait un second
 * mouvement la ou on en veut un seul.
 *
 * Meme marche que `arcStore` et `refletStore` : un depot, pas un contexte,
 * parce que les lecteurs sont des boucles `useFrame` et non des composants.
 */
export const fonduStore: { sortante: DirectionKey | null; affichee: DirectionKey | null; melange: number } = {
  sortante: null,
  affichee: null,
  melange: 1,
};

export function poserFondu(sortante: DirectionKey | null, affichee: DirectionKey, melange: number): void {
  fonduStore.sortante = sortante;
  fonduStore.affichee = affichee;
  fonduStore.melange = melange;
}

/**
 * 1 quand c'est la direction de la route et que le passage est fini, 0 quand
 * elle n'est pas concernee, et entre les deux pendant un passage. `route`
 * sert de repli tant que personne n'a depose -- un lecteur monte avant
 * `RevealLighting` retombe ainsi sur la verite de la route plutot que sur un
 * zero, exactement comme `lireArcJour`.
 */
export function presenceDirection(d: DirectionKey, route: DirectionKey): number {
  if (fonduStore.affichee === null) return d === route ? 1 : 0;
  if (d === fonduStore.affichee) return fonduStore.melange;
  if (d === fonduStore.sortante) return 1 - fonduStore.melange;
  return 0;
}

/**
 * Idem pour un ensemble de directions. Le copal brule sur plusieurs d'entre
 * elles : passer de l'une a l'autre ne doit rien eteindre du tout.
 *
 * C'EST LA SOMME, ET PAS LE MAXIMUM -- le test l'a dit avant moi. Au milieu
 * d'une traversee de jade vers dore, les deux presences valent 0,4 et 0,6 :
 * leur maximum ferait tomber le copal a 0,6 alors qu'il brule des deux
 * cotes, leur somme le laisse entier. Les presences sont disjointes, donc
 * elles ne peuvent pas depasser un, et la borne n'est qu'une ceinture.
 */
export function presenceParmi(directions: readonly DirectionKey[], route: DirectionKey): number {
  let somme = 0;
  for (const d of directions) somme += presenceDirection(d, route);
  return Math.min(1, somme);
}
