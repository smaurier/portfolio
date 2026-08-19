"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, CatmullRomCurve3, TubeGeometry, Vector3, type Group, type Mesh, type Object3D } from "three";
import {
  generateVineFlowerPlacements,
  generateVineHelixPath,
  getVineFlowerBloom,
  getVineFlowerStartThreshold,
} from "@/lib/vine-shapes";
import { getMilpaGrowth } from "@/lib/reveal-arc";

const VINE_COLOR = "#3f6b2f";
const FLOWER_MODEL_PATH = "/models/vine-flower.glb";
const FLOWER_TARGET_SIZE = 0.09;
// En-dessous de ce seuil, on cache plutôt que de rendre un scale
// quasi-nul — retour de Sylvain le 18/08 : "enlève les fleurs à la base
// lorsqu'elles sont à zéro" / "cacher aussi les lianes".
const HIDDEN_THRESHOLD = 0.002;

// Fonction séparée plutôt qu'une assignation directe dans le useFrame du
// composant : eslint-plugin-react-hooks (compilateur React 19) refuse une
// mutation directe sur une valeur issue d'un hook (ici `clone`, un
// useMemo) dans le corps du composant, mais pas un appel de fonction qui
// mute en interne — même raison que setRimLightIntensity (rim-light.ts).
function updateFlowerTransform(
  clone: Object3D,
  visible: boolean,
  scale: number,
  x: number,
  y: number,
  z: number,
) {
  clone.visible = visible;
  clone.scale.setScalar(scale);
  clone.position.set(x, y, z);
}

function VineFlower({
  x,
  y,
  z,
  progressRef,
  vineStagger,
  startAt,
}: {
  x: number;
  y: number;
  z: number;
  progressRef: MutableRefObject<number>;
  vineStagger: number;
  startAt: number;
}) {
  const { scene } = useGLTF(FLOWER_MODEL_PATH);
  const clone = useMemo(() => scene.clone(true), [scene]);
  const readyRef = useRef(false);
  const baseScaleRef = useRef(0);
  const centerRef = useRef(new Vector3());
  const minYRef = useRef(0);

  // Même technique que background-flora.tsx (useFrame plutôt qu'useEffect,
  // même raison : plusieurs clones du même GLB caché par useGLTF). Une fois
  // la boîte englobante connue (position/centre du modèle brut, indépendant
  // de l'ouverture), l'échelle réelle affichée est recalculée chaque frame
  // à partir de l'ouverture (getVineFlowerBloom) — la fleur grossit depuis
  // son point d'accroche (position.y = -minY*scale = 0 à toute échelle),
  // pas depuis son centre géométrique.
  useFrame(() => {
    if (!readyRef.current) {
      const box = new Box3().setFromObject(clone);
      const size = box.getSize(new Vector3());
      if (size.y <= 0) return;
      baseScaleRef.current = FLOWER_TARGET_SIZE / size.y;
      centerRef.current = box.getCenter(new Vector3());
      minYRef.current = box.min.y;
      readyRef.current = true;
    }

    const vineGrowth = getMilpaGrowth(progressRef.current, vineStagger);
    const bloom = getVineFlowerBloom(vineGrowth, startAt);
    const visible = bloom > HIDDEN_THRESHOLD;
    const scale = baseScaleRef.current * bloom;
    updateFlowerTransform(
      clone,
      visible,
      scale,
      -centerRef.current.x * scale,
      -minYRef.current * scale,
      -centerRef.current.z * scale,
    );
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
  /** Décale le départ de la pousse (0..1, cf getMilpaGrowth) — retour de
   * Sylvain le 18/08 : "tout ne devrait pas pousser en même temps". */
  stagger: number;
};

// Deux lianes "grimpantes" sur les pattes avant : elles montent plus haut
// et dérivent vers le centre du corps (driftX/Z proches de 0, c'est là que
// se trouve le cou du cerf après recadrage — cf StagModel) pour donner
// l'effet "vigne vierge qui enlace" demandé par Sylvain, pas juste un
// enroulement au ras des pattes. Les deux pattes arrière gardent un
// enroulement plus court, sans dérive — tout le monde n'a pas besoin de
// grimper jusqu'au corps pour que l'ensemble se lise comme cohérent.
//
// x/z = position approximative des sabots (approximation à l'œil de la
// pose Idle, pas interrogé les os réels du rig — même remarque que pour le
// maïs, cf Codex). Ces coordonnées étaient à l'origine partagées à
// l'identique avec MIDGROUND_POSITIONS (milpa.tsx) : le maïs a depuis été
// repoussé à un rayon plus large ("milpa autour du cerf", pas "sur les
// pattes") pour que les deux se distinguent visuellement (retour de
// Sylvain le 18/08 : "on ne voit pas la diff") — la liane, elle, doit
// rester au plus près de la patte, c'est tout son sujet.
const VINES: VineConfig[] = [
  { x: 0.32, z: 0.28, height: 1.5, driftX: -0.15, driftZ: -0.1, seed: 0, stagger: 0 },
  { x: -0.32, z: 0.32, height: 1.6, driftX: 0.15, driftZ: -0.15, seed: 1.4, stagger: 0.4 },
  { x: 0.36, z: -0.3, height: 0.7, driftX: 0, driftZ: 0, seed: 2.8, stagger: 0.7 },
  { x: -0.28, z: -0.34, height: 0.65, driftX: 0, driftZ: 0, seed: 4.2, stagger: 0.9 },
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
    const flowerCount = config.height > 1 ? 5 : 3;
    const flowerPoints = generateVineFlowerPlacements(flowerCount).map((f, i) => ({
      point: curve.getPointAt(Math.min(1, Math.max(0, f.t))),
      // Seuil de départ propre à chaque fleur (33%-40% de la pousse de la
      // liane) — combine l'index de la fleur et le seed de la liane pour
      // qu'aucune liane ne retombe sur exactement le même motif.
      startAt: getVineFlowerStartThreshold(i, config.seed),
    }));
    return { tubeGeometry, flowerPoints };
  }, [config]);

  const groupRef = useRef<Group>(null);
  const tubeRef = useRef<Mesh>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    // Même mécanique que le maïs (getMilpaGrowth), avec un stagger propre à
    // chaque liane — la vie s'éveille pendant la prise de conscience, mais
    // pas exactement au même instant d'une plante à l'autre.
    const growth = getMilpaGrowth(progressRef.current, config.stagger);
    const visible = growth > HIDDEN_THRESHOLD;
    if (tubeRef.current) tubeRef.current.visible = visible;
    groupRef.current.scale.set(1, Math.max(0.001, growth), 1);
  });

  return (
    <group ref={groupRef} position={[config.x, 0, config.z]}>
      <mesh ref={tubeRef} geometry={tubeGeometry}>
        <meshStandardMaterial color={VINE_COLOR} />
      </mesh>
      {flowerPoints.map(({ point, startAt }, i) => (
        <VineFlower
          key={i}
          x={point.x}
          y={point.y}
          z={point.z}
          progressRef={progressRef}
          vineStagger={config.stagger}
          startAt={startAt}
        />
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
