"use client";

import { useMemo } from "react";
import { generateRingPlacements } from "@/lib/flora-placement";
import { getTerrainHeight } from "@/lib/terrain-height";

/**
 * Touffes d'herbe sèche, fixes au sol — retour de Sylvain le 18/08 ("un peu
 * triste", habiller la scène). Herbe sèche/en touffes (pas un gazon) :
 * cohérent avec le reste de la palette désertique déjà posée (agave, nopal,
 * ocotillo) — l'altiplano centre-mexicain est un matorral/steppe semi-aride,
 * pas une prairie.
 *
 * Géométrie procédurale minimale (cônes à 3 faces = silhouette de brin,
 * même esprit bas-poly que le reste) plutôt qu'un asset : pas de texture
 * alpha-cutout dans ce projet, et un brin de cette forme est trivial à
 * générer alors qu'aucun asset CC0 "touffe d'herbe sèche low-poly" precis
 * ne s'impose comme évidemment meilleur.
 *
 * Placement réutilise generateRingPlacements (flora-placement.ts) tel quel
 * plutôt qu'un nouveau générateur — même besoin (répartition homogène,
 * déterministe) à un rayon différent (plus proche/dense que le fond fixe).
 * Statique, pas de pousse animée — même règle que background-flora.tsx.
 */

const BLADE_COLORS = ["#8a7d4a", "#6f6a3c", "#5c6b3f"];
const BLADES_PER_TUFT = 4;
const TUFT_COUNT = 50;

type Blade = {
  angle: number;
  lean: number;
  height: number;
  color: string;
};

function GrassTuft({
  x,
  z,
  rotationY,
  scale,
  seed,
}: {
  x: number;
  z: number;
  rotationY: number;
  scale: number;
  seed: number;
}) {
  const blades = useMemo(() => {
    const items: Blade[] = [];
    for (let i = 0; i < BLADES_PER_TUFT; i++) {
      const angle = (i / BLADES_PER_TUFT) * Math.PI * 2 + seed;
      items.push({
        angle,
        lean: 0.15 + 0.1 * Math.sin(seed + i),
        height: 0.18 + 0.08 * ((Math.cos(seed * 3 + i) + 1) / 2),
        color: BLADE_COLORS[i % BLADE_COLORS.length],
      });
    }
    return items;
  }, [seed]);

  // Rayon de placement (1.8-8.5) dépasse FLAT_RADIUS du terrain (4,
  // terrain-height.ts) pour sa moitié externe : même bug que
  // background-flora.tsx/ocotillo.tsx sur ces touffes-là, même correction.
  const terrainY = getTerrainHeight(x, z);
  return (
    <group position={[x, terrainY, z]} rotation={[0, rotationY, 0]} scale={scale}>
      {blades.map((b, i) => {
        const offset = 0.03;
        return (
          <mesh
            key={i}
            position={[Math.cos(b.angle) * offset, b.height / 2, Math.sin(b.angle) * offset]}
            rotation={[Math.sin(b.angle) * b.lean, 0, Math.cos(b.angle) * b.lean]}
          >
            <coneGeometry args={[0.012, b.height, 3]} />
            <meshStandardMaterial color={b.color} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Grass() {
  const placements = useMemo(
    () =>
      generateRingPlacements(TUFT_COUNT, {
        // 1.8 : juste au-delà des pattes/lianes/maïs (rayon ~0.3-0.4), on ne
        // veut pas de touffe qui traverse le corps du cerf. 8.5 : reste dans
        // le champ caméra normal (radius max 9, cf camera-path.ts), avant le
        // fond fixe (background-flora/ocotillo, 6-10).
        minRadius: 1.8,
        maxRadius: 8.5,
        minScale: 0.7,
        maxScale: 1.4,
        // Seed distincte de background-flora.tsx (1) et ocotillo.tsx (7).
        seed: 12,
      }),
    [],
  );

  return (
    <>
      {placements.map((p, i) => (
        <GrassTuft
          key={i}
          x={p.x}
          z={p.z}
          rotationY={p.rotationY}
          scale={p.scale}
          seed={i * 1.7}
        />
      ))}
    </>
  );
}
