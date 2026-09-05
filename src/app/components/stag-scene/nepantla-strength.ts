/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : etat mute a 60 fps, lu par les deux chaines de post-traitement (meme precedent que arrow-vapor). */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { swingAzimuth, swingSpeed } from "@/lib/nepantla";
import { useCardinalTransition } from "./cardinal-transition-context";

/**
 * Le flou de file Nepantla (03/09), la partie sans moteur : l'intensite
 * du pan blur = vitesse de l'orbite pendant le voyage cardinal, nulle
 * hors transition et en reduced-motion. Lue par les deux chaines de
 * post-traitement.
 */

/** Etirement horizontal max (fraction de la largeur ecran) au pic. */
const BLUR_MAX = 0.05;

export function useNepantlaStrength(): { value: number } {
  const strength = useMemo(() => ({ value: 0 }), []);
  const transition = useCardinalTransition();
  const reducedRef = useRef<boolean | null>(null);

  useFrame(() => {
    if (reducedRef.current === null && typeof window !== "undefined") {
      reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    const direction = transition?.transitionDirection;
    const p = transition?.transitionProgressRef.current ?? 0;
    const orbiting = direction && !reducedRef.current && swingAzimuth(1, direction) !== 0;
    strength.value = orbiting && p > 0 ? swingSpeed(p) * BLUR_MAX : 0;
  });

  return strength;
}
