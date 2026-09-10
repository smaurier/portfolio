"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";

/**
 * LA CHAUFFE DES SHADERS, DEUXIEME TENTATIVE (11/09).
 *
 * three compile le programme d'un materiau la premiere fois qu'un objet
 * VISIBLE le rend. Or nos gestes arrivent en cours d'arc : Xolotl, les
 * braises des porteuses, la frappe. Leurs materiaux existent des le
 * chargement (mesure du 11/09 : 68 materiaux a l'arrivee sur Memoire, 112 a
 * Contact, et pas un de plus pendant tout l'arc), mais leurs objets sont
 * invisibles, donc leurs programmes se compilent au moment du geste, sur le
 * fil principal : six arrets a Memoire, trois a Contact, exactement la ou
 * un arret ruine le geste.
 *
 * La premiere tentative (10/09) avait ete retiree : elle compilait dix-huit
 * programmes de plus sans empecher un seul arret. La cause etait ailleurs,
 * et elle est trouvee depuis : la braise de Xolotl naissait en cours d'arc
 * et changeait le nombre de lumieres, donc TOUT se recompilait apres la
 * chauffe. La lumiere existe maintenant des la premiere image.
 *
 * `compileAsync` de three r185 parcourt la scene en `traverse`, pas en
 * `traverseVisible` (verifie a la source) : il compile aussi ce qui est
 * cache. On attend que tout soit charge (useProgress) puis douze images,
 * le temps que les traversees idempotentes posent leurs modificateurs,
 * sinon on compilerait des variantes d'avant modification.
 *
 * Ce qu'il ne peut pas faire : les variantes d'un AUTRE etat de rendu, comme
 * le reflet du Nord, qui rend sans brouillard dans sa propre cible. Celles-la
 * restent tardives, et l'oracle (.scratch/programmes-tardifs.mjs) le dira.
 */
const FRAMES_AFTER_LOAD = 3;

/** Le voile (reveal-trigger) attend cet evenement avant de se lever, avec un
 *  delai de secours : la chauffe doit se payer DERRIERE le voile, jamais
 *  dans les premieres secondes visibles. Mesure du 11/09 sur Contact, sans
 *  cette attente : vingt-quatre compilations juste apres l'ouverture. */
export const SHADERS_WARM_EVENT = "nahual:shaders-warm";

export default function ShaderWarmup() {
  const { gl, scene, camera } = useThree();
  const { progress } = useProgress();
  const framesRef = useRef(0);
  const doneRef = useRef(false);
  const readyRef = useRef(false);

  useEffect(() => {
    if (progress >= 100) readyRef.current = true;
  }, [progress]);

  useFrame(() => {
    if (doneRef.current || !readyRef.current) return;
    framesRef.current += 1;
    if (framesRef.current < FRAMES_AFTER_LOAD) return;
    doneRef.current = true;
    const fini = () => window.dispatchEvent(new Event(SHADERS_WARM_EVENT));
    gl.compileAsync(scene, camera).then(fini, () => {
      // Un pilote qui refuse la compilation parallele n'empeche rien : les
      // programmes se compileront comme avant, au premier rendu.
      fini();
    });
  });

  return null;
}
