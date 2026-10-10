"use client";

import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import { heroTexteVisible } from "@/lib/hero-mobile";
import styles from "./scene-text-overlay.module.css";

/**
 * Le paragraphe du hero, qui n'entre dans la carte qu'au premier
 * defilement sur telephone (04/10, lib/hero-mobile). Un attribut
 * `data-visible` pose par image depuis le progres de l'arc ; c'est la
 * feuille de style (scene-text-overlay, sous 768 px) qui cache le
 * paragraphe sans l'attribut. Au bureau l'attribut n'a aucun effet. Meme
 * motif que FadingBlock : requestAnimationFrame, jamais d'etat React par
 * image.
 */
export default function HeroTexteMobile({ progressRef, children }: { progressRef: MutableRefObject<number>; children: ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    let raf = 0;
    let visible: boolean | null = null;
    const tick = () => {
      const v = heroTexteVisible(progressRef.current);
      if (v !== visible && ref.current) {
        visible = v;
        if (v) ref.current.setAttribute("data-visible", "");
        else ref.current.removeAttribute("data-visible");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef]);
  return (
    <p ref={ref} className={styles.heroTexte}>
      {children}
    </p>
  );
}
