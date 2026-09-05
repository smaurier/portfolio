/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'objets three a 60 fps (meme precedent que sud-sky). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { aztecYear } from "aztec-year";
import { Box3, BoxGeometry, Color, Group, IcosahedronGeometry, Mesh, MeshStandardMaterial, Vector3, type MeshPhysicalMaterial } from "three";
import { createTurquoiseMaterial, createXiuhcoatlUniforms } from "./xiuhcoatl-materials";
import { getMictlanSky } from "./mictlan-sky";
import { xiuhcoatlStore } from "./xiuhcoatl-store";
import { useCurrentDirection } from "./use-current-direction";

/**
 * YearStones (05/09, Sylvain : « oui on met la date sur l'anneau, mais ca
 * pourrait etre des pierres disposees juste en face du cerf »). L'annee
 * mexica en cours (lib aztec-year, la meme que le pied de page et la
 * queue du serpent), ecrite comme sur les monuments : un NOMBRE et un
 * SIGNE.
 *  - Le signe : une petite stele de pierre face a la camera de tete de
 *    page, qui porte le glyphe du porteur d'annee (Tochtli, Acatl,
 *    Tecpatl, Calli), le meme embleme que sur la queue du xiuhcoatl,
 *    en mosaique de turquoise. Xihuitl = l'annee, la turquoise, le feu.
 *  - Le nombre : autant de galets que le chiffre de l'annee (1 a 13),
 *    poses en arc de part et d'autre de la stele. Compter en points est
 *    la notation attestee des glyphes d'annee (les Mexica n'utilisaient
 *    pas les barres).
 * A la frappe du serpent, le glyphe et les galets s'embrasent (licence :
 * portee par le mot xihuitl, pas par un texte). Sud seulement.
 */

const MODEL_PATH = "/models/xiuhcoatl.glb";
/** Rayon de l'arc (u), sur la Piedra, entre le cerf et la bande gravee. */
const ARC_RADIUS = 2.25;
/** Pas angulaire entre deux galets (rad). */
const PEBBLE_STEP = 0.085;
const STONE_COLOR = "#17140f"; // basalte sombre : la lueur portee du serpent ne doit pas en faire une enseigne
const EMBER = new Color("#ff7a1e");

function hash(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233 + 5.0) * 43758.5453;
  return v - Math.floor(v);
}

/** Un galet : icosaedre dont les sommets sont pousses par un bruit. */
function pebbleGeometry(seed: number): IcosahedronGeometry {
  const g = new IcosahedronGeometry(1, 1);
  const pos = g.getAttribute("position");
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = 0.78 + 0.32 * hash(seed, Math.round(v.x * 7 + v.y * 13 + v.z * 17));
    v.multiplyScalar(n);
    pos.setXYZ(i, v.x, v.y * 0.7, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export default function YearStones() {
  const groupRef = useRef<Group>(null);
  const glyphRef = useRef<Group>(null);
  const direction = useCurrentDirection();
  const blendRef = useRef(direction === "turquoise" ? 1 : 0);
  const { scene } = useGLTF(MODEL_PATH);
  const year = useMemo(() => aztecYear(), []);
  const uniforms = useMemo(() => createXiuhcoatlUniforms(), []);
  const glyphMaterial = useMemo(() => {
    const m = createTurquoiseMaterial(new Color("#2aa6b8"), getMictlanSky(), uniforms) as MeshPhysicalMaterial;
    m.transparent = false;
    m.opacity = 1;
    return m;
  }, [uniforms]);
  const stoneMaterial = useMemo(() => new MeshStandardMaterial({ color: STONE_COLOR, roughness: 1, metalness: 0, emissive: EMBER, emissiveIntensity: 0 }), []);
  const pebbles = useMemo(
    () =>
      Array.from({ length: year.number }, (_, i) => {
        // De part et d'autre de la stele, en alternance, sur l'arc.
        const side = i % 2 === 0 ? -1 : 1;
        const rank = Math.floor(i / 2) + 1;
        const a = side * rank * PEBBLE_STEP * 1.15 + 0.3 * side; // la stele occupe ~0.3 rad
        return { geometry: pebbleGeometry(i + 1), x: Math.sin(a) * ARC_RADIUS, z: Math.cos(a) * ARC_RADIUS, rot: hash(i, 3) * Math.PI, scale: 0.065 + 0.03 * hash(i, 4) };
      }),
    [year.number]
  );
  const steleGeometry = useMemo(() => new BoxGeometry(0.46, 0.36, 0.1), []);

  // Le glyphe : l'embleme du porteur, extrait du GLB du serpent (bind
  // pose, mesh statique), centre, ramene a 0.34 u de large, monte sur la
  // face avant de la stele.
  useEffect(() => {
    const holder = glyphRef.current;
    if (!holder) return;
    const src = scene.getObjectByName(`YearBearer_${year.bearer}`);
    if (!src) return;
    const g = new Group();
    src.traverse((o) => {
      if ((o as Mesh).isMesh) g.add(new Mesh((o as Mesh).geometry, glyphMaterial));
    });
    const box = new Box3().setFromObject(g);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = 0.3 / Math.max(size.x, size.y, 1e-3);
    g.children.forEach((c) => c.position.sub(center));
    g.scale.setScalar(s);
    holder.add(g);
    return () => {
      holder.remove(g);
    };
  }, [scene, year.bearer, glyphMaterial]);

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
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uEmber.value = 0.25 + 0.6 * gate + 2.6 * fire;
    uniforms.uCrackle.value = 1 + 2 * fire;
    stoneMaterial.emissiveIntensity = 0.12 * gate + 2.2 * fire;
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* La stele, face a la camera de tete de page (+z), posee sur la Piedra. */}
      <group position={[0, 0, ARC_RADIUS]}>
        <mesh geometry={steleGeometry} material={stoneMaterial} position={[0, 0.18, 0]} castShadow receiveShadow />
        <group ref={glyphRef} position={[0, 0.2, 0.052]} />
      </group>
      {pebbles.map((p, i) => (
        <mesh key={i} geometry={p.geometry} material={stoneMaterial} position={[p.x, p.scale * 0.55, p.z]} rotation={[0, p.rot, 0]} scale={p.scale} castShadow receiveShadow />
      ))}
    </group>
  );
}
