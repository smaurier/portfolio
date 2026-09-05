/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'objets three a 60 fps (meme precedent que sud-sky). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { aztecYear } from "aztec-year";
import { Box3, Color, Group, Mesh, Vector3, type MeshPhysicalMaterial } from "three";
import { createTurquoiseMaterial, createXiuhcoatlUniforms } from "./xiuhcoatl-materials";
import { getMictlanSky } from "./mictlan-sky";
import { xiuhcoatlStore } from "./xiuhcoatl-store";
import { useCurrentDirection } from "./use-current-direction";
import { terrainHeightWorld } from "./cardinal-orientation";
import { getRevealFloor } from "@/lib/reveal-arc";
import { useSceneRefs } from "./scene-refs-context";

/**
 * YearStones (05/09, v3 apres deux retours de Sylvain : « vire la stele
 * noire, vire la pierre noire a cote. Ce qui nous interesse c'est la
 * partie turquoise et braise. Tu tournes ca precisement a l'horizontal
 * et ca doit faire une sorte de rocher dans le sol »).
 *
 * L'annee mexica en cours (lib aztec-year, la meme que le pied de page
 * et la queue du serpent), ecrite comme sur les monuments, un SIGNE et
 * un NOMBRE, mais ici ce sont des ROCHERS DE TURQUOISE a demi enfouis
 * dans la prairie, devant le cerf, hors du cercle :
 *  - le signe : l'embleme du porteur d'annee (Tochtli, Acatl, Tecpatl,
 *    Calli), la geometrie meme de la queue du xiuhcoatl, couchee a plat
 *    (le haut du glyphe vers le loin, comme un texte au sol lu depuis la
 *    camera), en mosaique de turquoise a joints de braise ;
 *  - le nombre : autant de points que le chiffre (1 a 13), les memes
 *    points de turquoise que sur la queue, a demi enfouis en arc de part
 *    et d'autre du signe. Compter en points est la notation attestee.
 * A la frappe du serpent, tout s'embrase (licence, portee par le mot
 * xihuitl : l'annee, la turquoise, le feu). Sud seulement.
 */

const MODEL_PATH = "/models/xiuhcoatl.glb";
/** Rayon de l'arc (u) : hors de la Piedra et de son anneau, dans l'herbe. */
const ARC_RADIUS = 4.0;
/** Largeur du glyphe couche (u) : 5-6 fois l'embleme de la queue. */
const GLYPH_WIDTH = 1.3;
/** Pas angulaire entre deux points (rad) a ce rayon. */
const DOT_STEP = 0.075;
/** Gris pierre AVANT que l'anneau ne devienne braise (retour Sylvain
 * 05/09 : « totalement gris pierre avant que l'anneau devienne braise ;
 * lorsqu'il devient braise, il prend aussi les couleurs turquoise et
 * braise ») ; la bascule suit l'allumage de l'anneau (ignite 0.55 -> 0.8),
 * ou la frappe si elle vient avant. */
const STONE_GREY = new Color("#5e5a55");
const TURQUOISE = new Color("#2aa6b8");
/** Part du rocher qui depasse du sol (fraction de son epaisseur). 0.55 ->
 * 0.95 (retour Sylvain « on voit sa partie souterraine ») : le sol est
 * rendu translucide par le revelateur curseur (plancher d'opacite en tete
 * de page), la partie enfouie se voyait a travers ; le rocher est POSE. */
const EMERGED = 0.95;

/** Un noeud du GLB (mesh ou groupe de primitives) en meshes statiques,
 * centre a l'origine, ramene a `width` u de large ; rend aussi l'epaisseur
 * (axe z du GLB, l'embleme est plat en XY). */
function bakeFlat(src: Group | Mesh, material: MeshPhysicalMaterial, width: number): { group: Group; thickness: number } {
  const g = new Group();
  src.traverse((o) => {
    if ((o as Mesh).isMesh) g.add(new Mesh((o as Mesh).geometry, material));
  });
  const box = new Box3().setFromObject(g);
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);
  const s = width / Math.max(size.x, size.y, 1e-3);
  g.children.forEach((c) => c.position.sub(center));
  g.scale.setScalar(s);
  return { group: g, thickness: size.z * s };
}

