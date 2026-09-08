import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * Quels MODELES appartiennent a quelle direction (08/09). Mesure du meme
 * jour (cf docs/da/etat-de-l-art.md) : la page d'accueil telechargeait les
 * DOUZE fichiers GLB, 5,7 Mo, dont ceux de l'Ouest, du Nord et du Sud qui ne
 * s'y affichent jamais. Cause : les composants de direction appellent
 * `useGLTF(path)` dans leur corps et etaient montes sur toutes les pages.
 *
 * Cette table sert a deux choses : monter un composant seulement sur sa
 * direction (mount-for-direction) et precharger une direction quand le
 * visiteur montre son intention (survol ou focus d'un lien cardinal), pour
 * garder la navigation instantanee sans payer a l'arrivee.
 *
 * N'y figurent que les modeles PROPRES a une direction. La flore de fond
 * (agave, nopals, cactus), le mais et le cerf sont communs a presque toutes
 * les pages : ils restent charges d'emblee.
 */

/** Les quatre gros, dans l'ordre de leur poids sur disque. */
export const HEAVY_MODELS = [
  "/models/xolotl.glb", // 1,9 Mo
  "/models/cihuateotl.glb", // 1,5 Mo
  "/models/xiuhcoatl.glb", // 0,8 Mo
  "/models/hummingbird-poly.glb", // 0,23 Mo
] as const;

export const DIRECTION_ASSETS: Record<DirectionKey, string[]> = {
  /** Le foyer ne charge rien de plus : c'est la premiere page vue. */
  jade: [],
  /** L'Est n'a pas de modele propre : son monde de verre et ses dards sont
   * geometrie procedurale, et sa coque de glace clone le cerf. */
  dore: [],
  /** Le Sud : le serpent de feu et les colibris. */
  turquoise: ["/models/xiuhcoatl.glb", "/models/hummingbird-poly.glb"],
  /** L'Ouest : les porteuses, et Xolotl en etoile du soir. */
  cendre: ["/models/cihuateotl.glb", "/models/xolotl.glb"],
  /** Le Nord : Xolotl, qui y passe toujours. */
  obsidienne: ["/models/xolotl.glb"],
};

export function assetsForDirection(direction: DirectionKey): string[] {
  return DIRECTION_ASSETS[direction] ?? [];
}
