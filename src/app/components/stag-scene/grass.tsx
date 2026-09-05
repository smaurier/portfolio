"use client";

import { useEffect, useMemo, useRef } from "react";
import { Color, ConeGeometry, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D } from "three";
import { useCurrentDirection } from "./use-current-direction";
import { getTerrainHeight } from "@/lib/terrain-height";

/**
 * Touffes d'herbe sèche, fixes au sol : retour de Sylvain le 18/08 ("un peu
 * triste", habiller la scène). Herbe sèche/en touffes (pas un gazon) :
 * cohérent avec le reste de la palette désertique déjà posée (agave, nopal,
 * ocotillo) : l'altiplano centre-mexicain est un matorral/steppe semi-aride,
 * pas une prairie.
 *
 * 05/09 (retour Sylvain : « il ne devrait pas y avoir d'herbe sur
 * l'anneau, par contre tu pourrais mettre de l'herbe sur toute la prairie,
 * et pas de la couleur, de vraies mesh ») : les touffes couvrent maintenant
 * TOUTE la prairie (rayon 3.3 -> 34, plus clairsemees au loin), jamais sur
 * la Piedra (r < 3.3, l'anneau des serpents compris), et restent de vrais
 * brins (cones a 3 faces) : un seul InstancedMesh (~3600 brins) plutot que
 * 200 meshes, pour que la prairie entiere ne coute qu'un draw call.
 *
 * Placement deterministe (hash), hauteur du terrain reelle par touffe. Au
 * Nord, les touffes dans le bassin (r < margelle) disparaissent (03/09) :
 * on les ecrase a l'echelle 0.
 */

const BLADE_COLORS = ["#8a7d4a", "#6f6a3c", "#5c6b3f"];
const BLADES_PER_TUFT = 4;
const TUFT_COUNT = 900;
const MIN_RADIUS = 3.3; // au-dela de la Piedra (3) et de son anneau
// 34 -> 16 (05/09, retour Sylvain « des brins d'herbe dans le ciel ») : au
// loin les touffes se posaient sur les flancs des montagnes et se lisaient
// contre le ciel. La prairie, c'est le plat autour de la scene ; on refuse
// aussi toute touffe la ou le terrain monte (pente = montagne).
const MAX_RADIUS = 16;
const MAX_TERRAIN_Y = 0.35;
/** Rayon de la margelle du bassin du Nord (cf tezcatl-water WATER_RADIUS + margelle). */
const POOL_RADIUS = 6.9;

function hash(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233 + 12.0) * 43758.5453;
  return v - Math.floor(v);
}

type Tuft = { x: number; z: number; y: number; rotationY: number; scale: number; blades: { angle: number; lean: number; height: number; color: number }[] };

function makeTufts(): Tuft[] {
  const out: Tuft[] = [];
  for (let i = 0; i < TUFT_COUNT; i++) {
    // Densite qui decroit avec la distance : racine du rayon uniforme en
    // surface, puis biais vers le proche (puissance 0.7).
    const r = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.pow(hash(i, 1), 0.8);
    const a = hash(i, 2) * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = getTerrainHeight(x, z);
    if (y > MAX_TERRAIN_Y) continue; // pas d'herbe sur les pentes
    const blades = [];
    for (let b = 0; b < BLADES_PER_TUFT; b++) {
      const angle = (b / BLADES_PER_TUFT) * Math.PI * 2 + i * 1.7;
      blades.push({
        angle,
        lean: 0.15 + 0.1 * Math.sin(i * 1.7 + b),
        height: 0.22 + 0.12 * ((Math.cos(i * 5.1 + b) + 1) / 2),
        color: b % BLADE_COLORS.length,
      });
    }
    out.push({ x, z, y, rotationY: hash(i, 3) * Math.PI * 2, scale: 0.8 + 0.8 * hash(i, 4), blades });
  }
  return out;
}

export default function Grass() {
  const meshRef = useRef<InstancedMesh>(null);
  const direction = useCurrentDirection();
  const tufts = useMemo(() => makeTufts(), []);
  const geometry = useMemo(() => new ConeGeometry(0.012, 1, 3), []); // hauteur 1, mise a l'echelle par instance
  const material = useMemo(() => new MeshStandardMaterial({ color: "#ffffff" }), []);
  const count = tufts.length * BLADES_PER_TUFT;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const north = direction === "obsidienne";
    const dummy = new Object3D();
    const tuftM = new Matrix4();
    const color = new Color();
    let idx = 0;
    for (const t of tufts) {
      const hidden = north && Math.hypot(t.x, t.z) < POOL_RADIUS;
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, t.rotationY, 0);
      dummy.scale.setScalar(hidden ? 0.0001 : t.scale);
      dummy.updateMatrix();
      tuftM.copy(dummy.matrix);
      for (const b of t.blades) {
        const offset = 0.03;
        dummy.position.set(Math.cos(b.angle) * offset, b.height / 2, Math.sin(b.angle) * offset);
        dummy.rotation.set(Math.sin(b.angle) * b.lean, 0, Math.cos(b.angle) * b.lean);
        dummy.scale.set(1, b.height, 1);
        dummy.updateMatrix();
        dummy.matrix.premultiply(tuftM);
        mesh.setMatrixAt(idx, dummy.matrix);
        mesh.setColorAt(idx, color.set(BLADE_COLORS[b.color]));
        idx++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [tufts, direction]);

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} castShadow={false} receiveShadow />;
}
