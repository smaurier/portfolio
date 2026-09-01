"use client";

import { useMemo } from "react";
import { PlaneGeometry } from "three";
import { getTerrainHeight } from "@/lib/terrain-height";

/**
 * Sol du fond : retour de Sylvain le 18/08 : la scène flottait dans un vide
 * noir total, sans horizon ni ancrage spatial ("un peu triste"). Grand
 * plan, meshStandardMaterial (répond à RevealLighting comme tout le reste
 * de la scène : même principe que le fix du 18/08 sur background-flora.tsx :
 * ne jamais avoir un élément qui ignore l'arc de lumière). Couleur terre/
 * sable sec, cohérente avec le reste de la palette désertique.
 *
 * **Retouche même soirée** : "la ligne d'horizon reste plate, est-ce qu'on
 * ne pourrait pas faire un sol un peu sculpté plutôt ?" : sommets déplacés
 * en hauteur (terrain-height.ts, fonction pure/testée) plutôt qu'un disque
 * plat. Le rayon proche du centre reste volontairement plat (FLAT_RADIUS
 * dans terrain-height.ts) : le cerf, le maïs et les lianes sont tous
 * ancrés à y=0 sans connaître ce relief : les sculpter sous leurs pieds les
 * ferait flotter/s'enfoncer, pas fait ce soir (grass/background-flora vont
 * jusqu'au bord de la zone plate, léger décalage possible sur les
 * spécimens les plus excentrés, pas gênant à l'œil vu leur taille et le
 * fog/depth-fade qui les estompe déjà à cette distance).
 *
 * PlaneGeometry (pas CircleGeometry comme avant) : un disque n'a pas
 * d'anneaux concentriques par défaut (juste un éventail de triangles
 * depuis le centre), impossible à sculpter avec assez de résolution. Un
 * plan carré, subdivisé, largement plus grand que la zone visible (le fog
 * masque les coins avant qu'on les distingue).
 *
 * **Deuxième retouche, même soirée** : les montagnes (génériques + Popo/
 * Izta, ex-mountains.tsx en meshes extrudés séparés) vivent maintenant dans
 * ce même champ de hauteur (terrain-height.ts) : retour de Sylvain : "les
 * montagnes autour doivent être faites avec le sol sculpté, popo et izta
 * inclus". Un seul terrain continu, garanti raccordé à sa base : plus de
 * mesh flottant posé sur le sol, plus de risque de jointure visible entre
 * deux systèmes séparés.
 *
 * Un disque sombre séparé sous le cerf simule une ombre de contact : pas
 * une vraie shadow map (coût/complexité pas justifiés pour cette scène),
 * juste de quoi ancrer visuellement le sujet au sol. Reste un simple
 * cercle plat : il est dans la zone plate du terrain (FLAT_RADIUS), aucun
 * conflit avec le relief. meshBasicMaterial (non éclairé) : une ombre
 * reste sombre quelle que soit la lumière ambiante.
 */
const GROUND_COLOR = "#241d14";
const GROUND_SIZE = 90;
// 80 -> 128 : les bosses de montagne (terrain-height.ts, rayon 2-3.5) ont
// besoin d'assez de résolution pour rester lisses, pas juste les dunes
// proches qui s'en seraient contentées.
const GROUND_SEGMENTS = 128;
const CONTACT_SHADOW_RADIUS = 0.85;

export default function Ground() {
  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(GROUND_SIZE, GROUND_SIZE, GROUND_SEGMENTS, GROUND_SEGMENTS);
    // Couché à plat une fois pour toutes dans la géométrie elle-même (pas
    // une rotation posée sur le <mesh>) : après rotation, X/Z du repère
    // local correspondent déjà aux coordonnées du sol, Y=0 partout avant
    // sculpture : pas d'ambiguïté sur quel axe déplacer.
    geo.rotateX(-Math.PI / 2);

    const position = geo.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      position.setY(i, getTerrainHeight(x, z));
    }
    position.needsUpdate = true;
    geo.computeVertexNormals();

    return geo;
  }, []);

  return (
    <>
      <mesh geometry={geometry} position={[0, -0.005, 0]}>
        <meshStandardMaterial color={GROUND_COLOR} flatShading />
      </mesh>
      {/* Contact shadow (28/08 retour Sylvain "c'est quoi le cercle
          noir sous le cerf" : trop marque). Remplace disc noir opaque
          par un shader radial gradient : plus opaque au centre (sous
          les pattes), fade doux vers le bord. Signature "ombre de
          contact" naturelle vs disque plaque. */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[CONTACT_SHADOW_RADIUS, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={{}}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            void main() {
              vec2 c = vUv - 0.5;
              float r = length(c) * 2.0;
              float alpha = 1.0 - smoothstep(0.0, 1.0, r);
              alpha = pow(alpha, 1.6);
              // Additive blend NOIR = darken subtile (le noir additif
              // = 0, donc en pratique on soustrait via -alpha impossible
              // ; on utilise plutot NormalBlending equivalent via mix
              // qui pose noir semi opaque). Fallback : couleur noir +
              // alpha, gl_FragColor.a fait le job en NormalBlending.
              gl_FragColor = vec4(0.0, 0.0, 0.0, alpha * 0.35);
            }
          `}
        />
      </mesh>
    </>
  );
}
