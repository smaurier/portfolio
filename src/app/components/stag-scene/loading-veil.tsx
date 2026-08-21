"use client";

import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import { easeToward, isLoadingDone, MIN_VEIL_DURATION_MS } from "@/lib/loading-veil";
import styles from "./loading-veil.module.css";

// Vitesse de rattrapage du compteur affiché vers la vraie valeur de
// useProgress (retour de Sylvain le 20/08 : "fait défiler les
// pourcentages" — la valeur brute saute par paliers au lieu de compter en
// continu). Choisi à l'œil pour rester lisible sans traîner.
const DISPLAY_EASE_FACTOR = 0.12;
// En-dessous de ce delta, on cale directement sur la cible plutôt que de
// laisser l'approche exponentielle traîner indéfiniment sans jamais
// l'atteindre exactement.
const SNAP_THRESHOLD = 0.05;

/**
 * Premier beat de la scène (retour de Sylvain le 19/08, cf memory
 * project-nahual-da) : la phrase en nahuatl du Codex Nahual ("in xochitl,
 * in cuicatl" — fleur et chant, la seule vérité selon les tlamatinimeh)
 * plutôt qu'un simple indicateur de progression. `useProgress` (drei)
 * s'abonne au `THREE.DefaultLoadingManager` global — pas besoin d'être
 * monté dans le Canvas, ce composant est un sibling du Canvas dans
 * stag-scene.tsx, en overlay HTML par-dessus (comme le header/footer de
 * layout.tsx, jamais du contenu WebGL).
 *
 * Démonté pour de bon une fois le fondu terminé (pas juste opacity:0) :
 * un voile invisible mais toujours dans le DOM resterait un obstacle au
 * scroll/aux interactions pendant la transition (cf .hidden en CSS).
 */
export default function LoadingVeil({
  phrase,
  translation,
  label,
}: {
  phrase: string;
  translation: string;
  label: string;
}) {
  const { progress } = useProgress();
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const displayedRef = useRef(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinDurationElapsed(true), MIN_VEIL_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Boucle rAF plutôt qu'un effet piloté par `progress` seul : useProgress
  // ne re-render qu'à chaque palier (un asset qui finit de charger), le
  // "défilé" doit continuer entre deux paliers pour ne pas juste sauter par
  // à-coups un peu plus lentement. `displayedRef` (pas juste le state) sert
  // de valeur "current" synchrone pour décider quand arrêter de reprogrammer
  // un frame une fois la cible rattrapée — sinon la boucle tournerait à
  // vide indéfiniment (setState(progress) à chaque frame) après le rattrapage.
  useEffect(() => {
    if (reducedMotionRef.current) {
      displayedRef.current = progress;
      setDisplayedProgress(progress);
      return;
    }
    let frame: number;
    function tick() {
      const current = displayedRef.current;
      if (Math.abs(progress - current) < SNAP_THRESHOLD) {
        displayedRef.current = progress;
        setDisplayedProgress(progress);
        return;
      }
      const next = easeToward(current, progress, DISPLAY_EASE_FACTOR);
      displayedRef.current = next;
      setDisplayedProgress(next);
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [progress]);

  const done = isLoadingDone(progress, minDurationElapsed);

  useEffect(() => {
    if (!done) return;
    // Laisse le temps au fondu CSS de jouer avant de retirer le voile du
    // DOM — durée alignée sur la transition opacity de loading-veil.module.css.
    const timer = setTimeout(() => setMounted(false), 600);
    return () => clearTimeout(timer);
  }, [done]);

  if (!mounted) return null;

  return (
    <div
      className={`${styles.veil} ${done ? styles.hidden : ""}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {/* .stage : position:relative, hérité de l'anneau de serpents qui
       * l'entourait (retiré le 21/08 — rendu final jugé raté par Sylvain,
       * cf memory project-nahual-da, à refaire un jour avec une vraie
       * silhouette dessinée plutôt qu'un tracé calculé). Gardé tel quel :
       * n'a pas d'effet visible sans élément absolute à l'intérieur. */}
      <div className={styles.stage}>
        <p className={styles.phrase}>{phrase}</p>
        <p className={styles.translation}>{translation}</p>
        {/* aria-hidden : le pourcentage change plusieurs fois par seconde —
         * l'annoncer à chaque tick via la région aria-live du parent serait
         * du bruit pour un lecteur d'écran, pas une information utile.
         * aria-label du parent ("Chargement de la scène") suffit à annoncer
         * l'état une fois ; le pourcentage reste un repère visuel seul. */}
        <p className={styles.percent} aria-hidden="true">
          {Math.round(displayedProgress)}%
        </p>
      </div>
    </div>
  );
}
