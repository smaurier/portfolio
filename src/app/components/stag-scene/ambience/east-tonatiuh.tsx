"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type Points, type ShaderMaterial } from "three";

/**
 * Est / Tonatiuh (28/08 task #43, refonte 28/08 bug canvas noir).
 * Signature soleil : particules dorées scintillantes en volume au
 * quart supérieur droit, courbe descendante vers le sol comme un
 * halo solaire tombant en biais.
 *
 * Refonte : ancien = 6 planes DoubleSide additifs → occultaient toute
 * la scène 3D sur pages non-jade (bug canvas noir services isolé
 * par bisection). Nouveau = Points system 120 particules jaunes,
 * même pattern que SpiritParticles/autres moods (Points additive
 * légers, pas de conflit depth).
 */
const PARTICLE_COUNT = 120;

export default function EastTonatiuh({ alphaRef }: { alphaRef: MutableRefObject<number> }) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const seeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribution biaisée quart supérieur droit + descendante :
      // t 0..1 le long d'un vecteur descendant depuis (4, 5, -1) vers (0, 1, 1)
      const t = Math.random();
      const jitter = 0.6;
      positions[i * 3] = 4 * (1 - t) + (Math.random() - 0.5) * jitter;
      positions[i * 3 + 1] = 5 - t * 4 + (Math.random() - 0.5) * jitter;
      positions[i * 3 + 2] = -1 + t * 2 + (Math.random() - 0.5) * jitter;
      seeds[i] = Math.random();
    }
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    return {
      geometry: geo,
      uniforms: {
        uAlpha: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new Color("#ffb400") },
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
          varying float vTwinkle;

          void main() {
            vec3 pos = position;
            // Léger flottement lent
            pos.x += sin(uTime * 0.3 + aSeed * 6.28) * 0.15;
            pos.y += cos(uTime * 0.25 + aSeed * 4.0) * 0.12;
            // Twinkle scintillement individuel (fréquence variée par seed)
            vTwinkle = 0.3 + 0.7 * pow(0.5 + 0.5 * sin(uTime * (2.0 + aSeed * 3.0) + aSeed * 6.28), 3.0);

            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = 28.0 / -mv.z;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uAlpha;
          varying float vTwinkle;

          void main() {
            if (uAlpha < 0.01) discard;
            vec2 uv = gl_PointCoord - 0.5;
            float r = length(uv);
            float shape = 1.0 - smoothstep(0.0, 0.5, r);
            shape = pow(shape, 1.4);
            float a = shape * vTwinkle * uAlpha;
            gl_FragColor = vec4(uColor * a, 1.0);
          }
        `}
      />
    </points>
  );
}
