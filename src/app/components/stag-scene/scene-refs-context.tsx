"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { arcProgress, arcScrollHeight, exitProgress } from "@/lib/reveal-arc";
import { getPerfProfile, type PerfProfile } from "@/lib/mobile-perf";
import { getSceneControls, hydrateSceneControls, subscribeSceneControls } from "../scene-controls-store";
import { shouldReduceMotion } from "@/lib/reduced-motion";

/**
 * Contexte partagé des refs et de l'état runtime de la scène 3D
 * (28/08 refactor Phase A "PersistentScene in layout"). Extrait de
 * l'ancien SceneStage pour vivre au niveau layout : le canvas WebGL
 * persiste ainsi entre navigations SPA, plus de coupure structurelle
 * au router.push.
 *
 * Contient :
 *  - progressRef : scroll 0..1 partagé par tous les composants scène
 *    (RevealLighting, OrbitCamera, StagModel, SpiritParticles, etc.)
 *  - noticedRef : "a-t-il remarqué le visiteur", partagé scroll+souris
 *  - reducedMotionRef : préférence utilisateur, évalué au mount
 *  - perfProfile : profil mobile-friendly (dprCap, postFx flag)
 *
 * Scroll listener et lifecycle handlers montés une seule fois par
 * session (layout persist), pas remontés à chaque page. Reset scroll
 * au mount initial uniquement (pas à chaque nav SPA, geste normal
 * quand on reste dans l'univers).
 */

// 2 viewports scroll = arc reveal complet (200vh scrollables). Choix
// fixe : contenus courts (Contact) jouent quand même l'arc entier,
// contenus longs jouent l'arc sur les 200vh initiaux puis contenu
// continue au-dessus du canvas figé "chemins révélés".
// 08/09 : la constante et le calcul vivent dans reveal-arc.ts, avec le
// reste de l'arc. Ils étaient recopiés ici ET dans scene-controls.tsx, et
// la cloche du climax en fait un troisième lecteur : trois copies d'un
// même réglage auraient divergé sans bruit.

// Classe scope pour globals.css (les .header_bottom nav a etc.).
const REVEAL_SCOPE_CLASS = "nahual-lab-reveal";

export type SceneRefs = {
  progressRef: MutableRefObject<number>;
  noticedRef: MutableRefObject<boolean>;
  reducedMotionRef: MutableRefObject<boolean>;
  perfProfile: PerfProfile;
  // Pin face-a-face progress (28/08 boite outil #6) : 0..1 sur la
  // fenetre de scroll pin (300vh apres l'arc reveal). Alimente par
  // FaceAFacePin composant via GSAP ScrollTrigger scrub. Consommé par
  // PostFX (bloom boost) + OrbitCamera (dolly + fov).
  pinProgressRef: MutableRefObject<number>;
  // L'ACTE DE SORTIE (10/09, F2) : 0..1 sur la fenetre courte QUI SUIT
  // l'arc. Avant, ce defilement-la etait mort : mesure du 10/09, l'arc
  // finissait a 63,5 % de la page et le tiers restant se faisait sur une
  // image figee. Lu par OrbitCamera (le cadre se resserre, la camera prend
  // de la hauteur) et PostFX (le cadre se ferme).
  exitRef: MutableRefObject<number>;
};

const SceneRefsContext = createContext<SceneRefs | null>(null);

