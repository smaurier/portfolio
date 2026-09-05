/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'objets three a 60 fps (meme precedent que sud-sky). */
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, Color, Group, NormalBlending, Sprite, SpriteMaterial } from "three";
import { getRevealFloor } from "@/lib/reveal-arc";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * SudSkyBodies (05/09, Sylvain en direct). Deux corps dans le ciel du Sud :
 *  - la LUNE de Coatepec : un disque doux, bas derriere a gauche, dans la
 *    direction de la source de nuit du rig (direction-light, night). Elle
 *    s'efface quand le soleil monte au zenith (l'arc de revelation).
 *  - des petits NUAGES : quelques sprites doux, hauts sur le dome, qui
 *    derivent lentement ; pales la nuit, blancs et pleins au midi. Ils
 *    cassent l'impression de « soleil ecrasant » (retour Sylvain) sans
 *    couvrir le ciel.
 * Textures generees sur canvas (pas d'asset). Groupe centre camera, comme
 * le dome. Sud seulement, fondu.
 */

const RADIUS = 80;
/** Direction de la lune = direction de la source de nuit du rig Sud. */
const MOON_DIR = { x: -7, y: 3, z: -6 }; // elevation ~18 deg : dans le cadre (a 4.5 elle passait au-dessus du bandeau)
const CLOUD_COUNT = 7;

function radialTexture(size: number, inner: number, outer: number, noise: number, seed: number): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const rnd = (i: number, k: number) => {
    const v = Math.sin(seed * 91.7 + i * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  // Quelques bosses pour un nuage, aucune pour la lune (noise = 0).
  const lobes: [number, number, number][] = [];
  for (let i = 0; i < 6; i++) lobes.push([0.5 + (rnd(i, 1) - 0.5) * 0.5, 0.5 + (rnd(i, 2) - 0.5) * 0.3, 0.18 + rnd(i, 3) * 0.16]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      let a = 0;
      if (noise > 0) {
        for (const [lx, ly, lr] of lobes) {
          const d = Math.hypot(u - lx, (v - ly) * 1.6) / lr;
          a = Math.max(a, Math.max(0, 1 - d * d));
        }
        a = Math.pow(a, 0.8);
      } else {
        const d = Math.hypot(u - 0.5, v - 0.5) * 2;
        a = d < inner ? 1 : d > outer ? 0 : 1 - (d - inner) / (outer - inner);
        a = a * a * (3 - 2 * a);
      }
      const i = (y * size + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export default function SudSkyBodies() {
  const groupRef = useRef<Group>(null);
  const moonRef = useRef<Sprite>(null);
  const cloudsRef = useRef<Sprite[]>([]);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const blendRef = useRef(direction === "turquoise" ? 1 : 0);

  const moonMaterial = useMemo(
    () => new SpriteMaterial({ map: radialTexture(128, 0.55, 1.0, 0, 1), color: new Color("#dfe8ff"), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }),
    []
  );
  const clouds = useMemo(
    () =>
      Array.from({ length: CLOUD_COUNT }, (_, i) => {
        const az = -1.2 + (i / (CLOUD_COUNT - 1)) * 2.4 + Math.sin(i * 3.1) * 0.15; // eventail devant la camera
        const elev = 0.17 + Math.sin(i * 1.7) * 0.06 + 0.05 * (i % 2); // 6 a 16 deg : sous le bandeau, au-dessus de la crete
        return {
          material: new SpriteMaterial({ map: radialTexture(192, 0, 1, 1, 10 + i), color: new Color("#ffffff"), transparent: true, opacity: 0, depthWrite: false, blending: NormalBlending, fog: false }),
          az,
          elev,
          width: 14 + Math.sin(i * 2.3) * 4,
          drift: 0.004 + 0.002 * (i % 3),
        };
      }),
    []
  );
  const moonDir = useMemo(() => {
    const l = Math.hypot(MOON_DIR.x, MOON_DIR.y, MOON_DIR.z);
    return { x: MOON_DIR.x / l, y: MOON_DIR.y / l, z: MOON_DIR.z / l };
  }, []);

  useFrame((state) => {
    const south = direction === "turquoise";
    blendRef.current += ((south ? 1 : 0) - blendRef.current) * 0.06;
    const blend = blendRef.current;
    const g = groupRef.current;
    if (!g) return;
    g.visible = blend > 0.01;
    if (!g.visible) return;
    g.position.copy(state.camera.position);
    const day = getRevealFloor(sceneRefs?.progressRef.current ?? 0);
    const t = sceneRefs?.reducedMotionRef.current ? 0 : state.clock.elapsedTime;
    // La lune : pleine la nuit, s'efface avec le jour.
    const moon = moonRef.current;
    if (moon) {
      moon.position.set(moonDir.x * RADIUS, moonDir.y * RADIUS, moonDir.z * RADIUS);
      moon.scale.setScalar(6.5);
      moonMaterial.opacity = blend * (1 - day) * (1 - day) * 0.9;
    }
    // Les nuages : derive lente en azimut, plus presents au jour, teintes
    // de nuit (bleu sombre) puis blancs.
    for (let i = 0; i < clouds.length; i++) {
      const s = cloudsRef.current[i];
      const c = clouds[i];
      if (!s) continue;
      const az = c.az + t * c.drift;
      const y = Math.sin(c.elev);
      const r = Math.cos(c.elev);
      // Devant la camera : la camera regarde -z en tete de page.
      s.position.set(Math.sin(az) * r * RADIUS, y * RADIUS, -Math.cos(az) * r * RADIUS);
      s.scale.set(c.width, c.width * 0.42, 1);
      c.material.opacity = blend * (0.12 + 0.68 * day);
      c.material.color.setRGB(0.55 + 0.45 * day, 0.6 + 0.4 * day, 0.75 + 0.25 * day);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <sprite ref={moonRef} material={moonMaterial} raycast={() => null} renderOrder={-97} />
      {clouds.map((c, i) => (
        <sprite
          key={i}
          ref={(el) => {
            if (el) cloudsRef.current[i] = el;
          }}
          material={c.material}
          raycast={() => null}
          renderOrder={-96}
        />
      ))}
    </group>
  );
}
