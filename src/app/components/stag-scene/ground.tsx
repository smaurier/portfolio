"use client";

/**
 * Sol du fond — retour de Sylvain le 18/08 : la scène flottait dans un vide
 * noir total, sans horizon ni ancrage spatial ("un peu triste"). Grand
 * disque plat, meshStandardMaterial (répond à RevealLighting comme tout le
 * reste de la scène — même principe que le fix du 18/08 sur
 * background-flora.tsx : ne jamais avoir un élément qui ignore l'arc de
 * lumière). Couleur terre/sable sec, cohérente avec le reste de la palette
 * désertique (agave/nopal/ocotillo).
 *
 * Rayon très au-delà de l'orbite caméra (camera-path.ts, radius max 9) et
 * du fond fixe (background-flora.tsx/ocotillo.tsx, radius max 9-10) : le
 * bord ne doit jamais être visible à l'œil — c'est le fog (cf stag-scene.tsx)
 * qui le fait disparaître dans le noir avant qu'on l'atteigne, pas la
 * distance seule.
 *
 * Un disque sombre séparé sous le cerf simule une ombre de contact — pas
 * une vraie shadow map (coût/complexité pas justifiés pour cette scène),
 * juste de quoi ancrer visuellement le sujet au sol. meshBasicMaterial
 * (non éclairé) : une ombre reste sombre quelle que soit la lumière
 * ambiante, contrairement aux surfaces éclairées.
 */
const GROUND_COLOR = "#241d14";
const GROUND_RADIUS = 40;
const CONTACT_SHADOW_RADIUS = 0.85;

export default function Ground() {
  return (
    <>
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[GROUND_RADIUS, 48]} />
        <meshStandardMaterial color={GROUND_COLOR} />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[CONTACT_SHADOW_RADIUS, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} />
      </mesh>
    </>
  );
}
