/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation des uniforms et de la sim 60 fps legitime en 3D (meme precedent que stag-mirror). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, DoubleSide, Plane, ShaderMaterial, Vector3, type Mesh } from "three";
import { emitterSplats, pointerSplat, smokeGate, worldToSimUv, type SimUv } from "@/lib/tezcatl-fluid";
import { TezcatlFluidSim } from "./tezcatl-fluid-sim";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * TezcatlSmoke (02/09, Nord, sprint identites). La fumee du miroir de
 * Tezcatlipoca, animee par un VRAI simulateur de fluide (cf
 * tezcatl-fluid-sim.ts) et confinee au disque du tezcatl (rayon
 * PiedraGround). Demande Sylvain : "comme sur igloo.inc, des volutes,
 * avec un vrai simulateur de fluide et de fumee".
 *
 * Mise en scene : les filets naissent a la ligne de contact du reflet
 * (emetteurs en orbite lente autour du cerf), s'ecartent en s'enroulant
 * (confinement de vorticite) et meurent vers le bord du miroir. La
 * souris projetee sur le sol pousse la fumee (le visiteur trouble le
 * miroir). Nord seulement, revele en descendant (meme gate que le
 * reflet), tempo epaissi x0.6 (fiche Mictlampa).
 *
 * Accessibilite : prefers-reduced-motion -> la sim tourne ~3 s pour
 * poser un voile puis se fige (fumee immobile lisible, jamais absente).
 * Mobile (perfProfile.postFx false) : grilles divisees par deux.
 */

const MIRROR_RADIUS = 3.0; // = GROUND_RADIUS de PiedraGround
const EMITTER_COUNT = 6;
const EMITTER_RING = 0.7; // monde : autour des pattes, sous le reflet
const NORTH_TIME_SCALE = 0.6;
const SMOKE_OPACITY = 0.42;
const REDUCED_WARMUP_SECONDS = 3;
const SMOKE_COLOR = new Color("#9d92c9"); // lueur froide du puits, a peine plus claire que le reflet
const SMOKE_SHADOW = new Color("#201533");
const GROUND_PLANE = new Plane(new Vector3(0, 1, 0), 0);

export default function TezcatlSmoke() {
  const meshRef = useRef<Mesh>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const { gl } = useThree();
  const opacityRef = useRef(0);
  const prevPointerRef = useRef<SimUv | null>(null);
  const simTimeRef = useRef(0);
  const hitRef = useRef(new Vector3());

  const lowPerf = sceneRefs ? !sceneRefs.perfProfile.postFx : false;
  const sim = useMemo(() => new TezcatlFluidSim(gl, lowPerf ? 64 : 128, lowPerf ? 128 : 256), [gl, lowPerf]);
  useEffect(() => () => sim.dispose(), [sim]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uDye: { value: sim.dyeTexture },
          uOpacity: { value: 0 },
          uColor: { value: SMOKE_COLOR },
          uShadow: { value: SMOKE_SHADOW },
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
          uniform vec3 uColor;
          uniform vec3 uShadow;
          varying vec3 vWorldPos;
          const float RADIUS = ${MIRROR_RADIUS.toFixed(1)};
          void main() {
            vec2 uv = vWorldPos.xz / (2.0 * RADIUS) + 0.5;
            float dens = texture2D(uDye, uv).r;
            // Filets fins : courbe de contraste, le coeur des volutes
            // est clair, leurs franges s'evanouissent vite.
            float body = pow(smoothstep(0.015, 0.5, dens), 1.3);
            float d = length(vWorldPos.xz) / RADIUS;
            float mask = 1.0 - smoothstep(0.78, 1.0, d);
            float a = uOpacity * body * mask;
            if (a < 0.003) discard;
            vec3 col = mix(uShadow, uColor, smoothstep(0.1, 0.9, dens));
            gl_FragColor = vec4(col, a);
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
    const target = smokeGate({ direction, scrollDepth: depth, reducedMotion: reduced }) * SMOKE_OPACITY;
    opacityRef.current = reduced ? target : opacityRef.current + (target - opacityRef.current) * 0.05;
    const visible = opacityRef.current > 0.003;
    if (meshRef.current) meshRef.current.visible = visible;
    if (!visible) {
      prevPointerRef.current = null;
      return;
    }

    // Sim : seulement quand elle se voit. Figee apres warm-up en
    // reduced-motion.
    const frozen = reduced && simTimeRef.current > REDUCED_WARMUP_SECONDS;
    if (!frozen) {
      const dt = Math.min(delta, 1 / 30) * NORTH_TIME_SCALE;
      simTimeRef.current += dt;
      const emitters = emitterSplats(simTimeRef.current, EMITTER_COUNT, EMITTER_RING, MIRROR_RADIUS);

      // Souris projetee sur le sol (le visiteur trouble le miroir).
      let pointer = null;
      if (!reduced) {
        state.raycaster.setFromCamera(state.pointer, state.camera);
        const hit = state.raycaster.ray.intersectPlane(GROUND_PLANE, hitRef.current);
        if (hit) {
          const { u, v, inside } = worldToSimUv(hit.x, hit.z, MIRROR_RADIUS);
          const uv = { u, v };
          if (inside && prevPointerRef.current) pointer = pointerSplat(prevPointerRef.current, uv, dt);
          prevPointerRef.current = uv;
        }
      }
      sim.step(dt, emitters, pointer);
    }
    material.uniforms.uDye.value = sim.dyeTexture;
    material.uniforms.uOpacity.value = opacityRef.current;
  });

  return (
    // Juste au-dessus du relief de la Piedra (0.005 + displacement
    // ~0.015) : la fumee couvre le reflet (renderOrder au-dessus de
    // StagMirror 998) sans passer sous la gravure.
    <mesh
      ref={meshRef}
      material={material}
      position={[0, 0.03, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={999}
      frustumCulled={false}
      raycast={() => null}
      visible={false}
    >
      <planeGeometry args={[MIRROR_RADIUS * 2, MIRROR_RADIUS * 2]} />
    </mesh>
  );
}
