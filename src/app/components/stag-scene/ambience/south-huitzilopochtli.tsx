 
"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type Points, type ShaderMaterial } from "three";

/**
 * Sud / Huitzilopochtli (28/08 task #43). Dieu-colibri, guerrier du
 * soleil de midi. Signature : 3 colibris turquoise qui volent en
 * boucles Lissajous autour du cerf, chacun laissant une trainée courte
 * de particules qui scintillent.
 *
 * Implémentation Points : chaque "colibri" est un cluster de 15 points
 * qui suivent une trajectoire Lissajous propre, décalés dans le temps
 * pour former une trainée. Total 45 points, très léger.
 */
const HUMMINGBIRD_COUNT = 3;
const TRAIL_LENGTH = 15;
const TOTAL = HUMMINGBIRD_COUNT * TRAIL_LENGTH;

export default function SouthHuitzilopochtli({ alphaRef }: { alphaRef: MutableRefObject<number> }) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(TOTAL * 3);
    const birds = new Float32Array(TOTAL);
    const trailPos = new Float32Array(TOTAL);
    for (let bi = 0; bi < HUMMINGBIRD_COUNT; bi++) {
      for (let ti = 0; ti < TRAIL_LENGTH; ti++) {
        const i = bi * TRAIL_LENGTH + ti;
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 2;
        positions[i * 3 + 2] = 0;
        birds[i] = bi;
        trailPos[i] = ti / (TRAIL_LENGTH - 1); // 0 = tête, 1 = queue
      }
    }
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aBird", new BufferAttribute(birds, 1));
    geo.setAttribute("aTrail", new BufferAttribute(trailPos, 1));
    return {
      geometry: geo,
      uniforms: {
        uAlpha: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new Color("#0f6bb8") },
        uAccent: { value: new Color("#f97316") }, // orange complémentaire, gorge du colibri
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
          attribute float aBird;
          attribute float aTrail;
          uniform float uTime;
          varying float vTrail;
          varying float vFlash;

          void main() {
            // Chaque colibri a sa phase et son shape Lissajous
            float phase = aBird * 2.1;
            float speed = 0.9 + aBird * 0.15;
            // Décalage temporel de la queue par rapport à la tête
            float tOffset = aTrail * 0.4;
            float t = uTime * speed - tOffset + phase;
            // Lissajous 3D asymétrique, rayons différents par colibri
            float rx = 2.5 + aBird * 0.4;
            float ry = 1.5;
            float rz = 2.0 + aBird * 0.3;
            vec3 pos = vec3(
              sin(t * 1.3 + phase) * rx,
              2.5 + sin(t * 0.8 + phase * 2.0) * ry,
              cos(t * 1.7 + phase) * rz
            );
            // Flash battement d'ailes (7 Hz, comme un vrai colibri)
            vFlash = 0.5 + 0.5 * sin(uTime * 44.0 + aBird * 3.0);
            vTrail = aTrail;

            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;
            // Tête plus grosse, queue s'atomise
            float sz = mix(38.0, 6.0, aTrail);
            gl_PointSize = sz / -mv.z;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform vec3 uAccent;
          uniform float uAlpha;
          varying float vTrail;
          varying float vFlash;

          void main() {
            if (uAlpha < 0.01) discard;
            vec2 uv = gl_PointCoord - 0.5;
            float r = length(uv);
            float shape = 1.0 - smoothstep(0.0, 0.5, r);
            // Tête = mix turquoise+orange avec flash battement d'ailes
            // Queue = turquoise pur qui s'atomise
            vec3 col = mix(mix(uColor, uAccent, vFlash * 0.3), uColor, vTrail);
            float trailFade = 1.0 - vTrail * 0.7; // queue plus discrète
            float a = shape * trailFade * uAlpha;
            gl_FragColor = vec4(col * a, 1.0);
          }
        `}
      />
    </points>
  );
}
