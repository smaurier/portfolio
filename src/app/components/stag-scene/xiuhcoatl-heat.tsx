"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type PerspectiveCamera, type Vector4 } from "three";
import { XiuhcoatlHeatEffect } from "./xiuhcoatl-heat-effect";
import { xiuhcoatlStore } from "./xiuhcoatl-store";
import { projectHeatPoints } from "./heat-projection";

/**
 * XiuhcoatlHeat (04/09). Monte la passe de chaleur dans PostFX et projette
 * chaque frame les points de chaleur du store (monde) en UV ecran, avec
 * un rayon qui suit la distance (perspective) et une force qui s'eteint
 * avec l'age. Rien a faire quand le serpent est absent (force 0 partout,
 * le shader sort tout de suite).
 */

/** Rayon du tremblement autour d'un point, en unites monde. */

export default function XiuhcoatlHeat() {
  const effect = useMemo(() => new XiuhcoatlHeatEffect(), []);

  useFrame((state) => {
    const uPoints = effect.uniforms.get("uPoints");
    const uTime = effect.uniforms.get("uTime");
    const uAspect = effect.uniforms.get("uAspect");
    const uGround = effect.uniforms.get("uGroundHeat");
    const uFlash = effect.uniforms.get("uFlash");
    const uTint = effect.uniforms.get("uTint");
    if (!uPoints || !uTime || !uAspect || !uGround || !uFlash || !uTint) return;
    uTime.value = state.clock.elapsedTime;
    uGround.value = xiuhcoatlStore.groundHeat;
    uFlash.value = xiuhcoatlStore.strike.flash;
    uTint.value = xiuhcoatlStore.strike.tint;
    uAspect.value = state.size.width / Math.max(1, state.size.height);
    const points = uPoints.value as Vector4[];
    // Projection partagee avec la chaine WebGPU (heat-projection.ts).
    projectHeatPoints(state.camera as PerspectiveCamera, performance.now(), false, (i, x, y, z, w) => points[i].set(x, y, z, w));
  });

  return <primitive object={effect} />;
}
