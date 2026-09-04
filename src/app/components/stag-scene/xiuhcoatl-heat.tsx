"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type PerspectiveCamera, type Vector4 } from "three";
import { XiuhcoatlHeatEffect } from "./xiuhcoatl-heat-effect";
import { HEAT_POINT_LIFE_MS, HEAT_TRAIL_MAX, xiuhcoatlStore } from "./xiuhcoatl-store";

/**
 * XiuhcoatlHeat (04/09). Monte la passe de chaleur dans PostFX et projette
 * chaque frame les points de chaleur du store (monde) en UV ecran, avec
 * un rayon qui suit la distance (perspective) et une force qui s'eteint
 * avec l'age. Rien a faire quand le serpent est absent (force 0 partout,
 * le shader sort tout de suite).
 */

/** Rayon du tremblement autour d'un point, en unites monde. */
const HEAT_RADIUS_WORLD = 1.6;

export default function XiuhcoatlHeat() {
  const effect = useMemo(() => new XiuhcoatlHeatEffect(), []);
  const scratch = useMemo(() => new Vector3(), []);

  useFrame((state) => {
    const uPoints = effect.uniforms.get("uPoints");
    const uTime = effect.uniforms.get("uTime");
    const uAspect = effect.uniforms.get("uAspect");
    if (!uPoints || !uTime || !uAspect) return;
    uTime.value = state.clock.elapsedTime;
    uAspect.value = state.size.width / Math.max(1, state.size.height);
    const points = uPoints.value as Vector4[];
    const now = performance.now();
    const cam = state.camera as PerspectiveCamera;
    const fovRad = ((cam.fov ?? 45) * Math.PI) / 180;
    const trail = xiuhcoatlStore.trail;
    const presence = xiuhcoatlStore.presence;
    for (let i = 0; i < HEAT_TRAIL_MAX; i++) {
      const p = trail[i];
      if (!p || presence <= 0) {
        points[i].set(0, 0, 0, 0);
        continue;
      }
      const age = (now - p.bornAt) / HEAT_POINT_LIFE_MS;
      if (age >= 1) {
        points[i].set(0, 0, 0, 0);
        continue;
      }
      scratch.set(p.x, p.y, p.z);
      const dist = scratch.distanceTo(cam.position);
      scratch.project(cam);
      if (scratch.z > 1) {
        points[i].set(0, 0, 0, 0);
        continue;
      }
      // Rayon UV = rayon monde / hauteur visible a cette distance.
      const radiusUv = HEAT_RADIUS_WORLD / (2 * dist * Math.tan(fovRad / 2));
      // L'air chaud monte un peu en vieillissant, puis se calme.
      const strength = presence * Math.pow(1 - age, 1.6);
      points[i].set((scratch.x + 1) / 2, (scratch.y + 1) / 2 + age * radiusUv * 0.8, radiusUv * (0.6 + 0.7 * age), strength);
    }
  });

  return <primitive object={effect} />;
}
