import { Vector3, type PerspectiveCamera } from "three";
import { HEAT_POINT_LIFE_MS, HEAT_TRAIL_MAX, xiuhcoatlStore } from "./xiuhcoatl-store";

/**
 * Projection des points de chaleur du xiuhcoatl a l'ecran (05/09, sorti de
 * xiuhcoatl-heat.tsx pour servir aussi la chaine WebGPU : une seule
 * source de verite pour « ou l'air tremble »). Chaque point du store
 * (monde) devient (u, v, rayon UV, force) ; `yDown` choisit l'origine de
 * v : bas-gauche (gl_FragCoord, chaine WebGL) ou haut-gauche (TSL).
 */

/** Rayon monde d'un point de chaleur (u). */
export const HEAT_RADIUS_WORLD = 1.6;

export type HeatPointUv = { x: number; y: number; z: number; w: number };

const scratch = new Vector3();

export function projectHeatPoints(
  camera: PerspectiveCamera,
  now: number,
  yDown: boolean,
  write: (i: number, x: number, y: number, z: number, w: number) => void
): void {
  const fovRad = ((camera.fov ?? 45) * Math.PI) / 180;
  const trail = xiuhcoatlStore.trail;
  const presence = xiuhcoatlStore.presence * xiuhcoatlStore.heatGate;
  for (let i = 0; i < HEAT_TRAIL_MAX; i++) {
    const p = trail[i];
    if (!p || presence <= 0) {
      write(i, 0, 0, 0, 0);
      continue;
    }
    const age = (now - p.bornAt) / HEAT_POINT_LIFE_MS;
    if (age >= 1) {
      write(i, 0, 0, 0, 0);
      continue;
    }
    scratch.set(p.x, p.y, p.z);
    const dist = scratch.distanceTo(camera.position);
    scratch.project(camera);
    if (scratch.z > 1) {
      write(i, 0, 0, 0, 0);
      continue;
    }
    // Rayon UV = rayon monde / hauteur visible a cette distance.
    const radiusUv = HEAT_RADIUS_WORLD / (2 * dist * Math.tan(fovRad / 2));
    // L'air chaud monte un peu en vieillissant, puis se calme.
    const strength = presence * Math.pow(1 - age, 1.6);
    const vUp = (scratch.y + 1) / 2 + age * radiusUv * 0.8;
    write(i, (scratch.x + 1) / 2, yDown ? 1 - vUp : vUp, radiusUv * (0.6 + 0.7 * age), strength);
  }
}
