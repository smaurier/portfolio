/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'objets three et d'uniforms a 60 fps (meme precedent que xolotl-companion). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { birdTangent, HUITZILIN_SPEC, HUITZILIN_SPECIES, initialBird, stepBird, type BirdState, type Prey } from "@/lib/huitzilin";
import { CENTZON_COUNT, CENTZON_SPEC, makeStarField, throwFactor } from "@/lib/centzon-stars";
import { centzonStore } from "./centzon-store";
import { addShaderModifier } from "./shader-patch";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * HuitzilinBirds (04/09, contre-chant du Sud). Cinq colibris, un par
 * espece (lib/huitzilin), sur le vrai modele Poly by Google
 * (public/models/hummingbird-poly.glb, CC BY 3.0, texture peinte). Le
 * modele n'a pas d'animation : les AILES sont battues par le shader (les
 * sommets des ailes tournent autour de l'epaule, ~14 battements/s, un
 * flou de battement plus qu'un mouvement lisible, comme en vrai), et la
 * COULEUR d'espece est une rotation de teinte de la texture. Ils vivent
 * dans le ciel du Sud en continu : stationnaire vibrant, fleche,
 * stationnaire ; haut la nuit vers les etoiles, bas a midi vers les
 * fleurs. Sud seulement, fondu par direction, reduced-motion = pas de
 * battement d'ailes ni de vibration.
 *
 * Repere du modele : le corps va de la queue (0, 0, -1.1) au bec
 * (0, 1.75, 1.05), donc incline vers le haut ; on le redresse de -42 deg
 * autour de X pour que le bec pointe +z (l'avant), avec un leger cabre.
 */

const MODEL_PATH = "/models/hummingbird-poly.glb";
const BASE_SCALE = 0.06; // 0.22 -> 0.08 -> 0.06 (05/09, Sylvain : « trop gros, c est tout petit normalement », puis « encore un peu grand »)
const MODEL_PITCH = 0.68; // rad, redresse le corps : +atan(0.63/0.78), le bec vient a l horizontale (05/09, retour Sylvain « ils volent a la verticale » : le signe etait inverse)
const FLAP_HZ = 14;
const FLAP_AMPLITUDE = 0.75; // rad

useGLTF.preload(MODEL_PATH);

type BirdUniforms = { uTime: { value: number }; uFlap: { value: number }; uHue: { value: number }; uSat: { value: number }; uPhase: { value: number } };

function makeMaterial(base: MeshStandardMaterial, uniforms: BirdUniforms): MeshStandardMaterial {
  const mat = base.clone();
  mat.name = "huitzilin";
  addShaderModifier(mat, (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uFlap = uniforms.uFlap;
    shader.uniforms.uHue = uniforms.uHue;
    shader.uniforms.uSat = uniforms.uSat;
    shader.uniforms.uPhase = uniforms.uPhase;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uTime;
uniform float uFlap;
uniform float uPhase;
// Rotation d'un point autour d'un axe (Rodrigues).
vec3 hRotate(vec3 p, vec3 axis, float a) {
  float c = cos(a), s = sin(a);
  return p * c + cross(axis, p) * s + axis * dot(axis, p) * (1.0 - c);
}`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
{
  // Aile = sommets ecartes du corps (|x| > 0.28), epaule vers (±0.3, 0.75, -0.3),
  // axe de battement = axe du corps (queue -> bec).
  float w = smoothstep(0.24, 0.44, abs(position.x));
  if (w > 0.0) {
    vec3 shoulder = vec3(sign(position.x) * 0.3, 0.75, -0.3);
    vec3 axis = normalize(vec3(0.0, 0.63, 0.78));
    float a = sign(position.x) * uFlap * sin(uTime * ${(FLAP_HZ * Math.PI * 2).toFixed(3)} + uPhase);
    transformed = shoulder + hRotate(transformed - shoulder, axis, a * w);
  }
}`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uHue;
uniform float uSat;
vec3 hHueShift(vec3 c, float h, float sat) {
  // Rotation de teinte dans l'espace YIQ, puis saturation.
  const vec3 k = vec3(0.57735);
  float cosA = cos(h), sinA = sin(h);
  vec3 r = c * cosA + cross(k, c) * sinA + k * dot(k, c) * (1.0 - cosA);
  float l = dot(r, vec3(0.299, 0.587, 0.114));
  return mix(vec3(l), r, sat);
}`
      )
      .replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb = hHueShift(diffuseColor.rgb, uHue, uSat);");
  });
  mat.customProgramCacheKey = () => "huitzilin";
  return mat;
}

export default function HuitzilinBirds() {
  const groupRef = useRef<Group>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const { scene } = useGLTF(MODEL_PATH);
  const blendRef = useRef(direction === "turquoise" ? 1 : 0);
  const statesRef = useRef<BirdState[]>(HUITZILIN_SPECIES.map((_, i) => initialBird(11 + i * 17, HUITZILIN_SPEC)));
  const birdsRef = useRef<Mesh[]>([]);
  // Le meme champ d'etoiles que CentzonStars (meme graine) : les colibris
  // choisissent leurs proies dedans.
  const stars = useMemo(() => makeStarField(400), []);
  const arrivedAtRef = useRef<number | null>(null);
  const preyPick = useRef(0);
  const scratch = useMemo(
    () => ({ q: new Quaternion(), qy: new Quaternion(), qx: new Quaternion(), qm: new Quaternion(), axisY: new Vector3(0, 1, 0), axisX: new Vector3(1, 0, 0), fwd: new Vector3(), vel: new Vector3() }),
    []
  );

  // Un mesh par oiseau : meme geometrie, materiau clone avec ses uniforms
  // (teinte d'espece, phase de battement).
  const birds = useMemo(() => {
    let source: Mesh | null = null;
    scene.traverse((c) => {
      if (!source && (c as Mesh).isMesh) source = c as Mesh;
    });
    if (!source) return [];
    const src = source as Mesh;
    const base = src.material as MeshStandardMaterial;
    return HUITZILIN_SPECIES.map((sp, i) => {
      const uniforms: BirdUniforms = { uTime: { value: 0 }, uFlap: { value: FLAP_AMPLITUDE }, uHue: { value: (sp.hueShift * Math.PI) / 180 }, uSat: { value: sp.saturation }, uPhase: { value: i * 1.3 } };
      const mesh = new Mesh(src.geometry, makeMaterial(base, uniforms));
      mesh.frustumCulled = false;
      mesh.userData.uniforms = uniforms;
      mesh.userData.scale = BASE_SCALE * sp.scale;
      return mesh;
    });
  }, [scene]);

  useEffect(() => {
    birdsRef.current = birds;
    const g = groupRef.current;
    if (!g) return;
    for (const b of birds) g.add(b);
    return () => {
      for (const b of birds) g.remove(b);
    };
  }, [birds]);

  useFrame((state, delta) => {
    const south = direction === "turquoise";
    blendRef.current += ((south ? 1 : 0) - blendRef.current) * 0.06;
    const blend = blendRef.current;
    const g = groupRef.current;
    if (!g) return;
    g.visible = blend > 0.01;
    if (!g.visible) {
      arrivedAtRef.current = null;
      return;
    }
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const p = sceneRefs?.progressRef.current ?? 0;
    const dt = reduced ? 0 : Math.max(1e-3, Math.min(delta, 1 / 30));
    if (arrivedAtRef.current === null) arrivedAtRef.current = state.clock.elapsedTime;
    const sinceArrival = state.clock.elapsedTime - arrivedAtRef.current;
    // Une proie : une etoile encore vivante (ni prise, ni eteinte par le
    // scroll), deja jetee dans le ciel, devant la camera (z < 0) et pas trop
    // haute (un colibri ne monte pas au zenith). Tant que la nuit dure
    // (p < 0.7) ; au midi il n'y a plus rien a chasser.
    const pickPrey = (): Prey | null => {
      if (p > 0.7) return null;
      for (let tries = 0; tries < 24; tries++) {
        preyPick.current = (preyPick.current * 1103515245 + 12345) & 0x7fffffff;
        const i = preyPick.current % CENTZON_COUNT;
        const s = stars[i];
        if (centzonStore.killedAt[i] >= 0) continue;
        if (p - s.deathAt >= 0) continue;
        if (throwFactor(s, sinceArrival) < 1) continue;
        if (s.dir.z > -0.2 || s.dir.y > 0.6 || s.dir.y < 0.1) continue;
        return { index: i, dir: s.dir };
      }
      return null;
    };
    const { q, qy, qx, qm, axisY, axisX } = scratch;
    qm.setFromAxisAngle(axisX, MODEL_PITCH);
    for (let i = 0; i < birds.length; i++) {
      const mesh = birds[i];
      const s = (statesRef.current[i] = dt > 0 ? stepBird(statesRef.current[i], dt, p, HUITZILIN_SPEC, pickPrey) : statesRef.current[i]);
      // Le geste du mythe : a l'arrivee de sa fleche, l'etoile visee tombe.
      if (s.justKilled !== null && centzonStore.killedAt[s.justKilled] < 0) centzonStore.killedAt[s.justKilled] = state.clock.elapsedTime;
      mesh.position.set(s.x, s.y, s.z);
      // Le modele regarde +z : cap = rotation autour de Y telle que +z -> tangente.
      const d = birdTangent(s);
      const yaw = Math.atan2(d.x, d.z);
      q.copy(qy.setFromAxisAngle(axisY, yaw)).multiply(qx.setFromAxisAngle(axisX, -s.pitch)).multiply(qm);
      mesh.quaternion.copy(q);
      mesh.scale.setScalar(mesh.userData.scale as number);
      // Verification (05/09, Sylvain : « verifie que les colibris ne volent
      // pas en arriere ») : produit scalaire entre l'avant du modele (+z
      // local -> monde) et la vitesse ; > 0 = il vole bec devant. Lu par
      // Playwright via window.__huitzilinForward, sans cout notable.
      if (typeof window !== "undefined" && s.mode === "dart") {
        const prev = mesh.userData.prevPos as Vector3 | undefined;
        if (prev) {
          const fwd = scratch.fwd.set(0, 0, 1).applyQuaternion(mesh.quaternion);
          const vel = scratch.vel.copy(mesh.position).sub(prev);
          const dbg = ((window as unknown as { __huitzilinForward?: number[] }).__huitzilinForward ??= []);
          dbg[i] = vel.lengthSq() > 1e-8 ? fwd.dot(vel.normalize()) : 0;
        }
        mesh.userData.prevPos = (prev ?? new Vector3()).copy(mesh.position);
      }
      const u = mesh.userData.uniforms as BirdUniforms;
      u.uTime.value = state.clock.elapsedTime;
      u.uFlap.value = reduced ? 0 : FLAP_AMPLITUDE;
      const mat = mesh.material as MeshStandardMaterial;
      mat.transparent = blend < 1;
      mat.opacity = blend;
    }
  });

  return <group ref={groupRef} visible={false} />;
}
