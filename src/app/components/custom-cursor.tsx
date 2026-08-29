"use client";

import { useEffect, useRef } from "react";
import styles from "./custom-cursor.module.css";

/**
 * Curseur custom (28/08 task #47). Signature léché SOTY : point
 * cardinal jade qui suit la souris, ring extérieur avec trainée lerp,
 * morph cardinal (dore/turquoise/cendre/obsidienne/jade) au survol
 * des liens nav, magnetic attraction sur CTAs.
 *
 * Actif uniquement sur (hover: hover) and (pointer: fine) — touch/pen
 * exclu du check via matchMedia dans useEffect, le body class
 * `nahual-custom-cursor` est posée conditionnellement, le CSS
 * masque le curseur natif seulement dans cette zone.
 *
 * Attraction magnétique : elements avec attribut data-magnetic sont
 * détectés au pointerover, le curseur est tiré vers leur centre avec
 * un lerp fort (0.35) au lieu du lerp normal (0.15). Effet "aimant"
 * classique Awwwards.
 *
 * Morph couleur cardinale : elements avec data-cardinal-direction
 * (posé par CardinalLink) déclenchent un change de --cursor-color
 * via style inline sur le container, avec transition CSS 0.3s.
 */

const DOT_LERP = 0.55; // dot suit vite (quasi direct)
const RING_LERP_NORMAL = 0.15; // ring suit lentement (trainée)
const RING_LERP_MAGNETIC = 0.35; // ring suit plus vite quand aimanté

const CARDINAL_COLORS: Record<string, string> = {
  jade: "#00c078",
  dore: "#ffb400",
  turquoise: "#0f6bb8",
  cendre: "#d76464",
  obsidienne: "#6b3fa8",
};

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  // Refs mutés sync par les event handlers, lues dans le rAF loop.
  // Refs plutôt que state pour éviter re-render à chaque pointermove.
  const targetRef = useRef({ x: -100, y: -100 });
  const dotRef2 = useRef({ x: -100, y: -100 });
  const ringPosRef = useRef({ x: -100, y: -100 });
  const magneticTargetRef = useRef<HTMLElement | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Media query : hover fine only. Sinon on ne monte pas le
    // curseur ET on ne masque pas le natif.
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;
    // Respect prefers-reduced-motion (29/08 a11y) : le lerp du dot
    // et du ring cree un mouvement continu qui peut declencher
    // troubles vestibulaires. Skip completement le curseur custom,
    // le natif reste visible.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.body.classList.add("nahual-custom-cursor");
    activeRef.current = true;

    function onPointerMove(e: PointerEvent) {
      targetRef.current.x = e.clientX;
      targetRef.current.y = e.clientY;
    }

    function onPointerOver(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Cherche l'ancêtre le plus proche avec data-magnetic ou
      // data-cardinal-direction (CardinalLink devrait poser
      // data-cardinal-direction sur les liens nav).
      const magnetic = target.closest("[data-magnetic]") as HTMLElement | null;
      const cardinal = target.closest("[data-cardinal-direction]") as HTMLElement | null;

      if (magnetic) {
        magneticTargetRef.current = magnetic;
        cursorRef.current?.setAttribute("data-hover", "true");
      } else if (cardinal) {
        cursorRef.current?.setAttribute("data-hover", "true");
      }

      if (cardinal && cursorRef.current) {
        const dir = cardinal.getAttribute("data-cardinal-direction") ?? "jade";
        const color = CARDINAL_COLORS[dir] ?? CARDINAL_COLORS.jade;
        cursorRef.current.style.setProperty("--cursor-color", color);
      }
    }

    function onPointerOut(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const magnetic = target.closest("[data-magnetic]");
      const cardinal = target.closest("[data-cardinal-direction]");
      // relatedTarget vide OU sort du magnetic/cardinal = reset
      const related = e.relatedTarget as HTMLElement | null;
      const stillMagnetic = related?.closest("[data-magnetic]");
      const stillCardinal = related?.closest("[data-cardinal-direction]");

      if (magnetic && !stillMagnetic) {
        magneticTargetRef.current = null;
        cursorRef.current?.setAttribute("data-hover", "false");
      }
      if (cardinal && !stillCardinal) {
        cursorRef.current?.setAttribute("data-hover", "false");
        cursorRef.current?.style.removeProperty("--cursor-color");
      }
    }

    function onPointerDown() {
      cursorRef.current?.setAttribute("data-pressed", "true");
    }
    function onPointerUp() {
      cursorRef.current?.setAttribute("data-pressed", "false");
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });

    let rafId = 0;
    function tick() {
      // Attraction magnétique : si un target est actif, la target
      // "réelle" devient le centre de l'élément aimanté, pas la
      // souris. Le ring lerp fort donne l'effet "aspiré vers".
      let tx = targetRef.current.x;
      let ty = targetRef.current.y;
      let ringLerp = RING_LERP_NORMAL;
      if (magneticTargetRef.current) {
        const rect = magneticTargetRef.current.getBoundingClientRect();
        tx = rect.left + rect.width / 2;
        ty = rect.top + rect.height / 2;
        ringLerp = RING_LERP_MAGNETIC;
      }

      dotRef2.current.x += (targetRef.current.x - dotRef2.current.x) * DOT_LERP;
      dotRef2.current.y += (targetRef.current.y - dotRef2.current.y) * DOT_LERP;
      ringPosRef.current.x += (tx - ringPosRef.current.x) * ringLerp;
      ringPosRef.current.y += (ty - ringPosRef.current.y) * ringLerp;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dotRef2.current.x}px, ${dotRef2.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPosRef.current.x}px, ${ringPosRef.current.y}px, 0) translate(-50%, -50%)`;
      }

      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      cancelAnimationFrame(rafId);
      document.body.classList.remove("nahual-custom-cursor");
      activeRef.current = false;
    };
  }, []);

  return (
    <div ref={cursorRef} className={styles.cursor} aria-hidden="true">
      <div ref={dotRef} className={styles.dot} />
      <div ref={ringRef} className={styles.ring} />
    </div>
  );
}
