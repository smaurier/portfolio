/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation des uniforms et de la sim 60 fps legitime en 3D (meme precedent que stag-mirror). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, DoubleSide, Plane, ShaderMaterial, Vector3, type Mesh } from "three";
import { pointerSplat, smokeGate, worldToSimUv, type SimUv } from "@/lib/tezcatl-fluid";
import { DEFAULT_FLUID_PARAMS, TezcatlFluidSim, type FluidParams } from "./tezcatl-fluid-sim";
import { TEZCATL_EXTENT, WATER_LEVEL, ZERO_TEXTURE, tezcatlStore } from "./tezcatl-store";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * TezcatlWater (02/09, Nord). Une nappe d'eau CALME de ~20 cm sur toute la
 * surface, geree par le simulateur de fluide (Navier-Stokes,
 * tezcatl-fluid-sim.ts). Arbitrages Sylvain 02/09 dans l'ordre : "20 cm
 * d'eau, des ondes a la souris", "utilise le simulateur de fluide pour
 * tout cela", "enleve la fumee, ne met qu'une nappe d'eau", "l'eau est
 * geree par le simulateur de fluide cela dit. Mais elle doit etre calme".
 * Le fleuve Chiconahuapan de la fiche Mictlampa : le cerf a les pattes
 * dedans, son reflet est dessous.
 *
 * CALME : rien n'injecte d'energie au repos (plus d'emetteurs, ils
 * faisaient les tourbillons "qu'on ne sait pas pourquoi" avec le
 * confinement de vorticite), vorticite a zero, dissipation forte : le
 * fluide est immobile jusqu'a ce que la souris le pousse, et la
 * perturbation s'eteint en une ou deux secondes.
 *
 * Rendu : plan translucide sombre, miroir noir au repos, normale inclinee
 * par le gradient de PRESSION (les fronts autour de la poussee) et par la
 * VITESSE (le courant tire la surface). Lisible par le speculaire de la
 * top light froide du puits et le Fresnel. Le reflet menteur, sous l'eau,
 * est refracte par la meme pression (via tezcatlStore).
 *
 * Nord seulement, meme gate que le reflet. Reduced-motion : eau plate
 * (pas de poussee), toujours visible. Mobile : grille divisee par deux.
 */

const EXTENT = TEZCATL_EXTENT;
const WATER_OPACITY = 0.3;
const WATER_COLOR = new Color("#0b0714");
const SPEC_COLOR = new Color("#cfc6f2");
const RIM_COLOR = new Color("#5a4a8a");
const LIGHT_DIR = new Vector3(0.25, 1, 0.35).normalize(); // la top light froide du puits
const WATER_PLANE = new Plane(new Vector3(0, 1, 0), -WATER_LEVEL);
/** Pente de la surface par unite de gradient de pression. */
const PRESSURE_GAIN = 10.0;
/** Inclinaison de la surface par unite de vitesse (le courant tire la
 * surface). */
const VELOCITY_TILT = 0.8;

/** Fluide de l'eau calme : pas d'encre, pas d'emetteurs, pas de
 * vorticite, dissipation rapide. Seule la souris pousse. */
const WATER_FLUID_PARAMS: FluidParams = {
  ...DEFAULT_FLUID_PARAMS,
  curl: 0,
  velocityDissipation: 1.4,
  pressureIterations: 20,
  pointerRadius: 0.004,
  pointerPush: 1.0,
  emitterDye: 0,
  emitterPush: 0,
};

export default function TezcatlWater() {
  const meshRef = useRef<Mesh>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const { gl } = useThree();
  const opacityRef = useRef(0);
  const prevPointerRef = useRef<SimUv | null>(null);
  const hitRef = useRef(new Vector3());

  const lowPerf = sceneRefs ? !sceneRefs.perfProfile.postFx : false;
  // Grille d'encre minimale : l'eau n'a pas d'encre, inutile de la payer.
  const sim = useMemo(() => new TezcatlFluidSim(gl, lowPerf ? 96 : 192, 8, WATER_FLUID_PARAMS), [gl, lowPerf]);
  useEffect(
    () => () => {
      sim.dispose();
      tezcatlStore.velocity = ZERO_TEXTURE;
      tezcatlStore.pressure = ZERO_TEXTURE;
      tezcatlStore.texel = 1;
    },
    [sim]
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uVelocity: { value: sim.velocityTexture },
          uPressure: { value: sim.pressureTexture },
          uTexel: { value: sim.texel },
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
            // Les pentes accrochent un peu de lumiere diffuse : le sillage
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
    [sim]
  );

  useFrame((state, delta) => {
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const doc = typeof document !== "undefined" ? document.documentElement : null;
    const denom = doc ? doc.scrollHeight - window.innerHeight : 0;
    const depth = denom > 0 ? Math.min(1, window.scrollY / denom) : 1;
    const target = smokeGate({ direction, scrollDepth: depth, reducedMotion: reduced }) * WATER_OPACITY;
    opacityRef.current = reduced ? target : opacityRef.current + (target - opacityRef.current) * 0.05;
    const visible = opacityRef.current > 0.003;
    if (meshRef.current) meshRef.current.visible = visible;
    if (!visible) {
      prevPointerRef.current = null;
      return;
    }

    // La souris projetee sur la nappe pousse le fluide. Pas de poussee en
    // reduced-motion (eau plate), la sim tourne quand meme (elle s'eteint).
    const dt = Math.min(delta, 1 / 30);
    let pointer = null;
    if (!reduced) {
      state.raycaster.setFromCamera(state.pointer, state.camera);
      const hit = state.raycaster.ray.intersectPlane(WATER_PLANE, hitRef.current);
      if (hit) {
        const { u, v, inside } = worldToSimUv(hit.x, hit.z, EXTENT);
        const uv = { u, v };
        if (inside && prevPointerRef.current) pointer = pointerSplat(prevPointerRef.current, uv, dt);
        prevPointerRef.current = uv;
      }
    }
    sim.step(dt, [], pointer);

    tezcatlStore.velocity = sim.velocityTexture;
    tezcatlStore.pressure = sim.pressureTexture;
    tezcatlStore.texel = sim.texel;
    material.uniforms.uVelocity.value = sim.velocityTexture;
    material.uniforms.uPressure.value = sim.pressureTexture;
    material.uniforms.uTexel.value = sim.texel;
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
