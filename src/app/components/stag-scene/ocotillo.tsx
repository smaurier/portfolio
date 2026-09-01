"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import {
  generateOcotilloCluster,
  generateOcotilloFlowerPlacements,
  generateOcotilloWandPath,
  type OcotilloWandConfig,
} from "@/lib/ocotillo-shapes";
import { generateRingPlacements } from "@/lib/flora-placement";
import { getTerrainHeight } from "@/lib/terrain-height";

// Vert-gris sec, cohérent avec l'ambiance désertique (distinct du vert des
// lianes VINE_COLOR="#3f6b2f", plus vif : l'ocotillo est une tige ligneuse,
// pas une plante grimpante fraîche).
const WAND_COLOR = "#78805a";
const FLOWER_MODEL_PATH = "/models/vine-flower.glb";
// Plus petites que les fleurs de liane (0.09) : les fleurs d'ocotillo sont
// une petite grappe serrée en pointe, pas des fleurs individuelles espacées.
const FLOWER_TARGET_SIZE = 0.05;

function OcotilloFlower({ x, y, z }: { x: number; y: number; z: number }) {
  // Même technique que VineFlower (vines.tsx) et FloraInstance
  // (background-flora.tsx) : useFrame plutôt qu'useEffect, le clone n'est
  // mesurable de façon fiable qu'une fois réellement attaché au graphe de
  // scène (plusieurs clones du même GLB caché par useGLTF).
  const { scene } = useGLTF(FLOWER_MODEL_PATH);
  const clone = useMemo(() => scene.clone(true), [scene]);
  const normalizedRef = useRef(false);

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

function OcotilloWand({ config }: { config: OcotilloWandConfig }) {
  const { tubeGeometry, flowerPoints } = useMemo(() => {
    const path = generateOcotilloWandPath({
      height: config.height,
      leanX: config.leanX,
      leanZ: config.leanZ,
      wobbleAmplitude: 0.025,
      wobbleFrequency: 2.5,
      segments: 20,
      seed: config.seed,
    });
    const curve = new CatmullRomCurve3(path.map((p) => new Vector3(p.x, p.y, p.z)));
    const tubeGeometry = new TubeGeometry(curve, 24, 0.012, 5, false);
    const flowerPoints = generateOcotilloFlowerPlacements(2).map((f) => curve.getPointAt(f.t));
    return { tubeGeometry, flowerPoints };
  }, [config]);

  return (
    <>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial color={WAND_COLOR} />
      </mesh>
      {flowerPoints.map((point, i) => (
        <OcotilloFlower key={i} x={point.x} y={point.y} z={point.z} />
      ))}
    </>
  );
}

function OcotilloCluster({
  x,
  z,
  rotationY,
  scale,
  seed,
}: {
  x: number;
  z: number;
  rotationY: number;
  scale: number;
  seed: number;
}) {
  const wands = useMemo(() => generateOcotilloCluster({ wandCount: 7, seed }), [seed]);
  // Rayon de placement (6-9) au-delà de FLAT_RADIUS du terrain (4,
  // terrain-height.ts) : même bug que background-flora.tsx (base plantée
  // dans/flottant au-dessus du sol sculpté), même correction.
  const terrainY = getTerrainHeight(x, z);
  return (
    <group position={[x, terrainY, z]} rotation={[0, rotationY, 0]} scale={scale}>
      {wands.map((wand, i) => (
        <OcotilloWand key={i} config={wand} />
      ))}
    </group>
  );
}

/**
 * Buissons d'ocotillo (Fouquieria splendens), fixes dans le fond : palier 3
 * de la DA Nahual (cf memory project-nahual-da). Remplace elephant-tree.glb
 * (asset CC0 mal assorti au reste du style, cf audit + retrait du 18/08 dans
 * background-flora.tsx). Géométrie procédurale (src/lib/ocotillo-shapes.ts),
 * pas d'asset trouvé : la gerbe de tiges rayonnantes n'a pas d'équivalent
 * CC0, et Sylvain a tranché pour le procédural plutôt qu'un compromis
 * générique reteinté. Statique comme le reste du fond, pas de pousse
 * animée (même règle que background-flora.tsx).
 */
export default function Ocotillo() {
  const placements = useMemo(
    () =>
      generateRingPlacements(2, {
        minRadius: 6,
        maxRadius: 9,
        minScale: 0.9,
        maxScale: 1.15,
        // Seed distincte de background-flora.tsx (seed:1) : évite tout
        // chevauchement de position entre les deux anneaux de végétation.
        seed: 7,
      }),
    [],
  );

  return (
    <>
      {placements.map((p, i) => (
        <OcotilloCluster
          key={i}
          x={p.x}
          z={p.z}
          rotationY={p.rotationY}
          scale={p.scale}
          seed={i * 2.3}
        />
      ))}
    </>
  );
}
