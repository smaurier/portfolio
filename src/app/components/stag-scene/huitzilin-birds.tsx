/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'objets three et d'uniforms a 60 fps (meme precedent que xolotl-companion). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { birdTangent, HUITZILIN_SPEC, HUITZILIN_SPECIES, initialBird, stepBird, type BirdState } from "@/lib/huitzilin";
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
const BASE_SCALE = 0.08; // 0.22 -> 0.08 (05/09, Sylvain : « trop gros, c est tout petit normalement »)
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
  const scratch = useMemo(
    () => ({ q: new Quaternion(), qy: new Quaternion(), qx: new Quaternion(), qm: new Quaternion(), axisY: new Vector3(0, 1, 0), axisX: new Vector3(1, 0, 0) }),
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
    if (!g.visible) return;
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const p = sceneRefs?.progressRef.current ?? 0;
    const dt = reduced ? 0 : Math.max(1e-3, Math.min(delta, 1 / 30));
    const { q, qy, qx, qm, axisY, axisX } = scratch;
    qm.setFromAxisAngle(axisX, MODEL_PITCH);
    for (let i = 0; i < birds.length; i++) {
      const mesh = birds[i];
      const s = (statesRef.current[i] = dt > 0 ? stepBird(statesRef.current[i], dt, p, HUITZILIN_SPEC) : statesRef.current[i]);
      mesh.position.set(s.x, s.y, s.z);
      // Le modele regarde +z : cap = rotation autour de Y telle que +z -> tangente.
      const d = birdTangent(s);
      const yaw = Math.atan2(d.x, d.z);
      q.copy(qy.setFromAxisAngle(axisY, yaw)).multiply(qx.setFromAxisAngle(axisX, -s.pitch)).multiply(qm);
      mesh.quaternion.copy(q);
      mesh.scale.setScalar(mesh.userData.scale as number);
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
