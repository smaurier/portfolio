/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'uniforms et du store partage a 60 fps (meme precedent que xolotl-companion). */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Quaternion, Vector3, type Group, type Material, type Mesh, type MeshStandardMaterial, type PointLight } from "three";
import { initialWander, stepWander, wanderTangent, XIUHCOATL_WANDER, type WanderState } from "@/lib/xiuhcoatl-wander";
import { getMictlanSky } from "./mictlan-sky";
import { createEmberFireMaterial, createTurquoiseMaterial, createXiuhcoatlUniforms, type XiuhcoatlUniforms } from "./xiuhcoatl-materials";
import { pushHeat, xiuhcoatlStore } from "./xiuhcoatl-store";
import { isBot } from "@/lib/is-bot";
import { useReadingMode } from "@/lib/reading-mode-context";
import { tezcatlStore } from "./tezcatl-store";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * XiuhcoatlCompanion (04/09, Sud). Le serpent de feu, arme de
 * Huitzilopochtli a Coatepec, l'un des deux xiuhcoatl qui portent le soleil
 * autour de la Piedra del Sol. Etre de turquoise et de feu (pas d'eau :
 * « xiuh » = turquoise, annee, feu).
 *
 * Presence (04/09, Sylvain : « il pourrait etre la pendant toute la scene a
 * voler de maniere aleatoire dans le ciel », « apparition aleatoire, 1/3 ») :
 * tirage une fois par visite (sessionStorage), et quand il est la, il vit
 * dans le ciel du Sud en continu, sur le vol errant de lib/xiuhcoatl-wander,
 * borne a la bande de ciel entre la crete des montagnes et le bandeau.
 * Ondulation laterale (action Slither du GLB), lueur portee, braises.
 *
 * Modele : public/models/xiuhcoatl.glb, construit par script Blender
 * (tools/blender/xiuhcoatl.py), 16 os, actions Slither et Idle.
 * Sud seulement, rien en reduced-motion ni en mode recit.
 * Forcer la presence pour verifier : ?xiuhcoatl=1 dans l'URL.
 */

const MODEL_PATH = "/models/xiuhcoatl.glb";
const PRESENCE_PROBABILITY = 1 / 3;
const SESSION_KEY = "nahual-xiuhcoatl-present";
const FADE_IN_MS = 1_800;
// 2.4 (04/09, retour Sylvain : « il devrait faire le double »).
const SCALE = 2.4;
/** Longueur du modele (Blender) : les braises naissent le long du corps. */
const BODY_LENGTH = 5.2;
const EMBER_BURST_EVERY = 11; // une salve de braises toutes les N unites de budget
const EMBERS_PER_SECOND = 22;
const LIGHT_INTENSITY = 6;
const BANK_GAIN = 0.45;
const BANK_MAX = 0.35;
/** Cadence des points de chaleur (trainee qui deforme l'air). */
const HEAT_EVERY_MS = 85;

useGLTF.preload(MODEL_PATH);

function setOpacity(root: Group, opacity: number, uniforms: XiuhcoatlUniforms) {
  uniforms.uOpacity.value = opacity;
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as Material & { opacity: number; isShaderMaterial?: boolean };
      if (mat.isShaderMaterial) continue; // uOpacity
      mat.transparent = opacity < 1;
      mat.opacity = opacity;
    }
  });
}

/** Les matieres (04/09) : ecailles = turquoise polie en mosaique avec le
 * feu dans les joints, flammes = braise du reflet de Xolotl, gueule =
 * faible lueur, os/griffes/perles = tels quels. Eclaire comme la scene
 * (retour Sylvain), fog compris. */
function dressMaterials(root: Group, uniforms: XiuhcoatlUniforms) {
  // IDEMPOTENT : la scene useGLTF est mise en cache, un retour sur la page
  // rehabille des meshes deja habilles. Sans ce garde, le ShaderMaterial
  // des flammes tombait dans la branche « autres » et recevait fog = true
  // sans uniform de fog : « uniforms.fogColor is undefined » a chaque
  // frame, plus rien ne s'affichait (retour Sylvain 04/09).
  if (root.userData.xiuhDressed) return;
  root.userData.xiuhDressed = true;
  const sky = getMictlanSky();
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    const mat = mesh.material as MeshStandardMaterial;
    if (Array.isArray(mesh.material) || !mat) return;
    if (mat.name.includes("scale")) {
      const stone = createTurquoiseMaterial(mat.color.clone(), sky, uniforms);
      stone.name = "xiuh_scale_turquoise";
      mesh.material = stone;
    } else if (mat.name.includes("fire")) {
      const ember = createEmberFireMaterial(uniforms);
      ember.name = "xiuh_fire_ember";
      mesh.material = ember;
    } else if (mat.name.includes("mouth")) {
      mat.emissiveIntensity = 0.35;
      mat.fog = true;
    } else {
      mat.emissiveIntensity = 0;
      mat.fog = true;
    }
  });
}

/** Presence tiree une fois par visite ; ?xiuhcoatl=1 force la presence. */
function decidePresence(): boolean {
  if (window.location.search.includes("xiuhcoatl=1")) return true;
  try {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached !== null) return cached === "1";
    const present = Math.random() < PRESENCE_PROBABILITY;
    sessionStorage.setItem(SESSION_KEY, present ? "1" : "0");
    return present;
  } catch {
    return Math.random() < PRESENCE_PROBABILITY;
  }
}

