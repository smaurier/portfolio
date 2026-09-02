"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, Color, Euler, InstancedMesh, Matrix4, MeshPhysicalMaterial, Quaternion, Vector3 } from "three";
import { arrowVolley } from "@/lib/obsidian-wind";
import { getMictlanSky } from "./mictlan-sky";
import { WATER_LEVEL, tezcatlStore } from "./tezcatl-store";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * ObsidianArrows (02/09, Nord). Temiminaloyan, 7e strate du Mictlan : "ou
 * l'on tire des fleches sur les gens", par des mains invisibles. Ici un
 * evenement de PROFONDEUR : au-dela de 60 % de scroll (on descend les
 * niveaux), une volee de fleches tombe du ciel toutes les ~9 s, se plante
 * dans le bassin autour du cerf (jamais sur lui, cf lib/obsidian-wind.ts),
 * fait une onde a l'impact (tezcatlStore.impacts, consomme par
 * TezcatlWater) puis s'efface. Un InstancedMesh, pool de 24 fleches.
 * Nord seulement, rien en reduced-motion (pas de projectile).
 */

const POOL = 24;
const FALL_FROM = 7;
const FALL_TIME = 0.55;
const STUCK_TIME = 3.5;
const ARROW_LEN = 0.9;
const ARROW_COLOR = new Color("#140f1e");

type ArrowSlot = { active: boolean; x: number; z: number; start: number; impacted: boolean; yaw: number };

export default function ObsidianArrows() {
  const meshRef = useRef<InstancedMesh>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const timeRef = useRef(0);
  const lastVolleyRef = useRef(-1);
  const slotsRef = useRef<ArrowSlot[]>(Array.from({ length: POOL }, () => ({ active: false, x: 0, z: 0, start: 0, impacted: false, yaw: 0 })));
  const geometry = useMemo(() => new BoxGeometry(0.025, ARROW_LEN, 0.025), []);
  const material = useMemo(() => {
    const m = new MeshPhysicalMaterial({ color: ARROW_COLOR, metalness: 0.7, roughness: 0.3, clearcoat: 0.8, envMapIntensity: 1.2 });
    const sky = getMictlanSky();
    if (sky) m.envMap = sky;
    return m;
  }, []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  const scratch = useMemo(() => ({ m: new Matrix4(), q: new Quaternion(), e: new Euler(), p: new Vector3(), s: new Vector3() }), []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const north = direction === "obsidienne";
    if (!north || reduced) {
      mesh.visible = false;
      for (const slot of slotsRef.current) slot.active = false;
      return;
    }
    mesh.visible = true;
    const dt = Math.min(delta, 1 / 30);
    timeRef.current += dt;
    const t = timeRef.current;

    // Profondeur de page (meme lecture que l'eau et le reflet).
    const doc = typeof document !== "undefined" ? document.documentElement : null;
    const denom = doc ? doc.scrollHeight - window.innerHeight : 0;
    const depth = denom > 0 ? Math.min(1, window.scrollY / denom) : 1;

    // Nouvelle volee ? (id stable : lancee une seule fois)
    const volley = arrowVolley(depth, t);
    if (volley && volley.id !== lastVolleyRef.current) {
      lastVolleyRef.current = volley.id;
      for (const a of volley.arrows) {
        const slot = slotsRef.current.find((s) => !s.active);
        if (!slot) break;
        slot.active = true;
        slot.x = a.x;
        slot.z = a.z;
        slot.start = t + a.delay;
        slot.impacted = false;
        slot.yaw = Math.atan2(a.z, a.x);
      }
    }

    const { m, q, e, p, s } = scratch;
    slotsRef.current.forEach((slot, i) => {
      if (!slot.active || t < slot.start) {
        s.setScalar(0);
        m.compose(p.set(0, -10, 0), q.identity(), s);
        mesh.setMatrixAt(i, m);
        return;
      }
      const age = t - slot.start;
      if (age < FALL_TIME) {
        // Chute : ease-in (la fleche accelere), legere inclinaison.
        const k = age / FALL_TIME;
        const y = FALL_FROM - (FALL_FROM - WATER_LEVEL) * k * k;
        p.set(slot.x, y + ARROW_LEN * 0.5, slot.z);
        e.set(0.12, slot.yaw, 0.08);
        s.setScalar(1);
      } else {
        if (!slot.impacted) {
          slot.impacted = true;
          tezcatlStore.impacts.push({ x: slot.x, z: slot.z, amount: 0.22 });
          // Une fleche proche du cerf le fait tressaillir un peu.
          const r = Math.hypot(slot.x, slot.z);
          if (r < 2.4) tezcatlStore.stagHit = { at: state.clock.elapsedTime, strength: 0.35, side: slot.z >= 0 ? 1 : -1 };
        }
        const stuck = age - FALL_TIME;
        if (stuck > STUCK_TIME) {
          slot.active = false;
          s.setScalar(0);
        } else {
          // Plantee dans l'eau, penchee, puis s'efface (fond dans le Mictlan).
          const fade = 1 - Math.max(0, (stuck - STUCK_TIME + 1) / 1);
          s.set(fade, fade, fade);
        }
        p.set(slot.x, WATER_LEVEL + ARROW_LEN * 0.35, slot.z);
        e.set(0.35, slot.yaw, 0.15);
      }
      q.setFromEuler(e);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, POOL]} frustumCulled={false} raycast={() => null} visible={false} />;
}
