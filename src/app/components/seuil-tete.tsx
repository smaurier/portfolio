"use client";

import { useEffect, useRef } from "react";
import { seuilTeteOpacity } from "@/lib/seuil-tete";
import { renderWithNahuatl } from "@/lib/nahuatl";
import { useSceneRefs } from "./stag-scene/scene-refs-context";

/**
 * La ligne de seuil des pages echo, en haut a gauche du calque fixe (13/09,
 * X2 de l'audit). Elle lit la progression de l'arc a chaque image, comme
 * FadingBlock, et s'efface apres le premier quart. En mode recit le CSS la
 * remet dans le flux, opaque. Elle reste dans le DOM en tete de <main> :
 * un lecteur d'ecran l'entend a sa place, avant le contenu.
 */
export default function SeuilTete({ texte }: { texte: string }) {
  const refs = useSceneRefs();
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!refs) return;
    let raf = 0;
    let derniere = -1;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const o = refs.reducedMotionRef.current ? 1 : seuilTeteOpacity(refs.progressRef.current);
        if (o !== derniere) {
          derniere = o;
          el.style.opacity = String(o);
          el.style.visibility = o > 0.01 ? "visible" : "hidden";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [refs]);
  return (
    <p ref={ref} className="seuilTete" data-seuil-tete="fixe">
      {renderWithNahuatl(texte)}
    </p>
  );
}
