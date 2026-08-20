"use client";

import type { MutableRefObject } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { AmbientLight, DirectionalLight, Fog } from "three";
import { getAmbientIntensity, getDirectionalIntensity, getFogColor } from "@/lib/reveal-arc";

/**
 * Lumière (+ brouillard, depuis le 20/08) de l'arc de reveal (palier 1, cf
 * memory project-nahual-da) : pénombre → prise de conscience → face-à-face
 * → chemins révélés, pilotée par la même progression de scroll que la
 * caméra (src/lib/reveal-arc.ts). Intensités/couleur appliquées via ref +
 * useFrame plutôt que prop/state React, même raison que OrbitCamera : ça
 * change à chaque frame de scroll.
 *
 * Le brouillard vivait avant dans stag-scene.tsx (couleur fixe #000000) —
 * déplacé ici : retour de Sylvain le 20/08 (intégrer le jade à la scène,
 * cf memory project-nahual-da — étude concurrentielle, piste "lueur
 * d'ambiance") — sa teinte fait maintenant partie du même système que
 * l'intensité lumineuse plutôt qu'un prop statique séparé.
 */
export default function RevealLighting({
  progressRef,
}: {
  progressRef: MutableRefObject<number>;
}) {
  const ambientRef = useRef<AmbientLight>(null);
  const directionalRef = useRef<DirectionalLight>(null);
  const fogRef = useRef<Fog>(null);

  useFrame(() => {
    if (ambientRef.current) {
      ambientRef.current.intensity = getAmbientIntensity(progressRef.current);
    }
    if (directionalRef.current) {
      directionalRef.current.intensity = getDirectionalIntensity(progressRef.current);
    }
    if (fogRef.current) {
      fogRef.current.color.set(getFogColor(progressRef.current));
    }
  });

  return (
    <>
      {/* near/far au-delà de l'orbite caméra (radius max 9) : le fog ne
       * doit jamais assombrir la scène proche, seulement l'horizon —
       * inchangé depuis stag-scene.tsx, seule la couleur bouge désormais. */}
      <fog ref={fogRef} attach="fog" args={["#000000", 10, 34]} />
      <ambientLight ref={ambientRef} />
      <directionalLight ref={directionalRef} position={[4, 6, 4]} />
    </>
  );
}
