"use client";

import { useEffect } from "react";

/**
 * LE CHAPITRAGE DES PAGES A CONTENU (11/09, lot D3).
 *
 * Le Centre etage ses chapitres au fil de l'arc (getChapterOpacity). Les
 * pages a contenu, elles, posent toutes leurs cartes d'un bloc : sur
 * Memoire, la plus longue (4466 px de defilement), on lit une colonne
 * uniforme pendant que l'arc, lui, est fini au tiers.
 *
 * Ce qu'on fait ici est plus simple que le mecanisme du Centre, et c'est
 * voulu : les cartes sont rendues par le serveur, elles font la hauteur de
 * la page, on ne les masque jamais (display: none deplacerait tout ce qui
 * suit). Chaque carte apparait quand elle ENTRE dans le cadre, une fois, en
 * opacite et en translation ; rien ne depend de l'arc, donc aucune carte ne
 * peut rester invisible en bas de page (l'oracle du plan).
 *
 * Sous prefers-reduced-motion, rien : la classe de depart n'est pas posee
 * et les cartes sont la tout de suite. Sans JavaScript, idem, puisque la
 * classe est posee d'ici.
 */
// Releve du 11/09 : Memoire et Services posent des div.serviceCard, Projets
// des article.projectCase.
const CIBLES = ".contentPage > .serviceCard, .contentPage > .projectCase, .contentPage > article, .contentPage > section";

export default function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cartes = Array.from(document.querySelectorAll<HTMLElement>(CIBLES));
    if (cartes.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).classList.add("chapitre-vu");
          obs.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    for (const c of cartes) {
      // Ce qui est deja dans le cadre a l'arrivee est vu tout de suite : pas
      // de premiere carte qui apparait en retard sous les yeux du visiteur.
      const r = c.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.88 && r.bottom > 0) {
        c.classList.add("chapitre-vu");
        continue;
      }
      c.classList.add("chapitre-attend");
      obs.observe(c);
    }
    // LES CARTES SAUTEES (mesure du 11/09) : un saut de defilement (ancre,
    // Page suivante, molette rapide, la sonde elle-meme) peut passer
    // par-dessus une carte sans qu'elle entre jamais dans le cadre, et
    // l'observateur ne signale que les entrees. Deux cartes sur douze
    // restaient invisibles en bas de Memoire. Tout ce qui est passe
    // AU-DESSUS du cadre est donc considere comme vu, au defilement.
    let raf = 0;
    const rattraper = () => {
      raf = 0;
      for (const c of cartes) {
        if (c.classList.contains("chapitre-vu")) continue;
        if (c.getBoundingClientRect().bottom < 0) {
          c.classList.add("chapitre-vu");
          obs.unobserve(c);
        }
      }
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(rattraper);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
