/* eslint-disable react-hooks/immutability -- fichier 3D r3f : useFrame mutations 60 fps, refs pour valeurs frame-based, Math.random init particules. Patterns gamedev legitimes. */
"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { getOrbitCameraPosition, getOrbitCameraTarget } from "@/lib/camera-path";
import { swingAzimuth, swingSpeed } from "@/lib/nepantla";
import { useCardinalTransition } from "./cardinal-transition-context";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";
import { xiuhcoatlStore } from "./xiuhcoatl-store";

/**
 * Applique à chaque frame la trajectoire pure de src/lib/camera-path.ts.
 * progressRef est un ref (pas un state) : la position du scroll change à
 * haute fréquence, la faire transiter par le state React re-rendrait tout
 * l'arbre à chaque tick pour rien : useFrame lit le ref directement.
 *
 * Parallaxe souris (27/08, retour Sylvain "effet paralaxe sur cerf pour
 * les mouvements de souris"). Signature Awwwards-level classique :
 * la caméra décale légèrement selon la position souris (XY normalisée
 * -1..1), la cible reste sur le cerf → l'orbite pivote autour du sujet
 * en fonction de l'utilisateur. Amplitude sub-unitaire pour rester
 * subtile (pas de gimmick), lerp 0.08 pour lisser les tremblements du
 * pointeur.
 *
 * Respect prefers-reduced-motion : parallaxe désactivée sous ce media,
 * même garde-fou d'accessibilité que le reste de l'arc (cf reveal-arc.ts
 * et cursor-reveal.ts).
 */
const SOUTH_CAMERA_DROP = 0.2;
const SOUTH_TARGET_LIFT = 1.0; // 1.1 -> 1.0 (05/09, retour Sylvain : la stele de l'annee coupee en bas)
// Recul Huitztlampa (04/09, Sylvain : « reculer la caméra, le cerf est aussi
// important, il faut bien avoir toute la vue ») : rayon x1.36 (7 -> 9.5 en
// tete de page), cerf entier et ciel dans le meme cadre.
const SOUTH_RADIUS_SCALE = 1.48; // 1.36 -> 1.48 (05/09, « encore reculer un peu »)
const PARALLAX_X = 0.5;
const PARALLAX_Y = 0.35;
const MOUSE_LERP = 0.08;
// Multiplicateur maximum du parallax pendant une onde Ollin (29/08).
// Au peak du press, la camera suit ×2.5 plus fort le curseur, decroit
// avec l'onde (~800ms). Signature "l'onde tire aussi le regard".
const OLLIN_PARALLAX_BOOST = 1.5;

/**
 * Touch drag orbit (28/08 task #50 mobile). Sur devices touch, un
 * swipe horizontal/vertical dérive l'orbite caméra avec accumulation
 * persistante : le cerf peut être observé sous plusieurs angles au
 * lieu du parallax souris limité aux -1..1 souris. Reset progressif
 * au relâchement pour ne pas rester bloqué.
 */
const TOUCH_ORBIT_X = 0.008; // rad par px horizontal
const TOUCH_ORBIT_Y = 0.005;
const TOUCH_DECAY = 0.02; // retour à 0 par frame

/**
 * Voyage cardinal Nepantla (03/09, etage 2, remplace le dolly + whip
 * pan aller-retour du 28/08 : retour Sylvain "si l'on part sur un
 * cote, ce n'est pas pour revenir"). Pendant le passage, la camera
 * fait UN TOUR COMPLET autour du cerf dans le sens de la direction
 * (swingAzimuth, lib/nepantla), lent-rapide-lent : le cerf est l'axe
 * du monde, le monde tourne autour de lui, et la camera retombe
 * exactement sur sa position de repos (2π periodique) : plan-sequence
 * sans coupe. La vitesse de l'orbite (swingSpeed, pic au moment de la
 * nav) pilote une respiration de recul + montee (le voyage prend de
 * la hauteur, arc du soleil) et l'ouverture du FOV.
 */
const SWING_DOLLY = 0.35; // recul relatif du rayon au pic de vitesse
const SWING_LIFT = 0.9; // montee (unites monde) au pic de vitesse
const SWING_FOV = 10; // ouverture FOV (degres) au pic de vitesse

