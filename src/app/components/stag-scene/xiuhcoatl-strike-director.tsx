"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { advanceStrike, strikeState } from "@/lib/strike-sequence";
import { xiuhcoatlStore } from "./xiuhcoatl-store";
import { useSceneRefs } from "./scene-refs-context";
import { markTrace } from "../traces-store";

/**
 * XiuhcoatlStrikeDirector (05/09). Un seul endroit calcule l'enveloppe de
 * la frappe (lib pure strike-sequence) a partir de `strikeAt` (pose par
 * SudSky au climax) et l'ecrit dans le store ; les composants ne lisent
 * que des nombres 0..1. Hors frappe, tout est a zero.
 */
export default function XiuhcoatlStrikeDirector() {
  const sceneRefs = useSceneRefs();
  // L'horloge PROPRE de la frappe (09/09), avancee d'un pas borne par image
  // plutot que lue sur `elapsedTime - strikeAt`. Mesure qui a motive ce
  // changement : au declenchement, l'anneau s'embrase et son shader se
  // compile, et l'horloge de la scene a saute de 3,9 s en UNE image. Toute
  // l'enveloppe de 3,1 s etait consommee d'un coup, donc invisible. Voir
  // `advanceStrike` dans lib/strike-sequence.
  const activeRef = useRef(false);
  const sinceRef = useRef(-1);
  const lastAtRef = useRef(-1);
  useFrame((_state, delta) => {
    const at = xiuhcoatlStore.strikeAt;
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    if (at < 0) {
      sinceRef.current = -1;
      lastAtRef.current = -1;
    } else if (at !== lastAtRef.current) {
      // Nouvelle frappe : l'horloge repart de zero, jamais d'un ecart.
      lastAtRef.current = at;
      sinceRef.current = 0;
    } else if (sinceRef.current >= 0) {
      sinceRef.current = advanceStrike(sinceRef.current, delta);
    }
    const s = strikeState(sinceRef.current, reduced);
    const t = xiuhcoatlStore.strike;
    t.stiffen = s.stiffen;
    t.flash = s.flash;
    t.shake = s.shake;
    t.lift = s.lift;
    t.fire = s.fire;
    t.tint = s.tint;
    if (s.fire > 0.5 || s.tint > 0.2) markTrace("xiuhcoatl-strike"); // une trace : la frappe

    // LE CONTENU S'ECARTE PENDANT LA FRAPPE (09/09). Mesure du meme jour :
    // au point de scroll ou la frappe se declenche, les cartes de projets
    // couvraient TOUT le centre de l'ecran. L'effet le plus spectaculaire du
    // site se jouait derriere un mur de texte opaque, et aucune qualite de
    // modelisation n'y aurait rien change.
    //
    // On pose un etat sur <html> et c'est le CSS qui decide de la maniere :
    // meme motif que `data-loaded` et que `body.nahual-lab-reveal`, deja
    // employes par le projet. Ecrit seulement quand la valeur CHANGE, pas a
    // chaque image.
    const active = s.stiffen > 0.01 || s.fire > 0.02;
    if (active !== activeRef.current) {
      activeRef.current = active;
      if (typeof document !== "undefined") {
        if (active) document.documentElement.dataset.strike = "1";
        else delete document.documentElement.dataset.strike;
      }
    }
  });
  return null;
}
