"use client";

import gsap from "gsap";
import { useEffect } from "react";
import {
  DOT_FLIGHT_ORDER,
  FOYER_TIMING,
  HEARTH_STORAGE_KEY,
  HEARTH_WORLD,
  apertureRadius,
  dotFlightDelay,
  projectToScreen,
  shouldPerformCeremony,
} from "@/lib/foyer";
import { foyerStore } from "./foyer-store";

/**
 * FoyerArrival (08/09, chantier du foyer). Orchestre l'ARRIVEE sur le
 * site : le moment ou le voile s'ecarte et ou le monde prend la main.
 *
 * Le principe, et c'est tout le chantier : RIEN NE SE FOND, TOUT SE RANGE.
 * L'ancien passage etait un `opacity: 0` de 600 ms sur le voile entier,
 * c'est-a-dire un fondu enchaine entre deux medias (DOM 2D et WebGL 3D) :
 * ca se voit toujours. Ici chaque element du voile a une destination :
 *  - la fumee se retire depuis la clarte du foyer, emportant avec elle le
 *    plateau du codex (Piedra, phrase, traduction) qui vit dedans ;
 *  - les quatre dots cardinaux rejoignent la boussole en bas a droite :
 *    c'est le meme quinconce, memes couleurs, meme disposition, donc la
 *    carte du cosmos montree pendant l'attente devient l'instrument de
 *    navigation (le visiteur apprend la nav sans qu'on la lui explique) ;
 *  - la flamme DOM passe la main aux braises WebGL qui brulent au meme
 *    pixel : le raccord de medium se fait sur un point brillant, la seule
 *    facon de ne pas le voir ;
 *  - le logo signature, deja cale au pixel sur celui du header (31/08),
 *    n'a rien a faire : il EST le logo du header.
 *
 * Une seule horloge (lib/foyer), une seule timeline GSAP, comme le
 * passage cardinal (lib/nepantla + cardinal-transition-context).
 *
 * Vit dans PiedraSkeleton, donc hors des providers : pas de contexte a
 * disposition, d'ou les crochets `data-foyer*` sur les elements et le
 * store de module pour parler a la scene 3D.
 */

/** Echelle finale des dots en vol : 10px (voile) -> 6px (boussole). */
const COMPASS_DOT_SCALE = 0.6;
/** Opacite de repos de la boussole (cardinal-compass.module.css). */
const COMPASS_REST_OPACITY = 0.55;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readLastVisit(): number | null {
  try {
    const raw = window.localStorage.getItem(HEARTH_STORAGE_KEY);
    return raw === null ? null : Number.parseInt(raw, 10);
  } catch {
    return null;
  }
}

function markVisit(): void {
  try {
    window.localStorage.setItem(HEARTH_STORAGE_KEY, String(Date.now()));
  } catch {
    // Navigation privee, stockage refuse : la ceremonie rejouera. Tant pis,
    // c'est le comportement le moins surprenant.
  }
}

