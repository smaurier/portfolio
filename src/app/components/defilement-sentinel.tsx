"use client";

import { useEffect } from "react";

/**
 * LE BANDEAU SE FERME DES QU'ON DEFILE (14/09, retour Sylvain : « il y a
 * trop de texte qui se chevauche sur telephone, un peu moins sur ordi »).
 *
 * Mesure du 14/09, texte contre texte sur cinq pages, telephone et
 * ordinateur : tous les recouvrements restants venaient du meme endroit,
 * le bandeau fixe. Son fond est a 72 % d'opacite, choix du 26/08 pour
 * garder l'esprit flottant ; a 72 %, le texte qui passe dessous reste
 * lisible, et l'oeil lit deux textes a la fois.
 *
 * La reponse tient en un attribut : en HAUT de page, rien ne passe sous le
 * bandeau, il garde donc sa transparence et la scene respire ; des que le
 * defilement commence, il se ferme. C'est le motif que tout le monde
 * connait, et il ne coute qu'un ecouteur passif.
 */
const SEUIL_PX = 24;

export default function DefilementSentinel() {
  useEffect(() => {
    const root = document.documentElement;
    let pose = false;
    let raf = 0;
    const lire = () => {
      raf = 0;
      const doit = window.scrollY > SEUIL_PX;
      if (doit === pose) return;
      pose = doit;
      if (doit) root.setAttribute("data-defile", "true");
      else root.removeAttribute("data-defile");
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(lire);
    };
    lire();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      root.removeAttribute("data-defile");
    };
  }, []);
  return null;
}
