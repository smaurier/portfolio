"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { orientationAngle, stepAngle, toDecorLocal, wrapAngle } from "@/lib/cardinal-orientation";
import { getTerrainHeight } from "@/lib/terrain-height";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";
import { xiuhcoatlStore } from "./xiuhcoatl-store";

/**
 * CardinalOrientation (05/09). Le groupe qui TOURNE le decor neutre pour
 * que chaque page regarde vers sa direction cardinale (lib pure
 * cardinal-orientation.ts). Le cerf, la camera, la lumiere, les astres
 * et les effets par direction (bassin du Nord, chemin de cempasuchil,
 * fleches, colibris...) sont hors du groupe : ils sont composes par
 * rapport a la camera, pas au decor.
 *
 * Au changement de page, l'angle glisse par le plus court arc (lissage
 * exponentiel, ~1.5 s, en meme temps que le voyage Nepantla de la
 * camera) ; en reduced-motion il saute.
 *
 * L'angle courant est publie dans `orientationStore` pour les composants
 * hors du groupe qui interrogent la hauteur du terrain en coordonnees
 * monde (Xolotl, les epines du Sud) : voir `terrainHeightWorld`.
 */

export const orientationStore = { angle: 0 };

/** Hauteur du terrain sous un point du MONDE, le decor etant tourne. */
export function terrainHeightWorld(x: number, z: number): number {
  const p = toDecorLocal(x, z, orientationStore.angle);
  return getTerrainHeight(p.x, p.z);
}

/** Vitesse du lissage : 1 - exp(-RATE * dt), RATE 3 -> 95 % en 1 s. */
const RATE = 3;

export default function CardinalOrientation({ children }: { children: ReactNode }) {
  const groupRef = useRef<Group>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const angleRef = useRef(orientationAngle(direction));

  useFrame((_, delta) => {
    const target = orientationAngle(direction);
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const dt = Math.min(delta, 1 / 20);
    const k = reduced ? 1 : 1 - Math.exp(-RATE * dt);
    const suivant = stepAngle(angleRef.current, target, k);
    // COLLE A LA CIBLE quand on y est. Un lissage exponentiel converge sans
    // jamais arriver : sans ce collage, l'angle bouge encore d'un
    // milliardieme de radian a chaque image, longtemps apres que le voyage
    // est fini. Et un angle qui bouge, meme d'un milliardieme, coute le
    // recalcul de TOUT le decor (voir plus bas).
    angleRef.current = Math.abs(wrapAngle(target - suivant)) < 1e-4 ? target : suivant;
    orientationStore.angle = angleRef.current;
    const g = groupRef.current;
    if (g) {
      // La frappe (05/09) : le sol tremble, vibration verticale amortie.
      const shake = xiuhcoatlStore.strike.shake;
      const st = performance.now() / 1000;
      const py = shake === 0 ? 0 : shake * 0.045 * (Math.sin(st * 53.0) * 0.6 + Math.sin(st * 89.0) * 0.4);
      // ON N'ECRIT QUE SI CA CHANGE (10/09).
      //
      // Ecrire dans `rotation` ou `position` n'est pas gratuit : a l'image
      // suivante, three appelle `updateMatrix()`, qui recompose la matrice
      // ET marque l'objet sale SANS REGARDER si quelque chose a change. La
      // mise a jour est alors propagee de FORCE a tous les descendants,
      // c'est-a-dire a tout le decor : mesure du 10/09 sur Contact,
      // updateMatrixWorld, multiplyMatrices, projectObject et traverse
      // comptaient a eux quatre 159 ms par seconde, 4,1 ms par image sur
      // un budget de 16,7, pour un decor immobile.
      //
      // Le groupe est donc en matrice manuelle : au repos, rien n'est
      // recalcule ; pendant un voyage cardinal ou une frappe, tout l'est
      // comme avant.
      if (g.matrixAutoUpdate) g.matrixAutoUpdate = false;
      if (g.rotation.y !== angleRef.current || g.position.y !== py) {
        g.rotation.y = angleRef.current;
        g.position.y = py;
        g.updateMatrix();
      }
    }
  });

  return <group ref={groupRef}>{children}</group>;
}
