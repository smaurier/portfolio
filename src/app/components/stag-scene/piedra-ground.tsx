"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { DoubleSide, PlaneGeometry, RepeatWrapping, type MeshPhysicalMaterial } from "three";
import { getMictlanSky } from "./mictlan-sky";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * PiedraGround (30/08). Gravure de la Piedra del Sol au sol, sous le
 * cerf, en RELIEF 3D REEL via displacement map. Reutilise la V2
 * dessinee main par Sylvain (Adobe Illustrator, cf public/img/
 * piedra-del-sol-v2.svg).
 *
 * 3eme des 3 pistes de reemploi de la Piedra (proposees le 21/08).
 *
 * Deux textures generees a partir du SVG source :
 *  - piedra-del-sol-v2.webp : couleur (fond transparent, strokes blancs)
 *    pour tinter la surface via map
 *  - piedra-del-sol-height.webp : greyscale (fond noir, strokes blancs)
 *    pour deformer la geometrie via displacementMap. Blanc = relief
 *    up, noir = plat.
 *
 * Plan subdivise finement (256x256) pour que le displacementMap
 * produise un vrai relief lisible. Rayon 3 unites (dans la zone plate
 * de terrain-height.ts, pas de conflit avec le sol sculpte). Position
 * legerement au-dessus du sol principal (Y=0.005) pour eviter Z-fighting.
 *
 * meshStandardMaterial (pas basic) : le relief a besoin de recevoir
 * lumiere directionnelle pour que ses creux/bosses fassent des ombres
 * lisibles. RevealLighting fournit la lumiere.
 *
 * displacementScale petit (0.06) : gravure subtile, pas un mur.
 * displacementBias -0.03 : moitie du relief creuse dans le sol (creux),
 * moitie sort (bosse), plus naturel qu'une gravure "tout en relief".
 */

const PIEDRA_MAP = "/img/piedra-del-sol-v2.webp";
const PIEDRA_HEIGHTMAP = "/img/piedra-del-sol-height.webp";
const GROUND_RADIUS = 3;
const GROUND_SEGMENTS = 256;
// Retour Sylvain 30/08 : "baisse un peu opacite, reliefs moins forts"
// Reduits d'environ moitie : displacement 0.06→0.03, bias -0.03→-0.015,
// opacite 0.55→0.35. Gravure plus subtile, moins dominante.
const DISPLACEMENT_SCALE = 0.03;
const DISPLACEMENT_BIAS = -0.015;

/**
 * Tezcatl (01/09, etage 4 sprint identites : LEAD de la fiche
 * Mictlampa). Au Nord, la Piedra gravee devient le miroir fumant de
 * Tezcatlipoca : un disque d'obsidienne POLI (roughness bas, metalness
 * haut : la top light froide du puits y accroche un sheen speculaire)
 * et plus present (opacite montee). La fumee de l'ambiance Nord nait
 * sur ses bords (cf north-mictlantecuhtli). Ailleurs : matiere gravure
 * historique inchangee. Crossfade ~800ms, meme convention que fog/rig/
 * grade, snap si prefers-reduced-motion.
 *
 * Note craft : morph one-off de materiau, pilote en local plutot qu'en
 * lib testee (contrairement a direction-fog/light/grade qui sont de la
 * logique partagee) : trois scalaires lerpes, pas de logique metier.
 */
const PIEDRA_NEUTRAL = { roughness: 0.85, metalness: 0.05, opacity: 0.1, clearcoat: 0, envMapIntensity: 0 };
// 02/09 (retour Sylvain "pas flagrant, utiliser des outils en plus") :
// vrai outil PBR : une carte d'environnement violet-nuit reflechie par le
// disque (envMap equirect procedurale) + vernis clearcoat. L'obsidienne
// polie reflete le ciel du Mictlan.
const PIEDRA_TEZCATL = { roughness: 0.12, metalness: 0.7, opacity: 0.42, clearcoat: 1, envMapIntensity: 1.6 };

export default function PiedraGround() {
  const [colorMap, heightMap] = useTexture([PIEDRA_MAP, PIEDRA_HEIGHTMAP]);
  const materialRef = useRef<MeshPhysicalMaterial>(null);
  const skyMap = useMemo(() => getMictlanSky(), []);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();

  // PlaneGeometry subdivise finement + rotate a plat, memoize.
  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(GROUND_RADIUS * 2, GROUND_RADIUS * 2, GROUND_SEGMENTS, GROUND_SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  // Force wrap ClampToEdge sur les textures pour eviter que le UV
  // deborde sur la carte (le disc est centre dans un plan carre).
  useMemo(() => {
    for (const t of [colorMap, heightMap]) {
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.anisotropy = 8;
    }
  }, [colorMap, heightMap]);

  useFrame(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const target = direction === "obsidienne" ? PIEDRA_TEZCATL : PIEDRA_NEUTRAL;
    const alpha = sceneRefs?.reducedMotionRef.current ? 1 : 0.06;
    mat.roughness += (target.roughness - mat.roughness) * alpha;
    mat.metalness += (target.metalness - mat.metalness) * alpha;
    mat.opacity += (target.opacity - mat.opacity) * alpha;
    mat.clearcoat += (target.clearcoat - mat.clearcoat) * alpha;
    mat.envMapIntensity += (target.envMapIntensity - mat.envMapIntensity) * alpha;
    if (skyMap && mat.envMap !== skyMap) {
      mat.envMap = skyMap;
      mat.needsUpdate = true;
    }
  });

  return (
    // renderOrder 1 (05/09, retour Sylvain « a un certain angle, la piedra
    // devient turquoise ») : le revelateur curseur rend TOUS les materiaux
    // transparents, donc le disque et le sol passent dans la passe
    // transparente, triee par distance a la camera. A certains angles le
    // disque etait dessine AVANT le sol : il se melangeait au ciel du dome
    // (alpha 0.1 sur du turquoise), puis sa profondeur rejetait le sol
    // dessous : tout le disque montrait le ciel. Diagnostique en coupant
    // depthWrite (le cyan disparaissait). Le disque passe toujours apres.
    <mesh geometry={geometry} position={[0, 0.005, 0]} receiveShadow renderOrder={1}>
      <meshPhysicalMaterial
        ref={materialRef}
        map={colorMap}
        displacementMap={heightMap}
        displacementScale={DISPLACEMENT_SCALE}
        displacementBias={DISPLACEMENT_BIAS}
        transparent
        opacity={0.10}
        roughness={0.85}
        metalness={0.05}
        clearcoat={0}
        clearcoatRoughness={0.08}
        envMapIntensity={0}
        side={DoubleSide}
      />
    </mesh>
  );
}
