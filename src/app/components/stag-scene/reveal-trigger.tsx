"use client";

import { useEffect, useRef } from "react";
import { useProgress } from "@react-three/drei";

/**
 * RevealTrigger / VeilOrchestrator (31/08 refonte event-driven).
 * Orchestre toute la sequence du voile en reagissant aux VRAIS
 * evenements DOM plutot qu'a des timers arbitraires :
 *
 *  1. animationend du dernier char de la traduction → pose
 *     `data-reveal-done="true"` sur le skeleton. Le CSS demarre alors
 *     la sequence post-reveal (dots + cercle + logo).
 *  2. animationend du dernier char du logo → sequence complete.
 *  3. useProgress atteint 100 (assets 3D charges) ET sequence complete
 *     → attend HOLD_MS puis pose `data-loaded="true"` sur <html>.
 *     Le voile fade out via CSS.
 *
 * Le voile ne peut plus fade out AVANT la fin de la sequence visible.
 * Retour Sylvain 31/08 : "faut pas mettre un delay mais plutot triger
 * l'affichage en fonction de l'affichage de la phrase". Meme principe
 * pour le fade out final : attendre le vrai signal de fin, pas un
 * minuteur.
 *
 * Fallbacks : chaque etape a un timer de secours pour ne pas bloquer
 * le voile indefiniment si un event manque (traduction vide, CSS
 * modifie, etc.).
 */

/** Duree de respiration entre la fin du logo et le fade out du voile. */
const HOLD_AFTER_SEQUENCE_MS = 1000;

/** Fallback : si aucun animationend "translationCharReveal" ne remonte
 * dans ce delai, on marque quand meme la sequence pour ne pas bloquer. */
const REVEAL_FALLBACK_MS = 6000;

/** Fallback : si aucun animationend "logoCharReveal" ne remonte dans
 * ce delai APRES data-reveal-done, on marque quand meme la sequence. */
const SEQUENCE_FALLBACK_MS = 6000;

export default function RevealTrigger() {
  const { progress } = useProgress();
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const sequenceDoneRef = useRef(false);

  useEffect(() => {
    const skeleton = document.querySelector<HTMLElement>(
      '[data-testid="piedra-skeleton"]',
    );
    if (!skeleton) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    let done = false;

    const tryPoseLoaded = () => {
      if (done) return;
      if (progressRef.current >= 100 && sequenceDoneRef.current) {
        done = true;
        timers.push(
          setTimeout(() => {
            document.documentElement.setAttribute("data-loaded", "true");
          }, HOLD_AFTER_SEQUENCE_MS),
        );
      }
    };

    const markSequenceDone = () => {
      if (sequenceDoneRef.current) return;
      sequenceDoneRef.current = true;
      tryPoseLoaded();
    };

    const markRevealDone = () => {
      if (skeleton.getAttribute("data-reveal-done") === "true") return;
      skeleton.setAttribute("data-reveal-done", "true");
      // A partir d'ici, la sequence post-reveal (dots + cercle + logo)
      // demarre en CSS. Le prochain animationend "logoCharReveal" du
      // dernier char du logo signalera la fin.
      const seqFallback = setTimeout(markSequenceDone, SEQUENCE_FALLBACK_MS);
      timers.push(seqFallback);
    };

    const onAnimEnd = (event: Event) => {
      const e = event as AnimationEvent;
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const idx = parseInt(el.style.getPropertyValue("--char-index") || "-1", 10);
      const total = parseInt(el.style.getPropertyValue("--char-count") || "0", 10);
      const isLastChar = total > 0 && idx === total - 1;
      if (!isLastChar) return;
      if (e.animationName.includes("translationCharReveal")) {
        markRevealDone();
      } else if (e.animationName.includes("logoCharReveal")) {
        markSequenceDone();
      }
    };

    skeleton.addEventListener("animationend", onAnimEnd);
    // Fallback global : si la sequence texte ne signale jamais sa
    // fin (traduction vide, CSS change), on marque tout comme
    // fini pour ne pas bloquer le voile.
    const revealFallback = setTimeout(() => {
      markRevealDone();
      markSequenceDone();
    }, REVEAL_FALLBACK_MS);
    timers.push(revealFallback);

    return () => {
      skeleton.removeEventListener("animationend", onAnimEnd);
      timers.forEach(clearTimeout);
    };
  }, []);

  // Reagit au changement de progress : quand les assets 3D finissent
  // de charger, on tente de poser data-loaded (si la sequence est
  // aussi finie).
  useEffect(() => {
    if (progress < 100) return;
    if (!sequenceDoneRef.current) return;
    // Re-appel via un tick pour rester dans le flow des effets.
    const timer = setTimeout(() => {
      if (document.documentElement.getAttribute("data-loaded") === "true") return;
      document.documentElement.setAttribute("data-loaded", "true");
    }, HOLD_AFTER_SEQUENCE_MS);
    return () => clearTimeout(timer);
  }, [progress]);

  return null;
}
