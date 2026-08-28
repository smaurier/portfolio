"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, DoubleSide, type Mesh, type ShaderMaterial } from "three";

/**
 * Est / Tonatiuh (28/08 task #43). Le soleil du 5e âge nahua. Signature
 * mytho : god-rays chauds, shafts volumétriques venant du haut-droite.
 *
 * Implémentation : 6 planes triangulaires en éventail, positionnés dans
 * le quart supérieur droit du monde, orientés vers le sol au centre.
 * Shader fragment = gradient chaud additif avec noise scintillant. Le
 * uAlpha global fade tout l'ensemble en douceur.
 *
 * Pas de post-processing god-rays effect coûteux : cette version
 * mesh-based tourne à ~zero coût GPU même sur mobile modeste, tout en
 * donnant l'illusion volumétrique cherchée (rays qui se croisent au
 * point de convergence, halo chaud).
 */
const SHAFT_COUNT = 6;
const SHAFT_LENGTH = 8;
const SHAFT_WIDTH = 1.4;

export default function EastTonatiuh({ alphaRef }: { alphaRef: MutableRefObject<number> }) {
  const groupRef = useRef<Mesh[]>([]);
  const materialsRef = useRef<ShaderMaterial[]>([]);

  const shafts = useMemo(() => {
    const items: Array<{ rotation: [number, number, number]; offset: [number, number, number]; seed: number }> = [];
    // Angles espacés dans un cône ~40° en fan
    for (let i = 0; i < SHAFT_COUNT; i++) {
      const spread = (i / (SHAFT_COUNT - 1) - 0.5) * 0.6; // ~35° total
      items.push({
        // Origine top-right, rotation vers bas-gauche
        offset: [4 + Math.random() * 0.3, 5 + Math.random() * 0.3, -1 + Math.random() * 0.5],
        rotation: [-0.4 + spread * 0.2, 0.5 + spread, spread * 0.3],
        seed: Math.random(),
      });
    }
    return items;
  }, []);

  const color = useMemo(() => new Color("#f5a623"), []);

  useFrame((state) => {
    const alpha = alphaRef.current;
    materialsRef.current.forEach((mat, i) => {
      if (!mat) return;
      mat.uniforms.uAlpha.value = alpha;
      mat.uniforms.uTime.value = state.clock.elapsedTime + shafts[i].seed * 10;
      // Discard early si invisible : le shader check uAlpha < 0.01 discard.
    });
  });

  if (shafts.length === 0) return null;

  return (
    <group>
      {shafts.map((s, i) => (
        <mesh
          key={i}
          position={s.offset}
          rotation={s.rotation}
          ref={(m) => {
            if (m) groupRef.current[i] = m;
          }}
          raycast={() => null}
        >
          <planeGeometry args={[SHAFT_WIDTH, SHAFT_LENGTH]} />
          <shaderMaterial
            ref={(m) => {
              if (m) materialsRef.current[i] = m as ShaderMaterial;
            }}
            transparent
            depthWrite={false}
            side={DoubleSide}
            blending={AdditiveBlending}
            uniforms={{
              uAlpha: { value: 0 },
              uTime: { value: 0 },
              uColor: { value: color },
            }}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform float uAlpha;
              uniform float uTime;
              uniform vec3 uColor;
              varying vec2 vUv;

              // Hash bruit peu coûteux
              float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
              float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
                           mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
              }

              void main() {
                if (uAlpha < 0.01) discard;
                // Gradient centre chaud, bords fade
                float cx = 1.0 - abs(vUv.x - 0.5) * 2.0;
                cx = pow(cx, 2.2);
                // Fade top→bottom : le shaft s'éteint vers le sol
                float fy = smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
                // Scintillement subtil dans le shaft
                float shimmer = 0.7 + 0.3 * noise(vec2(vUv.x * 8.0, vUv.y * 3.0 + uTime * 0.3));
                float shape = cx * fy * shimmer;
                gl_FragColor = vec4(uColor * shape * uAlpha * 0.9, 1.0);
              }
            `}
          />
        </mesh>
      ))}
    </group>
  );
}
