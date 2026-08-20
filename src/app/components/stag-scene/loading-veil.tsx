"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import { isLoadingDone, MIN_VEIL_DURATION_MS } from "@/lib/loading-veil";
import styles from "./loading-veil.module.css";

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

  useEffect(() => {
    const timer = setTimeout(() => setMinDurationElapsed(true), MIN_VEIL_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

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
      <p className={styles.phrase}>{phrase}</p>
      <p className={styles.translation}>{translation}</p>
      {/* aria-hidden : le pourcentage change plusieurs fois par seconde —
       * l'annoncer à chaque tick via la région aria-live du parent serait
       * du bruit pour un lecteur d'écran, pas une information utile.
       * aria-label du parent ("Chargement de la scène") suffit à annoncer
       * l'état une fois ; le pourcentage reste un repère visuel seul. */}
      <p className={styles.percent} aria-hidden="true">
        {Math.round(progress)}%
      </p>
    </div>
  );
}
