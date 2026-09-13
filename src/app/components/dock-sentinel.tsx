"use client";

import { useEffect } from "react";

/**
 * LA COLONNE DE BOUTONS S'EFFACE QUAND ON DESCEND (13/09, X3 de l'audit).
 *
 * Sur telephone, huit boutons vivent a gauche, de 16 a 116 px pour la
 * derniere rangee ; le couloir de 72 px du contenu ne suffit pas a cette
 * rangee, et tout texte qui defile finit sous elle (mesure controls-overlap
 * a mi-parcours de Memoire : « mode recit » recouvrait 470 px2 d'une carte).
 * Le geste des navigateurs mobiles : ce qu'on ne lit pas se retire quand on
 * descend, et revient des qu'on remonte, qu'on touche le haut, ou qu'on
 * entre dedans au clavier (`:focus-within`, en CSS). Rien ne bouge sur
 * ordinateur : le CSS ne lit l'attribut que sous 767 px.
 */
const SEUIL_PX = 12;

export default function DockSentinel() {
  useEffect(() => {
    const root = document.documentElement;
    let dernier = window.scrollY;
    let cache = false;
    let raf = 0;
    const lire = () => {
      raf = 0;
      const y = window.scrollY;
      const delta = y - dernier;
      if (y < 40 || delta < -SEUIL_PX) {
        if (cache) { cache = false; root.removeAttribute("data-dock-hidden"); }
        dernier = y;
      } else if (delta > SEUIL_PX) {
        if (!cache) { cache = true; root.setAttribute("data-dock-hidden", "true"); }
        dernier = y;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(lire); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      root.removeAttribute("data-dock-hidden");
    };
  }, []);
  return null;
}
