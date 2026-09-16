"use client";

import { useMemo, useRef } from "react";
import type { Group as GroupType, Object3D } from "three";
import { mergeByMaterial } from "@/lib/merge-meshes";
import { elaguerDecor } from "@/lib/elaguer-decor";
import { preparerPieces } from "@/lib/pieces-modele";
import { MailleInstanciee } from "./maille-instanciee";
import { useFigeUneFois } from "./use-fige-une-fois";
import { useLibereToutAuDemontage } from "./use-libere";
import { useGLTF } from "@react-three/drei";
import { CatmullRomCurve3, Matrix4, TubeGeometry, Vector3 } from "three";
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

/**
 * LES FLEURS D'UN BOUQUET, EN UNE SEULE MAILLE (16/09).
 *
 * Chaque fleur etait un `scene.clone(true)` pose dans son propre groupe :
 * vingt-huit fleurs dans la scene, donc vingt-huit appels de dessin et
 * cinquante-six objets, pour une geometrie et un materiau strictement
 * identiques depuis la fusion. La normalisation ne dependait que du modele,
 * jamais du point de pose : elle se calcule maintenant une fois sur la
 * source (voir lib/pieces-modele), ce qui supprime aussi le `useFrame`
 * d'attente qui guettait l'attachement de chaque clone au graphe.
 */
function OcotilloFleurs({ points }: { points: Vector3[] }) {
  const { scene } = useGLTF(FLOWER_MODEL_PATH);
  const pieces = useMemo(() => {
    // Sur la SOURCE, et idempotent : `scene.clone(true)` partage les
    // geometries, donc fusionner un clone disposerait celles des autres.
    mergeByMaterial(scene);
    elaguerDecor(scene);
    return preparerPieces(scene, FLOWER_TARGET_SIZE);
  }, [scene]);
  const poses = useMemo(
    () => points.map((p) => new Matrix4().makeTranslation(p.x, p.y, p.z)),
    [points],
  );
  return (
    <>
      {pieces.map((piece, i) => (
        <MailleInstanciee key={i} piece={piece} poses={poses} />
      ))}
    </>
  );
}

useGLTF.preload(FLOWER_MODEL_PATH);

/** Une hampe : son tube, et les points ou ses fleurs se posent. */
function construireHampe(config: OcotilloWandConfig) {
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
  return {
    tubeGeometry: new TubeGeometry(curve, 24, 0.012, 5, false),
    flowerPoints: generateOcotilloFlowerPlacements(2).map((f) => curve.getPointAt(f.t)),
  };
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
  // Les hampes et leurs points de fleurs sont calcules ICI, au niveau du
  // bouquet (16/09), et non plus hampe par hampe : c'est ce qui permet de
  // dessiner les quatorze fleurs du bouquet en UNE instance au lieu de
  // quatorze mailles. La geometrie du tube reste une par hampe, elles sont
  // toutes differentes.
  const hampes = useMemo(
    () => generateOcotilloCluster({ wandCount: 7, seed }).map(construireHampe),
    [seed],
  );
  const pointsFleurs = useMemo(() => hampes.flatMap((h) => h.flowerPoints), [hampes]);
  useLibereToutAuDemontage(hampes.map((h) => h.tubeGeometry));
  // Les HAMPES seulement (14/09, F1c) : elles sont posees une fois pour
  // toutes, et se recomposaient a chaque image pour rien. Pas le groupe du
  // bouquet, qui reste a r3f, ni les fleurs, qui sont desormais une maille
  // instanciee figee par FleursInstanciees.
  const bouquetRef = useRef<GroupType>(null);
  useFigeUneFois<GroupType>(bouquetRef, (racine) => racine.children.filter((c: Object3D) => c.type === "Mesh"));
  // Rayon de placement (6-9) au-delà de FLAT_RADIUS du terrain (4,
  // terrain-height.ts) : même bug que background-flora.tsx (base plantée
  // dans/flottant au-dessus du sol sculpté), même correction.
  const terrainY = getTerrainHeight(x, z);
  return (
    <group ref={bouquetRef} position={[x, terrainY, z]} rotation={[0, rotationY, 0]} scale={scale}>
      {hampes.map((hampe, i) => (
        <mesh key={i} geometry={hampe.tubeGeometry}>
          <meshStandardMaterial color={WAND_COLOR} />
        </mesh>
      ))}
      <OcotilloFleurs points={pointsFleurs} />
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
