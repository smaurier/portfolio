"use client";

import { useMemo } from "react";
import { ExtrudeGeometry, Shape } from "three";
import {
  generateGenericPeakProfile,
  generateMountainRangePlacements,
} from "@/lib/mountain-range";

/**
 * Toile de fond montagneuse — deux couches distinctes, cf retours de
 * Sylvain le 18/08 (session complète) :
 *
 * 1. **Popocatépetl + Iztaccíhuatl**, une seule fois — pas un décor
 *    générique : c'est la légende nahua la plus connue de mésoamérique
 *    centrale (le guerrier veillant sur la princesse endormie), cohérente
 *    avec tout ce qui est déjà posé (Nahui Ollin, points cardinaux, Xolotl
 *    — cf Codex Nahual, memory project-nahual-da). Répétées 5x en anneau au
 *    premier essai : lisait comme un motif dupliqué ("c'est assez mal
 *    fait"), pas un horizon. Repositionnées une seule fois, dernier retour :
 *    "on doit voir le Popo et l'Izta seulement lorsqu'on regarde de face
 *    l'animal" — placées à l'azimuth exactement opposé à la caméra au
 *    climax du face-à-face (climaxProgress=0.75, cf camera-path.ts), pas de
 *    logique de visibilité en plus : le FOV (45°) suffit à les sortir du
 *    cadre le reste de l'orbite, aucun état à gérer.
 * 2. **Chaîne générique**, tout autour (retour Sylvain : "sinon tu dois
 *    mettre une ligne de montagne tout autour, d'une distance non
 *    homogène") — pics procéduraux (mountain-range.ts), rayon et hauteur
 *    variés par pic, pas un anneau à rayon constant (ça relisait comme un
 *    motif). Chaque pic a son propre profil irrégulier (déterministe par
 *    seed), jamais deux fois la même silhouette.
 *
 * Silhouettes en `Shape` 2D extrudé sur une faible profondeur (pas des
 * volumes) — profils asymétriques/irréguliers, jamais un cône à faces
 * régulières (le tout premier essai en cônes à 6 faces lisait comme des
 * pyramides égyptiennes). Popocatépetl garde une encoche de cratère
 * (stratovolcan) ; Iztaccíhuatl son profil à plusieurs bosses (tête/
 * poitrine/genoux/pieds) en une silhouette continue.
 *
 * Couleurs volontairement sombres/désaturées mais pas noires — même erreur
 * à ne pas répéter que elephant-tree.glb (retiré le 18/08). Répondent à
 * RevealLighting comme le reste (meshStandardMaterial). Exclues du groupe
 * EnvironmentDepthFade (cf stag-scene.tsx) : la perspective atmosphérique
 * grise encore plus un objet déjà sombre, contraire au retour "on doit
 * deviner le contour" — seul le fog s'en charge, plus loin sur l'anneau.
 */

const ROCK_COLOR = "#211c28";
const SNOW_CAP_COLOR = "#4a4a58";
const EXTRUDE_DEPTH = 1;

// Profil du Popocatépetl : asymétrique (pas un triangle centré), une
// encoche près du sommet pour évoquer le cratère plutôt qu'un pic lisse.
// Coordonnées gardées telles quelles (pas de geometry.center()) : le
// SnowCap ci-dessous est positionné dans le même repère, sur les mêmes
// points de sommet — centrer la géométrie après coup avait décalé la neige
// du sommet réel (bug trouvé en vérifiant le rendu, corrigé ici).
function createPopocatepetlShape(): Shape {
  const shape = new Shape();
  shape.moveTo(-5.2, 0);
  shape.lineTo(-4.4, 1.9);
  shape.lineTo(-3.1, 1.6);
  shape.lineTo(-1.9, 3.9);
  shape.lineTo(-0.7, 3.4); // épaulement avant le sommet
  shape.lineTo(0.1, 5.6); // sommet décalé du centre, pas symétrique
  shape.lineTo(0.8, 5.1); // bord du cratère
  shape.lineTo(1.35, 5.45); // encoche du cratère
  shape.lineTo(2.5, 3.3);
  shape.lineTo(3.7, 3.1);
  shape.lineTo(4.5, 1.1);
  shape.lineTo(5.3, 0);
  shape.closePath();
  return shape;
}

