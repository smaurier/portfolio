/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'uniforms a 60 fps (meme precedent que xolotl-companion). */
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Color, ShaderMaterial, type Fog, type Mesh } from "three";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";
import { getRevealFloor } from "@/lib/reveal-arc";
import { xiuhcoatlStore } from "./xiuhcoatl-store";

/**
 * SudSky (04/09, tissu du Sud). Le ciel de midi. Jusqu'ici le fond de la
 * scene est le noir du canvas : le brouillard teinte les objets lointains,
 * jamais le vide derriere eux. Au Sud, le go de Sylvain (« le fond de
 * page en plein midi, franchement clair ») exige un vrai ciel : un dome
 * (sphere vue de l'interieur, hors fog) dont l'HORIZON prend chaque frame
 * la couleur du brouillard (continuite parfaite avec les montagnes qui
 * se fondent dedans) et dont le ZENITH est plus profond, comme un ciel
 * reel. En haut de page le fog est noir : le dome est noir, c'est la nuit
 * des 400 etoiles (qui viendront s'y poser). Il s'eclaircit avec l'arc.
 * Sud seulement, en fondu ; ailleurs le fond reste noir.
 */

const RADIUS = 85; // camera far = 100
const ZENITH_DEEP = new Color("#0b3f6e");

export default function SudSky() {
  const meshRef = useRef<Mesh>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const blendRef = useRef(direction === "turquoise" ? 1 : 0);
  const scratch = useMemo(() => new Color(), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        transparent: true,
        uniforms: {
          uHorizon: { value: new Color("#000000") },
          uZenith: { value: new Color("#000000") },
          uOpacity: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uHorizon;
          uniform vec3 uZenith;
          uniform float uOpacity;
          varying vec3 vDir;
          void main() {
            // Elevation 0 a l'horizon, 1 au zenith ; sous l'horizon on garde
            // la couleur d'horizon (le sol est devant de toute facon).
            float e = clamp(vDir.y, 0.0, 1.0);
            float t = smoothstep(0.0, 0.85, e);
            vec3 col = mix(uHorizon, uZenith, t);
            gl_FragColor = vec4(col, uOpacity);
          }
        `,
      }),
    []
  );

  useFrame((state) => {
    const south = direction === "turquoise";
    blendRef.current += ((south ? 1 : 0) - blendRef.current) * 0.06;
    const blend = blendRef.current;
    // Souffle chaud : monte avec le midi, Sud seulement, rien en reduced-motion.
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const ignite = getRevealFloor(sceneRefs?.progressRef.current ?? 0);
    xiuhcoatlStore.groundHeat = reduced ? 0 : blend * ignite * ignite;
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.visible = blend > 0.01;
    if (!mesh.visible) return;
    const fog = state.scene.fog as Fog | null;
    const horizon = material.uniforms.uHorizon.value as Color;
    if (fog) horizon.copy(fog.color);
    // Zenith : la couleur d'horizon tiree vers un bleu profond, dosee par la
    // luminosite de l'horizon (nuit = noir partout).
    const lum = horizon.r * 0.3 + horizon.g * 0.59 + horizon.b * 0.11;
    scratch.copy(horizon).lerp(ZENITH_DEEP, 0.7 * Math.min(1, lum * 3));
    (material.uniforms.uZenith.value as Color).copy(scratch);
    material.uniforms.uOpacity.value = blend;
    // Le dome suit la camera : toujours centre sur elle.
    mesh.position.copy(state.camera.position);
  });

  return (
    <mesh ref={meshRef} material={material} frustumCulled={false} renderOrder={-100} raycast={() => null}>
      <sphereGeometry args={[RADIUS, 32, 16]} />
    </mesh>
  );
}