export function SceneRefsProvider({ children }: { children: ReactNode }) {
  const progressRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const noticedRef = useRef(false);
  const pinProgressRef = useRef(0);
  const exitRef = useRef(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  // Mode eco (05/09, controles de scene) : profil de rendu leger force.
  const [eco, setEco] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydratation depuis le stockage, cote client seulement
    setEco(hydrateSceneControls().eco);
    return subscribeSceneControls((s) => setEco(s.eco));
  }, []);
  const perfProfile = useMemo(() => getPerfProfile(viewportWidth, eco), [viewportWidth, eco]);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Le drapeau que TOUS les composants de la scene lisent pour figer
    // leurs animations. La contemplation est une demande explicite de
    // l'utilisateur : elle gagne sur la preference systeme (regle unique
    // dans lib/reduced-motion, partagee avec le frameloop du canvas).
    // Relu au changement de preference ET au changement de controles :
    // avant le 09/09 il etait pose une seule fois au montage, si bien
    // qu'un visiteur qui changeait sa preference systeme, ou qui demandait
    // la contemplation, gardait l'ancien comportement pour la session.
    const relireMouvement = () => {
      reducedMotionRef.current = shouldReduceMotion(reducedMotionQuery.matches, getSceneControls().cinematic);
    };
    relireMouvement();
    reducedMotionQuery.addEventListener("change", relireMouvement);
    const desabonnerMouvement = subscribeSceneControls(relireMouvement);

    // Reset scroll au mount initial de la session (le layout persiste entre
    // les navigations, donc ce reset ne se rejoue pas au changement de
    // page).
    //
    // 16/09 : LE RESTE DE CE COMMENTAIRE ETAIT DEVENU FAUX. Il disait que
    // « l'utilisateur qui navigue en interne ne veut pas repartir de zero a
    // chaque nav ». Sylvain a tranche l'inverse : chaque direction porte un
    // arc complet, et arriver au milieu, c'est arriver quand tout est deja
    // joue. La remontee se fait desormais PENDANT le passage, en glissant,
    // et elle vit dans lib/descente-nepantla.
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    document.body.classList.add(REVEAL_SCOPE_CLASS);

    // Mouvement reduit : l'arc NE PROGRESSE PAS. C'est la cause profonde
    // du gel, plus encore que le frameloop du canvas -- la scene ne reste
    // pas seulement sur la meme image, elle reste sur le meme ETAT (au Sud,
    // la nuit d'arrivee, quoi qu'on scrolle). C'est le choix documente du
    // 28/08 ("une scene statique lisible"), et le mode recit accessible
    // est l'alternative offerte. Des que la contemplation est demandee,
    // reducedMotionRef repasse a faux et l'arc se remet a suivre le scroll.
    function handleScroll() {
      if (reducedMotionRef.current) return;
      // UNE SEULE LECTURE DE MISE EN PAGE POUR LES DEUX (20/09). L'arc et la
      // sortie comptent desormais sur la meme page, donc ils lisent la meme
      // valeur au meme endroit -- et il y en a moins qu'avant, pas plus.
      // Gratuit ici : un ecouteur `scroll` s'execute quand la mise en page
      // est deja a jour, contrairement a un rappel d'image (oracle
      // `lectures-de-mise-en-page`, 16/09).
      const vh = window.innerHeight;
      const maxScroll = document.documentElement.scrollHeight - vh;
      progressRef.current = arcProgress(window.scrollY, vh, maxScroll);
      exitRef.current = exitProgress(window.scrollY, vh, maxScroll);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    // SONDE DE L'ARC (20/09). L'oracle « l'arc finit ou la sortie
    // commence » doit lire ce que le site TIENT, pas recalculer la regle de
    // son cote : un oracle qui refait le calcul ne garde que lui-meme. Meme
    // motif que __nahualFoyer / __nahualFrost / __nahualCihuateteo. On
    // expose les refs, pas leurs valeurs, pour que la lecture soit vivante.
    (window as unknown as { __nahualArc?: unknown }).__nahualArc = {
      progress: progressRef,
      exit: exitRef,
      // La longueur de l'arc de CETTE page, calculee par la fonction du site
      // et pas par une copie cote test : c'est ce qui permet aux sept
      // rebasages du 20/09 de viser « 80 % de l'arc » au lieu de « 1,6
      // fenetre ». Un test en pixels absolus est vert par accident sur une
      // page et rouge sur une autre.
      longueur: () => arcScrollHeight(window.innerHeight, document.documentElement.scrollHeight - window.innerHeight),
    };
    return () => {
      window.removeEventListener("scroll", handleScroll);
      reducedMotionQuery.removeEventListener("change", relireMouvement);
      desabonnerMouvement();
      document.body.classList.remove(REVEAL_SCOPE_CLASS);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  const value = useMemo<SceneRefs>(
    () => ({ progressRef, noticedRef, reducedMotionRef, perfProfile, pinProgressRef, exitRef }),
    [perfProfile],
  );

  return <SceneRefsContext.Provider value={value}>{children}</SceneRefsContext.Provider>;
}

/** Consomme les refs partagés : null hors provider. Chaque composant
 *  scène 3D (StagModel/OrbitCamera/…) doit être monté sous ce provider
 *  (layout.tsx en pratique). */
export function useSceneRefs(): SceneRefs | null {
  return useContext(SceneRefsContext);
}
