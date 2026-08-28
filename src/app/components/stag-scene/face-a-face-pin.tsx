"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSceneRefs } from "./scene-refs-context";

/**
 * Face-a-face sticky pin (28/08 boite outil #6). Signature SOTY
 * scroll-driven cinema : le chapitre "face-a-face" pin sur ~200vh,
 * pendant lequel PostFX + camera scrub via pinProgressRef partage.
 *
 * Structure : section 300vh de hauteur, child pin 100vh viewport
 * hold via ScrollTrigger pin option. Progress local 0..1 → poste
 * dans sceneRefs.pinProgressRef, consomme par PostFX (bloom boost)
 * et OrbitCamera (dolly + fov shift).
 *
 * Reduced-motion : ScrollTrigger not registered, section rendered
 * inline height auto sans pin.
 */

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

    const st = ScrollTrigger.create({
      trigger: section,
      pin,
      pinSpacing: true,
      start: "top top",
      end: "+=200%",
      scrub: 1,
      onUpdate: (self) => {
        refs.pinProgressRef.current = self.progress;
      },
    });

    return () => {
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
