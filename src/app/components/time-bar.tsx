"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./time-bar.module.css";
import { arcPhase, progressFromSlider, sliderFromProgress, SLIDER_MAX, type ArcPhase } from "@/lib/time-bar";
import { useReadingMode } from "../../lib/reading-mode-context";

/**
 * TimeBar (05/09). Un fin curseur nuit -> midi en bas de page, qui suit le
 * scroll et le pilote en retour. C'est d'abord un gain d'accessibilite :
 * l'arc devient un vrai controle (fleches au clavier, valeur en mots pour
 * le lecteur d'ecran), et pour tout le monde un moyen de « revoir le
 * lever » sans chercher la bonne hauteur de page. Invisible en mode recit.
 */

export type TimeBarLabels = { label: string; night: string; dawn: string; morning: string; noon: string };

const ARC_SCROLL_VIEWPORTS = 2;

export default function TimeBar({ labels }: { labels: TimeBarLabels }) {
  const readingMode = useReadingMode();
  const [value, setValue] = useState(0);
  const draggingRef = useRef(false);

  // Suit le scroll (sauf pendant qu'on tient le curseur).
  useEffect(() => {
    const read = () => {
      if (draggingRef.current) return;
      const arc = window.innerHeight * ARC_SCROLL_VIEWPORTS;
      setValue(sliderFromProgress(arc > 0 ? window.scrollY / arc : 0));
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, []);

  if (readingMode.active) return null;

  const phase: ArcPhase = arcPhase(progressFromSlider(value));
  const phaseLabel = labels[phase];

  return (
    <div className={styles.bar}>
      <input
        type="range"
        className={styles.range}
        min={0}
        max={SLIDER_MAX}
        step={5}
        value={value}
        aria-label={labels.label}
        aria-valuetext={phaseLabel}
        onPointerDown={() => {
          draggingRef.current = true;
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onChange={(e) => {
          const v = Number(e.target.value);
          setValue(v);
          window.scrollTo({ top: progressFromSlider(v) * window.innerHeight * ARC_SCROLL_VIEWPORTS, behavior: "auto" });
        }}
      />
      <span className={styles.phase} aria-hidden="true">
        {phaseLabel}
      </span>
    </div>
  );
}
