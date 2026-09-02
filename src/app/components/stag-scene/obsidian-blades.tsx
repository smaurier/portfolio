"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  Color,
  Euler,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  Quaternion,
  Vector3,
} from "three";
import { bladeHit, bladeState } from "@/lib/obsidian-wind";
import { getMictlanSky } from "./mictlan-sky";
import { tezcatlStore } from "./tezcatl-store";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * ObsidianBlades (02/09, Nord, contre-chant de la fiche Mictlampa : le
 * vent d'Itzehecayan). Des LAMES d'obsidienne en vrais modeles (retour
 * Sylvain "les lames devraient etre des modeles, un air tres dur et
 * brut"), portees a l'horizontale par le vent d'Est en Ouest, en
 * tournant sur elles-memes. Mythologie : un vent qui coupe, pas une
 * pluie (cf lib/obsidian-wind.ts).
 *
 * Le plus efficace possible : UN eclat facette (12 triangles, normales
 * plates), UN InstancedMesh (un seul draw call), matrices composees en
 * CPU (80 instances, negligeable) ce qui permet aussi de tester l'entaille
 * du cerf au passage (bladeHit) et de la publier dans tezcatlStore pour
 * que le cerf reagisse (StagModel).
 *
 * Matiere : obsidienne noire, metal, clearcoat, envMap "ciel du Mictlan"
 * (le meme que le tezcatl) : les aretes accrochent le violet.
 * Nord seulement (fondu par l'echelle), tempo du Nord x0.6.
 */

const COUNT = 80;
const SPAN = 12;
const NORTH_TIME_SCALE = 0.6;
const BLADE_COLOR = new Color("#0a0712");

/** Un eclat d'obsidienne : sliver allonge a facettes, pointe en +z, talon
 * en -z, arete vive. Non indexe -> normales plates -> facettes dures. */
function makeShardGeometry(): BufferGeometry {
  const tip = [0, 0, 0.5];
  const tail = [0, 0, -0.5];
  const left = [-0.07, 0, -0.12];
  const right = [0.07, 0, -0.12];
  const top = [0, 0.03, -0.18];
  const bottom = [0, -0.03, -0.18];
  const tris = [
    // pointe -> flancs
    [tip, left, top], [tip, top, right], [tip, right, bottom], [tip, bottom, left],
    // talon -> flancs
    [tail, top, left], [tail, right, top], [tail, bottom, right], [tail, left, bottom],
    // fermeture flancs (arete)
    [left, bottom, top], [right, top, bottom],
  ];
  const positions: number[] = [];
  for (const t of tris) for (const v of t) positions.push(...v);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export default function ObsidianBlades() {
  const meshRef = useRef<InstancedMesh>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const fadeRef = useRef(direction === "obsidienne" ? 1 : 0);
  const timeRef = useRef(0);
  const geometry = useMemo(() => makeShardGeometry(), []);
  const material = useMemo(() => {
    const m = new MeshPhysicalMaterial({
      color: BLADE_COLOR,
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      flatShading: true,
      envMapIntensity: 1.6,
    });
    const sky = getMictlanSky();
    if (sky) m.envMap = sky;
    return m;
  }, []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  const seeds = useMemo(() => Array.from({ length: COUNT }, (_, i) => (i + 0.5) / COUNT), []);
  const scales = useMemo(() => seeds.map((s) => 0.35 + ((s * 7.3) % 1) * 0.35), [seeds]);
  const prevRef = useRef(seeds.map(() => ({ x: 99, y: 0, z: 0 })));
  const scratch = useMemo(() => ({ m: new Matrix4(), q: new Quaternion(), e: new Euler(), p: new Vector3(), s: new Vector3() }), []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const target = direction === "obsidienne" ? 1 : 0;
    fadeRef.current = reduced ? target : fadeRef.current + (target - fadeRef.current) * 0.05;
    const fade = fadeRef.current;
    mesh.visible = fade > 0.01;
    if (!mesh.visible) return;
    // Reduced-motion : les lames restent posees dans l'air (temps fige).
    if (!reduced) timeRef.current += Math.min(delta, 1 / 30) * NORTH_TIME_SCALE;
    const t = timeRef.current;
    const { m, q, e, p, s } = scratch;
    for (let i = 0; i < COUNT; i++) {
      const b = bladeState(t, seeds[i], SPAN);
      p.set(b.x, b.y, b.z);
      // Pointe vers -x (sens du vent), roulis autour de l'axe de vol.
      e.set(b.pitch, -Math.PI / 2, b.roll, "YXZ");
      q.setFromEuler(e);
      s.setScalar(scales[i] * fade);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      // Entaille : la lame entre dans le volume du cerf.
      const prev = prevRef.current[i];
      if (fade > 0.5) {
        const hit = bladeHit(prev, b);
        if (hit) tezcatlStore.stagHit = { at: state.clock.elapsedTime, strength: hit.strength, side: hit.side };
      }
      prev.x = b.x;
      prev.y = b.y;
      prev.z = b.z;
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, COUNT]}
      frustumCulled={false}
      raycast={() => null}
      visible={false}
    />
  );
}
