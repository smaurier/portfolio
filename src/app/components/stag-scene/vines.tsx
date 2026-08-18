"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, CatmullRomCurve3, TubeGeometry, Vector3, type Group } from "three";
import { generateVineFlowerPlacements, generateVineHelixPath } from "@/lib/vine-shapes";
import { getMilpaGrowth } from "@/lib/reveal-arc";

const VINE_COLOR = "#3f6b2f";
const FLOWER_MODEL_PATH = "/models/vine-flower.glb";
const FLOWER_TARGET_SIZE = 0.09;

function VineFlower({ x, y, z }: { x: number; y: number; z: number }) {
  const { scene } = useGLTF(FLOWER_MODEL_PATH);
  const clone = useMemo(() => scene.clone(true), [scene]);
  const normalizedRef = useRef(false);

  // Même technique que background-flora.tsx (useFrame plutôt qu'useEffect,
  // même raison : plusieurs clones du même GLB caché par useGLTF).
  useFrame(() => {
    if (normalizedRef.current) return;
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    if (size.y <= 0) return;
    const scale = FLOWER_TARGET_SIZE / size.y;
    const center = box.getCenter(new Vector3());
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    normalizedRef.current = true;
  });

  return (
    <group position={[x, y, z]}>
      <primitive object={clone} />
    </group>
  );
}

useGLTF.preload(FLOWER_MODEL_PATH);

type VineConfig = {
  x: number;
  z: number;
  height: number;
  driftX: number;
  driftZ: number;
  seed: number;
};

// Deux lianes "grimpantes" sur les pattes avant : elles montent plus haut
// et dérivent vers le centre du corps (driftX/Z proches de 0, c'est là que
// se trouve le cou du cerf après recadrage — cf StagModel) pour donner
// l'effet "vigne vierge qui enlace" demandé par Sylvain, pas juste un
// enroulement au ras des pattes. Les deux pattes arrière gardent un
// enroulement plus court, sans dérive — tout le monde n'a pas besoin de
// grimper jusqu'au corps pour que l'ensemble se lise comme cohérent.
const VINES: VineConfig[] = [
  { x: 0.32, z: 0.28, height: 1.5, driftX: -0.15, driftZ: -0.1, seed: 0 },
  { x: -0.32, z: 0.32, height: 1.6, driftX: 0.15, driftZ: -0.15, seed: 1.4 },
  { x: 0.36, z: -0.3, height: 0.7, driftX: 0, driftZ: 0, seed: 2.8 },
  { x: -0.28, z: -0.34, height: 0.65, driftX: 0, driftZ: 0, seed: 4.2 },
];

function Vine({
  config,
  progressRef,
}: {
  config: VineConfig;
  progressRef: MutableRefObject<number>;
}) {
  const { tubeGeometry, flowerPoints } = useMemo(() => {
    const path = generateVineHelixPath({
      height: config.height,
      radius: 0.075,
      turns: config.height > 1 ? 3.5 : 2.2, // plus de tours sur les lianes qui grimpent haut
      segments: 32,
      seed: config.seed,
      driftX: config.driftX,
      driftZ: config.driftZ,
    });
    const curve = new CatmullRomCurve3(path.map((p) => new Vector3(p.x, p.y, p.z)));
    const tubeGeometry = new TubeGeometry(curve, 40, 0.011, 5, false);
    const flowerPoints = generateVineFlowerPlacements(config.height > 1 ? 5 : 3).map((f) =>
      curve.getPointAt(Math.min(1, Math.max(0, f.t))),
    );
    return { tubeGeometry, flowerPoints };
  }, [config]);

  const groupRef = useRef<Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    // Même timing que le maïs (getMilpaGrowth) : la vie s'éveille ensemble
    // pendant la prise de conscience, pas de retour en arrière.
    const growth = Math.max(0.001, getMilpaGrowth(progressRef.current));
    groupRef.current.scale.set(1, growth, 1);
  });

  return (
    <group ref={groupRef} position={[config.x, 0, config.z]}>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial color={VINE_COLOR} />
      </mesh>
      {flowerPoints.map((point, i) => (
        <VineFlower key={i} x={point.x} y={point.y} z={point.z} />
      ))}
    </group>
  );
}

/**
 * Les lianes — palier 3 de la DA Nahual (cf memory project-nahual-da).
 * Contrairement au maïs (Milpa, asset CC0 trouvé), aucun modèle ne colle à
 * "liane qui grimpe et enlace un cerf" — géométrie procédurale (hélice +
 * dérive vers le corps, cf src/lib/vine-shapes.ts), le seul cas du palier 3
 * où le procédural garde du sens face à des assets trouvés.
 */
export default function Vines({ progressRef }: { progressRef: MutableRefObject<number> }) {
  return (
    <>
      {VINES.map((config, i) => (
        <Vine key={i} config={config} progressRef={progressRef} />
      ))}
    </>
  );
}
