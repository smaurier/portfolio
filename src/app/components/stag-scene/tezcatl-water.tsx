/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation des uniforms 60 fps legitime en 3D (meme precedent que stag-mirror). */
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, ShaderMaterial, Vector3, type Mesh } from "three";
import { smokeGate } from "@/lib/tezcatl-fluid";
import { TEZCATL_EXTENT, WATER_LEVEL, tezcatlStore } from "./tezcatl-store";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * TezcatlWater (02/09, Nord). Une nappe d'eau de ~20 cm sur toute la
 * surface (demande Sylvain : "comme 20 cm d'eau et lorsqu'on bougerait la
 * souris, ca ferait des ondes dedans"). Le fleuve Chiconahuapan de la
 * fiche Mictlampa, celui que Xolotl aide a traverser : le cerf a les
 * pattes dedans, son reflet et la fumee sont dessous.
 *
 * UN SEUL simulateur pour tout (arbitrage Sylvain 02/09 "utilise le
 * simulateur de fluide pour tout cela") : pas de sim d'ondes separee, la
 * surface est lue dans le fluide de tezcatl-fluid-sim.ts (via
 * tezcatlStore, produit par TezcatlSmoke) : le gradient de PRESSION
 * dessine les fronts autour de ce que la souris pousse, la VITESSE incline
 * la surface dans le sens du courant. Ce qui la rend lisible : le reflet
 * speculaire de la top light froide du puits sur les pentes, et le Fresnel
 * (plus claire en incidence rasante). Ce qui est SOUS l'eau (reflet
 * menteur, fumee) est refracte par la meme pression, chacun dans son
 * shader.
 *
 * Nord seulement, meme gate que le reflet et la fumee. Reduced-motion : la
 * sim est figee par TezcatlSmoke, l'eau reste visible et calme.
 */

const EXTENT = TEZCATL_EXTENT;
const WATER_OPACITY = 0.3;
const WATER_COLOR = new Color("#0b0714");
const SPEC_COLOR = new Color("#cfc6f2");
const RIM_COLOR = new Color("#5a4a8a");
const LIGHT_DIR = new Vector3(0.25, 1, 0.35).normalize(); // la top light froide du puits
/** Pente de la surface par unite de gradient de pression. */
const PRESSURE_GAIN = 6.0;
/** Inclinaison de la surface par unite de vitesse (le courant tire la
 * surface). */
const VELOCITY_TILT = 0.35;

export default function TezcatlWater() {
  const meshRef = useRef<Mesh>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const opacityRef = useRef(0);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uVelocity: { value: tezcatlStore.velocity },
          uPressure: { value: tezcatlStore.pressure },
          uTexel: { value: tezcatlStore.texel },
          uOpacity: { value: 0 },
          uColor: { value: WATER_COLOR },
          uSpec: { value: SPEC_COLOR },
          uRim: { value: RIM_COLOR },
          uLightDir: { value: LIGHT_DIR },
          uPressureGain: { value: PRESSURE_GAIN },
          uVelocityTilt: { value: VELOCITY_TILT },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        vertexShader: `
          varying vec3 vWorldPos;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorldPos = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          uniform sampler2D uVelocity;
          uniform sampler2D uPressure;
          uniform float uTexel;
          uniform float uOpacity;
          uniform vec3 uColor;
          uniform vec3 uSpec;
          uniform vec3 uRim;
          uniform vec3 uLightDir;
          uniform float uPressureGain;
          uniform float uVelocityTilt;
          varying vec3 vWorldPos;
          const float EXTENT = ${EXTENT.toFixed(1)};
          void main() {
            vec2 uv = vWorldPos.xz / (2.0 * EXTENT) + 0.5;
            float pL = texture2D(uPressure, uv - vec2(uTexel, 0.0)).x;
            float pR = texture2D(uPressure, uv + vec2(uTexel, 0.0)).x;
            float pB = texture2D(uPressure, uv - vec2(0.0, uTexel)).x;
            float pT = texture2D(uPressure, uv + vec2(0.0, uTexel)).x;
            vec2 grad = vec2(pR - pL, pT - pB) * uPressureGain;
            vec2 vel = texture2D(uVelocity, uv).xy * uVelocityTilt;
            vec2 tilt = grad + vel;
            vec3 n = normalize(vec3(-tilt.x, 1.0, -tilt.y));
            vec3 view = normalize(cameraPosition - vWorldPos);
            float fresnel = pow(1.0 - max(dot(n, view), 0.0), 3.0);
            vec3 h = normalize(uLightDir + view);
            float spec = pow(max(dot(n, h), 0.0), 90.0);
            // Les pentes accrochent un peu de lumiere diffuse : le courant
            // reste lisible hors du reflet speculaire, sans white-out.
            float slope = clamp((1.0 - n.y) * 4.0, 0.0, 1.0);
            float d = max(abs(vWorldPos.x), abs(vWorldPos.z)) / EXTENT;
            float mask = 1.0 - smoothstep(0.8, 0.98, d);
            vec3 col = uColor + uRim * fresnel * 0.35 + uSpec * (spec * 0.5 + slope * 0.18);
            float a = (uOpacity + fresnel * 0.15 + spec * 0.3 + slope * 0.15) * mask;
            gl_FragColor = vec4(col, clamp(a, 0.0, 0.9));
          }
        `,
      }),
    []
  );

  useFrame(() => {
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const doc = typeof document !== "undefined" ? document.documentElement : null;
    const denom = doc ? doc.scrollHeight - window.innerHeight : 0;
    const depth = denom > 0 ? Math.min(1, window.scrollY / denom) : 1;
    const target = smokeGate({ direction, scrollDepth: depth, reducedMotion: reduced }) * WATER_OPACITY;
    opacityRef.current = reduced ? target : opacityRef.current + (target - opacityRef.current) * 0.05;
    const visible = opacityRef.current > 0.003;
    if (meshRef.current) meshRef.current.visible = visible;
    if (!visible) return;
    // Champs publies par TezcatlSmoke (textures ping-pong : la reference
    // change a chaque frame).
    material.uniforms.uVelocity.value = tezcatlStore.velocity;
    material.uniforms.uPressure.value = tezcatlStore.pressure;
    material.uniforms.uTexel.value = tezcatlStore.texel;
    material.uniforms.uOpacity.value = opacityRef.current;
  });

  return (
    <mesh
      ref={meshRef}
      material={material}
      position={[0, WATER_LEVEL, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1000}
      frustumCulled={false}
      raycast={() => null}
      visible={false}
    >
      <planeGeometry args={[EXTENT * 2, EXTENT * 2]} />
    </mesh>
  );
}
