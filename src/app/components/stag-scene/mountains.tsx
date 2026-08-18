"use client";

/**
 * Toile de fond lointaine — Popocatépetl et Iztaccíhuatl, pas un décor
 * générique : c'est la légende nahua la plus connue de mésoamérique
 * centrale (le guerrier Popocatépetl veillant sur la princesse Iztaccíhuatl
 * endormie), cohérente avec tout ce qui est déjà posé sur le site (Nahui
 * Ollin, points cardinaux, Xolotl — cf Codex Nahual, memory
 * project-nahual-da). Ajoutées le 18/08 suite au retour de Sylvain ("un peu
 * triste", scène sans horizon).
 *
 * Géométrie fixe (pas procédurale) : deux silhouettes précises et
 * culturellement identifiées, pas une espèce répétée — même logique que
 * MIDGROUND_POSITIONS dans milpa.tsx (configuration à l'œil, pas de
 * générateur nécessaire pour deux éléments nommés).
 *
 * Couleurs volontairement sombres/désaturées : même erreur à ne pas répéter
 * que elephant-tree.glb (retiré le 18/08, cf background-flora.tsx) — un
 * élément de fond ne doit jamais rivaliser avec le cerf en pénombre. Elles
 * répondent à RevealLighting comme le reste de la scène (meshStandardMaterial),
 * et le fog (stag-scene.tsx) les enfonce encore dans la brume à cette
 * distance.
 *
 * Placées à un seul azimuth (pas en anneau autour de toute la scène) : de
 * vraies montagnes n'occupent qu'une portion de l'horizon, pas 360° — la
 * caméra (orbite complète, camera-path.ts) les découvre progressivement
 * plutôt que de les avoir en permanence dans le champ.
 */

const ROCK_COLOR = "#141018";
const SNOW_CAP_COLOR = "#3a3a44";

function Popocatepetl() {
  return (
    <group position={[-13, 0, -24]}>
      {/* Cône volcanique — silhouette symétrique caractéristique. */}
      <mesh position={[0, 4, 0]}>
        <coneGeometry args={[6, 8, 6]} />
        <meshStandardMaterial color={ROCK_COLOR} />
      </mesh>
      {/* Calotte enneigée : Popocatépetl est un volcan enneigé, teinte plus
       * claire pour se détacher légèrement même en pénombre. */}
      <mesh position={[0, 7.5, 0]}>
        <coneGeometry args={[1.5, 1.6, 6]} />
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
  { x: -8, height: 3.0 },
  { x: -3, height: 4.3 },
  { x: 2, height: 2.9 },
  { x: 6.5, height: 2.1 },
];

function Iztaccihuatl() {
  return (
    <group position={[11, 0, -26]}>
      {IZTACCIHUATL_PROFILE.map((hump, i) => (
        <mesh key={i} position={[hump.x, hump.height / 2, 0]}>
          <coneGeometry args={[3.2, hump.height, 5]} />
          <meshStandardMaterial color={ROCK_COLOR} />
        </mesh>
      ))}
      {/* Neige sur le point culminant ("la poitrine") seulement. */}
      <mesh position={[-3, 4.5, 0]}>
        <coneGeometry args={[0.85, 0.9, 5]} />
        <meshStandardMaterial color={SNOW_CAP_COLOR} />
      </mesh>
    </group>
  );
}

export default function Mountains() {
  return (
    <>
      <Popocatepetl />
      <Iztaccihuatl />
    </>
  );
}
