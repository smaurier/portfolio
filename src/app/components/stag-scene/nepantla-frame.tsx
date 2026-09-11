"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { whenRevealed } from "@/lib/apres-le-voile";
import { getPath } from "@/lib/routes";
import { isLocale } from "@/dictionaries/locales";
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

  // Prechargement des 5 destinations cardinales (03/09, retour Sylvain
  // "tout charger des le chargement de depart") : le passage Nepantla ne
  // doit jamais attendre le reseau. En prod les pages sont SSG, ce prefetch
  // met le RSC payload en cache avant le premier voyage. (En dev, Next
  // compile quand meme a la volee.)
  //
  // APRES LE VOILE et non au boot (10/09). L'intention ne change pas, son
  // MOMENT change. Mesure sur la production, Pixel 7 emule, CPU x4, Fast
  // 3G : le voile ne se leve que 1,1 s apres le dernier octet recu, et ces
  // cinq prefetch partaient en pleine fenetre de chargement -- huit
  // requetes qui disputaient la bande passante aux modeles que le voile,
  // lui, attend vraiment. Une fois le voile leve, la bande est libre et le
  // visiteur n'a pas encore eu le temps de descendre la page.
  useEffect(() => {
    const match = pathname?.match(/^\/([a-z]{2})(?:\/|$)/);
    const locale = match && isLocale(match[1]) ? match[1] : "fr";
    return whenRevealed(() => {
      router.prefetch(`/${locale}`);
      for (const key of ["services", "projets", "contact", "memoire"] as const) {
        router.prefetch(getPath(locale, key));
      }
    });
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

  // data-nepantla-frame : le seul crochet stable sur le contenu de page.
  // Lu par FoyerArrival (hors des providers, il ne peut pas passer par le
  // contexte) pour poser le contenu a l'arrivee sur le site.
  return <div ref={ref} data-nepantla-frame="">{children}</div>;
}
