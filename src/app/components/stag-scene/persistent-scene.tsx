/* eslint-disable react-hooks/set-state-in-effect -- fichier 3D r3f : useFrame mutations 60 fps, refs pour valeurs frame-based, Math.random init particules. Patterns gamedev legitimes. */
"use client";

import { SONDE } from "@/lib/sonde";


import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { setConsoleFunction, VSMShadowMap } from "three";
import { deriveFogTint, readDirectionAccentColor, readDirectionColor } from "./direction-colors";
import SceneContent from "./scene-content";
import ShaderWarmup from "./shader-warmup";
import { useSceneRefs } from "./scene-refs-context";
import { useCurrentDirection } from "./use-current-direction";
import { useAtmosphereHour } from "./use-atmosphere-hour";
import { isBot } from "@/lib/is-bot";
import { shouldRenderContinuously } from "@/lib/reduced-motion";
import { getSceneControls, subscribeSceneControls } from "../scene-controls-store";
import { getFogTint } from "@/lib/direction-fog";
import { useReadingMode } from "@/lib/reading-mode-context";
import XolotlCompanion from "./xolotl-companion";
import MountForDirection, { PreloadOnIntent } from "./mount-for-direction";
import EhecatlWind from "./ehecatl-wind";
import styles from "./scene-stage.module.css";

/**
 * LA CHAINE DE POST-TRAITEMENT, EN MORCEAU SEPARE (10/09).
 *
 * `postprocessing` fait 633 Ko de source et vivait dans le morceau
 * principal, celui de 1,44 Mo (377 Ko compresses) que le navigateur
 * telecharge avant de pouvoir seulement demander les modeles. Or le profil
 * MOBILE coupe le post-traitement (`postFx: false`, lib/scene-controls) :
 * un telephone payait donc le transfert d'une chaine d'effets qu'il
 * n'allume jamais.
 *
 * En import dynamique, le morceau ne part que si `postFx` est vrai. Sur
 * bureau il part au meme moment qu'avant, en parallele du reste ; sur
 * mobile il ne part pas du tout. Aucun effet ne change.
 */
const PostFX = dynamic(() => import("./post-fx"), { ssr: false });

/**
 * Scène 3D persistante montée UNE seule fois dans layout.tsx
 * (28/08 refactor Phase A). Le canvas WebGL survit à toutes les
 * navigations SPA : plus de coupure structurelle au router.push,
 * plus de flash blanc, plus de reconstruction shader.
 *
 * Direction cardinale lue via usePathname (useCurrentDirection). Au
 * changement d'URL, seules les couleurs propagées (climaxRimColor,
 * climaxAccentColor, fogTint) changent : les enfants scène (StagModel,
 * RevealLighting, SpiritParticles) réagissent progressivement via
 * leurs useFrame internes (les uniforms sont mutés en douceur par
 * les setters existants, pas re-créés).
 *
 * Refs partagés (progressRef, noticedRef, etc.) viennent de
 * SceneRefsProvider, aussi monté au layout. Cohérent : tout ce qui
 * doit persister sur toute la session vit dans layout.
 */
/**
 * LES DEUX AVERTISSEMENTS QU'ON NE PEUT PAS CORRIGER, ET QU'ON TAIT.
 *
 * `THREE.Clock` est deprecie depuis three r183, mais c'est
 * react-three-fiber qui en fabrique un, pas nous ; et `X4122` vient du
 * compilateur de nuanceurs d'ANGLE, sur une somme de flottants. Aucun des
 * deux ne nous dit quoi que ce soit d'actionnable, et tous deux se repetent.
 *
 * DEUX CORRECTIONS LE 16/09.
 *
 * 1. Le filtre ne s'installait qu'en DEVELOPPEMENT. Or c'est la console de
 *    production qu'un jure ouvre : c'etait exactement l'inverse du besoin.
 *    Verifie sur la production locale, chargement de Projets plus
 *    defilement : l'avertissement de l'horloge sortait a chaque visite.
 * 2. On n'ecrase plus `console.warn` du navigateur. three r185 expose son
 *    propre crochet, `setConsoleFunction`, qui n'intercepte QUE ses
 *    messages a lui : le reste de la console reste intact, y compris nos
 *    propres avertissements et ceux de React. Remplacer `console.warn`
 *    globalement pour taire deux lignes de bibliotheque etait un filet
 *    beaucoup trop large.
 *
 * ET LE PIEGE QUI M'A EU UNE FOIS : ce crochet se prend sur `"three"`, pas
 * sur `"three/src/utils.js"`. Le paquet publie un build qui EMBARQUE
 * `utils.js` : importer la source donne une deuxieme instance du module,
 * avec son propre drapeau, que le `three` du site ne regarde jamais. Le
 * filtre s'installait alors tres bien, dans le vide.
 *
 * Ce qui n'est pas dans la liste passe, tel quel, au bon niveau.
 */
