"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useCardinalTransition } from "./cardinal-transition-context";

/**
 * NepantlaFrame (03/09, chantier transitions) : le seul element qui
 * voyage pendant un passage cardinal. Enveloppe {children} du layout
 * (le contenu de page qui change par route) : le canvas 3D, le header
 * et le footer restent en place, le monde ne bouge jamais.
 *
 * Deux roles :
 *  - enregistrer son element aupres du contexte (GSAP le tweene) ;
 *  - detecter le changement REEL de pathname apres router.push et
 *    declencher l'entree du nouveau contenu (completeArrival). Le
 *    commit React est garanti a ce moment-la : plus besoin des
 *    hacks double-rAF / flushSync de l'ere View Transitions.
 */
export default function NepantlaFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const transition = useCardinalTransition();
  const ref = useRef<HTMLDivElement>(null);
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    transition?.registerFrame(ref.current);
    return () => transition?.registerFrame(null);
  }, [transition]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    // No-op si aucune transition active (back/forward, URL directe).
    transition?.completeArrival();
  }, [pathname, transition]);

  return <div ref={ref}>{children}</div>;
}
