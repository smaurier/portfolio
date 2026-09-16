"use client";

import { useEffect, useRef } from "react";
import { Matrix4, type InstancedMesh as InstancedMeshType } from "three";
import type { PieceModele } from "@/lib/pieces-modele";

/**
 * UNE PIECE DE MODELE, POSEE N FOIS EN UN SEUL APPEL (16/09).
 *
 * Le decor posait un clone par exemplaire : vingt agaves, c'etait vingt
 * appels de dessin et quarante objets dans le graphe, pour une geometrie et
 * un materiau identiques. Or `updateMatrixWorld` descend tout le graphe a
 * chaque image, visible ou non (Object3D, r185) : chaque objet inutile se
 * paie pour toujours, et une deuxieme fois dans le parcours de culling.
 *
 * Trois details qui ne se voient qu'a l'usage :
 *
 * - `matrixAutoUpdate` a faux : les poses sont ecrites une fois, rien ne
 *   justifie de recomposer la matrice du porteur a chaque image.
 * - `computeBoundingSphere` APRES avoir ecrit les poses : sans ca, la
 *   sphere ne couvre qu'une instance et le culling jette tout le groupe des
 *   que celle-la sort du cadre.
 * - la geometrie et le materiau appartiennent au cache de `useGLTF`, pas a
 *   ce composant : on ne les libere jamais ici (voir use-libere).
 */
export function MailleInstanciee({
  piece,
  poses,
  castShadow = false,
}: {
  piece: PieceModele;
  poses: Matrix4[];
  castShadow?: boolean;
}) {
  const ref = useRef<InstancedMeshType>(null);
  useEffect(() => {
    const maille = ref.current;
    if (!maille) return;
    const pose = new Matrix4();
    poses.forEach((placement, i) => {
      pose.multiplyMatrices(placement, piece.pose);
      maille.setMatrixAt(i, pose);
    });
    maille.instanceMatrix.needsUpdate = true;
    maille.computeBoundingSphere();
    maille.matrixAutoUpdate = false;
    maille.updateMatrix();
  }, [piece, poses]);

  if (poses.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[piece.geometry, piece.material, poses.length]}
      castShadow={castShadow}
      raycast={() => null}
    />
  );
}
