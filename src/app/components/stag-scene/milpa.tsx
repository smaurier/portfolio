"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Group } from "three";
import { getMilpaGrowth } from "@/lib/reveal-arc";

const MODEL_PATH = "/models/corn.glb";
// 0.85 -> 1.35 (18/08, retour Sylvain : "on pourrait mettre le maïs plus
// grand") — changement isolé, testé seul plutôt que mélangé à autre chose.
const TARGET_HEIGHT = 1.35;

// Autour des pattes du cerf — approximation à l'œil de la pose Idle, pas
// interrogé les os réels du rig (point d'attention déjà noté dans le
// Codex : plus précis mais plus de travail, pas fait ce soir).
const MIDGROUND_POSITIONS: [number, number][] = [
  [0.32, 0.28],
  [-0.32, 0.32],
  [0.36, -0.3],
  [-0.28, -0.34],
];

// Rideau de premier plan : entre la caméra (qui démarre à l'azimuth 0,
// cf camera-path.ts startRadius) et le cerf. Ne reste "devant" que le temps
// des tout premiers degrés d'orbite — passé ça, la caméra a tourné et le
// rideau n'est plus dans l'axe, il s'écarte de lui-même avec le mouvement
// plutôt que par une mécanique dédiée.
const FOREGROUND_POSITIONS: [number, number][] = [
  [-0.9, 3.4],
  [0.8, 3.1],
];

function MilpaStalk({
  x,
  z,
  progressRef,
}: {
  x: number;
  z: number;
  progressRef: MutableRefObject<number>;
}) {
  const { scene } = useGLTF(MODEL_PATH);
  const clone = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<Group>(null);
  const normalizedRef = useRef(false);

  useFrame(() => {
    // Recadrage par bounding box, une fois, dans useFrame plutôt
    // qu'useEffect — cf background-flora.tsx pour le bug de timing que ça
    // évite avec plusieurs clones du même GLB caché.
    if (!normalizedRef.current) {
      const box = new Box3().setFromObject(clone);
      const size = box.getSize(new Vector3());
      if (size.y > 0) {
        const scale = TARGET_HEIGHT / size.y;
        const center = box.getCenter(new Vector3());
        clone.scale.setScalar(scale);
        clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
        normalizedRef.current = true;
      }
    }

    if (groupRef.current) {
      // Pousse : échelle Y seule (0 -> 1), X/Z restent pleins — la base
      // reste ancrée au sol (position déjà recentrée sur y=0 ci-dessus),
      // donc la tige émerge du sol plutôt que de rétrécir uniformément
      // dans toutes les directions.
      const growth = Math.max(0.001, getMilpaGrowth(progressRef.current));
      groupRef.current.scale.set(1, growth, 1);
    }
  });

  return (
    <group ref={groupRef} position={[x, 0, z]}>
      <primitive object={clone} />
    </group>
  );
}

/**
 * Le maïs (milpa) — palier 3 de la DA Nahual (cf memory project-nahual-da).
 * Contrairement au fond (background-flora.tsx, statique), c'est ici que se
 * joue la pousse animée : autour des pattes du cerf (milieu) et en rideau
 * de premier plan qui se dégage naturellement avec l'orbite de la caméra.
 */
export default function Milpa({ progressRef }: { progressRef: MutableRefObject<number> }) {
  return (
    <>
      {MIDGROUND_POSITIONS.map(([x, z], i) => (
        <MilpaStalk key={`mid-${i}`} x={x} z={z} progressRef={progressRef} />
      ))}
      {FOREGROUND_POSITIONS.map(([x, z], i) => (
        <MilpaStalk key={`fg-${i}`} x={x} z={z} progressRef={progressRef} />
      ))}
    </>
  );
}

useGLTF.preload(MODEL_PATH);
