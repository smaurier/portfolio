"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import { applyFrost, frostUniforms } from "./frost-store";
import { MATERIAL_SWEEP_EVERY, addShaderModifier } from "./shader-patch";

const STAG_PATH = "/models/stag.glb";

/**
 * LE GIVRE POSE PARTOUT, DES LE CHARGEMENT (11/09).
 *
 * Le monde de verre de l'Est modifie les materiaux standard de toute la
 * scene (frost-store.applyFrost) et ceux du cerf (le verre). Quand FrostWorld
 * le faisait a son montage, a l'Est seulement, chaque materiau persistant
 * recompilait a l'image suivante, en synchrone : de Projets vers Services,
 * des images de 400 a 500 ms une par une (mesure du 11/09). Pose des le
 * chargement, sur toutes les pages, la variante est compilee derriere le
 * voile ; a zero, le givre ne coute que quelques operations gardees par un
 * `if`, et le jeu de programmes ne change plus d'une page a l'autre.
 */
export default function FrostPatch() {
  const scene = useThree((s) => s.scene);
  const { scene: stagScene } = useGLTF(STAG_PATH);
  const sweepRef = useRef(0);
  const glassRef = useRef(false);

  useFrame(() => {
    if (sweepRef.current++ % MATERIAL_SWEEP_EVERY === 0) applyFrost(scene);
    if (!glassRef.current) {
      glassRef.current = true;
      applyFrost(stagScene);
  stagScene.traverse((o) => {
    const m = (o as Mesh).material as MeshStandardMaterial | undefined;
    if (!m || Array.isArray(m) || !(m as MeshStandardMaterial).isMeshStandardMaterial) return;
    addShaderModifier(m, (shader) => {
      shader.uniforms.uGlass = frostUniforms.uFrost;
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
 uniform float uGlass;`)
        .replace(
          "#include <dithering_fragment>",
          `if (uGlass > 0.001) {
             vec3 gN = normalize(vNormal);
             vec3 gV = normalize(vViewPosition);
             float gNV = abs(dot(gN, gV));
             float gFres = pow(1.0 - gNV, 2.2);
             // Verre : le fond passe au centre, les bords se blanchissent.
             vec3 glassCol = mix(vec3(0.62, 0.78, 0.96), vec3(0.97, 0.99, 1.0), gFres);
             gl_FragColor.rgb = mix(gl_FragColor.rgb, glassCol * (0.55 + 0.45 * gFres), uGlass);
             gl_FragColor.a = mix(gl_FragColor.a, 0.22 + 0.7 * gFres, uGlass);
           }
           #include <dithering_fragment>`,
        );
    });
  });
    }
  });

  return null;
}
