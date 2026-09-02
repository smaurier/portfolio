/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation des geometries de rubans 60 fps, legitime en 3D. */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Color, DoubleSide, MeshStandardMaterial, Vector3, type Object3D } from "three";
import { createStrip, stepStrip, type Strip } from "@/lib/paper-strip";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * AmateStrips (02/09, Nord). Des bandelettes de papier amate accrochees
 * aux bois et sur le dos du cerf, qui flottent dans le vent d'obsidienne.
 * Mythologie (Itzehecayan) : les morts etaient enterres avec des
 * vetements de papier pour se proteger du vent qui coupe : ces
 * bandelettes sont la protection du cerf, et l'alternative aux lianes
 * propre au Mictlan (retour Sylvain 02/09).
 *
 * Simulation : chaines Verlet (lib/paper-strip.ts, testee), epinglees a
 * des os du cerf (position monde lue chaque frame), gravite legere, meme
 * vent que les lames (Est -> Ouest) avec rafales et turbulence par
 * bandelette. Rendu : un ruban par bandelette (2 sommets par point,
 * geometrie mise a jour chaque frame), papier creme mat qui prend la
 * lumiere violette. Nord seulement (fondu d'opacite), vent nul en
 * reduced-motion (elles pendent, immobiles).
 */

const POINTS = 9;
const WIDTH = 0.09;
const PAPER = new Color("#e6d9bd");
/** Ancrages : os (noms sans point, GLTFLoader) + decalage local monde. */
const ANCHORS: { bone: string; offset: [number, number, number]; length: number }[] = [
  // Ancrages EN SURFACE (deuxieme capture 02/09 : ancrees sur les os,
  // a l'interieur du volume, les bandelettes pendaient dans le corps et
  // ne se voyaient pas). Bois : aux pointes, de part et d'autre de la
  // tete. Dos : au-dessus de l'echine.
  // Troisieme capture 02/09 : ancres trop hautes, les bandelettes
  // pendaient AU-DESSUS des bois. Ancres aux pointes des bois (a peine
  // au-dessus du noeud, ecartees du crane pour pendre a cote de la
  // tete) et sur le haut des flancs (ecartees de l'echine pour pendre
  // le long du corps, pas dedans).
  { bone: "Stag_Horns", offset: [-0.42, 0.26, 0.28], length: 0.7 },
  { bone: "Stag_Horns", offset: [0.44, 0.28, 0.22], length: 0.65 },
  { bone: "Stag_Horns", offset: [-0.34, 0.3, -0.28], length: 0.55 },
  { bone: "Stag_Horns", offset: [0.36, 0.3, -0.3], length: 0.55 },
  { bone: "Torso2", offset: [0.34, 0.22, 0], length: 0.6 },
  { bone: "Back", offset: [-0.32, 0.2, 0.05], length: 0.55 },
  { bone: "Torso3", offset: [0.33, 0.2, -0.05], length: 0.5 },
];
const WIND_BASE = { x: -1.8, y: 0.05, z: 0.4 };
/** Papier : pend franchement (gravite 5 au lieu de 3.5 par defaut), le
 * vent le souleve sans l'emporter. */
const STRIP_OPTIONS = { gravity: 5 };
const LOOKUP_EVERY = 60;

type Ribbon = { strip: Strip; geometry: BufferGeometry; bone: Object3D | null; anchor: (typeof ANCHORS)[number]; phase: number };

export default function AmateStrips() {
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const fadeRef = useRef(direction === "obsidienne" ? 1 : 0);
  const lookupRef = useRef(0);
  const anchorPos = useMemo(() => new Vector3(), []);
  const side = useMemo(() => new Vector3(), []);
  const tangent = useMemo(() => new Vector3(), []);
  const up = useMemo(() => new Vector3(0, 1, 0), []);

  const material = useMemo(
    () => new MeshStandardMaterial({ color: PAPER, roughness: 0.95, metalness: 0, side: DoubleSide, transparent: true, opacity: 0 }),
    []
  );
  const ribbons = useMemo<Ribbon[]>(
    () =>
      ANCHORS.map((anchor, i) => {
        const strip = createStrip(POINTS, anchor.length, { x: 0, y: 1.5, z: 0 });
        const geometry = new BufferGeometry();
        geometry.setAttribute("position", new BufferAttribute(new Float32Array(POINTS * 2 * 3), 3));
        geometry.setAttribute("normal", new BufferAttribute(new Float32Array(POINTS * 2 * 3), 3));
        const index: number[] = [];
        for (let p = 0; p < POINTS - 1; p++) {
          const a = p * 2;
          index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
        geometry.setIndex(index);
        return { strip, geometry, bone: null, anchor, phase: i * 1.7 };
      }),
    []
  );
  useEffect(() => () => { for (const r of ribbons) r.geometry.dispose(); material.dispose(); }, [ribbons, material]);

  useFrame((state, delta) => {
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const target = direction === "obsidienne" ? 1 : 0;
    fadeRef.current = reduced ? target : fadeRef.current + (target - fadeRef.current) * 0.05;
    material.opacity = fadeRef.current * 0.92;
    if (fadeRef.current < 0.01) return;

    // Os du cerf (arrive par Suspense) : recherche espacee tant qu'absents.
    if (ribbons.some((r) => !r.bone) && lookupRef.current++ % LOOKUP_EVERY === 0) {
      for (const r of ribbons) if (!r.bone) r.bone = state.scene.getObjectByName(r.anchor.bone) ?? null;
    }
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 30);
    const gust = 1 + 0.45 * Math.sin(t * 0.7) + 0.25 * Math.sin(t * 1.9 + 1.3);

    for (const r of ribbons) {
      if (!r.bone) continue;
      r.bone.getWorldPosition(anchorPos);
      anchorPos.x += r.anchor.offset[0];
      anchorPos.y += r.anchor.offset[1];
      anchorPos.z += r.anchor.offset[2];
      const wind = reduced
        ? { x: 0, y: 0, z: 0 }
        : {
            x: WIND_BASE.x * gust + Math.sin(t * 2.3 + r.phase) * 0.6,
            y: WIND_BASE.y * gust + Math.sin(t * 3.1 + r.phase * 2) * 0.5,
            z: WIND_BASE.z * gust + Math.cos(t * 1.7 + r.phase) * 0.7,
          };
      stepStrip(r.strip, dt, { x: anchorPos.x, y: anchorPos.y, z: anchorPos.z }, wind, STRIP_OPTIONS);

      // Ruban : 2 sommets par point, largeur perpendiculaire a la tangente.
      const pos = r.geometry.attributes.position as BufferAttribute;
      const nor = r.geometry.attributes.normal as BufferAttribute;
      const pts = r.strip.points;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        tangent.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
        side.crossVectors(tangent, up);
        if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
        side.normalize().multiplyScalar(WIDTH * 0.5);
        const p = pts[i];
        pos.setXYZ(i * 2, p.x - side.x, p.y - side.y, p.z - side.z);
        pos.setXYZ(i * 2 + 1, p.x + side.x, p.y + side.y, p.z + side.z);
        // Normale : perpendiculaire au ruban (tangente x cote).
        const nx = tangent.y * side.z - tangent.z * side.y;
        const ny = tangent.z * side.x - tangent.x * side.z;
        const nz = tangent.x * side.y - tangent.y * side.x;
        nor.setXYZ(i * 2, nx, ny, nz);
        nor.setXYZ(i * 2 + 1, nx, ny, nz);
      }
      pos.needsUpdate = true;
      nor.needsUpdate = true;
      r.geometry.computeBoundingSphere();
    }
  });

  return (
    <>
      {ribbons.map((r, i) => (
        <mesh key={i} geometry={r.geometry} material={material} frustumCulled={false} raycast={() => null} />
      ))}
    </>
  );
}
