/* eslint-disable react-hooks/immutability, react-hooks/purity -- pattern gamedev r3f useFrame : mutation d objets three et d uniforms a 60 fps, graines aleatoires des poussieres a l init (meme precedent que spirit-particles). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide, Group, Mesh, Points, PointsMaterial, ShaderMaterial, Sprite, SpriteMaterial, Vector3 } from "three";
import { useTexture } from "@react-three/drei";
import { beamAxis, BEAM_HEIGHT } from "@/lib/est-arc";
import { frostStore } from "./frost-store";
import { persistentLights } from "./persistent-lights";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * SunBeam (07/09, Est, Sylvain : « un vrai gros coup de projecteur facon
 * gros rayon de soleil constant sur le renne, le genre de gros rayon qui
 * fait spot dans les films ou le personnage est touche par la grace »).
 * Remplace la pluie de paillettes dorees (EastTonatiuh, retiree).
 *  - le PUITS DE LUMIERE : un cylindre incline vers le soleil, rendu en
 *    volume additif (plus dense au milieu qu'aux bords, stries lentes,
 *    plus franc en bas), qui tombe sur le cerf ;
 *  - un vrai projecteur (SpotLight) qui eclaire le cerf et le sol ;
 *  - des poussieres qui flottent dans le rayon ;
 *  - une flaque de lumiere au sol.
 * Apparait quand le monde a degele (frostStore.beam), Est seulement.
 */

const BEAM_TOP_RADIUS = 0.75;
const BEAM_BOTTOM_RADIUS = 1.35;
const MOTES = 140;
const SMOKE_SPRITE = "/img/particles/smoke_07.png";
const BEAM_COLOR = new Color("#ffd28a");

useTexture.preload(SMOKE_SPRITE);

