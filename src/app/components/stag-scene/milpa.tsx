/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d uniforms et de la pose des plants a 60 fps (meme precedent que sud-sky et spirit-particles). */
"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useCurrentDirection } from "./use-current-direction";
import { milpaPose, milpaRing } from "@/lib/milpa-frost";
import { addShaderModifier } from "./shader-patch";
import { frostAt, frostStore } from "./frost-store";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Group, type Material, type Mesh } from "three";
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

/** Les positions du centre reportees sur la bordure de la Piedra : a l'Est
 * SEULEMENT (07/09, Sylvain : ailleurs les plants du centre habillent le
 * cerf de motifs vegetaux, c'est l'intention de depart). */
const EAST_RING_POSITIONS = milpaRing(MIDGROUND_POSITIONS);

function MilpaStalk({
  x,
  z,
  stagger,
  progressRef,
  east = false,
}: {
  x: number;
  z: number;
  stagger: number;
  progressRef: MutableRefObject<number>;
  /** A l'Est : gelee, couchee et petite tant que le monde n'a pas degele. */
  east?: boolean;
}) {
  const { scene } = useGLTF(MODEL_PATH);
  /**
   * LA COURBURE EST DANS LE NUANCEUR (18/09), parce qu'une tige rigide ne
   * peut pas se courber autrement : seuls ses sommets le peuvent. Chaque
   * plant a donc SES materiaux -- `Object3D.clone` partage ceux du GLTF --
   * et donc ses propres uniformes, puisque chacun lit le gel de sa position
   * et se releve quand le front lui passe dessus.
   *
   * Les materiaux sont clones ICI, au montage : le balayage de `FrostPatch`
   * les trouvera ensuite comme les autres, et la glace continuera de les
   * atteindre. Les deux modificateurs vivent cote a cote sur le meme
   * materiau, c'est ce pour quoi `addShaderModifier` est fait.
   */
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = (o as Mesh).material as Material | Material[] | undefined;
      if (!m) return;
      (o as Mesh).material = Array.isArray(m) ? m.map((x) => x.clone()) : m.clone();
    });
    return c;
  }, [scene]);
  const groupRef = useRef<Group>(null);
  const normalizedRef = useRef(false);
  // L'azimut du plant : le sens dans lequel le gel l'a couche (vers l'exterieur).
  const bendAzimuth = useMemo(() => Math.atan2(x, z), [x, z]);
  /** L'axe horizontal autour duquel la tige se courbe : perpendiculaire au
   *  sens de la flexion, donc le meme que l'ancienne rotation de groupe. */
  const courbe = useMemo(
    () => ({
      uCourbe: { value: 0 },
      uAxe: { value: new Vector3(Math.cos(bendAzimuth), 0, -Math.sin(bendAzimuth)) },
      uPivot: { value: new Vector3() },
      uHaut: { value: 1 },
    }),
    [bendAzimuth],
  );
  const patchRef = useRef(false);

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
        // La courbure travaille dans l'espace du modele, pas dans le notre :
        // sa hauteur brute et le point ou la tige sort de terre.
        courbe.uHaut.value = size.y;
        courbe.uPivot.value.set(center.x, box.min.y, center.z);
        normalizedRef.current = true;
      }
      if (!patchRef.current && normalizedRef.current) {
        patchRef.current = true;
        clone.traverse((o) => {
          const m = (o as Mesh).material as Material | Material[] | undefined;
          if (!m) return;
          for (const mm of Array.isArray(m) ? m : [m]) attacherCourbure(mm, courbe);
        });
      }
    }

    if (groupRef.current) {
      // Pousse : échelle Y seule (0 -> 1), X/Z restent pleins : la base
      // reste ancrée au sol (position déjà recentrée sur y=0 ci-dessus),
      // donc la tige émerge du sol plutôt que de rétrécir uniformément
      // dans toutes les directions.
      const scrollGrowth = getMilpaGrowth(progressRef.current, stagger);
      // A l'Est, le gel commande : petite et couchee sous la glace, elle ne
      // se releve et ne pousse qu'apres le degel. Ailleurs la flexion vaut 0.
      // Un seul chemin de code, et la rotation est TOUJOURS ecrite : la scene
      // persiste d'une page a l'autre, une rotation seulement ignoree restait
      // en place et le mais restait couche partout (07/09).
      // LE BALAI (09/09) : chaque plant lit le givre de SA position, pas
      // celui du monde. Il se releve donc exactement quand le front lui
      // passe dessus, ce qui rend la repousse CAUSEE par le balai au lieu
      // d'etre une coincidence. Attestation du geste : Itztlacoliuhqui porte
      // un balai de paille « qui nettoie le chemin pour la vie nouvelle »
      // (cf docs/da/est-sources.md).
      const frost = east && frostStore.active ? frostAt(x, z) : 0;
      const pose = milpaPose(scrollGrowth, frost, east);
      groupRef.current.scale.set(1, Math.max(0.001, pose.growth), 1);
      // LA FLEXION N'EST PLUS UNE ROTATION DE GROUPE (18/09). Elle l'etait,
      // et le plant basculait alors d'un bloc autour de sa base : une perche,
      // exactement le mot de Sylvain. Elle passe maintenant par la courbure
      // du nuanceur. On ECRIT quand meme la rotation neutre, parce que la
      // scene persiste d'une page a l'autre et que la regle de ce fichier est
      // de ne jamais se contenter de sauter le calcul.
      groupRef.current.rotation.set(0, 0, 0);
      courbe.uCourbe.value = pose.bend;
    }
  });

  return (
    <group ref={groupRef} position={[x, 0, z]}>
      <primitive object={clone} />
    </group>
  );
}

