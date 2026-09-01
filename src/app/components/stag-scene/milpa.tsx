"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Group } from "three";
import { getMilpaGrowth } from "@/lib/reveal-arc";

const MODEL_PATH = "/models/corn.glb";
// 0.85 -> 1.35 (18/08, retour Sylvain : "on pourrait mettre le maïs plus
// grand") : changement isolé, testé seul plutôt que mélangé à autre chose.
const TARGET_HEIGHT = 1.35;

// Autour du cerf, à distance des pattes : pas dessus. À l'origine ces
// coordonnées étaient identiques à celles des lianes (vines.tsx), qui
// grimpent sur les pattes elles-mêmes : les deux se confondaient en un seul
// bloc vert (retour de Sylvain le 18/08 : "on ne voit pas la diff" entre le
// maïs et les lianes). Rayon x1.7 par rapport aux pattes (mêmes directions,
// juste repoussé) pour lire comme un vrai "milpa autour du cerf" : un champ
// qui l'entoure : plutôt qu'un feuillage collé aux pattes qui redouble les
// lianes.
const MIDGROUND_POSITIONS: [number, number][] = [
  [0.54, 0.48],
  [-0.54, 0.54],
  [0.61, -0.51],
  [-0.48, -0.58],
];

// Rideau de premier plan : entre la caméra (qui démarre à l'azimuth 0,
// cf camera-path.ts startRadius) et le cerf. Ne reste "devant" que le temps
// des tout premiers degrés d'orbite : passé ça, la caméra a tourné et le
// rideau n'est plus dans l'axe, il s'écarte de lui-même avec le mouvement
// plutôt que par une mécanique dédiée.
const FOREGROUND_POSITIONS: [number, number][] = [
  [-0.9, 3.4],
  [0.8, 3.1],
];

// Décale légèrement le départ de la pousse d'une tige à l'autre (retour de
// Sylvain le 18/08 : "tout ne devrait pas pousser en même temps") : suite
// fractionnaire du nombre d'or (même principe que flora-placement.ts),
// déterministe et bien répartie sur [0,1) sans motif répétitif visible.
const GOLDEN_RATIO_CONJUGATE = 0.6180339887498949;

function staggerForIndex(index: number): number {
  return (index * GOLDEN_RATIO_CONJUGATE) % 1;
}

function MilpaStalk({
  x,
  z,
  stagger,
  progressRef,
}: {
  x: number;
  z: number;
  stagger: number;
  progressRef: MutableRefObject<number>;
}) {
  const { scene } = useGLTF(MODEL_PATH);
  const clone = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<Group>(null);
  const normalizedRef = useRef(false);

  useFrame(() => {
    // Recadrage par bounding box, une fois, dans useFrame plutôt
    // qu'useEffect : cf background-flora.tsx pour le bug de timing que ça
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
      // Pousse : échelle Y seule (0 -> 1), X/Z restent pleins : la base
      // reste ancrée au sol (position déjà recentrée sur y=0 ci-dessus),
      // donc la tige émerge du sol plutôt que de rétrécir uniformément
      // dans toutes les directions.
      const growth = Math.max(0.001, getMilpaGrowth(progressRef.current, stagger));
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
 * Le maïs (milpa) : palier 3 de la DA Nahual (cf memory project-nahual-da).
 * Contrairement au fond (background-flora.tsx, statique), c'est ici que se
 * joue la pousse animée : autour des pattes du cerf (milieu) et en rideau
 * de premier plan qui se dégage naturellement avec l'orbite de la caméra.
 */
export default function Milpa({ progressRef }: { progressRef: MutableRefObject<number> }) {
  return (
    <>
      {MIDGROUND_POSITIONS.map(([x, z], i) => (
        <MilpaStalk
          key={`mid-${i}`}
          x={x}
          z={z}
          stagger={staggerForIndex(i)}
          progressRef={progressRef}
        />
      ))}
      {FOREGROUND_POSITIONS.map(([x, z], i) => (
        <MilpaStalk
          key={`fg-${i}`}
          x={x}
          z={z}
          // Décalé après les positions midground (même suite, index continué)
          // pour ne pas retomber sur les mêmes valeurs de stagger.
          stagger={staggerForIndex(MIDGROUND_POSITIONS.length + i)}
          progressRef={progressRef}
        />
      ))}
    </>
  );
}

useGLTF.preload(MODEL_PATH);
