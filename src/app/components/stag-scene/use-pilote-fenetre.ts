"use client";

import { useEffect, type MutableRefObject, type RefObject } from "react";
import { etatBloc, type EtatBloc, type Fenetre } from "@/lib/partition-texte";

/**
 * LE PILOTE D'UN BLOC DE TEXTE (11/10, partition du texte). Un seul
 * mecanisme pour le calque fixe (FadingBlock), le chant dans le flux
 * (BlocEnFlux) et, par etatBloc directement, la cloture : a chaque image,
 * l'etat de la fenetre est lu depuis le progres de l'arc et pose sur
 * l'element. Opacite et pointer-events en style ; `data-phase` pour le
 * CSS et pour RevealText (qui rejoue sa cascade a chaque entree) ;
 * `--avancement` (0 -> 1 dans la phase) pour que le mouvement de 12 px a
 * l'entree et de 8 px a la sortie vive en CSS, pas ici.
 *
 * Meme discipline que FadingBlock depuis le 19/08 : requestAnimationFrame
 * et ecriture DOM directe, jamais d'etat React par image, aucune lecture
 * de mise en page (lire un attribut n'en est pas une).
 *
 * `masquer` : le calque fixe empile ses blocs en colonne, un bloc invisible
 * doit sortir du flux (display none, bug du 19/08 : le hero colle en haut)
 * ; un bloc EN flux garde sa place (visibility hidden), sinon la page
 * changerait de hauteur et l'arc avec.
 */
export const ETAT_PLEIN: EtatBloc = { opacite: 1, phase: "tenue", avancement: 0 };

export function appliquerEtat(el: HTMLElement, etat: EtatBloc, masquer: boolean): void {
  el.style.opacity = String(etat.opacite);
  el.style.pointerEvents = etat.opacite > 0.05 ? "auto" : "none";
  if (masquer) el.style.display = etat.opacite > 0.001 ? "flex" : "none";
  else el.style.visibility = etat.opacite > 0.001 ? "visible" : "hidden";
  el.style.setProperty("--avancement", etat.avancement.toFixed(3));
  // Ecrit seulement au changement : un MutationObserver (RevealText) ecoute
  // cet attribut, et setAttribute a valeur egale le reveillerait quand meme.
  if (el.dataset.phase !== etat.phase) el.dataset.phase = etat.phase;
}

export function usePiloteFenetre(
  ref: RefObject<HTMLElement | null>,
  fenetre: Fenetre,
  progressRef: MutableRefObject<number>,
  reducedMotionRef: MutableRefObject<boolean>,
  options: { masquer: boolean; actif: boolean },
): void {
  const { masquer, actif } = options;
  useEffect(() => {
    if (!actif) return;
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) appliquerEtat(el, reducedMotionRef.current ? ETAT_PLEIN : etatBloc(progressRef.current, fenetre), masquer);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref, fenetre, progressRef, reducedMotionRef, masquer, actif]);
}
