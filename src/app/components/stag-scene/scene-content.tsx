"use client";

import { Suspense, type MutableRefObject } from "react";
import type { ColorRgb } from "@/lib/reveal-arc";
import BackgroundFlora from "./background-flora";
import CardinalAmbience from "./ambience/cardinal-ambience";
import CursorRevealScene from "./cursor-reveal-scene";
import EnvironmentDepthFade from "./environment-depth-fade";
import Grass from "./grass";
import Ground from "./ground";
import Milpa from "./milpa";
import Ocotillo from "./ocotillo";
import OrbitCamera from "./orbit-camera";
import PiedraGround from "./piedra-ground";
import RevealLighting from "./reveal-lighting";
import StagMirror from "./stag-mirror";
import TezcatlWater from "./tezcatl-water";
import ObsidianBlades from "./obsidian-blades";
import ObsidianArrows from "./obsidian-arrows";
import ArrowVapor from "./arrow-vapor";
import XiuhcoatlCompanion from "./xiuhcoatl-companion";
import SudSky from "./sud-sky";
import SudSkyBodies from "./sud-sky-bodies";
import CentzonStars from "./centzon-stars";
import HuitzilinBirds from "./huitzilin-birds";
import PiedraXiuhcoatlRing from "./piedra-xiuhcoatl-ring";
import SudSpines from "./sud-spines";
import AmateStrips from "./amate-strips";
import FurShells from "./fur-shells";
import CempasuchilPath from "./cempasuchil-path";
import MictlanMist from "./mictlan-mist";
import StagModel from "./stag-model";
import Vines from "./vines";
import { useCurrentDirection } from "./use-current-direction";

/**
 * Contenu 3D partagé entre la home et les pages écho (Services/Projets/
 * Contact/Mémoire) depuis le 25/08. Première variante par direction
 * activée le 25/08 (soir) : la couleur cible du fog et du liseré du
 * cerf change par page (Codex Nahual section 03 : home=jade,
 * Services=doré, Projets=turquoise, Contact=cendre, Mémoire=obsidienne).
 * Les couleurs sont résolues une seule fois dans SceneStage (à partir
 * de la variable CSS de la direction) et propagées ici via ctx. Le
 * reste de la scène (flore, animations, cadrage caméra) reste
 * identique : les enrichissements par direction (pose du cerf,
 * densité de flore, ambiance) viendront quand nous les coderons
 * (Sylvain : "chaque scène sera spécifique et enrichie").
 */
