"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Quaternion, Vector3, type Group, type Mesh, type MeshStandardMaterial, type PointLight } from "three";
import { emberBudget, flightPosition, flightRoll, flightTangent, XIUHCOATL_FLIGHT } from "@/lib/xiuhcoatl-flight";
import { isBot } from "@/lib/is-bot";
import { useReadingMode } from "@/lib/reading-mode-context";
import { tezcatlStore } from "./tezcatl-store";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * XiuhcoatlCompanion (04/09, Sud). Le serpent de feu, arme de
 * Huitzilopochtli a Coatepec, esprit du dieu du feu, et l'un des deux
 * xiuhcoatl qui portent le soleil autour de la Piedra del Sol. C'est le
 * PASSAGE RARE du Sud, comme Xolotl est celui du Nord : une fois par
 * visite, puis de loin en loin, il traverse le ciel au-dessus du cerf,
 * d'est en ouest, en un arc lent (lib/xiuhcoatl-flight), en rampant dans
 * l'air (action Slither du GLB), en laissant une trainee de braises
 * (moteur de particules des fleches, famille "chaude") et en eclairant la
 * scene de sa lueur.
 *
 * Modele : public/models/xiuhcoatl.glb, construit par script Blender
 * (tools/blender/xiuhcoatl.py) d'apres les references de
 * docs/da/sud-sources.md, 16 os, actions Slither et Idle.
 * Sud seulement, rien en reduced-motion ni en mode recit.
 */

const MODEL_PATH = "/models/xiuhcoatl.glb";
const FIRST_DELAY_MS = 12_000;
const REPEAT_EVERY_MS = 75_000;
const FLIGHT_MS = 17_000;
const FADE_MS = 1_200;
const SCALE = 1.2;
/** Longueur du modele (Blender) : les braises naissent le long du corps. */
const BODY_LENGTH = 4.2;
const EMBER_BURST_EVERY = 11; // une salve de braises toutes les N unites de budget
const LIGHT_INTENSITY = 14;

useGLTF.preload(MODEL_PATH);

function setOpacity(root: Group, opacity: number) {
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as MeshStandardMaterial;
      mat.transparent = opacity < 1;
      mat.opacity = opacity;
    }
  });
}

/** Le feu doit se voir de loin : on pousse l'emission des materiaux du GLB
 * (le bloom du site fait le reste), une fois au chargement. */
function dressFire(root: Group) {
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as MeshStandardMaterial;
      if (mat.name.includes("fire")) mat.emissiveIntensity = 2.4;
      else if (mat.name.includes("mouth")) mat.emissiveIntensity = 1.6;
      else if (mat.name.includes("scale")) mat.emissiveIntensity = 0.9;
      mat.fog = false;
    }
  });
}

export default function XiuhcoatlCompanion() {
  const groupRef = useRef<Group>(null);
  const lightRef = useRef<PointLight>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const readingMode = useReadingMode();
  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions } = useAnimations(animations, groupRef);
  const [armed, setArmed] = useState(false);
  const startRef = useRef<number | null>(null);
  const nextAtRef = useRef<number>(0);
  const emberAccRef = useRef(0);
  const scratch = useMemo(
    () => ({ q: new Quaternion(), qy: new Quaternion(), qz: new Quaternion(), qx: new Quaternion(), axisY: new Vector3(0, 1, 0), axisZ: new Vector3(0, 0, 1), axisX: new Vector3(1, 0, 0) }),
    []
  );

  useEffect(() => {
    dressFire(scene as Group);
  }, [scene]);

  // Arme le passage : Sud seulement, jamais pour un bot, en mode recit ou
  // en reduced-motion. Le premier vol part apres FIRST_DELAY_MS.
  useEffect(() => {
    const south = direction === "turquoise";
    if (!south || isBot() || readingMode.active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset d'etat pilote par la route
      setArmed(false);
      return;
    }
    nextAtRef.current = performance.now() + FIRST_DELAY_MS;
    setArmed(true);
  }, [direction, readingMode.active]);

  useFrame((_state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    if (!armed || reduced) {
      g.visible = false;
      if (lightRef.current) lightRef.current.intensity = 0;
      return;
    }
    const now = performance.now();
    if (startRef.current === null) {
      if (now < nextAtRef.current) {
        g.visible = false;
        if (lightRef.current) lightRef.current.intensity = 0;
        return;
      }
      startRef.current = now;
      const slither = actions["Slither"];
      if (slither) slither.reset().play();
    }
    const elapsed = now - startRef.current;
    if (elapsed > FLIGHT_MS) {
      startRef.current = null;
      nextAtRef.current = now + REPEAT_EVERY_MS;
      actions["Slither"]?.stop();
      g.visible = false;
      if (lightRef.current) lightRef.current.intensity = 0;
      return;
    }
    const t = elapsed / FLIGHT_MS;
    const fade = Math.min(1, elapsed / FADE_MS, (FLIGHT_MS - elapsed) / FADE_MS);
    g.visible = true;
    setOpacity(scene as Group, fade);

    // Trajectoire : position sur l'arc, corps oriente le long de la tangente
    // (le modele avance selon +X), roulis dans les virages.
    const p = flightPosition(t);
    const d = flightTangent(t);
    g.position.set(p.x, p.y, p.z);
    const yaw = Math.atan2(-d.z, d.x);
    const pitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
    const { q, qy, qz, qx, axisY, axisZ, axisX } = scratch;
    q.copy(qy.setFromAxisAngle(axisY, yaw)).multiply(qz.setFromAxisAngle(axisZ, pitch)).multiply(qx.setFromAxisAngle(axisX, flightRoll(t)));
    g.quaternion.copy(q);
    g.scale.setScalar(SCALE);

    // Sa lueur sur la scene.
    if (lightRef.current) lightRef.current.intensity = LIGHT_INTENSITY * fade;

    // Braises : salves le long de la moitie arriere du corps, orientees
    // comme lui, famille "chaude" du moteur des fleches.
    emberAccRef.current += emberBudget(t, Math.min(delta, 1 / 30));
    while (emberAccRef.current >= EMBER_BURST_EVERY) {
      emberAccRef.current -= EMBER_BURST_EVERY;
      const back = (0.15 + Math.random() * 0.75) * BODY_LENGTH * SCALE * 0.5;
      tezcatlStore.vapors.push({
        x: p.x - d.x * back,
        y: p.y - d.y * back,
        z: p.z - d.z * back,
        dx: -d.x,
        dy: -d.y,
        dz: -d.z,
        length: 0.9,
        heat: 1,
      });
    }
  });

  if (!armed) return null;
  return (
    <group ref={groupRef} visible={false}>
      <primitive object={scene} />
      <pointLight ref={lightRef} color="#ff7a1a" intensity={0} distance={16} decay={2} position={[0, 0.2, 0]} />
    </group>
  );
}
