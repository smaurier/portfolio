"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import { MIN_VEIL_DURATION_MS } from "@/lib/loading-veil";

/**
 * LoadingSync (30/08). Tiny client component qui pose
 * `data-loaded="true"` sur <html> quand :
 *  - useProgress atteint 100 (tous les assets 3D charges)
 *  - MIN_VEIL_DURATION_MS s'est ecoule (le temps de lire la phrase)
 *
 * Le CSS de PiedraSkeleton lit ce data-attribute pour fade out le
 * voile de chargement. Aucune body class posee, aucun hack CSS — le
 * CSS Modules cible `html[data-loaded="true"]` directement.
 *
 * Ne rend rien (return null) — c'est juste un side-effect isole.
 * Persist au niveau layout (comme LoadingVeil avant lui) : monte une
 * seule fois pour toute la session SPA.
 */
export default function LoadingSync() {
  const { progress } = useProgress();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_VEIL_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (progress >= 100 && minElapsed) {
      document.documentElement.setAttribute("data-loaded", "true");
    }
  }, [progress, minElapsed]);

  return null;
}
