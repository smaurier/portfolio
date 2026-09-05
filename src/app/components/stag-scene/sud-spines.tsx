"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { type Group } from "three";
import { generateRingPlacements } from "@/lib/flora-placement";
import { terrainHeightWorld } from "./cardinal-orientation";
import { useNormalizedClone } from "./background-flora";
import { useCurrentDirection } from "./use-current-direction";
import { xiuhcoatlStore } from "./xiuhcoatl-store";

/**
 * SudSpines (04/09, tissu du Sud, « les epines »). Le Sud est la
 * direction de Huitzilopochtli, du soleil et du desert d'epines : agaves
 * et nopals viennent plus nombreux et plus grands autour de la scene,
 * un second anneau propre au Sud par-dessus la flore commune. Rayon 6.4
 * a 8.6 : au-dela de l'orbite camera du Sud (rayon 6.1 au climax), jamais
 * devant l'objectif. Meme lib de placement que la flore (deterministe),
 * modeles existants (agave, nopals), pose sur la hauteur reelle du
 * terrain. Sud seulement : les plantes poussent (scale) a l'arrivee et se
 * retirent ailleurs.
 */

const SPINE_SPECIES = [
  { path: "/models/agave.glb", targetHeight: 1.3 },
  { path: "/models/nopal-quaternius.glb", targetHeight: 1.25 },
  { path: "/models/nopal-google.glb", targetHeight: 1.2 },
] as const;
const INSTANCES_PER_SPECIES = 5;

function Spine({ path, targetHeight, x, z, rotationY, scale, grow, phase }: { path: string; targetHeight: number; x: number; z: number; rotationY: number; scale: number; grow: { current: number }; phase: number }) {
  const model = useNormalizedClone(path, targetHeight);
  const ref = useRef<Group>(null);
  const terrainY = terrainHeightWorld(x, z);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const s = scale * grow.current;
    g.scale.setScalar(Math.max(0.001, s));
    g.visible = grow.current > 0.02;
    // Souffle chaud (05/09) : a midi, les epines fremissent, un balancement
    // lent et faible dans l'air qui tremble (rien si groundHeat = 0).
    const heat = xiuhcoatlStore.groundHeat;
    const t = state.clock.elapsedTime;
    g.rotation.z = heat * 0.035 * Math.sin(t * 1.7 + phase) + heat * 0.015 * Math.sin(t * 4.3 + phase * 2.1);
    g.rotation.x = heat * 0.02 * Math.sin(t * 1.1 + phase * 0.7);
  });
  return (
    <group ref={ref} position={[x, terrainY, z]} rotation={[0, rotationY, 0]} visible={false}>
      <primitive object={model} />
    </group>
  );
}

export default function SudSpines() {
  const direction = useCurrentDirection();
  const growRef = useRef(direction === "turquoise" ? 1 : 0);
  const placements = useMemo(
    () => generateRingPlacements(SPINE_SPECIES.length * INSTANCES_PER_SPECIES, { minRadius: 6.4, maxRadius: 8.6, minScale: 1.0, maxScale: 1.9, seed: 7 }),
    []
  );
  useFrame(() => {
    const target = direction === "turquoise" ? 1 : 0;
    growRef.current += (target - growRef.current) * 0.05;
  });
  return (
    <>
      {placements.map((pl, i) => {
        const sp = SPINE_SPECIES[i % SPINE_SPECIES.length];
        return <Spine key={i} path={sp.path} targetHeight={sp.targetHeight} x={pl.x} z={pl.z} rotationY={pl.rotationY} scale={pl.scale} grow={growRef} phase={i * 1.9} />;
      })}
    </>
  );
}

for (const sp of SPINE_SPECIES) useGLTF.preload(sp.path);
