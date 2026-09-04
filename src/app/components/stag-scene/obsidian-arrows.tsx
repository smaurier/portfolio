"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, Euler, InstancedMesh, Matrix4, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { ARROW_MATERIAL, ARROW_SPEC, makeArrowGeometry } from "@/lib/arrow-geometry";
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
const ARROW_LEN = ARROW_SPEC.length;
// Materiaux de la fleche, dans l'ordre des groupes de lib/arrow-geometry.
const OBSIDIAN_COLOR = new Color("#0a0712");

type ArrowSlot = { active: boolean; x: number; z: number; start: number; impacted: boolean; yaw: number };

export default function ObsidianArrows() {
  const meshRef = useRef<InstancedMesh>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const timeRef = useRef(0);
  const lastVolleyRef = useRef(-1);
  const slotsRef = useRef<ArrowSlot[]>(Array.from({ length: POOL }, () => ({ active: false, x: 0, z: 0, start: 0, impacted: false, yaw: 0 })));
  // Fleche MODELISEE (04/09, cf lib/arrow-geometry : roseau a noeuds,
  // avant-fut, ligatures, pointe d'obsidienne en feuille, trois plumes).
  // Construite pointe en +Y, retournee ici : elle tombe pointe en bas.
  const geometry = useMemo(() => {
    const g = makeArrowGeometry();
    g.rotateX(Math.PI);
    g.computeBoundingSphere();
    return g;
  }, []);
  // Un materiau par groupe (InstancedMesh accepte le tableau). La pointe
  // reprend la recette des lames d'obsidienne, le reste est mat.
  const materials = useMemo(() => {
    const obsidian = new MeshPhysicalMaterial({ color: OBSIDIAN_COLOR, metalness: 0.85, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.6 });
    const sky = getMictlanSky();
    if (sky) obsidian.envMap = sky;
    // TOUT obsidienne (04/09, Sylvain "les fleches doivent etre totalement
    // d'obsidienne") : la forme garde ses noeuds, ligatures et plumes, la
    // matiere est une seule pierre. Les plumes en double face pour rester
    // lisibles par la tranche. Les groupes restent en place.
    const feather = obsidian.clone();
    feather.side = DoubleSide;
    const list: (MeshPhysicalMaterial | MeshStandardMaterial)[] = [];
    list[ARROW_MATERIAL.obsidian] = obsidian;
    list[ARROW_MATERIAL.reed] = obsidian;
    list[ARROW_MATERIAL.binding] = obsidian;
    list[ARROW_MATERIAL.feather] = feather;
    return list;
  }, []);
  useEffect(() => () => { geometry.dispose(); for (const m of new Set(materials)) m.dispose(); }, [geometry, materials]);

  const scratch = useMemo(() => ({ m: new Matrix4(), q: new Quaternion(), e: new Euler(), p: new Vector3(), s: new Vector3(), axis: new Vector3() }), []);

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

    const { m, q, e, p, s, axis } = scratch;
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
        p.set(slot.x, WATER_LEVEL + ARROW_LEN * 0.35, slot.z);
        e.set(0.35, slot.yaw, 0.15);
        if (stuck > STUCK_TIME) {
          // Plantee quelques secondes, elle SE VAPORISE (04/09) : fumee
          // noire et eclats le long de la hampe (ArrowVapor), et
          // l'instance disparait d'un coup, plus de fondu.
          slot.active = false;
          q.setFromEuler(e);
          // Axe pointe -> talon : la geometrie est retournee (pointe en
          // -Y local), le talon est donc en +Y local.
          axis.set(0, 1, 0).applyQuaternion(q);
          tezcatlStore.vapors.push({ x: p.x, y: p.y, z: p.z, dx: axis.x, dy: axis.y, dz: axis.z, length: ARROW_LEN });
          s.setScalar(0);
        } else {
          s.setScalar(1);
        }
      }
      q.setFromEuler(e);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geometry, materials, POOL]} frustumCulled={false} raycast={() => null} visible={false} />;
}
