"use client";

import { useMemo } from "react";

/**
 * Toile de fond — Popocatépetl et Iztaccíhuatl, pas un décor générique :
 * c'est la légende nahua la plus connue de mésoamérique centrale (le
 * guerrier Popocatépetl veillant sur la princesse Iztaccíhuatl endormie),
 * cohérente avec tout ce qui est déjà posé sur le site (Nahui Ollin, points
 * cardinaux, Xolotl — cf Codex Nahual, memory project-nahual-da). Ajoutées
 * le 18/08 suite au retour de Sylvain ("un peu triste", scène sans horizon).
 *
 * **Retouche même soirée** : premier jet placé à un seul azimuth (~24-26
 * unités, une seule paire) — quasi invisible en pratique, l'orbite caméra
 * (radius 3.2-7, camera-path.ts) ne le traversait que sur une petite
 * portion des 360°. Retour de Sylvain : "elles doivent être tout autour et
 * de face, on doit vraiment deviner le contour". Rapprochées (rayon 15,
 * contre 24-26) et répétées 5 fois en anneau (tous les 72°) — la caméra
 * croise toujours une silhouette Popo/Izta reconnaissable, quel que soit
 * l'azimuth. Chaque copie n'est pas UNE autre montagne différente : c'est
 * délibérément la même paire répétée (registre mythologique/onirique — les
 * deux montagnes qui veillent depuis toutes les directions à la fois — pas
 * une tentative de rester géographiquement exact).
 *
 * Couleurs volontairement sombres/désaturées mais pas noires : même erreur
 * à ne pas répéter que elephant-tree.glb (retiré le 18/08, cf
 * background-flora.tsx) — un élément de fond ne doit jamais rivaliser avec
 * le cerf, mais doit rester un contour lisible, pas invisible. Répondent à
 * RevealLighting comme le reste (meshStandardMaterial). Exclues du groupe
 * EnvironmentDepthFade (cf stag-scene.tsx) : la perspective atmosphérique
 * grise encore plus un objet déjà sombre, contraire au retour "on doit
 * deviner le contour" — seul le fog s'en charge, plus loin sur l'anneau.
 */

const ROCK_COLOR = "#211c28";
const SNOW_CAP_COLOR = "#4a4a58";

function Popocatepetl() {
  return (
    <group position={[-7, 0, 0]}>
      {/* Cône volcanique — silhouette symétrique caractéristique. */}
      <mesh position={[0, 3.2, 0]}>
        <coneGeometry args={[4.8, 6.4, 6]} />
        <meshStandardMaterial color={ROCK_COLOR} />
      </mesh>
      {/* Calotte enneigée : Popocatépetl est un volcan enneigé, teinte plus
       * claire pour se détacher légèrement même en pénombre. */}
      <mesh position={[0, 6, 0]}>
        <coneGeometry args={[1.2, 1.3, 6]} />
        <meshStandardMaterial color={SNOW_CAP_COLOR} />
      </mesh>
    </group>
  );
}

// La princesse endormie : silhouette allongée en plusieurs points hauts
// (tête, poitrine — le point culminant de la légende, genoux, pieds) plutôt
// qu'un pic unique — c'est ce profil en creux/bosses qui la rend
// reconnaissable, pas juste "une montagne plus basse".
const IZTACCIHUATL_PROFILE = [
  { x: -6.4, height: 2.4 },
  { x: -2.4, height: 3.4 },
  { x: 1.6, height: 2.3 },
  { x: 5.2, height: 1.7 },
];

function Iztaccihuatl() {
  return (
    <group position={[5.5, 0, 0]}>
      {IZTACCIHUATL_PROFILE.map((hump, i) => (
        <mesh key={i} position={[hump.x, hump.height / 2, 0]}>
          <coneGeometry args={[2.6, hump.height, 5]} />
          <meshStandardMaterial color={ROCK_COLOR} />
        </mesh>
      ))}
      {/* Neige sur le point culminant ("la poitrine") seulement. */}
      <mesh position={[-2.4, 3.6, 0]}>
        <coneGeometry args={[0.7, 0.75, 5]} />
        <meshStandardMaterial color={SNOW_CAP_COLOR} />
      </mesh>
    </group>
  );
}

function MountainPair({ azimuth, radius }: { azimuth: number; radius: number }) {
  const x = radius * Math.sin(azimuth);
  const z = radius * Math.cos(azimuth);
  // Oriente la paire pour qu'elle "fasse face" au centre de la scène, quel
  // que soit son azimuth sur l'anneau.
  const rotationY = azimuth + Math.PI;

  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      <Popocatepetl />
      <Iztaccihuatl />
    </group>
  );
}

const RING_RADIUS = 15;
const COPIES = 5;

export default function Mountains() {
  const placements = useMemo(
    () =>
      Array.from({ length: COPIES }, (_, i) => ({
        azimuth: (i / COPIES) * Math.PI * 2,
        radius: RING_RADIUS,
      })),
    [],
  );

  return (
    <>
      {placements.map((p, i) => (
        <MountainPair key={i} azimuth={p.azimuth} radius={p.radius} />
      ))}
    </>
  );
}