export default function SceneContent({
  progressRef,
  noticedRef,
  climaxRimColor,
  climaxAccentColor,
  fogTint,
}: {
  progressRef: MutableRefObject<number>;
  noticedRef: MutableRefObject<boolean>;
  climaxRimColor: string;
  climaxAccentColor: string;
  fogTint: ColorRgb;
}) {
  const north = useCurrentDirection() === "obsidienne";
  return (
    <>
      {/* Le fog vit dans RevealLighting (couleur pilotée par le scroll,
       * cf getFogColor) : un seul point de vérité. climaxRimColor tinte
       * les lumières ambient+directional au climax pour que le décor
       * PBR entier suive la direction cardinale (retour Sylvain 26/08). */}
      <RevealLighting progressRef={progressRef} fogTint={fogTint} climaxRimColor={climaxRimColor} />
      {/* Perspective atmosphérique (18/08, retour Sylvain : "plus on est
       * loin et plus ça devient gris, comme en peinture") : uniquement
       * sur le décor/fond, jamais sur le cerf (rim-light.ts à la place)
       * ni sur le maïs/les lianes (compagnons immédiats du sujet). */}
      {/* Révélation par curseur (18/08) : portée : toute la scène 3D,
       * cerf inclus (contrairement à EnvironmentDepthFade qui l'exclut). */}
      <CursorRevealScene noticedRef={noticedRef} progressRef={progressRef}>
        <EnvironmentDepthFade>
          <Ground />
          <Suspense fallback={null}>
            <PiedraGround />
          </Suspense>
          {/* Aucune plante au Nord (03/09, retour Sylvain "enlever toutes les
            * plantes, meme les cactus") : le Mictlan est le lieu sans pousse,
            * seul le cempasuchil y est depose. Flore de fond, ocotillos,
            * herbe : caches d'un bloc ; milpa et lianes ont leur propre fondu. */}
          <group visible={!north}>
            <Suspense fallback={null}>
              <BackgroundFlora />
            </Suspense>
            <Suspense fallback={null}>
              <Ocotillo />
            </Suspense>
            <Suspense fallback={null}>
              <Grass />
            </Suspense>
          </group>
        </EnvironmentDepthFade>
        <Suspense fallback={null}>
          <StagModel
            progressRef={progressRef}
            noticedRef={noticedRef}
            climaxRimColor={climaxRimColor}
            climaxAccentColor={climaxAccentColor}
          />
        </Suspense>
        <Suspense fallback={null}>
          <Milpa progressRef={progressRef} />
        </Suspense>
        <Suspense fallback={null}>
          <Vines progressRef={progressRef} />
        </Suspense>
      </CursorRevealScene>
      <OrbitCamera progressRef={progressRef} />
      <CardinalAmbience />
      {/* Reflet menteur du tezcatl (01/09 etage 4, Nord uniquement :
       * fade interne par direction). Hors CursorRevealScene : le miroir
       * de Tezcatlipoca ne repond pas au tonalli du visiteur, il ment
       * de lui-meme. */}
      <Suspense fallback={null}>
        <StagMirror />
      </Suspense>
      {/* La nappe d'eau (02/09) : ~20 cm d'eau calme sur toute la surface,
       * simulateur d'eau (equation des ondes), anneaux a la souris,
       * par-dessus le reflet. Nord uniquement (gate interne). */}
      <TezcatlWater />
      {/* Le vent d'Itzehecayan (02/09) : lames d'obsidienne en modeles,
       * un InstancedMesh, Nord uniquement (fondu interne). */}
      <ObsidianBlades />
      {/* Temiminaloyan (02/09) : volees de fleches en profondeur de
       * scroll, impacts dans l'eau. Nord uniquement. */}
      <ObsidianArrows />
      {/* Vaporisation des fleches plantees (04/09) : sprite charge par
       * useTexture, d'ou le Suspense. */}
      <Suspense fallback={null}>
        <ArrowVapor />
      </Suspense>
      {/* Le serpent de feu du Sud (04/09) : passage rare au-dessus du cerf,
       * modele Blender charge par useGLTF, d'ou le Suspense. */}
      <Suspense fallback={null}>
        <XiuhcoatlCompanion />
      </Suspense>
      {/* Le ciel de midi du Sud (04/09) : dome hors fog, horizon = couleur
       * du brouillard, zenith plus profond ; noir en haut de page. */}
      <SudSky />
      {/* La lune et les nuages du Sud (05/09) : la lune s'efface quand le
       * soleil monte, les nuages derivent et blanchissent au midi. */}
      <SudSkyBodies />
      {/* Les 400 etoiles du Sud (04/09, lead) : sur le dome de nuit, elles
       * meurent et tombent a mesure que le midi monte. */}
      <CentzonStars />
      {/* Les colibris du Sud (04/09, contre-chant) : vrai modele Poly,
       * couleurs d'especes, ailes battues par shader, chasseurs d'etoiles. */}
      <Suspense fallback={null}>
        <HuitzilinBirds />
      </Suspense>
      {/* Voie B (04/09) : l'anneau exterieur de la Piedra, les deux
       * xiuhcoatl graves, prend la matiere du serpent et s'embrase au midi. */}
      <Suspense fallback={null}>
        <PiedraXiuhcoatlRing />
      </Suspense>
      {/* Les epines du Sud (04/09) : agaves et nopals plus nombreux. */}
      <Suspense fallback={null}>
        <SudSpines />
      </Suspense>
      {/* Bandelettes d'amate (02/09) : la protection de papier contre le
       * vent d'obsidienne, aux bois et sur le dos, simulateur Verlet.
       * Nord uniquement. */}
      <AmateStrips />
      {/* Le poil du cerf noir (02/09) : coques extrudees sur le maillage
       * skinne, Nord uniquement, desktop seulement. */}
      <FurShells />
      {/* Chemin de cempasuchil (02/09) : la fleur qui guide les ames, en
       * vrais modeles (Quaternius CC0), flottant sur la nappe depuis le
       * cerf vers le Nord, s'allonge en descendant. Nord uniquement. */}
      <Suspense fallback={null}>
        <CempasuchilPath />
      </Suspense>
      {/* Nappes de brouillard (03/09) : simulateur de fluide aux bords du
       * bassin, trois nappes empilees qui voilent la margelle. Nord
       * uniquement. */}
      <MictlanMist />
    </>
  );
}
