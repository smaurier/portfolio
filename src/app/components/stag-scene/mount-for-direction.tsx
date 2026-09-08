"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import { assetsForDirection } from "@/lib/direction-assets";
import type { DirectionKey } from "./direction-colors";
import { useCurrentDirection } from "./use-current-direction";

/**
 * MountForDirection (08/09) : ne monte ses enfants que sur les directions
 * qui les concernent, et les GARDE montes un moment apres qu'on a quitte la
 * page, le temps que leur fondu interne se termine.
 *
 * Pourquoi : les composants de direction appellent `useGLTF(path)` dans leur
 * corps, donc leur modele etait telecharge sur TOUTES les pages (mesure du
 * 08/09 : 5,7 Mo de GLB sur l'accueil, cf docs/da/etat-de-l-art.md). Les
 * gater ici evite le telechargement, et evite aussi de faire tourner leur
 * boucle d'animation pour rien.
 *
 * Le delai de sortie compte : chacun de ces composants fonde son opacite au
 * fil des images (blendRef lerp 0,06). Les demonter net ferait un a-coup a
 * la navigation ; on attend donc que le fondu ait eu le temps de finir.
 */

const DEFAULT_LINGER_MS = 2500;

export default function MountForDirection({
  is,
  linger = DEFAULT_LINGER_MS,
  children,
}: {
  /** La ou les directions concernees. */
  is: DirectionKey | DirectionKey[];
  linger?: number;
  children: ReactNode;
}) {
  const direction = useCurrentDirection();
  const wanted = Array.isArray(is) ? is.includes(direction) : is === direction;
  // `lingering` ne sert qu'a SURVIVRE au depart : le rendu suit `wanted`
  // directement, et l'effet ne fait qu'eteindre, jamais allumer. Ajuster
  // l'etat pendant le rendu (et non dans un effet) est le motif documente
  // par React pour un etat derive d'une prop, et ca evite le rendu en
  // cascade que signale react-hooks/set-state-in-effect.
  const [lingering, setLingering] = useState(wanted);
  if (wanted && !lingering) setLingering(true);

  useEffect(() => {
    if (wanted) return;
    const timer = window.setTimeout(() => setLingering(false), linger);
    return () => window.clearTimeout(timer);
  }, [wanted, linger]);

  return wanted || lingering ? <>{children}</> : null;
}

/**
 * PreloadOnIntent (08/09) : precharge les modeles d'une direction quand le
 * visiteur montre son intention d'y aller (survol ou focus d'un lien
 * cardinal). La navigation reste instantanee sans que l'accueil paie le
 * telechargement de tout le site.
 */
export function PreloadOnIntent() {
  const done = useRef(new Set<string>());
  useEffect(() => {
    function onIntent(event: Event) {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.("[data-cardinal-direction]") as HTMLElement | null;
      const key = link?.getAttribute("data-cardinal-direction") as DirectionKey | null;
      if (!key || done.current.has(key)) return;
      done.current.add(key);
      for (const path of assetsForDirection(key)) useGLTF.preload(path);
    }
    document.addEventListener("pointerenter", onIntent, { capture: true, passive: true });
    document.addEventListener("focusin", onIntent, { passive: true });
    return () => {
      document.removeEventListener("pointerenter", onIntent, { capture: true });
      document.removeEventListener("focusin", onIntent);
    };
  }, []);
  return null;
}
