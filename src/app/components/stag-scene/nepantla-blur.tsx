"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { swingAzimuth, swingSpeed } from "@/lib/nepantla";
import { useCardinalTransition } from "./cardinal-transition-context";
import { NepantlaBlurEffect } from "./nepantla-blur-effect";

/**
 * NepantlaBlur (03/09, etage 2b). Monte l'effet de flou de file dans
 * l'EffectComposer et asservit son intensite a la vitesse de l'orbite
 * cardinale (swingSpeed : zero aux deux bouts du voyage, pic au coeur
 * du passage, la ou la navigation se fait). Le jade (retour au foyer,
 * pas d'orbite : swingAzimuth nul) ne floute pas. Reduced motion :
 * strength reste a 0, l'effet est un passthrough quasi gratuit.
 */

// Etirement horizontal max (fraction de la largeur ecran) au pic de
// vitesse, au bord du cadre. 0.05 = file lisible sans bouillie.
const BLUR_MAX = 0.05;

export default function NepantlaBlur() {
  const effect = useMemo(() => new NepantlaBlurEffect(), []);
  const transition = useCardinalTransition();
  const reducedRef = useRef<boolean | null>(null);

  useFrame(() => {
    const uStrength = effect.uniforms.get("uStrength");
    if (!uStrength) return;
    if (reducedRef.current === null && typeof window !== "undefined") {
      reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    const direction = transition?.transitionDirection;
    const p = transition?.transitionProgressRef.current ?? 0;
    const orbiting = direction && !reducedRef.current && swingAzimuth(1, direction) !== 0;
    uStrength.value = orbiting && p > 0 ? swingSpeed(p) * BLUR_MAX : 0;
  });

  return <primitive object={effect} />;
}
