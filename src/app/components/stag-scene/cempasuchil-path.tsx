"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, BufferGeometry, Color, Euler, Float32BufferAttribute, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { cempasuchilFlowers, CEMPASUCHIL_COUNT } from "@/lib/cempasuchil-path";
import { WATER_LEVEL, tezcatlStore } from "./tezcatl-store";
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

const MODEL_PATH = "/models/flowers-quaternius.glb";
const FLOWER_NODE = "Flower_1";
/** Hauteur cible d'une fleur (monde) : ~15 cm pour un cerf de 2 unites. */
const FLOWER_HEIGHT = 0.1; // hauteur de la TETE seule (03/09)
/** La tige plonge sous la nappe : seule la tete flotte. */
const SINK = 0.02; // la tete flotte, a peine enfoncee (plus de tige)
const CEMPASUCHIL = new Color("#ff8a1a");
/** Convergence vers Xolotl (03/09, retour Sylvain "les fleurs
 * convergeraient vers lui, jusqu'a ce qu'il sorte du bassin, et
 * retrouvent leur place lentement") : quand il traverse le bassin, les
 * fleurs glissent vers lui (nuage autour, jamais empilees), puis
 * reviennent doucement a la couronne une fois sorti. */
const POOL_RADIUS = 6.4;
const PULL_RISE = 0.9; // /s
const PULL_FALL = 0.22; // /s : le retour est lent
const FOLLOW_RATE = 1.4; // /s vers la cible quand elles convergent
const RETURN_RATE = 0.45; // /s vers la couronne quand elles reviennent
const CLOUD_MIN = 0.5;
const CLOUD_MAX = 1.6;
/** Fraction de la hauteur du modele en dessous de laquelle on coupe (la
 * tige) : 0.55 garde la corolle et les feuilles hautes. */
const HEAD_CUT = 0.55;

/** Ne garde que les triangles dont les trois sommets sont au-dessus de
 * `fraction` de la hauteur totale. Geometrie non indexee en sortie. */
function keepAbove(src: BufferGeometry, fraction: number): BufferGeometry {
  const g = src.index ? src.toNonIndexed() : src;
  g.computeBoundingBox();
  const bb = g.boundingBox ?? new Box3();
  const cut = bb.min.y + (bb.max.y - bb.min.y) * fraction;
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  const nor = g.attributes.normal;
  const outPos: number[] = [];
  const outUv: number[] = [];
  const outNor: number[] = [];
  for (let t = 0; t < pos.count; t += 3) {
    const ys = [pos.getY(t), pos.getY(t + 1), pos.getY(t + 2)];
    if (Math.min(...ys) < cut) continue;
    for (let k = 0; k < 3; k++) {
      outPos.push(pos.getX(t + k), pos.getY(t + k), pos.getZ(t + k));
      if (uv) outUv.push(uv.getX(t + k), uv.getY(t + k));
      if (nor) outNor.push(nor.getX(t + k), nor.getY(t + k), nor.getZ(t + k));
    }
  }
  const out = new BufferGeometry();
  out.setAttribute("position", new Float32BufferAttribute(outPos, 3));
  if (uv) out.setAttribute("uv", new Float32BufferAttribute(outUv, 2));
  if (nor) out.setAttribute("normal", new Float32BufferAttribute(outNor, 3));
  else out.computeVertexNormals();
  if (g !== src) g.dispose();
  return out;
}

export default function CempasuchilPath() {
  const meshRef = useRef<InstancedMesh>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const fadeRef = useRef(direction === "obsidienne" ? 1 : 0);
  const gltf = useGLTF(MODEL_PATH);

  const { geometry, material } = useMemo(() => {
    const src = gltf.scene.getObjectByName(FLOWER_NODE) as Mesh | undefined;
    if (!src) return { geometry: null as BufferGeometry | null, material: null as MeshStandardMaterial | null };
    // Geometrie cuite avec le transform du noeud (scale 100 du pack), puis
    // normalisee : hauteur FLOWER_HEIGHT, pied a y=0, centree en xz. Le
    // pack a la fleur debout selon +z local : on la redresse selon +y.
    src.updateWorldMatrix(true, false);
    const whole = src.geometry.clone();
    whole.applyMatrix4(src.matrixWorld);
    whole.rotateX(-Math.PI / 2);
    // TETE SEULE (03/09, retour Sylvain "ne garder que les fleurs, pas
    // leurs tiges") : on ne garde que les triangles du haut du modele
    // (au-dessus de HEAD_CUT de la hauteur), la tige est jetee.
    const geo = keepAbove(whole, HEAD_CUT);
    whole.dispose();
    geo.computeBoundingBox();
    const box = geo.boundingBox ?? new Box3();
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const k = size.y > 0 ? FLOWER_HEIGHT / size.y : 1;
    geo.translate(-center.x, -box.min.y, -center.z);
    geo.scale(k, k, k);
    const srcMat = (Array.isArray(src.material) ? src.material[0] : src.material) as MeshStandardMaterial;
    const mat = new MeshStandardMaterial({
      map: srcMat.map ?? null,
      color: CEMPASUCHIL,
      roughness: 0.85,
      metalness: 0,
      emissive: CEMPASUCHIL,
      emissiveIntensity: 0.18,
    });
    return { geometry: geo, material: mat };
  }, [gltf]);
  useEffect(() => () => { geometry?.dispose(); material?.dispose(); }, [geometry, material]);

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
    const pullTarget = xoInPool ? 1 : 0;
    pullRef.current += (pullTarget - pullRef.current) * (1 - Math.exp(-(xoInPool ? PULL_RISE : PULL_FALL) * dt));
    const pull = pullRef.current;
    const anchorX = xo ? xo.x : 0;
    const anchorZ = xo ? xo.z : 0;
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
      // Cible : la couronne, tiree vers le nuage autour de Xolotl.
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

  if (!geometry || !material) return null;
  return (
    <instancedMesh ref={meshRef} args={[geometry, material, CEMPASUCHIL_COUNT]} frustumCulled={false} raycast={() => null} visible={false} />
  );
}

useGLTF.preload(MODEL_PATH);
