"use client";

import { useEffect } from "react";

/**
 * QUAND LE CHANT ENTRE, LA SCENE SE TAIT (14/09, retour Sylvain : « il y a
 * trop de texte qui se chevauche sur telephone »).
 *
 * Mesure du 14/09, texte contre texte sur cinq pages et deux ecrans, en ne
 * comptant que ce que l'oeil voit vraiment (une couche opaque qui
 * s'intercale ne compte pas) : apres avoir ferme le bandeau au defilement,
 * il ne restait QUE quatre recouvrements, tous sur telephone, tous les
 * memes : les chapitres du calque de scene, qui sont fixes, par-dessus le
 * chant, qui defile. Deux textes, deux voix, un seul ecran etroit.
 *
 * Le chant a la priorite : c'est la voix qui ferme la page. Le calque
 * s'efface donc quand il entre, exactement comme il s'efface devant le
 * pied de page. Sur grand ecran, les deux ne se touchent pas (le chant est
 * dans sa colonne) : la regle est donc bornee au petit ecran, cote CSS.
 */
export default function ChantSentinel() {
  useEffect(() => {
    const chant = document.querySelector<HTMLElement>("figure.cantar");
    if (!chant || typeof IntersectionObserver === "undefined") return;
    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible) root.setAttribute("data-chant-in-view", "true");
        else root.removeAttribute("data-chant-in-view");
      },
      // Comme le pied de page : quelques pixels ne sont pas une entree.
      { rootMargin: "0px 0px -100px 0px", threshold: 0 },
    );
    observer.observe(chant);
    return () => {
      observer.disconnect();
      root.removeAttribute("data-chant-in-view");
    };
  }, []);
  return null;
}
