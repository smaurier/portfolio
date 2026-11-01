"use client";

import { useEffect } from "react";
import { whenRevealed } from "@/lib/apres-le-voile";
import { appareilFaible, REGLES_PAR_DEFAUT } from "@/lib/detection-perf-faible";
import { STORAGE_KEYS } from "@/lib/scene-controls";
import { setSceneControls } from "../scene-controls-store";

/** On vise un NOMBRE d'images (celui qu'exige REGLES_PAR_DEFAUT pour
 * conclure), pas une duree fixe : une duree fixe desservait precisement
 * les appareils les plus lents (mesure du 01/11 : a ~90 ms/image, 3 s ne
 * reunissait que 34 images, sous l'echantillon minimal -- l'appareil le
 * plus faible restait donc le seul a ne jamais etre detecte). */
const IMAGES_CIBLE = REGLES_PAR_DEFAUT.imagesIgnorees + REGLES_PAR_DEFAUT.echantillonMinimal;
/** Plafond de temps, en secours : un appareil a 7 im/s atteint la cible en
 * 8 s ; en dessous, on conclut quand meme sur ce qui a ete mesure plutot
 * que d'attendre indefiniment un appareil en detresse. */
const PLAFOND_MS = 8000;

/**
 * Chronometre les premieres images reelles apres l'ouverture du voile et
 * bascule sur le profil eco si l'appareil peine -- un composant MINCE
 * autour de la decision pure (lib/detection-perf-faible.ts). Ne s'execute
 * qu'une fois par visiteur : un choix deja fait sur l'eco (bouton manuel ou
 * cette meme detection lors d'une visite precedente) n'est jamais remis en
 * cause.
 */
export function useDetectionPerfFaible(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let dejaChoisi: boolean;
    try {
      dejaChoisi = window.localStorage.getItem(STORAGE_KEYS.eco) !== null;
    } catch {
      return; // pas de stockage : un verdict qui ne tiendrait pas d'une visite a l'autre ne vaut rien
    }
    if (dejaChoisi) return;

    let annule = false;
    let idImage = 0;

    const desabonnerVoile = whenRevealed(() => {
      if (annule) return;
      const deltas: number[] = [];
      const depart = performance.now();
      let dernier = depart;

      function image(t: number) {
        deltas.push(t - dernier);
        dernier = t;
        if (annule) return;
        if (deltas.length >= IMAGES_CIBLE || t - depart >= PLAFOND_MS) {
          if (appareilFaible(deltas)) setSceneControls({ eco: true });
          return;
        }
        idImage = requestAnimationFrame(image);
      }
      idImage = requestAnimationFrame(image);
    });

    return () => {
      annule = true;
      desabonnerVoile();
      if (idImage) cancelAnimationFrame(idImage);
    };
  }, []);
}
