"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSceneRefs } from "./scene-refs-context";

/**
 * Face-a-face sticky pin (28/08 boite outil #6). Signature SOTY
 * scroll-driven cinema : le chapitre "face-a-face" pin sur ~200vh,
 * pendant lequel PostFX bloom scrub via pinProgressRef partage.
 *
 * Auto-release timer 5s (28/08 retour Sylvain "disparition du pin
 * apres x secondes") — au premier atteint du pin (onEnter), timer
 * 5s puis kill() ScrollTrigger + release scroll. Le pin est un
 * moment de contemplation, pas un piege.
 *
 * Reduced-motion : ScrollTrigger not registered, section rendered
 * inline height auto sans pin.
 */

const PIN_RELEASE_MS = 5000;

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function FaceAFacePin({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const refs = useSceneRefs();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!refs) return;
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;

    let releaseTimer: number | null = null;
    let released = false;

    const st = ScrollTrigger.create({
      trigger: section,
      pin,
      pinSpacing: true,
      start: "top top",
      end: "+=200%",
      scrub: 1,
      onEnter: () => {
        // Auto-release timer 5s a partir du moment ou pin devient
        // actif. Apres timer, kill ScrollTrigger + release scroll.
        if (released) return;
        if (releaseTimer !== null) window.clearTimeout(releaseTimer);
        releaseTimer = window.setTimeout(() => {
          released = true;
          st.kill();
          refs.pinProgressRef.current = 0;
        }, PIN_RELEASE_MS);
      },
      onUpdate: (self) => {
        if (!released) refs.pinProgressRef.current = self.progress;
      },
    });

    return () => {
      if (releaseTimer !== null) window.clearTimeout(releaseTimer);
      st.kill();
      refs.pinProgressRef.current = 0;
    };
  }, [refs]);

  return (
    <section ref={sectionRef} style={{ position: "relative" }}>
      <div
        ref={pinRef}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        {children}
      </div>
    </section>
  );
}