export default function FoyerArrival() {
  useEffect(() => {
    const root = document.documentElement;
    const skeleton = document.querySelector<HTMLElement>('[data-testid="piedra-skeleton"]');
    if (!skeleton) return;

    // 1. Le feu du foyer brule-t-il encore ? Le script inline du layout a
    //    deja pose data-hearth AVANT le premier paint pour qu'aucune
    //    amorce de ceremonie ne soit visible ; ici on refait le calcul
    //    avec la lib (qui fait foi) et on reconcilie si besoin.
    const ceremony = shouldPerformCeremony(readLastVisit(), Date.now());
    foyerStore.ceremony = ceremony;
    if (ceremony) root.removeAttribute("data-hearth");
    else root.setAttribute("data-hearth", "lit");
    markVisit();

    const reduced = prefersReducedMotion();
    let timeline: gsap.core.Timeline | null = null;

    function finish() {
      root.setAttribute("data-foyer", "done");
      foyerStore.arrival = 1;
    }

    function play() {
      const smoke = skeleton!.querySelector<HTMLElement>('[data-foyer="smoke"]');
      const plate = skeleton!.querySelector<HTMLElement>('[data-foyer="plate"]');
      const hearth = skeleton!.querySelector<HTMLElement>('[data-foyer="hearth"]');
      const deck = skeleton!.querySelector<HTMLElement>('[data-foyer="deck"]');

      // Reduced motion (RGAA 13.6) : aucun deplacement, aucune trouee qui
      // s'agrandit. Un fondu court, la camera deja au repos.
      if (reduced) {
        foyerStore.arrival = 1;
        gsap.to(skeleton, {
          opacity: 0,
          duration: FOYER_TIMING.reducedFadeDuration,
          onComplete: finish,
        });
        return;
      }

      const viewport = { width: window.innerWidth, height: window.innerHeight };

      // 2. Ou s'ouvre la trouee : au CENTRE DU PLATEAU. La planche du
      //    codex s'ouvre par son propre centre (c'est l'axe du monde), le
      //    visiteur entre par la ou il regardait deja.
      const plateRect = plate?.getBoundingClientRect();
      const origin = plateRect
        ? { x: plateRect.left + plateRect.width / 2, y: plateRect.top + plateRect.height / 2 }
        : { x: viewport.width / 2, y: viewport.height / 2 };
      skeleton!.style.setProperty("--foyer-x", `${origin.x}px`);
      skeleton!.style.setProperty("--foyer-y", `${origin.y}px`);

      // 3. Ou se pose la flamme : sur la projection EXACTE du feu 3D. La
      //    pose de la camera est publiee par OrbitCamera a chaque frame :
      //    une seule verite sur le rig, quelle que soit la direction ou le
      //    profil mobile. Si le point n'est pas projetable (camera dans un
      //    etat inattendu), la flamme reste sur l'origine de la trouee.
      const hearthPoint = projectToScreen(HEARTH_WORLD, foyerStore.camera, viewport);
      if (hearth && hearthPoint) {
        hearth.style.left = `${hearthPoint.x}px`;
        hearth.style.top = `${hearthPoint.y}px`;
      }

      const tl = gsap.timeline({ onComplete: finish });
      timeline = tl;

      // 4. La flamme se leve. Elle ne jaillit pas : elle etait la, on
      //    s'en approche. Quand la fumee l'atteindra, elle sera deja
      //    lisible : rien n'apparait sous les yeux du visiteur.
      if (hearth) {
        tl.fromTo(
          hearth,
          { opacity: 0, scale: 0.35 },
          {
            opacity: 1,
            scale: 1,
            duration: FOYER_TIMING.hearthRiseDuration,
            ease: "power2.out",
          },
          FOYER_TIMING.hearthRiseDelay,
        );
        // Le relais : la flamme DOM s'efface pendant que les braises
        // WebGL, au meme pixel et de la meme couleur, deviennent
        // lisibles. C'est ici que le medium change, et c'est ici qu'on
        // ne doit rien voir.
        tl.to(
          hearth,
          {
            opacity: 0,
            scale: 1.9,
            duration: FOYER_TIMING.handoffDuration,
            ease: "power1.out",
          },
          FOYER_TIMING.handoffDelay,
        );
      }

      // 5. La fumee se retire. Une seule variable animee, lue a la fois
      //    par le masque (alpha) et par la braise du bord (couleur).
      if (smoke) {
        const aperture = { t: 0 };
        tl.to(
          aperture,
          {
            t: 1,
            duration: FOYER_TIMING.openDuration,
            ease: "none",
            onUpdate: () => {
              // L'ease vit dans la lib (apertureRadius), pas dans GSAP :
              // la courbe de la trouee est testee, pas devinee.
              skeleton!.style.setProperty(
                "--foyer-hole",
                `${apertureRadius(aperture.t, origin, viewport)}px`,
              );
            },
            onComplete: () => {
              // Au-dela du coin le plus eloigne il ne reste plus un pixel
              // de fumee : on coupe le calque plutot que d'entretenir un
              // masque plein ecran pour rien.
              smoke.style.display = "none";
            },
          },
          FOYER_TIMING.openDelay,
        );
      }

      // 6. Les quatre dots rejoignent la boussole. Mesure des deux etats
      //    puis tween : c'est un shared element au sens strict, sur deux
      //    elements qui sont deja le meme glyphe.
      //
      //    Rien a ranger s'il n'y a pas eu de ceremonie : quand le foyer
      //    brule encore, le quinconce n'a jamais ete montre (le CSS le
      //    masque via html[data-hearth]). Sans cette garde, les quatre
      //    dots sortiraient du calque masque en rejoignant le pont de vol,
      //    redeviendraient visibles, et partiraient du coin haut-gauche
      //    (leur rect vaut zero tant qu'ils sont en display:none).
      let landed = false;
      if (deck && ceremony) {
        for (const direction of DOT_FLIGHT_ORDER) {
          const dot = skeleton!.querySelector<HTMLElement>(`[data-foyer-dot="${direction}"]`);
          const cell = document.querySelector<HTMLElement>(
            `[data-compass-direction="${direction}"]`,
          );
          if (!dot || !cell) continue;
          const from = dot.getBoundingClientRect();
          const to = cell.getBoundingClientRect();
          // Garde-fou : un element non affiche a un rect nul. On ne fait
          // pas voler un dot qui n'etait pas la, il partirait du coin.
          if (from.width === 0 || to.width === 0) continue;
          landed = true;
          // Rien ne doit sauter au moment ou le dot change de parent : on
          // le repose a l'ecran exactement la ou il etait.
          const size = from.width || 10;
          dot.style.animation = "none";
          dot.style.transform = "none";
          dot.style.position = "fixed";
          dot.style.left = `${from.left}px`;
          dot.style.top = `${from.top}px`;
          dot.style.width = `${size}px`;
          dot.style.height = `${size}px`;
          dot.style.margin = "0";
          dot.style.opacity = "1";
          deck.appendChild(dot);

          const start = FOYER_TIMING.flightDelay + dotFlightDelay(direction);
          tl.to(
            dot,
            {
              x: to.left + to.width / 2 - (from.left + size / 2),
              y: to.top + to.height / 2 - (from.top + size / 2),
              scale: COMPASS_DOT_SCALE,
              duration: FOYER_TIMING.flightDuration,
              ease: FOYER_TIMING.flightEase,
            },
            start,
          );
          // Il ne s'efface pas EN VOL : il se pose, puis son halo se
          // dissout sur place pendant que le vrai dot de la boussole,
          // deja dessous et de la meme couleur, prend le relais. Coupe
          // net a l'atterrissage, on verrait le halo disparaitre d'un
          // coup : c'est le seul endroit du geste ou ca se remarquerait.
          tl.to(
            dot,
            {
              opacity: 0,
              duration: FOYER_TIMING.landingFadeDuration,
              ease: "power1.in",
            },
            start + FOYER_TIMING.flightDuration - FOYER_TIMING.landingFadeDuration * 0.4,
          );
        }
      }

      // 6bis. La boussole accuse reception. Au repos elle est a 0.55
      //    d'opacite : les dots s'y poseraient sans que rien ne reponde,
      //    et le geste se lirait comme une disparition au lieu d'un
      //    rangement. Elle monte a pleine opacite le temps de l'accueil
      //    puis revient a son etat CSS (clearProps : sinon une opacite
      //    inline gagnerait contre le :hover pour le reste de la visite).
      const compass = landed
        ? document.querySelector<HTMLElement>("[data-compass-direction]")?.closest<HTMLElement>("nav")
        : null;
      if (compass) {
        tl.to(compass, { opacity: 1, duration: 0.5, ease: "power2.out" }, FOYER_TIMING.flightDelay);
        tl.to(
          compass,
          // Valeur de repos explicite (celle du CSS) puis clearProps :
          // tweener vers "" laisserait GSAP interpoler vers NaN.
          { opacity: COMPASS_REST_OPACITY, duration: 0.6, ease: "power2.inOut", clearProps: "opacity" },
          FOYER_TIMING.flightDelay + FOYER_TIMING.flightDuration + 0.35,
        );
      }

      // 7. La descente par l'axe. Horloge unique lue en useFrame par
      //    OrbitCamera (camera), CenterXiuhtecuhtli et CopalBraziers
      //    (le sursaut du feu) : personne n'a son propre minuteur.
      tl.to(
        foyerStore,
        {
          arrival: 1,
          duration: FOYER_TIMING.descentDuration,
          ease: FOYER_TIMING.descentEase,
        },
        FOYER_TIMING.descentDelay,
      );

      // 8. Le contenu de page se pose : meme signature que l'arrivee au
      //    Centre depuis une autre direction (nepantla, enterOffset
      //    "jade" = implosion axiale, scale 1.06 -> 1). Arriver au foyer
      //    a toujours la meme sensation, qu'on vienne du chargement ou
      //    d'un point cardinal.
      const frame = document.querySelector<HTMLElement>("[data-nepantla-frame]");
      if (frame) {
        tl.fromTo(
          frame,
          { opacity: 0, scale: 1.06 },
          {
            opacity: 1,
            scale: 1,
            duration: FOYER_TIMING.contentDuration,
            ease: FOYER_TIMING.descentEase,
            // Aucun transform residuel : un transform sur la frame ferait
            // d'elle le containing block des position:fixed descendants
            // (meme precaution que cardinal-transition-context).
            clearProps: "transform,opacity",
          },
          FOYER_TIMING.contentDelay,
        );
      }
    }

    // data-loaded est pose par RevealTrigger quand les assets 3D sont la
    // ET que la sequence visible est finie. Il peut deja etre la si ce
    // composant monte tard (hydratation lente) : on teste avant d'observer.
    if (root.getAttribute("data-loaded") === "true") {
      play();
      return () => {
        timeline?.kill();
      };
    }

    const observer = new MutationObserver(() => {
      if (root.getAttribute("data-loaded") !== "true") return;
      observer.disconnect();
      play();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-loaded"] });

    return () => {
      observer.disconnect();
      timeline?.kill();
    };
  }, []);

  return null;
}
