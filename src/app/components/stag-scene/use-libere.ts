"use client";

import { useEffect } from "react";

/**
 * LIBERER UNE RESSOURCE GRAPHIQUE EN PARTANT (15/09).
 *
 * Le canvas de ce site survit aux changements de page (PersistentScene) :
 * quand on quitte une direction, ses objets sont demontes par React, mais
 * leurs geometries et leurs textures restent sur le processeur graphique.
 * Le ramasse-miettes de JavaScript ne les touche pas : ce sont des tampons
 * alloues par le pilote, et seul `dispose()` les rend.
 *
 * Mesure du 15/09, production locale, sept tours des cinq directions :
 *
 *   geometries  36 -> 90 -> 130 -> 146 -> 163 -> 181 -> 199 -> 214
 *   textures    47 -> 75 ->  92 ->  95 ->  97 -> 100 -> 104 -> 107
 *
 * Le premier tour charge legitimement les cinq mondes ; ensuite chaque tour
 * ajoutait DIX-SEPT geometries et TROIS textures, lineairement, sans jamais
 * redescendre, meme apres un ramassage force. Le graphe de scene, lui,
 * etait propre, et le tas JavaScript ne bougeait pas : la fuite etait
 * purement graphique.
 *
 * Ce que ca coute : un visiteur qui se promene dix minutes accumule des
 * centaines de geometries. Sur un telephone, et sur iOS ou la memoire
 * graphique est serree, cela finit par une perte de contexte WebGL, donc
 * par un canvas noir.
 *
 * A N'UTILISER QUE SUR CE QU'ON POSSEDE. Une ressource partagee au niveau
 * du module (la texture d'amate des bandelettes, par exemple) appartient au
 * module, pas au composant : la liberer au demontage la retirerait sous les
 * pieds du composant suivant.
 */
type Liberable = { dispose: () => void };

export function useLibereAuDemontage(ressource: Liberable | null | undefined): void {
  useEffect(() => {
    return () => {
      ressource?.dispose();
    };
  }, [ressource]);
}

/** La meme chose pour une collection possedee par le composant : le cerf du
 *  miroir cuit une geometrie par maillage, et les rendait toutes.
 *
 *  LE TABLEAU DOIT ETRE STABLE (`useMemo`), comme la ressource de la version
 *  simple. L'effet se nettoie quand sa dependance change : un tableau
 *  construit en ligne change a chaque rendu, et chaque rendu dispose alors
 *  des ressources encore a l'ecran, que three renvoie au pilote a l'image
 *  suivante (l'ocotillo, 22/09 : deux cents re-entrees par tour du site).
 *  `fuite-gpu.spec.ts` compte ces re-entrees, et n'en tolere aucune. */
export function useLibereToutAuDemontage(ressources: ReadonlyArray<Liberable | null | undefined>): void {
  useEffect(() => {
    return () => {
      for (const r of ressources) r?.dispose();
    };
  }, [ressources]);
}
