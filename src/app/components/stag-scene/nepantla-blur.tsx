"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { NepantlaBlurEffect } from "./nepantla-blur-effect";
import { useNepantlaStrength } from "./nepantla-strength";

/**
 * NepantlaBlur (03/09, etage 2b). Le flou de file du voyage cardinal dans
 * l'EffectComposer (WebGL) : l'intensite vient de nepantla-strength.ts,
 * partagee avec la chaine WebGPU.
 */

export default function NepantlaBlur() {
  const effect = useMemo(() => new NepantlaBlurEffect(), []);
  const strength = useNepantlaStrength();

  useFrame(() => {
    const uStrength = effect.uniforms.get("uStrength");
    if (uStrength) uStrength.value = strength.value;
  });

  return <primitive object={effect} />;
}
