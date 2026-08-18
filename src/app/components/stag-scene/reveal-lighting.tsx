"use client";

import type { MutableRefObject } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { AmbientLight, DirectionalLight } from "three";
import { getAmbientIntensity, getDirectionalIntensity } from "@/lib/reveal-arc";

/**
 * Lumière de l'arc de reveal (palier 1, cf memory project-nahual-da) :
 * pénombre → prise de conscience → face-à-face → chemins révélés, pilotée
 * par la même progression de scroll que la caméra (src/lib/reveal-arc.ts).
 * Intensités appliquées via ref + useFrame plutôt que prop/state React, même
 * raison que OrbitCamera : ça change à chaque frame de scroll.
 */
export default function RevealLighting({
  progressRef,
}: {
  progressRef: MutableRefObject<number>;
}) {
  const ambientRef = useRef<AmbientLight>(null);
  const directionalRef = useRef<DirectionalLight>(null);

  useFrame(() => {
    if (ambientRef.current) {
      ambientRef.current.intensity = getAmbientIntensity(progressRef.current);
    }
    if (directionalRef.current) {
      directionalRef.current.intensity = getDirectionalIntensity(progressRef.current);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} />
      <directionalLight ref={directionalRef} position={[4, 6, 4]} />
    </>
  );
}
