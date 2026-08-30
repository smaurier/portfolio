/* eslint-disable react-hooks/immutability, react-hooks/refs, react-hooks/purity -- pattern gamedev r3f useFrame + init particules Math.random dans useMemo : mutations 60 fps + random init sont legitimes en 3D, les regles React 19 sont trop strictes pour ce contexte. */
"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type Points, type ShaderMaterial } from "three";

/**
 * Ouest / Ehecatl (28/08 task #43). Dieu du vent, aspect de Quetzalcóatl.
 * Signature : streamers horizontaux cendre qui traversent la scène de
 * droite à gauche (direction Ouest), suivant un curl noise field. Motion
 * fluide et continue, comme un souffle constant.
 *
 * Points étirés en X (particle avec forme longue) qui glissent
 * lentement dans le sens Est→Ouest, avec un léger drift Y+Z bruité.
 * Cycle de vie : entre X=+6 (droite) et X=-6 (gauche), respawn à droite.
 */
const STREAMER_COUNT = 80;

export default function WestEhecatl({ alphaRef }: { alphaRef: MutableRefObject<number> }) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(STREAMER_COUNT * 3);
    const seeds = new Float32Array(STREAMER_COUNT);
    for (let i = 0; i < STREAMER_COUNT; i++) {
      // Position initiale répartie sur toute la traversée
      positions[i * 3] = Math.random() * 12 - 6;
      positions[i * 3 + 1] = 0.5 + Math.random() * 4.5;
      positions[i * 3 + 2] = -2 + Math.random() * 4;
      seeds[i] = Math.random();
    }
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    return {
      geometry: geo,
      uniforms: {
        uAlpha: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new Color("#d76464") }, // cendre lumineuse
      },
    };
  }, []);

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uAlpha.value = alphaRef.current;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points ref={pointsRef} geometry={geometry} raycast={() => null}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        vertexShader={`
          attribute float aSeed;
          uniform float uTime;
          varying float vAlpha;
          varying float vSpeed;

          void main() {
            vec3 pos = position;
            // Traversée Est→Ouest continue. Vitesse variable par seed
            // (0.6 à 1.4) — pas de mur uniforme.
            float speed = 0.6 + aSeed * 0.8;
            float driftX = mod(uTime * speed + aSeed * 12.0, 12.0) - 6.0;
            pos.x = -driftX; // Ouest = X négatif
            // Petit drift Y+Z bruité (curl-like léger)
            pos.y += sin(uTime * 0.4 + aSeed * 6.28) * 0.3;
            pos.z += cos(uTime * 0.35 + aSeed * 5.0) * 0.4;

            // Fade in aux bords (droite et gauche), plein milieu
            float xNorm = pos.x / 6.0; // -1 à 1
            float fade = 1.0 - abs(xNorm) * 0.4;
            vAlpha = smoothstep(0.0, 0.3, 1.0 - abs(xNorm)) * fade;
            vSpeed = speed;

            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = 22.0 / -mv.z;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uAlpha;
          varying float vAlpha;
          varying float vSpeed;

          void main() {
            if (uAlpha < 0.01) discard;
            vec2 uv = gl_PointCoord - 0.5;
            // Forme allongée horizontalement (streamer stretched X)
            uv.x *= 0.35;
            float r = length(uv);
            float shape = 1.0 - smoothstep(0.0, 0.28, r);
            // Streamers plus rapides sont plus vifs
            vec3 col = uColor * (0.7 + vSpeed * 0.3);
            float a = shape * vAlpha * uAlpha * 0.8;
            gl_FragColor = vec4(col * a, 1.0);
          }
        `}
      />
    </points>
  );
}