// Profil de l'Iztaccíhuatl : silhouette allongée en plusieurs points hauts
// (tête, poitrine — le point culminant de la légende, genoux, pieds) —
// asymétrique et irrégulier, pas une répétition de bosses identiques.
function createIztaccihuatlShape(): Shape {
  const shape = new Shape();
  shape.moveTo(-9.2, 0);
  shape.lineTo(-8.5, 1.7); // pieds
  shape.lineTo(-7.1, 1.35);
  shape.lineTo(-6, 2.7); // genoux
  shape.lineTo(-4.8, 2.15);
  shape.lineTo(-3.6, 4); // poitrine, point culminant
  shape.lineTo(-2.4, 3.5);
  shape.lineTo(-1.5, 4.45); // épaule/tête
  shape.lineTo(-0.5, 3.6);
  shape.lineTo(0.5, 2.4); // visage, redescend
  shape.lineTo(1.5, 1.75);
  shape.lineTo(2.5, 0.9);
  shape.lineTo(3.1, 0);
  shape.closePath();
  return shape;
}

function SnowCap({ shapeName }: { shapeName: "popo" | "izta" }) {
  // Repère les coordonnées du sommet réel de chaque profil ci-dessus (pas
  // de geometry.center() sur la géométrie principale, donc ces coordonnées
  // restent valables telles quelles).
  const position: [number, number, number] =
    shapeName === "popo" ? [0.35, 4.9, EXTRUDE_DEPTH / 2] : [-3.1, 3.5, EXTRUDE_DEPTH / 2];
  return (
    <mesh position={position}>
      <coneGeometry args={[0.8, 0.85, 4]} />
      <meshStandardMaterial color={SNOW_CAP_COLOR} flatShading />
    </mesh>
  );
}

function NamedMountain({ shapeName }: { shapeName: "popo" | "izta" }) {
  const geometry = useMemo(() => {
    const shape = shapeName === "popo" ? createPopocatepetlShape() : createIztaccihuatlShape();
    return new ExtrudeGeometry(shape, {
      depth: EXTRUDE_DEPTH,
      bevelEnabled: false,
      curveSegments: 1, // segments droits (contour dessiné point à point), pas de lissage des angles
    });
  }, [shapeName]);

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={ROCK_COLOR} flatShading />
      </mesh>
      <SnowCap shapeName={shapeName} />
    </group>
  );
}

// Azimuth exactement opposé à la caméra au climax du face-à-face
// (climaxProgress=0.75, turns=1 -> azimuth caméra = 0.75 * 2π ; "derrière
// le sujet vu depuis la caméra" = cet azimuth + π). Rayon plus proche que
// la chaîne générique (16 contre 18-30) : les deux montagnes nommées
// doivent rester le premier plan de l'horizon, pas noyées dedans.
const NAMED_MOUNTAINS_AZIMUTH = 0.75 * Math.PI * 2 + Math.PI;
const NAMED_MOUNTAINS_RADIUS = 16;

function NamedMountainPair() {
  const x = NAMED_MOUNTAINS_RADIUS * Math.sin(NAMED_MOUNTAINS_AZIMUTH);
  const z = NAMED_MOUNTAINS_RADIUS * Math.cos(NAMED_MOUNTAINS_AZIMUTH);
  const rotationY = NAMED_MOUNTAINS_AZIMUTH + Math.PI;

  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      <group position={[-6.5, 0, 0]}>
        <NamedMountain shapeName="popo" />
      </group>
      <group position={[5, 0, 0]}>
        <NamedMountain shapeName="izta" />
      </group>
    </group>
  );
}

function GenericPeak({ seed, widthScale }: { seed: number; widthScale: number }) {
  const geometry = useMemo(() => {
    const profile = generateGenericPeakProfile(seed);
    const shape = new Shape();
    profile.forEach((p, i) => {
      if (i === 0) shape.moveTo(p.x * widthScale, p.y);
      else shape.lineTo(p.x * widthScale, p.y);
    });
    shape.closePath();
    return new ExtrudeGeometry(shape, { depth: EXTRUDE_DEPTH * 0.6, bevelEnabled: false, curveSegments: 1 });
  }, [seed, widthScale]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={ROCK_COLOR} flatShading />
    </mesh>
  );
}

const GENERIC_PEAK_COUNT = 16;

function GenericMountainRange() {
  const placements = useMemo(() => generateMountainRangePlacements(GENERIC_PEAK_COUNT), []);

  return (
    <>
      {placements.map((p, i) => {
        const x = p.radius * Math.sin(p.azimuth);
        const z = p.radius * Math.cos(p.azimuth);
        const rotationY = p.azimuth + Math.PI;
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, rotationY, 0]} scale={[1, p.heightScale, 1]}>
            <GenericPeak seed={i * 1.9} widthScale={p.widthScale} />
          </group>
        );
      })}
    </>
  );
}

export default function Mountains() {
  return (
    <>
      <NamedMountainPair />
      <GenericMountainRange />
    </>
  );
}