/**
 * LA COURBURE, DANS LE NUANCEUR DE SOMMETS.
 *
 * L'angle croit avec la hauteur : rien a la base,
 * toute la flexion a la pointe. La rotation se fait autour de la base, donc
 * la tige garde sa longueur -- elle se courbe, elle ne s'etire pas. La
 * normale tourne du meme angle, sinon la lumiere trahirait une tige droite
 * sur une silhouette courbe.
 *
 * ⚠️ `uCourbe * t * t` ci-dessous EST la transcription de `angleCourbure`
 * (lib/milpa-frost), qui porte les tests de la courbe : pas de coude au ras
 * du sol, monotone, bornee. GLSL ne peut pas appeler la fonction ; changer
 * l'une sans l'autre ferait mentir les tests, donc les deux se citent.
 */
function attacherCourbure(
  materiau: Material,
  u: { uCourbe: { value: number }; uAxe: { value: Vector3 }; uPivot: { value: Vector3 }; uHaut: { value: number } },
): void {
  addShaderModifier(materiau, (shader) => {
    shader.uniforms.uCourbe = u.uCourbe;
    shader.uniforms.uAxe = u.uAxe;
    shader.uniforms.uPivot = u.uPivot;
    shader.uniforms.uHaut = u.uHaut;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uCourbe;
         uniform vec3 uAxe;
         uniform vec3 uPivot;
         uniform float uHaut;
         // Rodrigues : rotation d'un vecteur autour d'un axe unitaire.
         vec3 tournerAutour(vec3 p, vec3 k, float a) {
           float c = cos(a), s = sin(a);
           return p * c + cross(k, p) * s + k * dot(k, p) * (1.0 - c);
         }
         float hauteurMilpa(float y) {
           return clamp((y - uPivot.y) / max(uHaut, 0.0001), 0.0, 1.0);
         }`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
         if (abs(uCourbe) > 0.0001) {
           float nT = hauteurMilpa(position.y);
           objectNormal = tournerAutour(objectNormal, uAxe, uCourbe * nT * nT);
         }`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         if (abs(uCourbe) > 0.0001) {
           float cT = hauteurMilpa(transformed.y);
           vec3 cRel = transformed - uPivot;
           transformed = uPivot + tournerAutour(cRel, uAxe, uCourbe * cT * cT);
         }`,
      );
  });
}

/**
 * Le maïs (milpa) : palier 3 de la DA Nahual (cf memory project-nahual-da).
 * Contrairement au fond (background-flora.tsx, statique), c'est ici que se
 * joue la pousse animée : autour des pattes du cerf (milieu) et en rideau
 * de premier plan qui se dégage naturellement avec l'orbite de la caméra.
 */
export default function Milpa({ progressRef }: { progressRef: MutableRefObject<number> }) {
  // Pas de mais dans le bassin du Nord (03/09, retour Sylvain "on va sortir
  // les plantes du bassin") : la milpa se retracte au Nord (fondu par
  // l'echelle), reste partout ailleurs.
  const direction = useCurrentDirection();
  const east = direction === "dore";
  const northFadeRef = useRef(direction === "obsidienne" ? 0 : 1);
  const rootRef = useRef<Group>(null);
  useFrame(() => {
    const target = direction === "obsidienne" ? 0 : 1;
    northFadeRef.current += (target - northFadeRef.current) * 0.06;
    if (rootRef.current) {
      rootRef.current.visible = northFadeRef.current > 0.02;
      rootRef.current.scale.set(1, Math.max(0.001, northFadeRef.current), 1);
    }
  });
  return (
    <group ref={rootRef}>
      {(east ? EAST_RING_POSITIONS : MIDGROUND_POSITIONS).map(([x, z], i) => (
        <MilpaStalk
          key={`mid-${i}`}
          x={x}
          z={z}
          stagger={staggerForIndex(i)}
          progressRef={progressRef}
          east={east}
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
          east={east}
        />
      ))}
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
