"use client";

import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { etatBloc, type Fenetre } from "@/lib/partition-texte";
import { isBot } from "@/lib/is-bot";
import styles from "./scene-text-overlay.module.css";
import { ETAT_PLEIN, usePiloteFenetre } from "./use-pilote-fenetre";

/**
 * Bloc de texte du calque fixe, dont l'opacite suit sa FENETRE dans l'arc
 * (11/10, partition du texte, lib/partition-texte) : en flux normal, pas
 * positionne lui-meme, c'est SceneTextOverlay (le parent) qui empile
 * plusieurs FadingBlock verticalement, pour que deux blocs cohabitant au
 * meme coin ne se superposent jamais quand les deux sont visibles
 * (`prefers-reduced-motion`, garde-fou du Codex Nahual). Hors mouvement
 * reduit, la partition garantit qu'un seul bloc est visible a la fois.
 *
 * `display: none` en plus de l'opacite quand le bloc est totalement
 * invisible : un bloc a opacite 0 reste sinon present dans le flux et
 * pousse le voisin visible loin de son ancrage reel (bug constate le
 * 19/08 : hero colle en haut au lieu du bas).
 *
 * L'opacite de tout premier rendu est posee en style inline depuis
 * `etatBloc(0, fenetre)` : sans ca, un bloc cense demarrer invisible
 * flashait plein pot avant le premier calcul (bug reel du 19/08).
 *
 * `data-bloc` nomme le bloc pour les oracles (partition-centre.spec.ts) ;
 * `data-phase` et `--avancement` sont poses par le pilote.
 */
export default function FadingBlock({
  progressRef,
  reducedMotionRef,
  fenetre,
  nom,
  children,
}: {
  progressRef: MutableRefObject<number>;
  reducedMotionRef: MutableRefObject<boolean>;
  fenetre: Fenetre;
  nom: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Bots (Lighthouse/PageSpeed/crawlers) : skip rAF permanent + force
  // contenu visible (les chapitres demarrent invisibles, seul le hero
  // serait crawle sinon). Detection post-hydration = pas de mismatch SSR.
  const [bot, setBot] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isBot()) setBot(true);
  }, []);

  usePiloteFenetre(rootRef, fenetre, progressRef, reducedMotionRef, { masquer: true, actif: !bot });

  const initial = bot ? ETAT_PLEIN : etatBloc(0, fenetre);
  const inlineStyle = {
    opacity: initial.opacite,
    pointerEvents: (initial.opacite > 0.05 ? "auto" : "none") as "auto" | "none",
    display: (initial.opacite > 0.001 ? "flex" : "none") as "flex" | "none",
  };

  return (
    <div ref={rootRef} className={styles.block} style={inlineStyle} data-bloc={nom} data-phase={initial.phase}>
      {children}
    </div>
  );
}
