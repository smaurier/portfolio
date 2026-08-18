"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { clampProgress } from "@/lib/camera-path";
import OrbitCamera from "./orbit-camera";
import StagModel from "./stag-model";
import styles from "./stag-scene.module.css";

/**
 * Palier 0 de la DA Nahual (cf memory project-nahual-da) : le cerf Quaternius
 * importé tel quel, caméra qui fait un tour à 360° autour de lui pendant le
 * scroll, rien d'autre — pas de reveal, pas d'échos, pas de shader custom.
 * Volontairement isolé sur /lab plutôt que branché sur la home en prod.
 */
export default function StagScene() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = reducedMotionQuery.matches;

    function handleScroll() {
      // prefers-reduced-motion : le cerf reste sur le cadrage par défaut
      // (progress=0), aucune trajectoire pilotée par le scroll.
      if (reducedMotionRef.current) return;

      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const scrollableHeight = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      progressRef.current = clampProgress(
        scrollableHeight > 0 ? scrolled / scrollableHeight : 0,
      );
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={sectionRef} className={styles.scrollTrack}>
      <div className={styles.sticky}>
        <Canvas camera={{ fov: 45, near: 0.1, far: 100 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[4, 6, 4]} intensity={1.4} />
          <Suspense fallback={null}>
            <StagModel />
          </Suspense>
          <OrbitCamera progressRef={progressRef} />
        </Canvas>
      </div>
    </div>
  );
}
