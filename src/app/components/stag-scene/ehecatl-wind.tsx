"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from "three";
import { streakAzimuth, streakIntensity, streakSpec } from "@/lib/ehecatl-wind";
import { useCardinalTransition } from "./cardinal-transition-context";
import { useSceneRefs } from "./scene-refs-context";

/**
 * EhecatlWind (03/09, etage 4 Nepantla) : le vent du passage rendu
 * visible dans le monde 3D. Des filaments translucides balaient
 * l'orbite autour du cerf dans le sens du voyage, plus vite que la
 * camera (lib/ehecatl-wind, TDD : Ehecatl emporte, la camera suit).
 * Ils n'existent qu'au coeur du mouvement (intensite = swingSpeed) :
 * le monde au repos ne montre jamais Ehecatl.
 *
 * Le plus efficace possible (meme ecole que les lames d'obsidienne) :
 * UN InstancedMesh, UNE geometrie croisee (deux rubans perpendiculaires
 * effiles par vertex colors : noir aux bouts + blending additif = les
 * extremites s'eteignent, aucun alpha par vertex necessaire), matrices
 * composees en CPU. Additif + depthWrite false : les filaments
 * s'additionnent a la scene sans jamais la masquer.
 *
 * Reduced motion : intensite laissee a 0, le mesh reste invisible
 * (meme convention que NepantlaBlur).
 */

// 48 -> 80 (04/09, "beaucoup plus fin et filamentaire") : beaucoup de
// fils tres fins plutot que quelques rubans.
const COUNT = 80;
// Opacite au pic de vitesse : souffle lisible, jamais un mur blanc.
// 0.3 -> 0.16 (04/09, retour Sylvain "trainees trop grosses, plus
// transparentes") : un souffle qu'on devine, pas des rubans.
const OPACITY_MAX = 0.13;
// Etirement des filaments avec la vitesse (longueur x1 au repos
// theorique, x2.4 au pic) : le vent se tend quand il souffle.
// 1.4 -> 0.8 -> 1.0 (04/09) : un fil peut etre long, c'est sa finesse qui
// fait le filament.
const STRETCH_MAX = 1.0;
// Souffle pale, legerement jade (l'haleine d'Ehecatl-Quetzalcoatl).
const WIND_COLOR = new Color("#cfe0d8");

/** Deux rubans perpendiculaires le long de X, effiles par vertex
 *  colors (noir -> blanc -> noir) : lisibles sous tous les angles de
 *  l'orbite, jamais invisibles par la tranche. */
function makeStreakGeometry(): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  // half = demi-epaisseur ; axis "y" = ruban vertical, "z" = horizontal.
  // 0.03 -> 0.016 -> 0.005 (04/09, "beaucoup plus fin") : un fil, quasi
  // sub-pixel de loin, que l'additif garde lisible sans le grossir.
  const half = 0.005;
  for (const axis of ["y", "z"] as const) {
    // 3 colonnes (bout noir, coeur blanc, bout noir) -> 2 quads -> 4 tris.
    const columns = [-0.5, 0, 0.5];
    const shades = [0, 1, 0];
    for (let c = 0; c < 2; c++) {
      const x0 = columns[c];
      const x1 = columns[c + 1];
      const s0 = shades[c];
      const s1 = shades[c + 1];
      const lo = (x: number) => (axis === "y" ? [x, -half, 0] : [x, 0, -half]);
      const hi = (x: number) => (axis === "y" ? [x, half, 0] : [x, 0, half]);
      const quad = [lo(x0), hi(x0), hi(x1), lo(x0), hi(x1), lo(x1)];
      const quadShades = [s0, s0, s1, s0, s1, s1];
      for (let v = 0; v < 6; v++) {
        positions.push(...quad[v]);
        colors.push(quadShades[v], quadShades[v], quadShades[v]);
      }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geo;
}

export default function EhecatlWind() {
  const meshRef = useRef<InstancedMesh>(null);
  const transition = useCardinalTransition();
  const sceneRefs = useSceneRefs();
  const geometry = useMemo(() => makeStreakGeometry(), []);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: WIND_COLOR,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        fog: false,
      }),
    [],
  );
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  const specs = useMemo(
    () => Array.from({ length: COUNT }, (_, i) => streakSpec((i + 0.5) / COUNT)),
    [],
  );
  const scratch = useMemo(
    () => ({ m: new Matrix4(), q: new Quaternion(), e: new Euler(), p: new Vector3(), s: new Vector3() }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const direction = transition?.transitionDirection;
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const t = transition?.transitionProgressRef.current ?? 0;
    const intensity = direction && !reduced ? streakIntensity(t, direction) : 0;
    mesh.visible = intensity > 0.01;
    // Via la ref (pas la variable memoisee) : mutation 60fps r3f,
    // le lint react-hooks/immutability n'a rien a redire sur une ref.
    (mesh.material as MeshBasicMaterial).opacity = intensity * OPACITY_MAX;
    if (!mesh.visible || !direction) return;
    const { m, q, e, p, s } = scratch;
    for (let i = 0; i < COUNT; i++) {
      const spec = specs[i];
      const azimuth = streakAzimuth(t, spec, direction);
      p.set(spec.radius * Math.cos(azimuth), spec.height, spec.radius * Math.sin(azimuth));
      // Axe long du ruban = tangente du cercle (le filament suit le
      // courant, jamais en travers du vent).
      e.set(0, -(azimuth + Math.PI / 2), 0);
      q.setFromEuler(e);
      s.set(spec.length * (1 + intensity * STRETCH_MAX), 1, 1);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
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
