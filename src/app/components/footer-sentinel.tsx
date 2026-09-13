"use client";

import { useEffect } from "react";

/**
 * LE PIED DE PAGE EST LA VRAIE FIN (13/09, X4 de l'audit).
 *
 * Le calque de texte et la cloture sont fixes ; le pied de page defile
 * par-dessus, et un jure qui va au bout lisait un panneau coupe (mesure :
 * la cloture du Centre sous le pied des 85 % de l'arc). Ici, un observateur
 * pose `data-footer-in-view` sur <html> des que le pied entre dans le cadre,
 * et le CSS efface les calques fixes (globals.css, scene-stage.module.css).
 * Rien n'est calcule par image : l'observateur ne parle que quand l'etat
 * change.
 */
export default function FooterSentinel() {
  useEffect(() => {
    const footer = document.querySelector<HTMLElement>("footer.siteFooter");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible) root.setAttribute("data-footer-in-view", "true");
        else root.removeAttribute("data-footer-in-view");
      },
      // Un pied de page qui n'a que 40 px dans le cadre n'est pas encore la
      // fin : on attend qu'il en montre 120.
      { rootMargin: "0px 0px -120px 0px", threshold: 0 },
    );
    observer.observe(footer);
    return () => {
      observer.disconnect();
      root.removeAttribute("data-footer-in-view");
    };
  }, []);
  return null;
}
