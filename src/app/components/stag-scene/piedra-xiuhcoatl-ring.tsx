/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'uniforms et de materiau a 60 fps (meme precedent que xolotl-companion). */
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Color, PlaneGeometry, RepeatWrapping, type MeshPhysicalMaterial } from "three";
import { getRevealFloor } from "@/lib/reveal-arc";
import { createTurquoiseMaterial, createXiuhcoatlUniforms } from "./xiuhcoatl-materials";
import { getMictlanSky } from "./mictlan-sky";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * PiedraXiuhcoatlRing (04/09, VOIE B du Sud, rappel de Sylvain : « ne pas
 * oublier de colorer l'anneau exterieur du serpent »). Sur la Piedra del
 * Sol, l'anneau exterieur est fait des deux xiuhcoatl qui portent le
 * soleil. Au Sud, cet anneau grave prend la MATIERE du serpent qui vole
 * au-dessus (turquoise polie en mosaique, feu de braise dans les joints,
 * xiuhcoatl-materials) et s'EMBRASE avec la montee du midi : rien en haut
 * de page (nuit), l'anneau s'allume avec l'arc.
 *
 * Construction : le meme plan 6 x 6 que PiedraGround, pose juste
 * au-dessus (y = 0.03, au-dessus du relief displace), avec pour alphaMap
 * la carte de hauteur de la gravure (strokes blancs sur noir) : seuls les
 * TRAITS graves prennent la matiere, et un masque radial ne garde que la
 * bande exterieure (r entre 0.82 et 0.99 du rayon), la ou sont les
 * serpents dans le dessin V2 de Sylvain. Sud seulement, fondu.
 */

const PIEDRA_HEIGHTMAP = "/img/piedra-del-sol-height.webp";
const GROUND_RADIUS = 3;
/** Bande des serpents, en fraction du rayon du disque. */
const RING_INNER = 0.82;
const RING_OUTER = 0.99;
const RING_Y = 0.03;

export default function PiedraXiuhcoatlRing() {
  const heightMap = useTexture(PIEDRA_HEIGHTMAP);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const blendRef = useRef(direction === "turquoise" ? 1 : 0);
  const uniforms = useMemo(() => createXiuhcoatlUniforms(), []);

  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(GROUND_RADIUS * 2, GROUND_RADIUS * 2, 1, 1);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const material = useMemo(() => {
    heightMap.wrapS = RepeatWrapping;
    heightMap.wrapT = RepeatWrapping;
    const mat = createTurquoiseMaterial(new Color("#2aa6b8"), getMictlanSky(), uniforms) as MeshPhysicalMaterial;
    mat.name = "piedra_xiuhcoatl_ring";
    mat.alphaMap = heightMap;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.opacity = 0;
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    // Masque radial : seule la bande exterieure (les deux serpents).
    // On ENVELOPPE l'onBeforeCompile pose par createTurquoiseMaterial (mosaique
    // + fog attenue) : passer par addShaderModifier ici l'ecraserait, la
    // matiere turquoise n'est pas enregistree dans son registre (constate :
    // « vXLocal undeclared », shader invalide).
    const previous = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      previous(shader, renderer);
      shader.uniforms.uRingInner = { value: RING_INNER * GROUND_RADIUS };
      shader.uniforms.uRingOuter = { value: RING_OUTER * GROUND_RADIUS };
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uRingInner;\nuniform float uRingOuter;")
        .replace(
          "#include <alphamap_fragment>",
          `#include <alphamap_fragment>
{
  float xr = length(vXLocal.xz);
  float band = smoothstep(uRingInner - 0.05, uRingInner + 0.03, xr) * (1.0 - smoothstep(uRingOuter - 0.02, uRingOuter + 0.02, xr));
  diffuseColor.a *= band;
}`
        );
    };
    mat.customProgramCacheKey = () => "piedra-xiuhcoatl-ring";
    return mat;
  }, [heightMap, uniforms]);

  useFrame((state) => {
    const south = direction === "turquoise";
    blendRef.current += ((south ? 1 : 0) - blendRef.current) * 0.06;
    const blend = blendRef.current;
    const p = sceneRefs?.progressRef.current ?? 0;
    // Embrasement avec l'arc : l'anneau s'allume quand le midi monte.
    const ignite = getRevealFloor(p);
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uEmber.value = 0.3 + 1.7 * ignite;
    material.opacity = blend * (0.15 + 0.85 * ignite);
    material.visible = material.opacity > 0.01;
  });

  return <mesh geometry={geometry} material={material} position={[0, RING_Y, 0]} raycast={() => null} renderOrder={2} />;
}

useTexture.preload(PIEDRA_HEIGHTMAP);
