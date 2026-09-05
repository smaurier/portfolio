"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { Vector2 } from "three";
import { OllinShockwaveEffect } from "./ollin-shockwave-effect";
import { useOllinWave } from "./ollin-wave";

/**
 * OllinShockwave (29/08). Composant R3F qui monte l'effet post-process
 * OllinShockwaveEffect dans l'EffectComposer parent (PostFX, WebGL).
 * Le declencheur et l'enveloppe vivent dans ollin-wave.ts, partages avec
 * la chaine WebGPU : ici on ne fait que copier l'etat dans les uniforms.
 */

export default function OllinShockwave() {
  const effect = useMemo(() => new OllinShockwaveEffect(), []);
  const wave = useOllinWave();

  useFrame(() => {
    const uProgress = effect.uniforms.get("uProgress");
    const uAmp = effect.uniforms.get("uAmplitude");
    const uCenter = effect.uniforms.get("uCenter");
    if (!uProgress || !uAmp || !uCenter) return;
    uProgress.value = wave.progress;
    uAmp.value = wave.amplitude;
    (uCenter.value as Vector2).copy(wave.center);
  });

  return <primitive object={effect} />;
}
