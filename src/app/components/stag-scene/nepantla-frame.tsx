"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { getPath } from "@/lib/routes";
import { isLocale } from "@/dictionaries";
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
  const router = useRouter();
  const transition = useCardinalTransition();
  const ref = useRef<HTMLDivElement>(null);
  const previousPathnameRef = useRef(pathname);

  // Prechargement des 5 destinations cardinales au boot (03/09,
  // retour Sylvain "tout charger des le chargement de depart") : le
  // passage Nepantla ne doit jamais attendre le reseau. En prod les
  // pages sont SSG, ce prefetch met le RSC payload en cache avant le
  // premier voyage. (En dev, Next compile quand meme a la volee.)
  useEffect(() => {
    const match = pathname?.match(/^\/([a-z]{2})(?:\/|$)/);
    const locale = match && isLocale(match[1]) ? match[1] : "fr";
    router.prefetch(`/${locale}`);
    for (const key of ["services", "projets", "contact", "memoire"] as const) {
      router.prefetch(getPath(locale, key));
    }
  }, [pathname, router]);

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
