"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, EffectGroup, HueSaturation, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { approachGrade, getGradeRig, type GradeRig } from "@/lib/direction-grade";
import { useCardinalTransition } from "./cardinal-transition-context";
import { useAtmosphereHour } from "./use-atmosphere-hour";
import { useSceneRefs } from "./scene-refs-context";
import OllinShockwave from "./ollin-shockwave";
import NepantlaBlur from "./nepantla-blur";
import XiuhcoatlHeat from "./xiuhcoatl-heat";

/**
 * Post-processing : retour de Sylvain le 18/08, après audit comparé à des
 * sites de référence (Lusion, cf Codex Nahual/memory project-nahual-da) :
 * le plus gros écart entre /lab et une expérience "haute facture" n'était
 * pas le nombre d'objets dans la scène (sol/montagnes/herbe ajoutés plus
 * tôt ce soir), mais l'absence totale de post-processing : tout tournait
 * en meshStandardMaterial par défaut, sans bloom/vignette/grade, ce qui se
 * lit comme une démo Three.js plutôt qu'une direction artistique.
 *
 * Effets volontairement sobres : le sujet doit rester lisible, l'effet ne
 * doit jamais devenir le sujet.
 * - Bloom : seuil de luminance modéré (pas de matériau emissive dans la
 *   scène pour l'instant : capte les zones déjà les plus lumineuses,
 *   spéculaires sur le cerf, fleurs rouges éclairées).
 * - Vignette : assombrit les bords, recentre l'œil sur le sujet : le
 *   levier le plus simple pour une lecture "cinématographique" plutôt que
 *   "capture d'écran d'un moteur 3D".
 * - ChromaticAberration : décalage minime, juste assez pour casser le
 *   rendu "trop propre"/synthétique par défaut d'un rendu WebGL sans
 *   grain : pas un effet de lentille appuyé.
 *
 * Phase C cinématographie (28/08) : pendant le burst de transition
 * cardinale, Bloom.intensity + ChromaticAberration.offset boostés en
 * bell curve. Signal cinéma renforcé synchro avec dolly caméra + FOV
 * shift (OrbitCamera) + head-look cerf (StagModel). Rester dans les
 * ordres de grandeur "sobres" (bloom max ~1.4, CA max ~0.002) : le
 * boost doit rester subtile SOTA cinéma, pas gimmick.
 */

const BLOOM_BASE = 0.6;
const BLOOM_BURST_ADD = 0.8;
const CA_BASE = 0.0006;
const CA_BURST_ADD = 0.0012;

/**
 * LA PROFONDEUR DE CHAMP (28/08, refaite le 10/09).
 *
 * Ce qui ne marchait pas : `focusDistance` et `focusRange` sont en UNITES
 * MONDE dans postprocessing 6.39 (le shader du cercle de confusion fait
 * `distance - focusDistance` sur une distance de vue, pas sur une
 * profondeur normalisée). On passait 0,03 et 0,06 : le plan de netteté
 * était à trois centimètres de la caméra et la plage de netteté faisait six
 * centimètres. Tant que le bokeh restait à zéro, personne ne le voyait ;
 * mais pendant un passage cardinal, où il montait à 3, TOUT le cadre
 * partait dans le flou, cerf compris. Le commentaire promettait un focus
 * rack, le shader rendait un flou plat.
 *
 * Ce qu'on fait maintenant : la mise au point suit une CIBLE, l'origine du
 * décor à hauteur de regard, et l'effet recalcule la distance à chaque
 * image depuis la position réelle de la caméra. Toutes les pages sont
 * bâties autour de cette origine (le cerf, le bassin, la Piedra, le
 * carrefour) : une seule cible suffit, il n'y a pas de table par direction
 * à tenir.
 *
 * La plage de netteté (12 u) couvre l'avant-plan et toute la prairie
 * (rayon 16 u) ; ce qui part dans le flou, ce sont les montagnes et le
 * ciel, là où l'oeil n'a rien à lire. Le bokeh de repos reste discret :
 * c'est une signature, pas un effet.
 */
