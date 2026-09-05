"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { orientationAngle, stepAngle, toDecorLocal } from "@/lib/cardinal-orientation";
import { getTerrainHeight } from "@/lib/terrain-height";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

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
    angleRef.current = stepAngle(angleRef.current, target, k);
    orientationStore.angle = angleRef.current;
    const g = groupRef.current;
    if (g) g.rotation.y = angleRef.current;
  });

  return <group ref={groupRef}>{children}</group>;
}
