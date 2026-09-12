"use client";

import { useEffect, useState } from "react";
import { useCardinalTransition, type CardinalDirection } from "./stag-scene/cardinal-transition-context";

/**
 * LA LIGNE DE SEUIL (11/09, N1 du backlog, choix de Sylvain : la deuxieme
 * personne ; au tutoiement depuis le 12/09, comme tout le site).
 *
 * Pendant le voyage cardinal, une phrase adressee au visiteur relie ce
 * qu'il quitte a ce qu'il rejoint. Elle vit dans un message de statut
 * (RGAA 7.5 : `role="status"`, annonce sans deplacer le focus), reste a
 * l'ecran deux secondes apres l'arrivee (13.8 : un contenu en mouvement
 * sans commande est tolere sous cinq secondes), et la meme phrase est
 * CONSERVEE, visible, en tete de la page d'arrivee (echo-scene-page,
 * stag-scene) : perceptible et utile pour tout le monde, pas seulement pour
 * qui lit vite.
 *
 * Les textes viennent des dictionnaires (`common.seuils`) ; tant qu'ils
 * sont vides, rien ne s'affiche ni ne s'annonce.
 */
const HOLD_AFTER_ARRIVAL_MS = 2000;

export type SeuilTexts = Record<CardinalDirection, string>;

export default function SeuilLine({ seuils }: { seuils: SeuilTexts }) {
  const transition = useCardinalTransition();
  const target = transition?.transitionDirection ?? null;
  // Etat derive pendant le rendu (le motif documente par React), pas dans
  // un effet : le voyage commence, la phrase de la direction visee s'affiche.
  const [affiche, setAffiche] = useState<{ texte: string; visible: boolean }>({ texte: "", visible: false });
  if (target) {
    const t = seuils[target] ?? "";
    if (affiche.texte !== t || affiche.visible !== t.length > 0) setAffiche({ texte: t, visible: t.length > 0 });
  }

  useEffect(() => {
    if (target) return;
    // Arrivee : on tient encore un peu, puis on efface.
    const timer = window.setTimeout(() => setAffiche((s) => (s.visible ? { ...s, visible: false } : s)), HOLD_AFTER_ARRIVAL_MS);
    return () => window.clearTimeout(timer);
  }, [target]);

  return (
    <p className="seuilVoyage" role="status" aria-live="polite" data-visible={affiche.visible ? "true" : "false"}>
      {affiche.visible ? affiche.texte : ""}
    </p>
  );
}