const DOF_TARGET_Y = 1; // getOrbitCameraTarget().y : la ligne de regard
// Stable entre les rendus : l'effet garde la reference et recalcule la
// distance a chaque image depuis la camera.
const DOF_TARGET: [number, number, number] = [0, DOF_TARGET_Y, 0];
const DOF_FOCUS_RANGE = 12;
const DOF_BASE_BOKEH = 1.4;
const DOF_BURST_BOKEH = 3.0;

export default function PostFX() {
  const bloomRef = useRef<{ intensity: number } | null>(null);
  const caRef = useRef<{ offset: { x: number; y: number } } | null>(null);
  const dofRef = useRef<{ bokehScale: number } | null>(null);
  const vignetteRef = useRef<{ darkness: number } | null>(null);
  const hueSatRef = useRef<{ saturation: number } | null>(null);
  const transition = useCardinalTransition();
  const refs = useSceneRefs();
  // Grade sur l'heure atmospherique (03/09 etage 3 Nepantla) : pendant
  // un passage cardinal, le grade traverse les heures intermediaires
  // du voyage du soleil, meme cadence de lissage que fog et rig.
  const hour = useAtmosphereHour();
  const gradeRef = useRef<GradeRig>({ ...getGradeRig(hour) });

  useFrame(() => {
    // Grade par direction : snap si prefers-reduced-motion (meme
    // convention que fog/rig), sinon easing vers la cible.
    const gradeTarget = getGradeRig(hour);
    gradeRef.current = refs?.reducedMotionRef.current
      ? { ...gradeTarget }
      : approachGrade(gradeRef.current, gradeTarget, 0.06);
    const grade = gradeRef.current;
    if (hueSatRef.current) {
      hueSatRef.current.saturation = grade.saturation;
    }

    // Vignette breathing scroll (28/08 boite outil D) : vignette
    // darkness varie selon progress reveal-arc : plus forte en
    // penombre (0.9) relaxe au climax chemins reveles (0.65). Signature
    // "l'oeil s'ouvre progressivement au monde nahual". Le grade
    // directionnel s'ajoute par-dessus (Nord : cadre ferme).
    if (vignetteRef.current && refs) {
      const p = refs.progressRef.current;
      vignetteRef.current.darkness = 0.9 - p * 0.25 + grade.vignetteAdd;
    }

    if (!transition) return;
    const p = transition.transitionProgressRef.current;
    const active = transition.transitionDirection !== null && p > 0;
    const bell = active ? Math.sin(p * Math.PI) : 0;

    if (bloomRef.current) {
      // Sound-reactive bloom (28/08 boite outil #3) : si audio level
      // dispo (window.__nahualAudioLevel pose par SoundDesign quand
      // unmuted), ajoute pulse proportionnel. Silencieux si mute.
      const audioLevel = typeof window !== "undefined"
        ? (window as unknown as { __nahualAudioLevel?: { current: number } }).__nahualAudioLevel?.current ?? 0
        : 0;
      // Pin face-a-face bloom boost (28/08 boite outil #6) : pendant
      // scrub pin, bloom monte de 0 a +1.5 = pic dramatique "regard
      // silencieux amplifie".
      const pinLevel = refs?.pinProgressRef.current ?? 0;
      // Le grade directionnel module l'ensemble (Nord : bloom sourd,
      // rien ne brille chez les morts sauf les lames).
      bloomRef.current.intensity = (BLOOM_BASE + bell * BLOOM_BURST_ADD + audioLevel * 0.6 + pinLevel * 1.5) * grade.bloomScale;
    }
    if (caRef.current) {
      const offset = CA_BASE + bell * CA_BURST_ADD;
      caRef.current.offset.x = offset;
      caRef.current.offset.y = offset;
    }
    if (dofRef.current) {
      // Au repos, le bokeh de base ; pendant un passage cardinal il monte
      // en cloche. Le sujet reste net parce que la mise au point est sur
      // lui : c'est ce qui fait un focus rack et non un flou plat.
      dofRef.current.bokehScale = DOF_BASE_BOKEH + bell * DOF_BURST_BOKEH;
    }
  });

  return (
    <EffectComposer multisampling={4}>
      {/* OllinShockwave (29/08) : onde de pression au pointerdown user,
          signature nahua "tremblement d'Ollin". En premier de la
          chaine : deforme la scene rendue AVANT DOF/bloom/CA, effet
          plus organique (le bokeh et le bloom prennent la distortion
          en compte). Skip si prefers-reduced-motion ou reading-mode.

          EffectGroup OBLIGATOIRE (01/09) : @react-three/postprocessing
          3.1.1 (arrive avec la migration pnpm, ^3.0.5 resolvait avant
          en 3.0.5) fusionne les effets consecutifs dans une meme
          EffectPass et ne coupe qu'entre deux convolutions. Sans ce
          groupe, Ollin (transforme les UV) est fusionne avec DOF
          (convolution) : postprocessing jette "Effects that transform
          UVs are incompatible with convolution effects" et le canvas
          crashe (page blanche prod du 01/09 matin). EffectGroup isole
          Ollin dans sa propre passe, a sa position dans la chaine. */}
      <EffectGroup>
        <OllinShockwave />
      </EffectGroup>
      {/* Flou de file Nepantla (03/09 etage 2b) : pan blur horizontal
          pendant le voyage cardinal, net sur le cerf, intensite =
          vitesse de l'orbite. AVANT DOF/bloom : le bloom eclaire
          l'image deja filee (physique d'un vrai pano rapide).
          EffectGroup obligatoire : 8 taps = convolution, interdit de
          fusionner avec Ollin qui transforme les UV (lecon 01/09). */}
      <EffectGroup>
        <NepantlaBlur />
      </EffectGroup>
      {/* Trainee chaude du xiuhcoatl (04/09, Sud) : l'air tremble derriere
          le serpent de feu (refraction fine, pas de fumee). Transforme les
          UV : EffectGroup obligatoire, comme Ollin. Muet quand il est
          absent (force 0, sortie immediate du shader). */}
      <EffectGroup>
        <XiuhcoatlHeat />
      </EffectGroup>
      {/* DOF en second : les autres effets (bloom, CA) s'appliquent
          par-dessus le rendu focus-racké. Focus fixe sur ~cerf.
          bokehScale animé par useFrame ci-dessus. */}
      <DepthOfField
        ref={dofRef as never}
        target={DOF_TARGET}
        focusRange={DOF_FOCUS_RANGE}
        bokehScale={DOF_BASE_BOKEH}
      />
      <Bloom
        ref={bloomRef as never}
        intensity={BLOOM_BASE}
        luminanceThreshold={0.35}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      {/* Aberration chromatique MODULEE PAR LE RAYON (08/09). Sans le
          drapeau `radialModulation`, qui vaut `false` par defaut dans
          postprocessing 6.39.4, le shader installe fait
          `ra = texture(inputBuffer, uv + shift)` avec un shift CONSTANT sur
          tout l'ecran, centre compris : ce n'est pas le comportement d'un
          objectif, c'est un decalage R/B uniforme. Au zoom 1:1 en
          production, chaque brin d'herbe sortait magenta d'un cote et cyan
          de l'autre, et les traits graves de la Piedra pareil : lu comme un
          artefact de compression, sur les cinq scenes.

          Avec le drapeau, le shader calcule
          `d = max(distance(uv, centre) * 2 - modulationOffset, 0)` puis
          `mix(uv, uv + shift, d)` : d vaut 0 au centre, 1 au bord median,
          1,41 dans les coins. `modulationOffset` est donc le RAYON PROPRE :
          en dessous, aucun decalage. A 0,6, le centre du cadre est net, il
          reste 40 % du decalage au bord median et 81 % dans les coins, la
          ou un objectif le produit vraiment. L'intensite (`offset`) ne
          change pas, seule sa repartition. Cout GPU nul. */}
      <ChromaticAberration
        ref={caRef as never}
        offset={[CA_BASE, CA_BASE]}
        radialModulation
        modulationOffset={0.6}
      />
      {/* Grade directionnel (01/09 etage 3) : saturation animee par
          useFrame selon la direction (0 partout sauf Nord -0.15,
          leçon Coco : l'air rabat les couleurs). Non-convolution :
          fusionne sans risque dans la passe Bloom/CA/Vignette. */}
      <HueSaturation ref={hueSatRef as never} saturation={0} />
      <Vignette ref={vignetteRef as never} eskil={false} offset={0.25} darkness={0.85} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}
