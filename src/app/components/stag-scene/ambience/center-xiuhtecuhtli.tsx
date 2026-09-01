/* eslint-disable react-hooks/purity -- pattern gamedev r3f useFrame + init particules Math.random dans useMemo : mutations 60 fps + random init sont legitimes en 3D, les regles React 19 sont trop strictes pour ce contexte. */
"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type Points, type ShaderMaterial } from "three";

/**
 * Centre / Xiuhtecuhtli (28/08 task #43). Le dieu du feu et du temps,
 * axe cosmique. Signature : embers verticaux jade qui montent du sol
 * autour du cerf, feu axial silencieux, comme une flamme qui respire.
 *
 * Points system avec cycle de vie : chaque ember naît près du sol
 * (y=0) dans un cercle de rayon 2 autour de l'origine, monte jusqu'à
 * y=4 avec rise curve, fade in-out, respawn. Densité modérée (60
 * embers) pour ne pas concurrencer les pétales SpiritParticles.
 */
const EMBER_COUNT = 60;

export default function CenterXiuhtecuhtli({ alphaRef }: { alphaRef: MutableRefObject<number> }) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(EMBER_COUNT * 3);
    const seeds = new Float32Array(EMBER_COUNT);
    const lifespans = new Float32Array(EMBER_COUNT);
    for (let i = 0; i < EMBER_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * 1.8;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      seeds[i] = Math.random();
      lifespans[i] = 3.0 + Math.random() * 2.5;
    }
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    geo.setAttribute("aLifespan", new BufferAttribute(lifespans, 1));
    return {
      geometry: geo,
      uniforms: {
        uAlpha: { value: 1 }, // jade = home, actif au boot
        uTime: { value: 0 },
        uColor: { value: new Color("#00c078") },
        uAccent: { value: new Color("#f97316") }, // orange chaud complémentaire
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
          attribute float aLifespan;
          uniform float uTime;
          varying float vAlpha;
          varying float vHeat;

          void main() {
            float t = mod(uTime + aSeed * aLifespan, aLifespan) / aLifespan;
            vec3 pos = position;
            // Rise ease-out cubic : accélère au début puis ralentit
            float rise = 1.0 - pow(1.0 - t, 3.0);
            pos.y += rise * 4.0;
            // Léger sway XZ pendant la montée, sinusoïdal par seed
            pos.x += sin(uTime * 0.7 + aSeed * 6.28) * 0.15 * t;
            pos.z += cos(uTime * 0.5 + aSeed * 6.28) * 0.15 * t;

            float fadeIn = smoothstep(0.0, 0.15, t);
            float fadeOut = 1.0 - smoothstep(0.65, 1.0, t);
            vAlpha = fadeIn * fadeOut;
            vHeat = t; // 0 = frais, 1 = éteint

            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;
            // Petit au début, gros au milieu, meurt en s'atomisant
            float sz = 30.0 + 20.0 * sin(t * 3.14);
            gl_PointSize = sz / -mv.z;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform vec3 uAccent;
          uniform float uAlpha;
          varying float vAlpha;
          varying float vHeat;

          void main() {
            if (uAlpha < 0.01) discard;
            vec2 uv = gl_PointCoord - 0.5;
            float r = length(uv);
            float shape = 1.0 - smoothstep(0.0, 0.5, r);
            // Cœur chaud orange, halo jade, l'ember se refroidit en montant
            vec3 col = mix(uAccent, uColor, vHeat);
            float a = shape * vAlpha * uAlpha;
            gl_FragColor = vec4(col * a, 1.0);
          }
        `}
      />
    </points>
  );
}
