"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, Euler, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { cempasuchilFlowers, CEMPASUCHIL_COUNT } from "@/lib/cempasuchil-path";
import { WATER_LEVEL, tezcatlStore } from "./tezcatl-store";
import { makeCempasuchilGeometry } from "@/lib/cempasuchil-geometry";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * CempasuchilPath (02/09, Nord). Le chemin de fleurs de cempasuchil qui
 * guide les ames : de VRAIS modeles (retour Sylvain "prends de vrais
 * modeles"), la fleur "Flower_1" du pack Flowers de Quaternius (CC0,
 * poly.pizza, meme auteur que le cerf : coherence low-poly), teintee
 * orange cempasuchil, flottant sur la nappe depuis le cerf vers le Nord.
 * Un InstancedMesh (64 fleurs, un seul draw call), positions par la lib
 * pure cempasuchil-path.ts (chemin qui s'allonge en descendant, derive
 * lente). Flottaison : leger bob par fleur. Nord seulement (fondu par
 * l'echelle), figees en reduced-motion.
 */

/** Hauteur cible d'une fleur (monde) : ~15 cm pour un cerf de 2 unites. */
/** La tige plonge sous la nappe : seule la tete flotte. */
const SINK = 0.02; // la tete flotte, a peine enfoncee (plus de tige)
const CEMPASUCHIL = new Color("#ff8a1a");
/** Convergence vers Xolotl (03/09, retour Sylvain "les fleurs
 * convergeraient vers lui, jusqu'a ce qu'il sorte du bassin, et
 * retrouvent leur place lentement") : quand il traverse le bassin, les
 * fleurs glissent vers lui (nuage autour, jamais empilees), puis
 * reviennent doucement a la couronne une fois sorti. */
const POOL_RADIUS = 6.4;
// 03/09 bis, retour Sylvain "elles convergent trop vite, on dirait des
// piranhas, attirees mais vraiment tres doucement" : tout divise par 4
// a 5, et l'attraction ne va jamais au bout (PULL_MAX) : elles penchent
// vers lui, elles ne l'assiegent pas.
const PULL_RISE = 0.2; // /s
const PULL_MAX = 0.7;
const FOLLOW_RATE = 0.3; // /s vers la cible quand elles convergent
// Retour (03/09 ter, retour Sylvain "moins brutal, une autre courbe,
// elles se deplacent toutes en meme temps, gros tas qui se replace") :
// CHAQUE fleur a son delai (0..RETURN_STAGGER_S apres la sortie de
// Xolotl) et sa propre lenteur ; sa traction descend en ease-in-out
// (cosinus) sur sa propre duree, pas d'exponentielle commune. Le
// surnaturel converge d'un bloc, le retour est une dispersion.
const RETURN_STAGGER_S = 14;
const RETURN_MIN_S = 10;
const RETURN_MAX_S = 26;
const RETURN_RATE = 0.35; // /s : suivi de la cible (qui, elle, bouge lentement)
const CLOUD_MIN = 0.5;
const CLOUD_MAX = 1.6;
export default function CempasuchilPath() {
  const meshRef = useRef<InstancedMesh>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const fadeRef = useRef(direction === "obsidienne" ? 1 : 0);
  // Fleur MODELISEE (04/09, retour Sylvain "on ne les identifie pas du
  // tout comme telles", puis "va pour le modele que tu controles") : la
  // boule de petales de lib/cempasuchil-geometry, couleurs par vertex
  // (coeur sombre, bouts clairs, calice vert). Une seule variante suffit,
  // le cap et l'echelle par instance cassent deja la repetition.
  const geometry = useMemo(() => makeCempasuchilGeometry(7), []);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        metalness: 0,
        side: DoubleSide,
        emissive: CEMPASUCHIL,
        emissiveIntensity: 0.2,
      }),
    []
  );
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  const scratch = useMemo(() => ({ m: new Matrix4(), q: new Quaternion(), e: new Euler(), p: new Vector3(), s: new Vector3() }), []);
  // Etat par fleur : position courante (elle glisse vers sa cible) et son
  // decalage propre dans le nuage autour de Xolotl.
  const currentRef = useRef<Float32Array | null>(null);
  const cloudRef = useMemo(() => {
    const arr = new Float32Array(CEMPASUCHIL_COUNT * 2);
    for (let i = 0; i < CEMPASUCHIL_COUNT; i++) {
      const a = ((i * 2.399963) % (Math.PI * 2));
      const r = CLOUD_MIN + ((i * 0.618034) % 1) * (CLOUD_MAX - CLOUD_MIN);
      arr[i * 2] = Math.cos(a) * r;
      arr[i * 2 + 1] = Math.sin(a) * r;
    }
    return arr;
  }, []);
  const pullRef = useRef(0);
  // Retour individuel : delai et duree par fleur, instant de sortie.
  const returnPlanRef = useMemo(() => {
    const arr = new Float32Array(CEMPASUCHIL_COUNT * 2);
    for (let i = 0; i < CEMPASUCHIL_COUNT; i++) {
      arr[i * 2] = ((i * 0.618034) % 1) * RETURN_STAGGER_S;
      arr[i * 2 + 1] = RETURN_MIN_S + ((i * 0.381966 + 0.2) % 1) * (RETURN_MAX_S - RETURN_MIN_S);
    }
    return arr;
  }, []);
  const leftAtRef = useRef<number | null>(null);
  const lastAnchorRef = useRef<[number, number]>([0, 0]);
  const wasInPoolRef = useRef(false);
  const pullsRef = useRef(new Float32Array(CEMPASUCHIL_COUNT));

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const target = direction === "obsidienne" ? 1 : 0;
    fadeRef.current = reduced ? target : fadeRef.current + (target - fadeRef.current) * 0.05;
    const fade = fadeRef.current;
    mesh.visible = fade > 0.01;
    if (!mesh.visible) return;
    const doc = typeof document !== "undefined" ? document.documentElement : null;
    const denom = doc ? doc.scrollHeight - window.innerHeight : 0;
    const depth = denom > 0 ? Math.min(1, window.scrollY / denom) : 1;
    const t = reduced ? 0 : state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 30);
    const flowers = cempasuchilFlowers(depth, t);
    const { m, q, e, p, s } = scratch;
    // Xolotl dans le bassin ? La traction monte vite, redescend lentement.
    const xo = tezcatlStore.xolotl;
    const xoInPool = !!xo && Math.hypot(xo.x, xo.z) < POOL_RADIUS && !reduced;
    if (xoInPool && !wasInPoolRef.current) leftAtRef.current = null;
    if (!xoInPool && wasInPoolRef.current) leftAtRef.current = t;
    wasInPoolRef.current = xoInPool;
    // Traction commune a la montee (le surnaturel), individuelle au retour.
    if (xoInPool) pullRef.current += (PULL_MAX - pullRef.current) * (1 - Math.exp(-PULL_RISE * dt));
    const pulls = pullsRef.current;
    for (let i = 0; i < CEMPASUCHIL_COUNT; i++) {
      if (xoInPool) {
        pulls[i] = pullRef.current;
      } else if (leftAtRef.current !== null) {
        const since = t - leftAtRef.current - returnPlanRef[i * 2];
        const duration = returnPlanRef[i * 2 + 1];
        const start = pulls[i];
        if (since > 0 && start > 0.0005) {
          // Ease-in-out cosinus sur la duree propre : part sans a-coup,
          // arrive sans a-coup.
          const k = Math.min(1, since / duration);
          const eased = 0.5 - 0.5 * Math.cos(k * Math.PI);
          pulls[i] = Math.min(start, PULL_MAX * (1 - eased));
        }
      } else {
        pulls[i] = 0;
      }
    }
    if (!xoInPool) pullRef.current = 0;
    if (xo) {
      lastAnchorRef.current[0] = xo.x;
      lastAnchorRef.current[1] = xo.z;
    }
    const anchorX = lastAnchorRef.current[0];
    const anchorZ = lastAnchorRef.current[1];
    if (!currentRef.current) {
      currentRef.current = new Float32Array(CEMPASUCHIL_COUNT * 2);
      for (let i = 0; i < CEMPASUCHIL_COUNT; i++) {
        currentRef.current[i * 2] = flowers[i].x;
        currentRef.current[i * 2 + 1] = flowers[i].z;
      }
    }
    const cur = currentRef.current;
    const rate = 1 - Math.exp(-(xoInPool ? FOLLOW_RATE : RETURN_RATE) * dt);
    for (let i = 0; i < CEMPASUCHIL_COUNT; i++) {
      const f = flowers[i];
      const bob = reduced ? 0 : Math.sin(t * 1.3 + f.phase) * 0.012;
      const visible = f.visible ? 1 : 0;
      const pull = pulls[i];
      // Cible : la couronne, tiree vers le nuage autour de Xolotl (dernier
      // point connu une fois parti : les fleurs s'en detachent).
      const tx = f.x + (anchorX + cloudRef[i * 2] - f.x) * pull;
      const tz = f.z + (anchorZ + cloudRef[i * 2 + 1] - f.z) * pull;
      cur[i * 2] += (tx - cur[i * 2]) * rate;
      cur[i * 2 + 1] += (tz - cur[i * 2 + 1]) * rate;
      p.set(cur[i * 2], WATER_LEVEL - SINK + bob, cur[i * 2 + 1]);
      // Inclinaison faible (03/09, "on dirait des poissons") : la fleur
      // reste a plat sur l'eau.
      e.set(reduced ? 0 : Math.sin(t * 0.8 + f.phase) * 0.03, f.yaw, reduced ? 0 : Math.cos(t * 0.7 + f.phase) * 0.03);
      q.setFromEuler(e);
      s.setScalar(f.scale * fade * visible);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, CEMPASUCHIL_COUNT]} frustumCulled={false} raycast={() => null} visible={false} />
  );
}

