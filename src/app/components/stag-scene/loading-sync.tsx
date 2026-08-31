"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import { MIN_VEIL_DURATION_MS } from "@/lib/loading-veil";

/**
 * LoadingSync (30/08). Tiny client component qui pose
 * `data-loaded="true"` sur <html> quand :
 *  - useProgress atteint 100 (tous les assets 3D charges)
 *  - `minDurationMs` s'est ecoule (temps de lire phrase + trad)
 *
 * 31/08 : duree min calculee dynamiquement par le layout via
 * `computeMinVeilDuration(phrase, translation)` — reveal complet des
 * chars + 3s de lecture confortable — au lieu d'un timer fige. Prop
 * optionnelle, fallback sur MIN_VEIL_DURATION_MS.
 *
 * Le CSS de PiedraSkeleton lit ce data-attribute pour fade out le
 * voile de chargement. Aucune body class posee, aucun hack CSS — le
 * CSS Modules cible `html[data-loaded="true"]` directement.
 *
 * Ne rend rien (return null) — c'est juste un side-effect isole.
 * Persist au niveau layout (comme LoadingVeil avant lui) : monte une
 * seule fois pour toute la session SPA.
 */
type Props = { minDurationMs?: number };

export default function LoadingSync({ minDurationMs = MIN_VEIL_DURATION_MS }: Props = {}) {
  const { progress } = useProgress();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), minDurationMs);
    return () => clearTimeout(timer);
  }, [minDurationMs]);

  useEffect(() => {
    if (progress >= 100 && minElapsed) {
      document.documentElement.setAttribute("data-loaded", "true");
    }
  }, [progress, minElapsed]);

  return null;
}
