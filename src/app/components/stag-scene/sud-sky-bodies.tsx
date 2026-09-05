/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'objets three a 60 fps (meme precedent que sud-sky). */
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, Color, Group, NormalBlending, Sprite, SpriteMaterial } from "three";
import { getRevealFloor } from "@/lib/reveal-arc";
import { moonDirection, sunDirection } from "@/lib/direction-light";
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
  // Le SOLEIL (05/09, astronomie) : un disque franc et un halo large, aux
  // couleurs de midi ; il suit sunDirection, la meme que la lumiere.
  const sunMaterial = useMemo(
    () => new SpriteMaterial({ map: radialTexture(128, 0.62, 0.72, 0, 2), color: new Color("#fff4d6"), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }),
    []
  );
  const sunHaloMaterial = useMemo(
    () => new SpriteMaterial({ map: radialTexture(128, 0.0, 1.0, 0, 3), color: new Color("#ffd9a0"), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }),
    []
  );
  const sunRef = useRef<Sprite>(null);
  const sunHaloRef = useRef<Sprite>(null);
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
    // La lune : a l'ouest, elle se couche quand le soleil monte (moonDirection,
    // la meme direction que la lumiere de nuit) ; elle palit avec le jour.
    const moon = moonRef.current;
    if (moon) {
      const md = moonDirection(day);
      moon.position.set(md.x * RADIUS, md.y * RADIUS, md.z * RADIUS);
      moon.scale.setScalar(6.5);
      moonMaterial.opacity = blend * Math.max(0, 1 - day * 1.6) * (md.y > -0.02 ? 1 : 0) * 0.95;
    }
    // Le soleil : se leve a l'est, monte au zenith (sunDirection, la meme
    // direction que la lumiere de jour). Disque + halo, plus forts en montant.
    const sun = sunRef.current, halo = sunHaloRef.current;
    if (sun && halo) {
      const sd = sunDirection(day);
      sun.position.set(sd.x * RADIUS, sd.y * RADIUS, sd.z * RADIUS);
      halo.position.copy(sun.position);
      const up = Math.max(0, Math.min(1, (sd.y + 0.02) / 0.12));
      sun.scale.setScalar(7);
      halo.scale.setScalar(26 + 10 * day);
      sunMaterial.opacity = blend * up;
      sunHaloMaterial.opacity = blend * up * (0.35 + 0.25 * day);
      // Rougeoyant a l'horizon, blanc-or en montant.
      sunMaterial.color.setRGB(1, 0.8 + 0.16 * day, 0.6 + 0.3 * day);
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
      s.scale.set(c.width, c.width * (0.3 + 0.12 * (i % 3)), 1);
      c.material.opacity = blend * (0.04 + 0.76 * day); // la nuit, a peine devinables (des soucoupes grises sinon)
      c.material.color.setRGB(0.55 + 0.45 * day, 0.6 + 0.4 * day, 0.75 + 0.25 * day);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <sprite ref={moonRef} material={moonMaterial} raycast={() => null} renderOrder={-97} />
      <sprite ref={sunHaloRef} material={sunHaloMaterial} raycast={() => null} renderOrder={-97} />
      <sprite ref={sunRef} material={sunMaterial} raycast={() => null} renderOrder={-96} />
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
