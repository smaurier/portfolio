/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation des uniforms 60 fps, legitime en 3D. */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial, SkinnedMesh, type Object3D } from "three";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * FurShells (02/09, Nord). Le POIL du cerf noir : "shell texturing", la
 * technique temps reel classique de la fourrure courte. N coques du
 * maillage skinne, extrudees le long des normales dans le vertex shader
 * (elles partagent le squelette du cerf : elles suivent l'animation),
 * chacune percee par un bruit a seuil croissant : la base est pleine, la
 * pointe clairsemee, la silhouette devient duveteuse. Bruit ancre sur la
 * position en bind pose (stable sur la peau, ne glisse pas avec la
 * camera). Noir velours, sheen violet en fresnel (la lumiere du puits
 * accroche le grain du poil).
 *
 * Demande Sylvain 02/09 : "un cerf noir texture si possible avec le poil
 * que l'on sentirait". Nord seulement (fondu), coupe sur mobile (N draw
 * calls du cerf en plus : reserve aux profils postFx).
 */

const LAYERS = 6;
const FUR_LENGTH = 0.05;
const NOISE_FREQ = 260.0;
const FUR_BASE = new Color("#07050c");
const FUR_SHEEN = new Color("#7c66c4");
const STAG_MESHES = ["Stag_1", "Stag_2", "Stag_3", "Stag_4", "Stag_5"];
const LOOKUP_EVERY = 60;

const VERT = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>
  uniform float uLayer;
  uniform float uLength;
  varying vec3 vFur;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    // Le maillage du cerf porte une echelle de ~36 dans sa matrice monde
    // (GLB quantifie, noeud a 100 puis normalisation) : extrusion et bruit
    // sont exprimes en UNITES MONDE via l'echelle de modelMatrix, sinon
    // 5 cm de poil font 2 unites (constate a la capture 02/09).
    float worldScale = length(modelMatrix[0].xyz);
    vFur = position * worldScale;
    #include <skinbase_vertex>
    #include <beginnormal_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    transformed += normalize(objectNormal) * uLayer * uLength / worldScale;
    vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
    vView = -mv.xyz;
    vN = normalMatrix * objectNormal;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uLayer;
  uniform float uOpacity;
  uniform float uFreq;
  uniform vec3 uBase;
  uniform vec3 uSheen;
  varying vec3 vFur;
  varying vec3 vN;
  varying vec3 vView;
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  void main() {
    // Un brin par cellule de bruit : la coque n'existe que la ou le
    // brin est plus long que la hauteur de la coque.
    float strand = hash3(floor(vFur * uFreq));
    if (strand < uLayer) discard;
    vec3 n = normalize(vN);
    vec3 v = normalize(vView);
    float fresnel = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.2);
    // Velours : la pointe du poil est plus claire que la base, et le
    // sheen violet monte sur les bords.
    vec3 col = uBase * (0.6 + 0.8 * uLayer) + uSheen * fresnel * (0.35 + 0.5 * uLayer);
    float a = uOpacity * (1.0 - uLayer * 0.75);
    gl_FragColor = vec4(col, a);
  }
`;

export default function FurShells() {
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const fadeRef = useRef(direction === "obsidienne" ? 1 : 0);
  const lookupRef = useRef(0);
  const shellsRef = useRef<SkinnedMesh[]>([]);
  const enabled = sceneRefs ? sceneRefs.perfProfile.postFx : true;

  const materials = useMemo(
    () =>
      Array.from({ length: LAYERS }, (_, i) => {
        const layer = (i + 1) / LAYERS;
        return new ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG,
          uniforms: {
            uLayer: { value: layer },
            uLength: { value: FUR_LENGTH },
            uOpacity: { value: 0 },
            uFreq: { value: NOISE_FREQ },
            uBase: { value: FUR_BASE },
            uSheen: { value: FUR_SHEEN },
          },
          transparent: true,
          depthWrite: false,
        });
      }),
    []
  );

  useEffect(
    () => () => {
      for (const shell of shellsRef.current) shell.removeFromParent();
      shellsRef.current = [];
      for (const m of materials) m.dispose();
    },
    [materials]
  );

  useFrame((state) => {
    if (!enabled) return;
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const target = direction === "obsidienne" ? 1 : 0;
    fadeRef.current = reduced ? target : fadeRef.current + (target - fadeRef.current) * 0.04;
    const fade = fadeRef.current;

    // Coques creees une fois les meshes du cerf montes (Suspense) :
    // chaque coque partage geometrie ET squelette de sa source, ajoutee
    // en enfant (meme transform monde).
    if (shellsRef.current.length === 0 && lookupRef.current++ % LOOKUP_EVERY === 0) {
      const sources = STAG_MESHES.map((n) => state.scene.getObjectByName(n)).filter((o): o is SkinnedMesh => !!o && (o as SkinnedMesh).isSkinnedMesh);
      if (sources.length === STAG_MESHES.length) {
        for (const src of sources) {
          for (const mat of materials) {
            const shell = new SkinnedMesh(src.geometry, mat);
            shell.bindMode = src.bindMode;
            shell.bind(src.skeleton, src.bindMatrix);
            shell.frustumCulled = false;
            shell.renderOrder = 5;
            shell.raycast = () => null;
            (src as Object3D).add(shell);
            shellsRef.current.push(shell);
          }
        }
      }
    }
    const visible = fade > 0.01;
    for (const shell of shellsRef.current) shell.visible = visible;
    for (const m of materials) m.uniforms.uOpacity.value = 0.95 * fade;
  });

  return null;
}