export default function YearStones() {
  const groupRef = useRef<Group>(null);
  const glyphRef = useRef<Group>(null);
  const dotsRef = useRef<Group>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const blendRef = useRef(direction === "turquoise" ? 1 : 0);
  const { scene } = useGLTF(MODEL_PATH);
  const year = useMemo(() => aztecYear(), []);
  const uniforms = useMemo(() => createXiuhcoatlUniforms(), []);
  const material = useMemo(() => {
    const m = createTurquoiseMaterial(TURQUOISE.clone(), getMictlanSky(), uniforms) as MeshPhysicalMaterial;
    m.transparent = false;
    m.opacity = 1;
    m.color.copy(STONE_GREY);
    m.sheen = 0;
    m.envMapIntensity = 0;
    return m;
  }, [uniforms]);

  // Le signe et les points : geometries du GLB, couchees a plat, a demi
  // enfouies (la pose est faite une fois, quand le GLB est la).
  useEffect(() => {
    const glyphHolder = glyphRef.current;
    const dotsHolder = dotsRef.current;
    if (!glyphHolder || !dotsHolder) return;
    const added: { holder: Group; node: Group }[] = [];
    const bearer = scene.getObjectByName(`YearBearer_${year.bearer}`) as Group | Mesh | undefined;
    if (bearer) {
      const { group, thickness } = bakeFlat(bearer, material, GLYPH_WIDTH);
      // XY du GLB -> XZ du sol : le haut du glyphe (+y) part vers -z, le
      // loin ; l'epaisseur (z) devient la hauteur.
      group.rotation.x = -Math.PI / 2;
      group.position.set(0, terrainHeightWorld(0, ARC_RADIUS) + thickness * (EMERGED - 0.5), ARC_RADIUS);
      glyphHolder.add(group);
      added.push({ holder: glyphHolder, node: group });
    }
    const dotSrc = scene.getObjectByName("YearDot00") as Group | Mesh | undefined;
    if (dotSrc) {
      const dotWidth = GLYPH_WIDTH * 0.2;
      for (let i = 0; i < year.number; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const rank = Math.floor(i / 2) + 1;
        const a = side * (rank * DOT_STEP * 1.2 + GLYPH_WIDTH / ARC_RADIUS / 2 + 0.06);
        const x = Math.sin(a) * ARC_RADIUS;
        const z = Math.cos(a) * ARC_RADIUS;
        const { group, thickness } = bakeFlat(dotSrc, material, dotWidth);
        group.rotation.x = -Math.PI / 2;
        group.position.set(x, terrainHeightWorld(x, z) + thickness * (EMERGED - 0.5), z);
        dotsHolder.add(group);
        added.push({ holder: dotsHolder, node: group });
      }
    }
    return () => {
      for (const { holder, node } of added) holder.remove(node);
    };
  }, [scene, year.bearer, year.number, material]);

  useFrame((state) => {
    const south = direction === "turquoise";
    blendRef.current += ((south ? 1 : 0) - blendRef.current) * 0.06;
    const blend = blendRef.current;
    const g = groupRef.current;
    if (!g) return;
    g.visible = blend > 0.01;
    if (!g.visible) return;
    g.scale.setScalar(blend);
    const fire = xiuhcoatlStore.strike.fire;
    const gate = xiuhcoatlStore.heatGate;
    // La nuit, comme le serpent (retour Sylvain « mieux integre dans la
    // nuit, trop visible ») : braises a un tiers, vernis presque eteint,
    // brouillard au niveau du decor ; tout monte avec le jour.
    const day = getRevealFloor(sceneRefs?.progressRef.current ?? 0);
    // Pierre grise tant que l'anneau n'est pas braise ; turquoise et braise
    // ensuite (bascule lissee sur l'allumage de l'anneau, ou la frappe).
    const igniteU = Math.min(1, Math.max(0, (day - 0.55) / 0.25));
    const lit = Math.max(igniteU * igniteU * (3 - 2 * igniteU), gate, Math.min(1, fire * 3));
    material.color.copy(STONE_GREY).lerp(TURQUOISE, lit);
    material.sheen = 0.35 * lit;
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uEmber.value = lit * (0.33 + 0.67 * day) * (0.25 + 0.6 * gate) + 2.6 * fire;
    uniforms.uCrackle.value = 1 + 2 * fire;
    uniforms.uFogScale.value = 1 - 0.7 * day;
    material.envMapIntensity = lit * (0.15 + 0.95 * day);
  });

  return (
    <group ref={groupRef} visible={false}>
      <group ref={glyphRef} />
      <group ref={dotsRef} />
    </group>
  );
}