const VERTEX = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec2 vUv2;
  void main() {
    vUv2 = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec3 vN;
  varying vec3 vV;
  varying vec2 vUv2;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    // Epaisseur traversee : pleine au milieu du cylindre, nulle sur les bords.
    float thick = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
    // Stries lentes le long du rayon (des voiles de poussiere qui descendent).
    float streak = 0.55 + 0.45 * noise(vec2(vUv2.x * 9.0, vUv2.y * 3.5 - uTime * 0.06));
    float streak2 = 0.7 + 0.3 * noise(vec2(vUv2.x * 23.0 + 4.0, vUv2.y * 8.0 - uTime * 0.11));
    // CylinderGeometry : uv.y = 1 en haut, 0 en bas. Plus franc vers le bas
    // (la ou il touche le cerf), doux en haut.
    float along = mix(1.0, 0.3, vUv2.y);
    float a = 0.6 * thick * streak * streak2 * along * uIntensity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

export default function SunBeam() {
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const smokeTexture = useTexture(SMOKE_SPRITE);
  const rootRef = useRef<Group>(null);
  const beamRef = useRef<Mesh>(null);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 }, uColor: { value: BEAM_COLOR } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        forceSinglePass: true,
      }),
    [],
  );
  const geometry = useMemo(() => {
    // Le cylindre est construit de bas (y = 0) en haut ; uv.y = 0 en bas.
    const geo = new CylinderGeometry(BEAM_TOP_RADIUS, BEAM_BOTTOM_RADIUS, BEAM_HEIGHT, 40, 1, true);
    geo.translate(0, BEAM_HEIGHT / 2, 0);
    return geo;
  }, []);

  const motes = useMemo(() => {
    const geo = new BufferGeometry();
    const pos = new Float32Array(MOTES * 3);
    const seed = new Float32Array(MOTES * 3);
    for (let i = 0; i < MOTES; i++) {
      seed[i * 3] = Math.random();
      seed[i * 3 + 1] = Math.random();
      seed[i * 3 + 2] = Math.random();
    }
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    const mat = new PointsMaterial({ map: smokeTexture, color: new Color("#ffe6b0"), size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false });
    const pts = new Points(geo, mat);
    pts.frustumCulled = false;
    pts.raycast = () => null;
    return { pts, geo, mat, seed };
  }, [smokeTexture]);

  const pool = useMemo(() => {
    const s = new Sprite(new SpriteMaterial({ map: smokeTexture, color: new Color("#ffcf80"), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }));
    s.raycast = () => null;
    return s;
  }, [smokeTexture]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.add(motes.pts);
    root.add(pool);
    return () => {
      root.remove(motes.pts);
      root.remove(pool);
    };
  }, [motes, pool]);
  useEffect(() => () => {
    material.dispose();
    geometry.dispose();
    motes.geo.dispose();
    motes.mat.dispose();
    pool.material.dispose();
  }, [material, geometry, motes, pool]);

  const axis = useMemo(() => new Vector3(), []);
  const up = useMemo(() => new Vector3(0, 1, 0), []);

  useEffect(
    () => () => {
      if (persistentLights.sun) persistentLights.sun.intensity = 0;
    },
    [],
  );

  useFrame((state, delta) => {
    // Le projecteur est une lumiere PERSISTANTE (11/09, voir persistent-lights).
    const root = rootRef.current, beam = beamRef.current, spot = persistentLights.sun;
    if (!root || !beam || !spot) return;
    const east = direction === "dore";
    const target = east ? frostStore.beam : 0;
    material.uniforms.uIntensity.value += (target * 0.9 - material.uniforms.uIntensity.value) * Math.min(1, delta * 1.5);
    const k = material.uniforms.uIntensity.value;
    root.visible = k > 0.005;
    if (!root.visible) {
      spot.intensity = 0;
      return;
    }
    const t = state.clock.elapsedTime;
    material.uniforms.uTime.value = t;
    // L'axe du rayon (lib/est-arc, partage avec la lance du soleil).
    const ax = beamAxis(sceneRefs?.progressRef.current ?? 0);
    axis.set(ax.x, ax.y, ax.z).normalize();
    beam.position.set(0, 0.05, 0);
    beam.quaternion.setFromUnitVectors(up, axis);
    // Le projecteur : au loin sur l'axe, vise le cerf.
    spot.position.copy(axis).multiplyScalar(14);
    spot.intensity = 260 * k;
    const tgt = persistentLights.sunTarget;
    if (tgt) {
      tgt.position.set(0, 0.9, 0);
      if (spot.target !== tgt) spot.target = tgt;
    }
    // Les poussieres : elles flottent dans le rayon, montent et descendent
    // lentement, chacune a sa hauteur.
    const pos = motes.geo.attributes.position as BufferAttribute;
    for (let i = 0; i < MOTES; i++) {
      const s0 = motes.seed[i * 3], s1 = motes.seed[i * 3 + 1], s2 = motes.seed[i * 3 + 2];
      const h = ((s1 * 9 + t * (0.12 + s2 * 0.1)) % 9) ;
      const r = (BEAM_BOTTOM_RADIUS - 0.15) * (1 - h / 22) * Math.sqrt(s0);
      const a = s2 * Math.PI * 2 + t * 0.05 + h * 0.3;
      const lx = Math.cos(a) * r + Math.sin(t * 0.7 + s0 * 10) * 0.08;
      const lz = Math.sin(a) * r + Math.cos(t * 0.6 + s1 * 10) * 0.08;
      // Repere du rayon -> monde : base au pied du cerf, axe incline.
      pos.setXYZ(i, lx + axis.x * h, 0.1 + axis.y * h, lz + axis.z * h);
    }
    pos.needsUpdate = true;
    motes.mat.opacity = 0.55 * k;
    // La flaque de lumiere au sol.
    pool.position.set(0, 0.12, 0);
    pool.scale.set(5.2, 2.6, 1);
    pool.material.opacity = 0.32 * k;
  });

  return (
    <group ref={rootRef} visible={false}>
      <mesh ref={beamRef} geometry={geometry} material={material} frustumCulled={false} raycast={() => null} renderOrder={12} />
    </group>
  );
}