export default function OrbitCamera({
  progressRef,
}: {
  progressRef: MutableRefObject<number>;
}) {
  const { camera } = useThree();
  // Position souris cible (normalisée -1..1) et position lissée qui
  // rattrape doucement : évite un mouvement caméra saccadé sur chaque
  // événement pointermove.
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mouseSmoothRef = useRef({ x: 0, y: 0 });
  const reducedMotionRef = useRef(false);
  // Touch drag orbit (task #50 mobile). Accumule un offset X/Y en radians
  // pendant le drag, decay à 0 progressif au relâchement.
  const touchOffsetRef = useRef({ x: 0, y: 0 });
  const touchLastRef = useRef<{ x: number; y: number } | null>(null);
  const transition = useCardinalTransition();
  const sceneRefs = useSceneRefs();
  const direction = useCurrentDirection();
  // Caméra Mictlampa (01/09, fiche Nord + retour Sylvain "jouer sur la
  // caméra : parcours ET traitement") : blend 0..1 crossfadé vers 1 au
  // Nord, qui pilote a la fois le traitement (FOV compressé -5°,
  // plongée légère, parallax amorti) et le parcours. Parcours retravaillé
  // le 02/09 : d'abord la même hélice décalée d'un demi-tour ("point
  // opposé"), mais on partait de dos (retour Sylvain "la caméra ne me
  // plaît pas trop"), puis HÉLICE MIROIR (option 1 validée) : même départ
  // face au cerf, l'orbite tourne dans l'autre sens et finit sur la vue
  // 3/4 symétrique. Avant le 02/09, le progress caméra suivait l'arc de
  // lumière remappé et la caméra reculait puis revenait : incohérent.
  const northBlendRef = useRef(direction === "obsidienne" ? 1 : 0);
  // Caméra Huitztlampa (04/09, retour Sylvain « ajuster la caméra pour
  // voir plus de ciel ») : au Sud le regard se lève vers le ciel où naît le
  // soleil (Coatepec) : la cible monte, la caméra descend un peu
  // (contre-plongée légère). Mesuré : la crête des montagnes culmine à
  // ~3° d'élévation et le bandeau de navigation coupe vers +5,5° avec le
  // regard de base ; avec le regard levé, la bande de ciel va de 3° à 16°,
  // c'est là que passe le xiuhcoatl. Le cerf reste entier dans le cadre
  // (sabots juste au-dessus du titre).
  const southBlendRef = useRef(direction === "turquoise" ? 1 : 0);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType === "touch" && touchLastRef.current) {
        const dx = event.clientX - touchLastRef.current.x;
        const dy = event.clientY - touchLastRef.current.y;
        touchOffsetRef.current.x += dx * TOUCH_ORBIT_X;
        touchOffsetRef.current.y += dy * TOUCH_ORBIT_Y;
        touchLastRef.current = { x: event.clientX, y: event.clientY };
        return;
      }
      // Souris / stylet : parallax comme avant
      mouseTargetRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseTargetRef.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    }
    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "touch") {
        touchLastRef.current = { x: event.clientX, y: event.clientY };
      }
    }
    function onPointerUp() {
      touchLastRef.current = null;
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  useFrame(() => {
    // Lissage exponentiel de la souris (pas de deriv brusque au tick suivant).
    mouseSmoothRef.current.x += (mouseTargetRef.current.x - mouseSmoothRef.current.x) * MOUSE_LERP;
    mouseSmoothRef.current.y += (mouseTargetRef.current.y - mouseSmoothRef.current.y) * MOUSE_LERP;

    // Mobile-aware camera path (28/08 retour Sylvain "le cerf doit
    // etre totalement visible en fin de page aussi"). Sur mobile
    // <768px, augmente radius + height pour garder cerf entier dans
    // le cadre malgre FOV plus large. Recalcule chaque frame (cheap)
    // pour reagir au resize.
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    // Blend Nord crossfadé (même cadence que fog/rig/grade).
    const northTarget = direction === "obsidienne" ? 1 : 0;
    northBlendRef.current += (northTarget - northBlendRef.current) * 0.06;
    const nb = northBlendRef.current;
    const southTarget = direction === "turquoise" ? 1 : 0;
    southBlendRef.current += (southTarget - southBlendRef.current) * 0.06;
    const sb = southBlendRef.current;
    // Parcours : la même hélice partout ; au Nord, en miroir. Crossfade
    // par le blend nb : interpolation entre la position normale et la
    // position miroir (même rayon, même hauteur, seul l'azimuth diffère :
    // la caméra pivote autour du cerf au changement de direction).
    const rawP = progressRef.current;
    const northEase = nb * nb * (3 - 2 * nb);
    const pathOpts = isMobile ? { startRadius: 8, endRadius: 4.8, startHeight: 3.2, endHeight: 2.0 } : {};
    const normal = getOrbitCameraPosition(rawP, pathOpts);
    const mirrored = getOrbitCameraPosition(rawP, { ...pathOpts, mirror: true });
    const position =
      northEase <= 0.001
        ? normal
        : northEase >= 0.999
          ? mirrored
          : {
              x: normal.x + (mirrored.x - normal.x) * northEase,
              y: normal.y,
              z: normal.z + (mirrored.z - normal.z) * northEase,
            };
    // Plongée légère Mictlampa : la caméra monte un peu, on regarde
    // vers le bas (on descend au Mictlan).
    position.y += nb * 0.45;
    // Contre-plongée Huitztlampa : caméra un peu plus basse, regard levé.
    position.y -= sb * SOUTH_CAMERA_DROP;
    const southPush = 1 + sb * (SOUTH_RADIUS_SCALE - 1);
    position.x *= southPush;
    position.z *= southPush;
    const target = getOrbitCameraTarget();
    target.y += sb * SOUTH_TARGET_LIFT;

    // Parallaxe : décale la position caméra XY selon la souris, la cible
    // reste ancrée sur le cerf → orbite légère autour du sujet. Y inversé
    // (clientY descend, caméra doit monter).
    // Boost Ollin (29/08) : pendant l'onde de press, la camera amplifie
    // sa reponse au parallax. Lu depuis window.__nahualOllinBoost pose
    // par OllinShockwave. 0 au repos, 1 au peak, decay avec l'onde.
    const ollinBoost = typeof window !== "undefined"
      ? (window as unknown as { __nahualOllinBoost?: { current: number } }).__nahualOllinBoost?.current ?? 0
      : 0;
    // Amorti Mictlampa : au Nord la caméra répond moins vivement (le
    // temps s'épaissit), parallax réduit de 40%.
    const parallaxMult = (1 + ollinBoost * OLLIN_PARALLAX_BOOST) * (1 - nb * 0.4);
    const parallaxX = reducedMotionRef.current ? 0 : mouseSmoothRef.current.x * PARALLAX_X * parallaxMult;
    const parallaxY = reducedMotionRef.current ? 0 : -mouseSmoothRef.current.y * PARALLAX_Y * parallaxMult;

    // Touch orbit offset : décay progressif au relâchement, sinon
    // reste. Ajoute au parallax pour combiner drag + repos.
    if (!touchLastRef.current) {
      touchOffsetRef.current.x *= 1 - TOUCH_DECAY;
      touchOffsetRef.current.y *= 1 - TOUCH_DECAY;
    }
    const touchX = reducedMotionRef.current ? 0 : touchOffsetRef.current.x * 2.0;
    const touchY = reducedMotionRef.current ? 0 : -touchOffsetRef.current.y * 2.0;

    // Voyage cardinal Nepantla (03/09, etage 2) : orbite complete
    // autour du cerf, la cible du regard NE BOUGE PAS (le cerf reste
    // l'axe du monde, l'enorme mouvement visuel vient de l'orbite).
    if (transition?.transitionDirection && transition.transitionProgressRef.current > 0) {
      const t = transition.transitionProgressRef.current;
      const az = swingAzimuth(t, transition.transitionDirection);
      const speed = swingSpeed(t);

      // Rotation de la position autour de l'axe Y (equivalent a un
      // azimuthOffset, mais apres le crossfade miroir Nord : le sens
      // visuel du voyage est absolu, pas inverse par le miroir).
      if (az !== 0) {
        const cosAz = Math.cos(az);
        const sinAz = Math.sin(az);
        const px = position.x;
        const pz = position.z;
        position.x = px * cosAz + pz * sinAz;
        position.z = -px * sinAz + pz * cosAz;
      }
      // Respiration du voyage : recul + montee au pic de vitesse
      // (le passage prend de la hauteur, comme l'arc du soleil),
      // retombe a zero aux deux bouts : position de repos exacte.
      const dolly = 1 + speed * SWING_DOLLY;
      position.x *= dolly;
      position.z *= dolly;
      position.y += speed * SWING_LIFT;

      const baseFov = (typeof window !== "undefined" && window.innerWidth < 768 ? 58 : 45) - nb * 5;
      const perspCam = camera as PerspectiveCamera;
      if (perspCam.isPerspectiveCamera) {
        perspCam.fov = baseFov + speed * SWING_FOV;
        perspCam.updateProjectionMatrix();
      }
    } else {
      // Retour repos FOV : safety, réévalue le base FOV responsive.
      const baseFov = (typeof window !== "undefined" && window.innerWidth < 768 ? 58 : 45) - nb * 5;
      const perspCam = camera as PerspectiveCamera;
      if (perspCam.isPerspectiveCamera && Math.abs(perspCam.fov - baseFov) > 0.5) {
        perspCam.fov = baseFov;
        perspCam.updateProjectionMatrix();
      }
    }

    // Pin face-a-face (boite outil #6) : retire dolly + fov shift
    // definitivement (retour Sylvain 28/08 "cerf super gros" ET
    // "deforme"). Le pin garde uniquement le bloom boost via PostFX
    // + palette shift future. Camera reste path normal, cerf reste
    // meme taille. La contemplation se fait par la lumiere qui
    // pulse, pas par le zoom close.
    // La frappe du xiuhcoatl (05/09) : secousse amortie de la camera,
    // trois sinus incommensurables, amplitude lue dans le store (0 hors
    // frappe, 0 en reduced-motion par construction de la lib).
    const shake = xiuhcoatlStore.strike.shake;
    const st = performance.now() / 1000;
    const shakeX = shake * 0.11 * (Math.sin(st * 47.0) * 0.6 + Math.sin(st * 71.3) * 0.4);
    const shakeY = shake * 0.08 * (Math.sin(st * 59.7 + 1.3) * 0.6 + Math.sin(st * 83.1) * 0.4);
    camera.position.set(
      position.x + parallaxX + touchX + shakeX,
      position.y + parallaxY + touchY + shakeY,
      position.z,
    );
    // Le regard reste ancre sur le cerf, y compris pendant l'orbite
    // Nepantla : le sujet ne quitte jamais le cadre, le monde defile.
    camera.lookAt(target.x + shakeX * 0.5, target.y + shakeY * 0.5, target.z);
  });

  return null;
}
