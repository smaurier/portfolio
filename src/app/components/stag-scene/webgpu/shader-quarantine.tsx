"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Material, Object3D } from "three";
import { isWebGpu } from "./renderer-kind";

/**
 * Quarantaine des ShaderMaterial (05/09, migration WebGPU, temporaire).
 * WebGPURenderer ne sait pas rendre un ShaderMaterial GLSL : il logue une
 * erreur A CHAQUE FRAME pour chacun (« Material ShaderMaterial is not
 * compatible ») et l'objet ne s'affiche pas. Tant que tous ne sont pas
 * convertis en TSL, on les cache sous WebGPU, on liste une fois ce qui
 * reste a porter (console.info, dev), et la boucle reste silencieuse. A
 * supprimer quand la liste est vide.
 */
export default function ShaderQuarantine() {
  const frame = useRef(0);
  const reported = useRef<Set<string>>(new Set());

  useFrame(({ scene }) => {
    if (!isWebGpu()) return;
    frame.current += 1;
    if (frame.current % 30 !== 1) return; // les enfants montent apres coup (Suspense)
    scene.traverse((o: Object3D) => {
      const mesh = o as Object3D & { material?: Material | Material[]; visible: boolean };
      if (!mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const raw = mats.find((m) => (m as { isShaderMaterial?: boolean }).isShaderMaterial && !(m as { isNodeMaterial?: boolean }).isNodeMaterial);
      if (!raw) return;
      if (mesh.visible) mesh.visible = false;
      const key = `${o.name || o.type}:${raw.name || "shader"}`;
      if (!reported.current.has(key) && process.env.NODE_ENV !== "production") {
        reported.current.add(key);
        console.info(`[webgpu] a porter en TSL : ${key}`);
      }
    });
  });

  return null;
}
