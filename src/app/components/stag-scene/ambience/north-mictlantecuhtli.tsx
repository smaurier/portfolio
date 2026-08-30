/* eslint-disable react-hooks/purity -- pattern gamedev r3f useFrame + init particules Math.random dans useMemo : mutations 60 fps + random init sont legitimes en 3D, les regles React 19 sont trop strictes pour ce contexte. */
"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type Points, type ShaderMaterial } from "three";

/**
 * Nord / Mictlantecuhtli (28/08 task #43). Seigneur du Mictlán, monde
 * des morts. Signature : fumée dense obsidienne qui monte lentement,
 * quelques éclats d'obsidien qui flottent en apesanteur. Ambiance
 * silencieuse, dense, contemplative.
 *
 * Points larges semi-opaques (fumée) + Points petits scintillants
 * (éclats). Ici tout en un shader avec attribut aKind qui bascule le
 * comportement (0 = fumée large lente, 1 = éclat petit scintillant).
 */
const SMOKE_COUNT = 45;
const SHARD_COUNT = 25;
const TOTAL = SMOKE_COUNT + SHARD_COUNT;

export default function NorthMictlantecuhtli({ alphaRef }: { alphaRef: MutableRefObject<number> }) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(TOTAL * 3);
    const seeds = new Float32Array(TOTAL);
    const lifespans = new Float32Array(TOTAL);
    const kinds = new Float32Array(TOTAL);
    for (let i = 0; i < TOTAL; i++) {
      const isSmoke = i < SMOKE_COUNT;
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.0 + Math.random() * 3.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = isSmoke ? 0 : 0.5 + Math.random() * 3;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      seeds[i] = Math.random();
      lifespans[i] = isSmoke ? 6.0 + Math.random() * 3.0 : 8.0 + Math.random() * 4.0;
      kinds[i] = isSmoke ? 0 : 1;
    }
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    geo.setAttribute("aLifespan", new BufferAttribute(lifespans, 1));
    geo.setAttribute("aKind", new BufferAttribute(kinds, 1));
    return {
      geometry: geo,
      uniforms: {
        uAlpha: { value: 0 },
        uTime: { value: 0 },
        uSmokeColor: { value: new Color("#3a2f4a") }, // gris violet dense
        uShardColor: { value: new Color("#6b3fa8") }, // obsidien violet vif
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
          attribute float aKind;
          uniform float uTime;
          varying float vAlpha;
          varying float vKind;

          void main() {
            float t = mod(uTime + aSeed * aLifespan, aLifespan) / aLifespan;
            vec3 pos = position;
            if (aKind < 0.5) {
              // Fumée : monte lente ease-out, drift latéral doux
              pos.y += pow(t, 0.7) * 5.0;
              pos.x += sin(uTime * 0.2 + aSeed * 6.28) * 0.4 * t;
              pos.z += cos(uTime * 0.15 + aSeed * 6.28) * 0.4 * t;
            } else {
              // Éclat : flotte en apesanteur, oscillation lente 3 axes
              pos.x += sin(uTime * 0.3 + aSeed * 6.28) * 0.6;
              pos.y += cos(uTime * 0.25 + aSeed * 4.0) * 0.4;
              pos.z += sin(uTime * 0.28 + aSeed * 5.0) * 0.5;
            }

            float fadeIn = smoothstep(0.0, 0.2, t);
            float fadeOut = 1.0 - smoothstep(0.7, 1.0, t);
            vAlpha = fadeIn * fadeOut;
            vKind = aKind;

            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;
            // Fumée = grosse et floue, éclat = petit et net
            float sz = mix(140.0, 18.0, aKind);
            gl_PointSize = sz / -mv.z;
          }
        `}
        fragmentShader={`
          uniform vec3 uSmokeColor;
          uniform vec3 uShardColor;
          uniform float uAlpha;
          varying float vAlpha;
          varying float vKind;

          void main() {
            if (uAlpha < 0.01) discard;
            vec2 uv = gl_PointCoord - 0.5;
            float r = length(uv);
            float shape;
            vec3 col;
            if (vKind < 0.5) {
              // Fumée : gradient très soft, halo diffus
              shape = 1.0 - smoothstep(0.0, 0.5, r);
              shape = pow(shape, 1.5);
              col = uSmokeColor;
            } else {
              // Éclat : cœur dense qui scintille
              shape = 1.0 - smoothstep(0.05, 0.4, r);
              col = uShardColor;
            }
            float a = shape * vAlpha * uAlpha;
            gl_FragColor = vec4(col * a, 1.0);
          }
        `}
      />
    </points>
  );
}
