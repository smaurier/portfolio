/* eslint-disable react-hooks/purity -- pattern gamedev r3f useFrame + init particules Math.random dans useMemo : mutations 60 fps + random init sont legitimes en 3D, les regles React 19 sont trop strictes pour ce contexte. */
"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type Points, type ShaderMaterial } from "three";
import { useLibereAuDemontage } from "../use-libere";

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
  useLibereAuDemontage(geometry);

  useFrame((state) => {
    if (!materialRef.current) return;
    const alpha = alphaRef.current;
    materialRef.current.uniforms.uAlpha.value = alpha;
    // ETEINDRE PLUTOT QUE DESSINER DU VIDE (16/09). Les trois ambiances
    // cardinales sont montees ensemble et se fondent par leur alpha : sur
    // une page donnee, deux dessinent donc a alpha nul, en additif et sans
    // ecriture de profondeur, sur tous les pixels que leurs points
    // couvrent. Un fragment se paie qu'il ecrive ou non. Mesure sur Contact
    // (Pixel 7, processeur divise par quatre, mediane du temps de rendu sur
    // deux cents images) : la seule ambiance du Nord pesait 1,6 ms par
    // image, sur un budget de 16,7. Meme motif que sun-beam et
    // foyer-column, qui le faisaient deja.
    if (pointsRef.current) pointsRef.current.visible = alpha > 0.002;
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
            // (0.6 à 1.4), pas de mur uniforme.
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
