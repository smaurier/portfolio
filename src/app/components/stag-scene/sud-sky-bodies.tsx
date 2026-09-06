/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'objets three a 60 fps (meme precedent que sud-sky). */
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, Color, Group, Sprite, SpriteMaterial } from "three";
import { moonDirection, sunDirection } from "@/lib/direction-light";
import { dayAtArc, sunInTheWest } from "@/lib/arc-day";
import { remapWestArc } from "@/lib/ouest-arc";
import { isEveningStar, isMorningStar } from "@/lib/venus";
import { eastSunDirection, morningStarDirection } from "@/lib/est-arc";
import { readXolotlSpawn } from "@/lib/xolotl-spawn";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";
import { markTrace } from "../traces-store";
import { getSceneControls } from "../scene-controls-store";

/**
 * SudSkyBodies (05/09, Sylvain en direct). Deux corps dans le ciel du Sud :
 *  - la LUNE de Coatepec : un disque doux, bas derriere a gauche, dans la
 *    direction de la source de nuit du rig (direction-light, night). Elle
 *    s'efface quand le soleil monte au zenith (l'arc de revelation).
 *  - le SOLEIL (disque + halo) qui se leve a l'est et monte au zenith.
 * Les nuages en sprites du 05/09 matin ont ete retires le 05/09 apres-midi :
 * le ciel de jour est maintenant une photographie sur le dome (sud-sky).
 * Textures generees sur canvas (pas d'asset). Groupe centre camera, comme
 * le dome. Sud seulement, fondu.
 */

const RADIUS = 80;
const VENUS_DIR = { x: Math.sin((115 * Math.PI) / 180) * Math.cos((10 * Math.PI) / 180), y: Math.sin((10 * Math.PI) / 180), z: Math.cos((115 * Math.PI) / 180) * Math.cos((10 * Math.PI) / 180) };

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
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const blendRef = useRef(direction === "turquoise" || direction === "cendre" || direction === "dore" ? 1 : 0);

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
  // L'etoile du soir (06/09, Ouest) : Venus au-dessus du couchant, une fois
  // le soleil entre dans la terre, si Venus est reellement etoile du soir
  // ou si Xolotl passe cette session (elle l'annonce).
  const venusRef = useRef<Sprite>(null);
  const venusMaterial = useMemo(
    () => new SpriteMaterial({ map: radialTexture(64, 0.0, 0.5, 0, 4), color: new Color("#fff6e0"), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }),
    [],
  );
  const venusShows = useMemo(() => (typeof window === "undefined" ? false : isEveningStar() || readXolotlSpawn("cendre")), []);
  const morningShows = useMemo(() => (typeof window === "undefined" ? false : isMorningStar()), []);
  useFrame((state) => {
    const south = direction === "turquoise";
    // Le Sud (lever) et l'Ouest (coucher, 06/09) ont des astres ; la lune
    // n'est que du Sud.
    const east = direction === "dore";
    const solar = south || direction === "cendre" || east;
    blendRef.current += ((solar ? 1 : 0) - blendRef.current) * 0.06;
    const blend = blendRef.current;
    const g = groupRef.current;
    if (!g) return;
    g.visible = blend > 0.01;
    if (!g.visible) return;
    g.position.copy(state.camera.position);
    const day = dayAtArc(direction, sceneRefs?.progressRef.current ?? 0);
    // La lune : a l'ouest, elle se couche quand le soleil monte (moonDirection,
    // la meme direction que la lumiere de nuit) ; elle palit avec le jour.
    const moon = moonRef.current;
    if (moon) {
      const md = moonDirection(day);
      moon.position.set(md.x * RADIUS, md.y * RADIUS, md.z * RADIUS);
      moon.scale.setScalar(6.5);
      moonMaterial.opacity = (south ? blend : 0) * Math.max(0, 1 - day * 1.6) * (md.y > -0.02 ? 1 : 0) * 0.95;
    }
    // Le soleil : se leve a l'est, monte au zenith (sunDirection, la meme
    // direction que la lumiere de jour). Disque + halo, plus forts en montant.
    const sun = sunRef.current, halo = sunHaloRef.current;
    if (sun && halo) {
      const sc = getSceneControls();
      const pNow = sceneRefs?.progressRef.current ?? 0;
      // A l'Est (06/09), le soleil suit son propre arc : il parait face au
      // regard a l'instant ou le gel eclate.
      const sd = east ? eastSunDirection(pNow) : sunDirection(day, sunInTheWest(direction, sc.cinematic && sc.cinematicAfternoon));
      sun.position.set(sd.x * RADIUS, sd.y * RADIUS, sd.z * RADIUS);
      halo.position.copy(sun.position);
      const up = Math.max(0, Math.min(1, (sd.y + 0.02) / 0.12));
      if (south && sd.y > 0.08 && blend > 0.5) markTrace("sunrise"); // une trace : le soleil s'est leve devant vous
      sun.scale.setScalar(east ? 8 : 7);
      halo.scale.setScalar(26 + 10 * day);
      sunMaterial.opacity = blend * up;
      sunHaloMaterial.opacity = blend * up * (0.35 + 0.25 * day);
      // Rougeoyant a l'horizon, blanc-or en montant.
      sunMaterial.color.setRGB(1, 0.8 + 0.16 * day, 0.6 + 0.3 * day);
      const venus = venusRef.current;
      if (venus) {
        // A l'est du soleil couchant (azimut 60 deg du decor) : Venus du soir
        // se tient plus haut et plus au sud, vers ou le regard de fin de
        // page se tourne (135 deg) : azimut 115 deg, 10 deg de hauteur (au-dessus des collines, sous le bandeau).
        const twinkle = 0.85 + 0.15 * Math.sin(state.clock.elapsedTime * 2.3);
        venus.scale.setScalar(3.2);
        if (east) {
          // Venus du MATIN (Tlahuizcalpantecuhtli) : au-dessus du lever, elle
          // palit quand le soleil monte.
          const md = morningStarDirection();
          venus.position.set(md.x * RADIUS, md.y * RADIUS, md.z * RADIUS);
          const fade = 1 - Math.min(1, Math.max(0, (pNow - 0.45) / 0.12));
          venusMaterial.opacity = morningShows ? blend * fade * twinkle : 0;
        } else {
          venus.position.set(VENUS_DIR.x * RADIUS, VENUS_DIR.y * RADIUS, VENUS_DIR.z * RADIUS);
          const dusk = direction === "cendre" ? remapWestArc(pNow).dusk : 0;
          venusMaterial.opacity = venusShows && direction === "cendre" ? blend * Math.max(0, (dusk - 0.72) / 0.2) * twinkle : 0;
        }
      }
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <sprite ref={moonRef} material={moonMaterial} raycast={() => null} renderOrder={-97} />
      <sprite ref={sunHaloRef} material={sunHaloMaterial} raycast={() => null} renderOrder={-97} />
      <sprite ref={sunRef} material={sunMaterial} raycast={() => null} renderOrder={-96} />
      <sprite ref={venusRef} material={venusMaterial} raycast={() => null} renderOrder={-96} />
    </group>
  );
}
