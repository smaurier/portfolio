/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'un store et du rendu a chaque image, legitime en 3D. */
"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { compensationNuit } from "@/lib/nuit-mobile";
import { useSceneRefs } from "./scene-refs-context";
import { nuitMobileStore } from "./nuit-mobile-store";

/**
 * NuitMobile (04/10) : calcule la compensation de la nuit une fois par
 * image (profil + progres de l'arc), la depose dans nuitMobileStore pour la
 * lumiere, le foyer et les braises, et pose l'exposition du rendu. Sur un
 * profil avec post-traitement tout vaut 1 : le bureau ne voit rien. Mince :
 * la mecanique vit dans lib/nuit-mobile. Priorite -1 : avant les
 * consommateurs, pour qu'ils lisent la valeur de l'image courante. La lib
 * rend un litteral de trois nombres par image : ce n'est pas un objet three,
 * le ramasse-miettes n'y voit rien.
 */
export default function NuitMobile() {
  const sceneRefs = useSceneRefs();
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    if (!sceneRefs) return;
    const c = compensationNuit(sceneRefs.perfProfile, sceneRefs.progressRef.current);
    nuitMobileStore.ambiant = c.ambiant;
    nuitMobileStore.emissif = c.emissif;
    nuitMobileStore.exposition = c.exposition;
    if (gl.toneMappingExposure !== c.exposition) gl.toneMappingExposure = c.exposition;
  }, -1);
  return null;
}
