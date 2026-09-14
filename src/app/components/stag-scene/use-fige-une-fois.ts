"use client";

import { useEffect, type RefObject } from "react";
import type { Object3D } from "three";
import { freezeDecor } from "@/lib/freeze-decor";

/**
 * FIGER UN OBJET POSE UNE FOIS POUR TOUTES (14/09, F1c du backlog).
 *
 * three recompose la matrice de tout objet dont `matrixAutoUpdate` est vrai,
 * a chaque image, sans regarder si quoi que ce soit a change. Mesure du
 * 14/09 sur Contact : sur les cent objets qui recomposent encore, hors os,
 * quarante-six n'avaient pas bouge d'un cheveu sur tout l'arc.
 *
 * Le gel se fait a la premiere image plutot qu'au montage : r3f a pose ses
 * proprietes, et `freezeDecor` met les matrices monde a jour avant de figer,
 * donc on ne gele pas une pose fausse. Une seule image, pas d'abonnement
 * permanent a la boucle : un `useFrame` de plus par composant se paierait
 * pour toujours, alors qu'il n'a rien a faire passe la premiere image.
 *
 * LE PIEGE, a connaitre avant d'appeler ceci : un objet fige ne bougera plus
 * si on ecrit dans sa `position`, sa `rotation` ou son `scale` (il faudrait
 * appeler `updateMatrix()` a la main). En revanche il suit toujours son
 * parent, donc le decor fige tourne quand la boussole tourne. A n'utiliser
 * que sur ce dont on a LU qu'il ne bouge jamais.
 *
 * `choisir` sert quand seule une partie du sous-arbre est immobile : les
 * hampes d'ocotillo sont posees, mais leurs fleurs se normalisent toutes
 * seules a la premiere image et se figent elles-memes apres.
 *
 * CE QU'ON NE FIGE PAS, et pourquoi c'est ecrit ici : la voie lactee et les
 * Centzon Huitznahua recopient la position de la CAMERA a chaque image
 * (`pts.position.copy(state.camera.position)`), et le rai du Sud oriente sa
 * lance. Une sonde les voyait immobiles, simplement parce qu'ils etaient
 * caches pendant la mesure. Une sonde dit ou chercher ; c'est le code qui
 * dit si on a le droit.
 */
export function useFigeUneFois<T extends Object3D>(ref: RefObject<T | null>, choisir?: (racine: T) => Object3D[]): void {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const racine = ref.current;
      if (!racine) return;
      for (const cible of choisir ? choisir(racine) : [racine]) freezeDecor(cible);
    });
    return () => cancelAnimationFrame(id);
    // Volontairement une seule fois : `choisir` est une lecture de la
    // structure, pas une dependance qui changerait le geste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
