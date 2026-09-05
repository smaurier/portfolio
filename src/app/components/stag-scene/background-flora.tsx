"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Object3D } from "three";
import { generateRingPlacements, type FloraPlacement } from "@/lib/flora-placement";
import { getTerrainHeight } from "@/lib/terrain-height";

/**
 * Végétation de fond, fixe dans le monde : palier 3 de la DA Nahual (cf
 * memory project-nahual-da). Deux rôles : (1) ambiance/texture désertique
 * mexicaine authentique autour du cerf, (2) repère visuel externe qui
 * règle l'ambiguïté "c'est le cerf qui tourne ou la caméra ?" (observation
 * de Sylvain) : ces éléments ne suivent PAS la rotation du cerf.
 *
 * Statique, pas de pousse animée : Sylvain a précisé vouloir réserver
 * l'animation de pousse au maïs (milpa), pas au fond entier.
 *
 * Espèces choisies pour leur authenticité précolombienne mésoaméricaine
 * (cf discussion du 17-18/08) : l'aloès a été explicitement écarté (Ancien
 * Monde, introduit après la colonisation, pas de racine dans la cosmologie
 * nahua contrairement aux autres). Yucca et le cactus en pot Quaternius
 * sont dans le repo mais pas placés ici : les deux GLB incluent un pot de
 * fleuriste (contexte "plante d'intérieur"), visuellement faux dans une
 * scène en pleine nature : à reprendre si une version sans pot est trouvée.
 *
 * elephant-tree.glb (torote/copal) retiré le 18/08 : audit visuel + poids
 * (3,6 Mo, ~40x les autres assets ici) a révélé un décalage de style : texture
 * peinte/photoréaliste à côté d'assets plats vertex-color, et un rendu qui
 * restait pleinement éclairé même en pénombre (0% de scroll), à l'encontre
 * de l'arc de reveal. Remplacé par un ocotillo procédural (cf Ocotillo,
 * src/lib/ocotillo-shapes.ts) : aucun asset CC0 trouvé pour cette silhouette
 * précise (gerbe de tiges rayonnantes), le procédural garantit l'exactitude
 * de l'espèce plutôt qu'un compromis générique.
 */

type Species = {
  path: string;
  /** Hauteur cible en unités de scène : mesurée à l'œil par espèce, pas
   * uniforme (l'elephant tree doit dominer, le cactus tonneau rester bas). */
  targetHeight: number;
};

const SPECIES: Species[] = [
  { path: "/models/agave.glb", targetHeight: 1.1 },
  { path: "/models/nopal-quaternius.glb", targetHeight: 1.0 },
  { path: "/models/nopal-google.glb", targetHeight: 1.0 },
  { path: "/models/cactus-barrel.glb", targetHeight: 0.55 },
  // Ajout 30/08 : cactus-quaternius (petit rond en second plan, 0.5
  // pour rester bas). Retour Sylvain "un peu de diversite aurait ete
  // cool" : au lieu de laisser cet asset orphelin, on le met a
  // l'ouvrage. Le yucca.glb (orphelin lui aussi) a ete essaye mais
  // c'est un yucca EN POT (mesh "yucca_plant_large_potted", plante +
  // pot en une seule primitive, impossible de separer sans editer au
  // vertex level) : retire de la scene, garde en .glb au cas ou un
  // futur remplacement propre.
  { path: "/models/cactus-quaternius.glb", targetHeight: 0.5 },
];

// 2 -> 4 (18/08, retour Sylvain : "tu peux les répéter et aussi faire
// varier leurs tailles", pour agave/nopal/cactus : pas le maïs, qui a sa
// propre mécanique de pousse dans milpa.tsx).
const INSTANCES_PER_SPECIES = 4;

export function useNormalizedClone(path: string, targetHeight: number): Object3D {
  const { scene } = useGLTF(path);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    // Ombres (05/09) : la flore projette (visible au Sud seulement, la
    // directionnelle ne projette que la).
    c.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh) o.castShadow = true;
    });
    return c;
  }, [scene]);
  const normalizedRef = useRef(false);

  // Recadre sur le bounding box réel plutôt que de deviner un facteur
  // d'échelle par asset : même principe que StagModel, mais calculé dans
  // useFrame (une seule fois, via le ref ci-dessus) plutôt qu'en useEffect :
  // avec plusieurs clones du même GLB partagé (useGLTF met en cache la
  // scène source), un useEffect pouvait mesurer un bounding box pas encore
  // à jour pour certaines instances : constaté en vrai (une des deux
  // instances de cactus tonneau restait à sa taille native, ~5 unités,
  // largement plus grande que prévu). useFrame garantit que l'objet est
  // déjà réellement attaché au graphe de scène Three.js au moment du calcul.
  useFrame(() => {
    if (normalizedRef.current) return;
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    if (size.y <= 0) return; // géométrie pas encore prête, on retente au frame suivant

    const center = box.getCenter(new Vector3());
    const scale = targetHeight / size.y;
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    normalizedRef.current = true;
  });

  return clone;
}

function FloraInstance({
  species,
  placement,
}: {
  species: Species;
  placement: FloraPlacement;
}) {
  const model = useNormalizedClone(species.path, species.targetHeight);
  // Rayon de placement (6-11) au-delà de FLAT_RADIUS du terrain (4,
  // terrain-height.ts) : le sol y est sculpté (dunes), y=0 fixe faisait
  // flotter/enfoncer la base de chaque plante dedans : bug trouvé par
  // Sylvain ("le cactus reste gris sur la partie basse, conflit avec le
  // sol"), corrigé en suivant la hauteur réelle du terrain à sa position.
  const terrainY = getTerrainHeight(placement.x, placement.z);
  return (
    <group
      position={[placement.x, terrainY, placement.z]}
      rotation={[0, placement.rotationY, 0]}
      scale={placement.scale}
    >
      <primitive object={model} />
    </group>
  );
}

export default function BackgroundFlora() {
  const placements = useMemo(
    () =>
      generateRingPlacements(SPECIES.length * INSTANCES_PER_SPECIES, {
        // minRadius au-delà du rayon caméra le plus proche (climax, 4 :
        // cf camera-path.ts) : le fond ne doit jamais se retrouver devant
        // la caméra pendant l'orbite.
        minRadius: 6,
        maxRadius: 11,
        // 0.75-1.25 -> 0.55-1.7 (18/08, retour Sylvain : "faire varier
        // leurs tailles") : écart plus net, pas juste perceptible de près.
        minScale: 0.55,
        maxScale: 1.7,
        seed: 1,
      }),
    [],
  );

  return (
    <>
      {placements.map((placement, i) => (
        <FloraInstance key={i} species={SPECIES[i % SPECIES.length]} placement={placement} />
      ))}
    </>
  );
}

for (const species of SPECIES) {
  useGLTF.preload(species.path);
}