const LIBRARY_WARNINGS = ["Clock: This module has been deprecated", "warning X4122: sum of"];
let warningFilterInstalled = false;

function installLibraryWarningFilter(): void {
  if (warningFilterInstalled || typeof window === "undefined") return;
  warningFilterInstalled = true;
  setConsoleFunction((niveau: "log" | "warn" | "error", ...params: unknown[]) => {
    const texte = params.map((a) => (typeof a === "string" ? a : "")).join(" ");
    if (niveau === "warn" && LIBRARY_WARNINGS.some((w) => texte.includes(w))) return;
    const sortie = niveau === "error" ? console.error : niveau === "warn" ? console.warn : console.log;
    sortie(...params);
  });
}

// Des le chargement du module (pas dans onCreated : react-three-fiber cree
// son THREE.Clock a la creation du Canvas, avant onCreated), et en
// production comme en developpement.
installLibraryWarningFilter();

export default function PersistentScene() {
  const refs = useSceneRefs();
  const direction = useCurrentDirection();
  const hour = useAtmosphereHour();
  const readingMode = useReadingMode();
  // Frameloop demand quand tab hidden (28/08 task #60 perf). Canvas
  // r3f prop frameloop "always" (defaut) tourne rAF permanent meme
  // en tab background = drain CPU/GPU + batterie. "demand" gele le
  // canvas jusqu'a next invalidate. Bascule via visibilitychange.
  //
  // Egalement "demand" si prefers-reduced-motion, SAUF contemplation
  // explicitement demandee (09/09 : le bouton existait et ne faisait rien,
  // 0,0 % des pixels du canvas changeaient apres le clic) :
  // gele le breath cycle du cerf, la parallax camera, les
  // particles, les ambiances 5 directions. Utilisateur voit une
  // scene statique lisible (RGAA 13.6, WCAG 2.3.3).
  const [frameloop, setFrameloop] = useState<"always" | "demand">("always");
  // Skip Canvas WebGL pour bots (Lighthouse/PageSpeed/crawlers).
  // Detection post-hydration via useEffect pour eviter mismatch SSR.
  // Contenu overlay HTML reste servi (pas de cloaking).
  const [bot, setBot] = useState(false);

  useEffect(() => {
    if (isBot()) setBot(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reducedMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    function computeFrameloop() {
      // La regle vit dans lib/reduced-motion, partagee avec
      // scene-refs-context : rendre les images et animer les composants
      // sont deux decisions, mais c'est la MEME regle, et deux copies se
      // desynchroniseraient. La contemplation, elle, est une demande
      // explicite : elle gagne sur la preference systeme.
      return shouldRenderContinuously({
        prefersReduced: reducedMotionMq.matches,
        cinematicRequested: getSceneControls().cinematic,
        documentHidden: typeof document !== "undefined" && document.hidden,
        paused: getSceneControls().paused,
      })
        ? ("always" as const)
        : ("demand" as const);
    }
    const relire = () => setFrameloop(computeFrameloop());
    relire();
    document.addEventListener("visibilitychange", relire);
    reducedMotionMq.addEventListener("change", relire);
    const desabonner = subscribeSceneControls(relire);
    return () => {
      document.removeEventListener("visibilitychange", relire);
      reducedMotionMq.removeEventListener("change", relire);
      desabonner();
    };
  }, []);

  // Palette sur l'HEURE atmospherique (03/09 etage 3 Nepantla) : au
  // repos = la route ; pendant un passage cardinal, la palette
  // traverse les heures intermediaires du voyage du soleil. Les
  // enfants lissent deja ces couleurs via leurs useFrame : la
  // traversee se lit comme un balayage de teintes. data-direction et
  // les gates d'identite restent sur la route.
  const climaxRimColor = useMemo(() => readDirectionColor(hour), [hour]);
  const climaxAccentColor = useMemo(() => readDirectionAccentColor(hour), [hour]);
  // Sud : ciel de midi (getFogTint deroge a la derivation, cf direction-fog.ts).
  const fogTint = useMemo(() => getFogTint(hour, deriveFogTint(climaxRimColor)), [hour, climaxRimColor]);

  if (!refs) return null;
  if (bot) return null;
  // Mode recit accessible : demonte le Canvas WebGL pour une lecture
  // calme sans layer 3D. Les rAF Three.js s'arretent, gains CPU et
  // batterie. Le contenu HTML reste visible sur fond noir opaque.
  if (readingMode.active) return null;

  return (
    // aria-hidden (11/09, axe « region ») : la scene est decorative pour les
    // technologies d'assistance, son equivalent textuel vit dans <main>
    // (common.sceneDescriptions). Rien de focalisable ne vit ici : les
    // commandes sont dans le rail, hors de la scene.
    <div className={styles.stage} data-direction={direction} aria-hidden="true">
      <Canvas
        // Sonde de dev (05/09) : la scene three exposee pour Playwright
        // (diagnostics visuels), jamais en production.
        onCreated={(state) => {
          // Journaux de compilation des shaders (07/09) : en production,
          // three n'interroge plus le pilote (un aller-retour synchrone par
          // programme, et sur ANGLE/d3d11 des notes de precision de son
          // propre shader PMREM affichees en warning). En dev on garde tout,
          // sauf deux messages de bibliotheques qu'on ne peut pas corriger
          // ici : la depreciation de THREE.Clock (instanciee par
          // react-three-fiber 9.7) et les notes X4122 du PMREM de three.
          // `?shaders-prod` (11/09) : la suite e2e de transitions mesure sur le
          // serveur de dev, ou la verification synchrone des programmes
          // multiplie le cout de chaque compilation par quatre ou cinq. Avec
          // ce drapeau, three se comporte comme en production.
          const shadersProd = process.env.NODE_ENV === "production" || new URLSearchParams(window.location.search).has("shaders-prod");
          if (shadersProd) state.gl.debug.checkShaderErrors = false;
          if (SONDE) {
            const w = window as unknown as { __nahualScene?: unknown; __nahualR3f?: unknown };
            w.__nahualScene = state.scene;
            w.__nahualR3f = state;
          }
        }}
        // Ombres (05/09, Sud : « un jeu d'ombres delicats ») : shadow map
        // activee au niveau du Canvas, la directionnelle ne projette qu'au
        // Sud (reveal-lighting), les autres pages restent sans ombre.
        //
        // VSM, ET A MOITIE DE CARTE (16/09).
        //
        // `shadows` tout court laissait react-three-fiber demander
        // `PCFSoftShadowMap`, que three a DEPRECIE en r185 : il le
        // remplacait en silence par `PCFShadowMap`. On dessinait donc du PCF
        // dur en croyant demander du doux, depuis la montee en r185.
        //
        // VSM floute vraiment, par une passe de flou separable sur la carte.
        // Il coute TROIS textures par lumiere la ou PCF en prend deux : la
        // carte en RG demi-flottant, sa texture de profondeur, et la cible de
        // la passe de flou. A 2048 il aurait donc triple l'empreinte. Mais
        // comme il floute par construction, il n'a pas besoin de 2048 : a
        // 1024 (voir reveal-lighting) il donne un bord plus doux POUR MOINS
        // CHER que le PCF d'avant.
        //
        // Le piege a surveiller, et c'est dans la source de three
        // (WebGLShadowMap, r185) : en VSM, les objets qui RECOIVENT l'ombre
        // sont rendus dans la carte eux aussi, pas seulement ceux qui la
        // projettent. La passe d'ombre grossit donc, et c'est mesure plus bas
        // dans le message du commit.
        shadows={{ type: VSMShadowMap }}
        // Photo (05/09, controles de scene) : canvas.toBlob a besoin que le
        // tampon soit conserve apres la composition.
        gl={{ preserveDrawingBuffer: true }}
        camera={{ fov: 45, near: 0.1, far: 100 }}
        dpr={[1, refs.perfProfile.dprCap]}
        frameloop={frameloop}
      >
        <SceneContent
          progressRef={refs.progressRef}
          noticedRef={refs.noticedRef}
          climaxRimColor={climaxRimColor}
          climaxAccentColor={climaxAccentColor}
          fogTint={fogTint}
        />
        {/* Xolotl (29/08) : chien-frère de Quetzalcoatl, guide vers
            Mictlán. Spawn aléatoire session-based par direction :
            15% pages écho, 40% Mémoire (Nord), 0% home. Traverse
            fugitivement en fond ~18s. Voir codex.xolotl. */}
        {/* Xolotl : Ouest (etoile du soir) et Nord (son royaume) seulement.
            Son modele pese 1,9 Mo : le monter partout le faisait telecharger
            sur l'accueil (mesure du 08/09). */}
        <MountForDirection is={["cendre", "obsidienne"]}>
          <XolotlCompanion />
        </MountForDirection>
        {/* Precharge la direction survolee ou focalisee : navigation
            instantanee sans payer a l'arrivee. */}
        <PreloadOnIntent />
        {/* Ehecatl (03/09, etage 4 Nepantla) : le vent du passage
            cardinal rendu visible : filaments qui balaient l'orbite
            plus vite que la camera. Invisible hors transition. */}
        <EhecatlWind />
        {/* La chauffe des shaders (11/09, deuxieme tentative) : compile pendant
            le voile ce qui, sinon, se compilerait au milieu d'un geste. */}
        <ShaderWarmup />
        {refs.perfProfile.postFx && <PostFX />}
      </Canvas>
    </div>
  );
}