export default function XiuhcoatlCompanion() {
  const groupRef = useRef<Group>(null);
  const lightRef = useRef<PointLight>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const readingMode = useReadingMode();
  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions } = useAnimations(animations, groupRef);
  const [present, setPresent] = useState(false);
  const wanderRef = useRef<WanderState | null>(null);
  const bornAtRef = useRef(0);
  const bankRef = useRef(0);
  const emberAccRef = useRef(0);
  const heatAtRef = useRef(0);
  // Les uniforms vivent avec la scene (cache useGLTF) : un remontage du
  // composant retrouve ceux que les matieres portent deja.
  const uniforms = useMemo<XiuhcoatlUniforms>(() => {
    const data = scene.userData as { xiuhUniforms?: XiuhcoatlUniforms };
    if (!data.xiuhUniforms) data.xiuhUniforms = createXiuhcoatlUniforms();
    return data.xiuhUniforms;
  }, [scene]);
  const scratch = useMemo(
    () => ({ q: new Quaternion(), qy: new Quaternion(), qz: new Quaternion(), qx: new Quaternion(), axisY: new Vector3(0, 1, 0), axisZ: new Vector3(0, 0, 1), axisX: new Vector3(1, 0, 0) }),
    []
  );

  useEffect(() => {
    dressMaterials(scene as Group, uniforms);
  }, [scene, uniforms]);

  // Presence : Sud seulement, jamais pour un bot, en mode recit ou en
  // reduced-motion ; tirage 1/3 par visite.
  useEffect(() => {
    const south = direction === "turquoise";
    if (!south || isBot() || readingMode.active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- presence pilotee par la route
      setPresent(false);
      wanderRef.current = null;
      return;
    }
    const here = decidePresence();
    if (here) {
      wanderRef.current = initialWander(Math.floor(Math.random() * 1e6), XIUHCOATL_WANDER);
      bornAtRef.current = performance.now();
      bankRef.current = 0;
    }
    setPresent(here);
  }, [direction, readingMode.active]);

  useEffect(() => {
    if (!present) return;
    const slither = actions["Slither"];
    slither?.reset().play();
    return () => {
      slither?.stop();
    };
  }, [present, actions]);

  useFrame((_state, delta) => {
    const g = groupRef.current;
    const w = wanderRef.current;
    if (!g || !w) return;
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    if (!present || reduced) {
      g.visible = false;
      xiuhcoatlStore.presence = 0;
      if (lightRef.current) lightRef.current.intensity = 0;
      return;
    }
    // dt borne et jamais nul : a dt = 0 (premiere frame, onglet
    // reactive) dh / dt donnait NaN -> quaternion NaN -> squelette NaN
    // (« computeBoundingSphere(): Computed radius is NaN » a chaque frame).
    const dt = Math.max(1e-3, Math.min(delta, 1 / 30));
    const prevHeading = w.heading;
    const s = stepWander(w, dt, XIUHCOATL_WANDER);
    wanderRef.current = s;

    const now = performance.now();
    const fade = Math.min(1, (now - bornAtRef.current) / FADE_IN_MS);
    g.visible = true;
    setOpacity(scene as Group, fade, uniforms);
    uniforms.uTime.value = _state.clock.elapsedTime;
    xiuhcoatlStore.presence = fade;

    // Corps oriente le long de la tangente (le modele avance selon +X),
    // inclinaison dans les virages (le cap qui tourne penche le corps).
    const d = wanderTangent(s);
    g.position.set(s.x, s.y, s.z);
    const yaw = Math.atan2(-d.z, d.x);
    const pitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
    let dh = s.heading - prevHeading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    const bankRaw = -(dh / dt) * BANK_GAIN;
    const bankTarget = Number.isFinite(bankRaw) ? Math.max(-BANK_MAX, Math.min(BANK_MAX, bankRaw)) : 0;
    bankRef.current += (bankTarget - bankRef.current) * Math.min(1, dt * 3);
    const { q, qy, qz, qx, axisY, axisZ, axisX } = scratch;
    q.copy(qy.setFromAxisAngle(axisY, yaw)).multiply(qz.setFromAxisAngle(axisZ, pitch)).multiply(qx.setFromAxisAngle(axisX, bankRef.current));
    g.quaternion.copy(q);
    g.scale.setScalar(SCALE);

    if (lightRef.current) lightRef.current.intensity = LIGHT_INTENSITY * fade;

    // Trainee chaude : un point de chaleur derriere lui a cadence fixe,
    // le long de la moitie arriere du corps (post-fx xiuhcoatl-heat).
    if (now - heatAtRef.current >= HEAT_EVERY_MS) {
      heatAtRef.current = now;
      const back = (0.3 + Math.random() * 0.6) * BODY_LENGTH * SCALE * 0.5;
      pushHeat(s.x - d.x * back, s.y - d.y * back, s.z - d.z * back, now);
    }

    // Etincelles le long de la moitie arriere du corps (famille « chaude »
    // du moteur des fleches : pas de fumee, que des eclats vifs).
    emberAccRef.current += EMBERS_PER_SECOND * dt;
    while (emberAccRef.current >= EMBER_BURST_EVERY) {
      emberAccRef.current -= EMBER_BURST_EVERY;
      const back = (0.15 + Math.random() * 0.75) * BODY_LENGTH * SCALE * 0.5;
      tezcatlStore.vapors.push({
        x: s.x - d.x * back,
        y: s.y - d.y * back,
        z: s.z - d.z * back,
        dx: -d.x,
        dy: -d.y,
        dz: -d.z,
        length: 0.9,
        heat: 1,
      });
    }
  });

  if (!present) return null;
  return (
    <group ref={groupRef} visible={false}>
      <primitive object={scene} />
      <pointLight ref={lightRef} color="#ff7a1a" intensity={0} distance={16} decay={2} position={[0, 0.2, 0]} />
    </group>
  );
}
