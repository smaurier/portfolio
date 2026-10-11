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
 *
 * DEPUIS LA PARTITION DU TEXTE (11/10) : sur le Centre, le chant est pilote
 * par sa fenetre dans l'arc (bloc-en-flux.tsx) et sa figure, placee pour
 * parler a 0,32 -> 0,50, est deja DANS le cadre bien avant, invisible
 * (`visibility: hidden`, phase `avant`). L'observateur d'intersection ne
 * voit pas la difference : il eteignait le chapitre I a 0,21 sur Pixel
 * (mesure, capture du 11/10). Un chant qui ne parle pas ne fait donc taire
 * personne : l'attribut n'est pose que si la figure intersecte ET que son
 * bloc pilote n'est pas en `avant`/`apres` (sans bloc pilote, les pages
 * echo : l'intersection seule, comme avant). La phase change sans que
 * l'intersection bouge : un MutationObserver sur l'attribut reprend la
 * main, meme motif que RevealText.
 */
export default function ChantSentinel() {
  useEffect(() => {
    const chant = document.querySelector<HTMLElement>("figure.cantar");
    if (!chant || typeof IntersectionObserver === "undefined") return;
    const root = document.documentElement;
    const bloc = chant.closest<HTMLElement>("[data-bloc]");
    let intersecte = false;
    const poser = () => {
      const phase = bloc?.dataset.phase;
      const parle = !bloc || (phase !== "avant" && phase !== "apres");
      if (intersecte && parle) root.setAttribute("data-chant-in-view", "true");
      else root.removeAttribute("data-chant-in-view");
    };
    const observer = new IntersectionObserver(
      (entries) => {
        intersecte = entries.some((e) => e.isIntersecting);
        poser();
      },
      // Comme le pied de page : quelques pixels ne sont pas une entree.
      { rootMargin: "0px 0px -100px 0px", threshold: 0 },
    );
    observer.observe(chant);
    const phases = bloc ? new MutationObserver(poser) : null;
    phases?.observe(bloc as HTMLElement, { attributes: true, attributeFilter: ["data-phase"] });
    return () => {
      observer.disconnect();
      phases?.disconnect();
      root.removeAttribute("data-chant-in-view");
    };
  }, []);
  return null;
}
