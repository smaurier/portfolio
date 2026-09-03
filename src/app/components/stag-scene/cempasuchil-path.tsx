"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Color, Euler, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3, type BufferGeometry } from "three";
import { cempasuchilFlowers, CEMPASUCHIL_COUNT } from "@/lib/cempasuchil-path";
import { WATER_LEVEL } from "./tezcatl-store";
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
const FLOWER_HEIGHT = 0.11; // 0.2 -> 0.13 -> 0.11 (captures 02/09 et 03/09)
/** La tige plonge sous la nappe : seule la tete flotte. */
const SINK = 0.075;
const CEMPASUCHIL = new Color("#ff8a1a");

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
    const geo = src.geometry.clone();
    geo.applyMatrix4(src.matrixWorld);
    geo.rotateX(-Math.PI / 2);
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

  useFrame((state) => {
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
    const flowers = cempasuchilFlowers(depth, t);
    const { m, q, e, p, s } = scratch;
    for (let i = 0; i < CEMPASUCHIL_COUNT; i++) {
      const f = flowers[i];
      const bob = reduced ? 0 : Math.sin(t * 1.3 + f.phase) * 0.012;
      const visible = f.visible ? 1 : 0;
      p.set(f.x, WATER_LEVEL - SINK + bob, f.z);
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
