/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'objets three a 60 fps (meme precedent que sud-sky). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  LinearFilter,
  MeshStandardMaterial,
  Object3D,
  Plane,
  RGBAFormat,
  UnsignedByteType,
  Vector2,
  Vector3,
} from "three";
import { rotateY } from "@/lib/cardinal-orientation";
import {
  applyRadialImpulse,
  createGrassGrid,
  GRASS_SIM,
  GRASS_TINT_BY_DIRECTION,
  GRASS_WIND_BY_DIRECTION,
  stepGrassGrid,
  windAt,
} from "@/lib/grass-sim";
import { getTerrainHeight } from "@/lib/terrain-height";
import { orientationStore } from "./cardinal-orientation";
import { addShaderModifier } from "./shader-patch";
import { useSceneRefs } from "./scene-refs-context";
import { useCurrentDirection } from "./use-current-direction";
import { xiuhcoatlStore } from "./xiuhcoatl-store";

/**
 * La prairie (05/09, refonte : retour Sylvain « un vrai simulateur
 * d'herbe... une vraie prairie qui pourrait reagir au vent », puis « je
 * voudrais vraiment quelque chose qui prend toute la surface »).
 *
 * Avant : 900 touffes eparses de 4 cones rigides. Maintenant : des
 * dizaines de milliers de BRINS (un seul InstancedMesh, un seul draw
 * call) qui couvrent toute la prairie, du bord de la Piedra au pied des
 * montagnes, et qui PLIENT : chaque brin a trois segments, un vertex
 * shader le courbe selon la flexion lue dans une texture de simulation.
 *
 * La simulation (lib pure grass-sim.ts) tourne en CPU sur une grille de
 * 64 x 64 cellules : ressort + amortissement par cellule, poussee par un
 * champ de vent qui vit (brise + rafales en nappes qui voyagent) et par
 * des impulsions radiales : l'onde d'Ollin (le press souris, projete au
 * sol) et la frappe du xiuhcoatl sur l'anneau (Sud). La grille est
 * envoyee au GPU chaque frame (64 x 64 RGBA 8 bits, 16 Ko) et
 * echantillonnee en bilineaire : la flexion est continue d'un brin a
 * l'autre.
 *
 * Herbe SECHE (altiplano semi-aride, pas une pelouse), doree a paille,
 * plus claire en pointe, teintee par page (lib GRASS_TINT_BY_DIRECTION).
 * Le mesh vit dans le groupe d'orientation cardinale : la grille est
 * dans le repere du decor, le vent (monde) y est ramene par l'angle
 * courant.
 *
 * Reduced-motion : pas de simulation, pose de brise statique.
 */

const MIN_RADIUS = 3.3; // au-dela de la Piedra (3) et de son anneau
const MAX_RADIUS = 16; // la prairie, c'est le plat ; les pentes sont les montagnes
const MAX_TERRAIN_Y = 0.35;
/** Repli si le profil de rendu n'est pas encore la (cf lib/scene-controls). */
const BLADES_FALLBACK = 26000;
const GRID_SIZE = 64;
const GRID_EXTENT = 17;
const SEGMENTS = 3;
/** Ou le xiuhcoatl frappe l'anneau (cf xiuhcoatl-companion STRIKE_HIT), monde. */
const STRIKE_POINT = { x: 2.6, z: 0.6 };

const BLADE_COLORS = ["#a58c4e", "#8a7d4a", "#6f6a3c", "#b59d5a", "#7d7a44", "#9c8a52"];

function hash(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233 + 12.0) * 43758.5453;
  return v - Math.floor(v);
}

/** Un brin : une bande de SEGMENTS quads, largeur 1 au pied qui s'effile,
 * hauteur 1 (echelle par instance). position.y = 0..1 sert de parametre de
 * courbure dans le shader. */
