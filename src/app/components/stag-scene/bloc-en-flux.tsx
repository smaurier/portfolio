"use client";

import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { etatBloc, type Fenetre } from "@/lib/partition-texte";
import { isBot } from "@/lib/is-bot";
import { useSceneRefs } from "./scene-refs-context";
import { ETAT_PLEIN, usePiloteFenetre } from "./use-pilote-fenetre";

/**
 * UN BLOC DE TEXTE DANS LE FLUX, DANS SA FENETRE (11/10, partition du
 * texte). Le chant du Centre reste un seul noeud, l'original, dans
 * `.cantarFlow` : pas de copie dans le calque, pas de `sticky`. Il defile
 * pendant sa tenue, comme une carte des pages echo, et son opacite, son
 * `data-phase` et son `--avancement` viennent de sa fenetre par le meme
 * pilote que FadingBlock. Il garde sa place quand il est invisible
 * (`visibility: hidden`, pas `display: none`) : la page ne change pas de
 * hauteur, donc l'arc non plus. En mode recit (`body.reading-mode`), le
 * CSS le force visible : il est dans le flux, il se lit.
 */
const REF_ZERO: MutableRefObject<number> = { current: 0 };
const REF_PLEIN: MutableRefObject<boolean> = { current: true };

export default function BlocEnFlux({ fenetre, nom, children }: { fenetre: Fenetre; nom: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const refs = useSceneRefs();
  const [bot, setBot] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isBot()) setBot(true);
  }, []);
  // Hors provider (rendu sans scene) : pas de pilote, le bloc reste visible.
  usePiloteFenetre(ref, fenetre, refs?.progressRef ?? REF_ZERO, refs?.reducedMotionRef ?? REF_PLEIN, {
    masquer: false,
    actif: refs !== null && !bot,
  });
  const initial = bot || !refs ? ETAT_PLEIN : etatBloc(0, fenetre);
  const inlineStyle = {
    opacity: initial.opacite,
    visibility: (initial.opacite > 0.001 ? "visible" : "hidden") as "visible" | "hidden",
    pointerEvents: (initial.opacite > 0.05 ? "auto" : "none") as "auto" | "none",
  };
  return (
    <div ref={ref} className="blocEnFlux" style={inlineStyle} data-bloc={nom} data-phase={initial.phase}>
      {children}
    </div>
  );
}
