"use client";

import type { MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { getOrbitCameraPosition, getOrbitCameraTarget } from "@/lib/camera-path";

/**
 * Applique à chaque frame la trajectoire pure de src/lib/camera-path.ts.
 * progressRef est un ref (pas un state) : la position du scroll change à
 * haute fréquence, la faire transiter par le state React re-rendrait tout
 * l'arbre à chaque tick pour rien — useFrame lit le ref directement.
 */
export default function OrbitCamera({
  progressRef,
}: {
  progressRef: MutableRefObject<number>;
}) {
  const { camera } = useThree();

  useFrame(() => {
    const position = getOrbitCameraPosition(progressRef.current);
    const target = getOrbitCameraTarget();
    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(target.x, target.y, target.z);
  });

  return null;
}