function makeBladeGeometry(): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  for (let r = 0; r <= SEGMENTS; r++) {
    const y = r / SEGMENTS;
    const half = 0.5 * Math.pow(1 - y, 0.8);
    positions.push(-half, y, 0, half, y, 0);
    normals.push(0, 0, 1, 0, 0, 1);
    uvs.push(0, y, 1, y);
  }
  for (let r = 0; r < SEGMENTS; r++) {
    const a = r * 2, b = a + 1, c = a + 2, d = a + 3;
    index.push(a, b, c, b, d, c);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

type Blade = { x: number; y: number; z: number; rot: number; width: number; height: number; color: number };

function makeBlades(count: number): Blade[] {
  const out: Blade[] = [];
  for (let i = 0; i < count; i++) {
    // Plus dense pres de la scene, mais toute la surface couverte.
    const r = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.pow(hash(i, 1), 0.85);
    const a = hash(i, 2) * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = getTerrainHeight(x, z);
    if (y > MAX_TERRAIN_Y) continue;
    out.push({
      x,
      y,
      z,
      rot: hash(i, 3) * Math.PI * 2,
      width: 0.02 + 0.014 * hash(i, 4),
      height: (0.2 + 0.16 * hash(i, 5)) * (0.85 + 0.65 * hash(i, 6)),
      color: Math.floor(hash(i, 7) * BLADE_COLORS.length) % BLADE_COLORS.length,
    });
  }
  return out;
}

const GROUND_PLANE = new Plane(new Vector3(0, 1, 0), 0);

export default function Grass() {
  const meshRef = useRef<InstancedMesh>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const bladeCount = sceneRefs?.perfProfile.bladeCount ?? BLADES_FALLBACK;
  const blades = useMemo(() => makeBlades(bladeCount), [bladeCount]);
  const geometry = useMemo(() => makeBladeGeometry(), []);
  const grid = useMemo(() => createGrassGrid(GRID_SIZE, GRID_EXTENT), []);
  const bendData = useMemo(() => new Uint8Array(GRID_SIZE * GRID_SIZE * 4).fill(128), []);
  const bendMap = useMemo(() => {
    const t = new DataTexture(bendData, GRID_SIZE, GRID_SIZE, RGBAFormat, UnsignedByteType);
    t.magFilter = LinearFilter;
    t.minFilter = LinearFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  }, [bendData]);
  // Uniformes partages entre les recompilations (objets stables).
  const uniforms = useMemo(
    () => ({
      uBendMap: { value: bendMap },
      uGridExtent: { value: GRID_EXTENT },
      uTime: { value: 0 },
      uTint: { value: new Color(1, 1, 1) },
      uTintMix: { value: 0 },
      uGreenBase: { value: 0 },
    }),
    [bendMap]
  );
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({ color: "#ffffff", side: DoubleSide, roughness: 0.92, metalness: 0 });
    addShaderModifier(m, (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform sampler2D uBendMap;
          uniform float uGridExtent;
          uniform float uTime;
          varying float vGrassH;`
        )
        .replace(
          "#include <begin_vertex>",
          `vec3 transformed = vec3(position);
          vGrassH = position.y;
          #ifdef USE_INSTANCING
          vec3 gBase = instanceMatrix[3].xyz;
          vec2 gUv = gBase.xz / (2.0 * uGridExtent) + 0.5;
          vec2 gBend = texture2D(uBendMap, gUv).xy * 2.0 - 1.0;
          float gHash = fract(sin(dot(gBase.xz, vec2(12.9898, 78.233))) * 43758.5453);
          float gFlut = sin(uTime * (2.4 + gHash * 2.2) + gHash * 6.2831) * 0.035;
          vec2 gDisp = gBend + vec2(gFlut, -0.6 * gFlut);
          float gHH = vGrassH * vGrassH;
          vec3 gAx = instanceMatrix[0].xyz;
          vec3 gAz = instanceMatrix[2].xyz;
          float gHy = length(instanceMatrix[1].xyz);
          vec3 gDw = vec3(gDisp.x, 0.0, gDisp.y) * gHH * gHy * 0.9;
          transformed.x += dot(gDw, gAx) / max(dot(gAx, gAx), 1e-8);
          transformed.z += dot(gDw, gAz) / max(dot(gAz, gAz), 1e-8);
          transformed.y *= 1.0 - 0.3 * gHH * min(1.0, length(gDisp));
          #endif`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform vec3 uTint;
          uniform float uTintMix;
          uniform float uGreenBase;
          varying float vGrassH;`
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          diffuseColor.rgb *= mix(0.45, 1.15, vGrassH);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uTint, uTintMix);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.34, 0.48, 0.2), uGreenBase * (1.0 - vGrassH) * 0.6);`
        );
    });
    return m;
  }, [uniforms]);

  // Pose des brins (une fois) : matrices + couleurs.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const color = new Color();
    blades.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(0, b.rot, 0);
      dummy.scale.set(b.width, b.height, b.width);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(BLADE_COLORS[b.color]));
    });
    mesh.count = blades.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blades]);

  // L'onde d'Ollin : le press est projete au sol, la prairie se couche en
  // cercle depuis le point d'impact.
  const pressRef = useRef<Vector2 | null>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      pressRef.current = new Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);
  const lastStrikeRef = useRef(-1);
  const hitPoint = useMemo(() => new Vector3(), []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const north = direction === "obsidienne";
    if (north) return; // la prairie est cachee au Nord (bassin)
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const t = reduced ? 0 : state.clock.elapsedTime;
    const spec = GRASS_WIND_BY_DIRECTION[direction];
    const angle = orientationStore.angle;
    // Le vent est donne dans le monde, la grille vit dans le decor tourne.
    const windLocal = (lx: number, lz: number) => {
      const w = rotateY({ x: lx, z: lz }, angle);
      const ww = windAt(w.x, w.z, t, spec);
      return rotateY(ww, -angle);
    };
    if (!reduced) {
      if (pressRef.current) {
        state.raycaster.setFromCamera(pressRef.current, state.camera);
        pressRef.current = null;
        if (state.raycaster.ray.intersectPlane(GROUND_PLANE, hitPoint)) {
          const l = rotateY({ x: hitPoint.x, z: hitPoint.z }, -angle);
          applyRadialImpulse(grid, l.x, l.z, 4, 5);
        }
      }
      if (xiuhcoatlStore.strikeHit > lastStrikeRef.current) {
        lastStrikeRef.current = xiuhcoatlStore.strikeHit;
        const l = rotateY(STRIKE_POINT, -angle);
        applyRadialImpulse(grid, l.x, l.z, 8, 9);
      }
      stepGrassGrid(grid, Math.min(delta, 0.1), windLocal, GRASS_SIM);
    } else {
      // Pose de brise statique : la flexion de repos du vent a t = 0.
      const n = GRID_SIZE * GRID_SIZE;
      const cell = (2 * GRID_EXTENT) / GRID_SIZE;
      for (let i = 0; i < n; i++) {
        const w = windLocal(-GRID_EXTENT + ((i % GRID_SIZE) + 0.5) * cell, -GRID_EXTENT + (Math.floor(i / GRID_SIZE) + 0.5) * cell);
        grid.bend[2 * i] = w.x * GRASS_SIM.windGain;
        grid.bend[2 * i + 1] = w.z * GRASS_SIM.windGain;
      }
    }
    const n = GRID_SIZE * GRID_SIZE;
    for (let i = 0; i < n; i++) {
      bendData[4 * i] = Math.round((grid.bend[2 * i] * 0.5 + 0.5) * 255);
      bendData[4 * i + 1] = Math.round((grid.bend[2 * i + 1] * 0.5 + 0.5) * 255);
    }
    bendMap.needsUpdate = true;
    uniforms.uTime.value = t;
    const tint = GRASS_TINT_BY_DIRECTION[direction];
    uniforms.uTint.value.lerp(new Color(tint.rgb[0], tint.rgb[1], tint.rgb[2]), 0.05);
    uniforms.uTintMix.value += (tint.mix - uniforms.uTintMix.value) * 0.05;
    uniforms.uGreenBase.value += (tint.greenBase - uniforms.uGreenBase.value) * 0.05;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, blades.length]}
      frustumCulled={false}
      castShadow={false}
      receiveShadow
    />
  );
}
