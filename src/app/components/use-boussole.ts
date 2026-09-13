"use client";

import { useEffect, useState } from "react";
import { approachAngle, capDepuisEvenement, etatBoussole, rotationRose, type EtatBoussole, type LectureOrientation } from "@/lib/boussole";

/**
 * LA BOUSSOLE VRAIE (13/09) : ecoute les capteurs d'orientation du
 * telephone et rend la rotation a donner a la rose pour que son nord pointe
 * le vrai nord. Voir lib/boussole pour les faits (MDN) et les limites.
 *
 *  - Chrome Android : `deviceorientationabsolute`, sans permission.
 *  - Safari iOS : `deviceorientation` avec `webkitCompassHeading`, apres
 *    `requestPermission()` dans un geste (le premier toucher ; la camera
 *    fait la meme demande pour la parallaxe, iOS ne pose la question qu'une
 *    fois).
 *  - Ordinateur, ou capteur muet : etat « absente », la rose reste
 *    orientee ecran, rien ne bouge.
 * La mesure tremble : lissee dans un rAF (~250 ms de constante de temps),
 * et l'etat React n'est ecrit que tous les 2 degres, pas a chaque capteur.
 */
export type Boussole = { etat: EtatBoussole; rotation: number };

const IMMOBILE: Boussole = { etat: "absente", rotation: 0 };
const TOUCH_ONLY = "(pointer: coarse)";

export function useBoussole(): Boussole {
  const [boussole, setBoussole] = useState<Boussole>(IMMOBILE);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia(TOUCH_ONLY).matches) return;
    let cible: number | null = null;
    let precision: number | null | undefined;
    let courant = 0;
    let publie = 0;
    let etatPublie: EtatBoussole = "absente";
    let raf = 0;
    let vivant = true;

    const tick = () => {
      if (!vivant) return;
      if (cible !== null) {
        courant = approachAngle(courant, rotationRose(cible), 0.12);
        const etat = etatBoussole({ cap: cible, precision });
        if (Math.abs(courant - publie) >= 2 || etat !== etatPublie) {
          publie = courant;
          etatPublie = etat;
          setBoussole({ etat, rotation: courant });
        }
      }
      raf = window.requestAnimationFrame(tick);
    };

    const onOrientation = (e: Event) => {
      const cap = capDepuisEvenement(e as unknown as LectureOrientation);
      if (cap === null) return;
      precision = (e as unknown as LectureOrientation).webkitCompassAccuracy;
      cible = cap;
    };
    const absolu = "ondeviceorientationabsolute" in window;
    const nom = absolu ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(nom, onOrientation, { passive: true });

    // iOS 13+ : la permission, dans un geste.
    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    const demander = () => {
      window.removeEventListener("touchend", demander);
      DOE?.requestPermission?.().catch(() => {});
    };
    if (DOE?.requestPermission) window.addEventListener("touchend", demander, { passive: true });

    raf = window.requestAnimationFrame(tick);
    return () => {
      vivant = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener(nom, onOrientation);
      window.removeEventListener("touchend", demander);
    };
  }, []);
  return boussole;
}
