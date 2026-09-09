/* eslint-disable react-hooks/set-state-in-effect -- fichier 3D r3f : useFrame mutations 60 fps, refs pour valeurs frame-based, Math.random init particules. Patterns gamedev legitimes. */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { deriveFogTint, readDirectionAccentColor, readDirectionColor } from "./direction-colors";
import PostFX from "./post-fx";
import SceneContent from "./scene-content";
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
const LIBRARY_WARNINGS = ["THREE.Clock: This module has been deprecated", "warning X4122: sum of"];
let warningFilterInstalled = false;
function installLibraryWarningFilter(): void {
  if (warningFilterInstalled || typeof window === "undefined") return;
  warningFilterInstalled = true;
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    const text = args.map((a) => (typeof a === "string" ? a : "")).join(" ");
    if (LIBRARY_WARNINGS.some((w) => text.includes(w))) return;
    original(...args);
  };
}
// Des le chargement du module (pas dans onCreated : react-three-fiber cree
// son THREE.Clock a la creation du Canvas, avant onCreated).
if (process.env.NODE_ENV !== "production") installLibraryWarningFilter();

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
    <div className={styles.stage} data-direction={direction}>
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
          if (process.env.NODE_ENV === "production") state.gl.debug.checkShaderErrors = false;
          if (process.env.NODE_ENV !== "production") {
            const w = window as unknown as { __nahualScene?: unknown; __nahualR3f?: unknown };
            w.__nahualScene = state.scene;
            w.__nahualR3f = state;
          }
        }}
        // Ombres (05/09, Sud : « un jeu d'ombres delicats ») : shadow map
        // activee au niveau du Canvas, la directionnelle ne projette qu'au
        // Sud (reveal-lighting), les autres pages restent sans ombre.
        shadows
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
        {refs.perfProfile.postFx && <PostFX />}
      </Canvas>
    </div>
  );
}
