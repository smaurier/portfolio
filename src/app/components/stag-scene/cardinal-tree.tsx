"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group, Mesh, MeshStandardMaterial, Object3D } from "three";
import { foliageGrowth, treeFor } from "@/lib/cardinal-trees";
import { frostStore } from "./frost-store";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * CardinalTree (07/09) : l'arbre de la direction, en bordure. Le Codex
 * Fejervary-Mayer planche 1 place un arbre a chaque point cardinal et le feu
 * au centre ; les essences sont celles que nomme la Library of Congress (cf
 * docs/da/arbres-cardinaux.md, lib/cardinal-trees) : amapolli a l'Est, cacao
 * au Sud, colorin a l'Ouest, pochotl au Nord, RIEN au Centre.
 *
 * Le FEUILLAGE pousse avec le scroll (le GLB porte deux objets, Wood et
 * Foliage, pour que le feuillage se mette a l'echelle a part) ; a l'Est il
 * attend le degel : l'arbre reste nu sous la glace, le dard le fait feuiller.
 */

const PATHS = ["pseudobombax", "cacao", "erythrina", "ceiba"] as const;
for (const s of PATHS) useGLTF.preload(`/models/tree-${s}.glb`);

function TreeModel({ species, scale, rotation, x, z, east }: { species: string; scale: number; rotation: number; x: number; z: number; east: boolean }) {
  const { scene } = useGLTF(`/models/tree-${species}.glb`);
  const sceneRefs = useSceneRefs();
  const groupRef = useRef<Group>(null);
  const foliageRef = useRef<Object3D | null>(null);

  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.raycast = () => null;
      m.castShadow = false;
      // Les feuilles sont des plans : elles doivent se voir des deux cotes.
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        const std = mat as MeshStandardMaterial;
        if (std.name === "Leaf" || std.name === "Flower") std.side = 2; // DoubleSide
      }
    });
    return c;
  }, [scene]);

  useEffect(() => {
    foliageRef.current = clone.getObjectByName("Foliage") ?? null;
  }, [clone]);

  useFrame(() => {
    const foliage = foliageRef.current;
    if (!foliage) return;
    const p = sceneRefs?.progressRef.current ?? 0;
    const frost = east && frostStore.active ? frostStore.state.frost : 0;
    const g = foliageGrowth(p, frost);
    foliage.visible = g > 0.02;
    foliage.scale.setScalar(Math.max(0.02, g));
  });

  return (
    <group ref={groupRef} position={[x, 0, z]} rotation={[0, rotation, 0]} scale={scale}>
      <primitive object={clone} />
    </group>
  );
}

export default function CardinalTree() {
  const direction = useCurrentDirection();
  const tree = treeFor(direction);
  // Le Centre n'a pas d'arbre : c'est le foyer (Xiuhtecuhtli).
  if (!tree) return null;
  return (
    <TreeModel
      key={tree.species}
      species={tree.species}
      scale={tree.scale}
      rotation={tree.rotation}
      x={tree.x}
      z={tree.z}
      east={direction === "dore"}
    />
  );
}
