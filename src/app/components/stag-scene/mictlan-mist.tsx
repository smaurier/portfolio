/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation des uniforms et de la sim 60 fps, legitime en 3D. */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, DoubleSide, ShaderMaterial, type Mesh } from "three";
import { mistEmitters } from "@/lib/mictlan-mist";
import { smokeGate } from "@/lib/tezcatl-fluid";
import { TezcatlFluidSim } from "./mictlan-fluid-sim";
import { TEZCATL_EXTENT, WATER_LEVEL } from "./tezcatl-store";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * MictlanMist (03/09, Nord). Les NAPPES de brouillard du Mictlan, sur un
 * vrai simulateur de fluide (Navier-Stokes GPU, mictlan-fluid-sim.ts :
 * le Navier-Stokes du 02/09 revenu de l'historique git pour ca). Retour
 * Sylvain : "on voit trop nettement la margelle au fond pour que ce soit
 * credible, j'aimerais un vrai simulateur de brouillard ou de fumee pour
 * faire des nappes".
 *
 * Le brouillard nait aux bords du bassin (couronne contre la margelle,
 * cf lib/mictlan-mist.ts) et rampe lentement vers l'interieur ; le centre
 * est masque (le cerf reste net). Rendu en trois nappes empilees au-dessus
 * de la nappe d'eau, chacune echantillonnant l'encre du fluide avec une
 * opacite decroissante en hauteur : un volume bas, laiteux, violet-gris,
 * qui voile la margelle. Nord seulement, tempo x0.6, fige apres warm-up
 * en reduced-motion, grilles divisees par deux sur mobile.
 */

const EXTENT = TEZCATL_EXTENT;
const EMITTERS = 16;
const RING_MIN = 4.6;
const RING_MAX = 6.3;
const NORTH_TIME_SCALE = 0.6;
const MIST_OPACITY = 0.5;
const REDUCED_WARMUP_SECONDS = 3;
const LAYERS = [
  { y: WATER_LEVEL + 0.08, opacity: 1.0 },
  { y: WATER_LEVEL + 0.3, opacity: 0.6 },
  { y: WATER_LEVEL + 0.55, opacity: 0.3 },
];
const MIST_COLOR = new Color("#8f86b8");
const MIST_SHADOW = new Color("#2a2140");
/** Rayon (monde) en deca duquel la nappe est masquee : le cerf reste net. */
const CLEAR_RADIUS = 2.6;

export default function MictlanMist() {
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const { gl } = useThree();
  const opacityRef = useRef(0);
  const simTimeRef = useRef(0);
  const meshRefs = useRef<(Mesh | null)[]>([]);

  const lowPerf = sceneRefs ? !sceneRefs.perfProfile.postFx : false;
  const sim = useMemo(
    () =>
      new TezcatlFluidSim(gl, lowPerf ? 64 : 128, lowPerf ? 128 : 256, {
        curl: 6,
        velocityDissipation: 0.35,
        dyeDissipation: 0.22,
        pressureIterations: 12,
        emitterRadius: 0.0012,
        pointerRadius: 0.002,
        emitterDye: 0.9,
        emitterPush: 2.5,
        pointerPush: 0,
      }),
    [gl, lowPerf]
  );
  useEffect(() => () => sim.dispose(), [sim]);

  const materials = useMemo(
    () =>
      LAYERS.map(
        (layer) =>
          new ShaderMaterial({
            uniforms: {
              uDye: { value: sim.dyeTexture },
              uOpacity: { value: 0 },
              uLayer: { value: layer.opacity },
              uColor: { value: MIST_COLOR },
              uShadow: { value: MIST_SHADOW },
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
              uniform sampler2D uDye;
              uniform float uOpacity;
              uniform float uLayer;
              uniform vec3 uColor;
              uniform vec3 uShadow;
              varying vec3 vWorldPos;
              const float EXTENT = ${EXTENT.toFixed(1)};
              const float CLEAR = ${CLEAR_RADIUS.toFixed(1)};
              void main() {
                vec2 uv = vWorldPos.xz / (2.0 * EXTENT) + 0.5;
                float dens = texture2D(uDye, uv).r;
                float body = smoothstep(0.02, 0.7, dens);
                float r = length(vWorldPos.xz);
                // Centre net (le cerf), nappe qui monte vers les bords.
                float ring = smoothstep(CLEAR, CLEAR + 1.6, r);
                float edge = 1.0 - smoothstep(0.86, 0.99, max(abs(vWorldPos.x), abs(vWorldPos.z)) / EXTENT);
                float a = uOpacity * uLayer * body * ring * edge;
                if (a < 0.003) discard;
                vec3 col = mix(uShadow, uColor, smoothstep(0.1, 0.9, dens));
                gl_FragColor = vec4(col, a);
              }
            `,
          })
      ),
    [sim]
  );
  useEffect(() => () => { for (const m of materials) m.dispose(); }, [materials]);

  useFrame((_state, delta) => {
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const doc = typeof document !== "undefined" ? document.documentElement : null;
    const denom = doc ? doc.scrollHeight - window.innerHeight : 0;
    const depth = denom > 0 ? Math.min(1, window.scrollY / denom) : 1;
    const target = smokeGate({ direction, scrollDepth: depth, reducedMotion: reduced }) * MIST_OPACITY;
    opacityRef.current = reduced ? target : opacityRef.current + (target - opacityRef.current) * 0.05;
    const visible = opacityRef.current > 0.003;
    for (const m of meshRefs.current) if (m) m.visible = visible;
    if (!visible) return;
    const frozen = reduced && simTimeRef.current > REDUCED_WARMUP_SECONDS;
    if (!frozen) {
      const dt = Math.min(delta, 1 / 30) * NORTH_TIME_SCALE;
      simTimeRef.current += dt;
      sim.step(dt, mistEmitters(simTimeRef.current, EMITTERS, RING_MIN, RING_MAX, EXTENT), null);
    }
    for (const m of materials) {
      m.uniforms.uDye.value = sim.dyeTexture;
      m.uniforms.uOpacity.value = opacityRef.current;
    }
  });

  return (
    <>
      {LAYERS.map((layer, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
          material={materials[i]}
          position={[0, layer.y, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={1002 + i}
          frustumCulled={false}
          raycast={() => null}
          visible={false}
        >
          <planeGeometry args={[EXTENT * 2, EXTENT * 2]} />
        </mesh>
      ))}
    </>
  );
}
