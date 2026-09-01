"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  buildSegmentTicks,
  buildSerpentOutlinePath,
  buildSnoutHook,
  buildTailFlare,
  sampleSerpentArc,
  SERPENT_A,
  SERPENT_B,
} from "@/lib/serpent-loop";
import styles from "./loading-cycle.module.css";

/**
 * Les deux Xiuhcoatl (serpents de feu) qui encerclent le voile de
 * chargement : cf src/lib/serpent-loop.ts pour la géométrie et l'ancrage
 * mythologique (Piedra del Sol, orientation vérifiée par recherche le
 * 21/08). Le corps (`outline`) se dessine via stroke-dasharray/dashoffset
 * (technique classique de "line draw" SVG) piloté par `progress` (0-100,
 * même source que le pourcentage affiché à côté) : le ruban se trace tête
 * (en bas) vers queue (en haut) à mesure que la scène charge : les deux
 * queues se rejoignant en haut pile quand la scène est prête. Les détails
 * (museau, queue trapèze-et-rayon, écailles) n'ont pas de longueur stable
 * exploitable en dasharray (plusieurs sous-tracés) : ils apparaissent en
 * fondu plutôt qu'en tracé progressif.
 *
 * `getTotalLength()` exige le DOM (pas dispo en SSR) : recalculé à chaque
 * changement de `progress` plutôt qu'une seule fois au montage : bon marché
 * ici (deux <path>, appelé au rythme de useProgress, pas par frame R3F).
 */
export default function LoadingCycle({ progress }: { progress: number }) {
  const pathARef = useRef<SVGPathElement>(null);
  const pathBRef = useRef<SVGPathElement>(null);
  const clamped = Math.min(100, Math.max(0, progress));

  useEffect(() => {
    for (const ref of [pathARef, pathBRef]) {
      const el = ref.current;
      if (!el) continue;
      const length = el.getTotalLength();
      el.style.strokeDasharray = `${length}`;
      el.style.strokeDashoffset = `${length * (1 - clamped / 100)}`;
    }
  }, [clamped]);

  const outlineA = useMemo(() => buildSerpentOutlinePath(SERPENT_A), []);
  const outlineB = useMemo(() => buildSerpentOutlinePath(SERPENT_B), []);
  const snoutA = useMemo(() => buildSnoutHook(SERPENT_A), []);
  const snoutB = useMemo(() => buildSnoutHook(SERPENT_B), []);
  const tailFlareA = useMemo(() => buildTailFlare(SERPENT_A), []);
  const tailFlareB = useMemo(() => buildTailFlare(SERPENT_B), []);
  const ticksA = useMemo(() => buildSegmentTicks(SERPENT_A), []);
  const ticksB = useMemo(() => buildSegmentTicks(SERPENT_B), []);

  // Point de rencontre de chaque serpent (dernier point échantillonné =
  // queue, t=1, en haut) : un petit repère "braise" dessus pour lire "les
  // deux queues qui se rejoignent en haut", pas juste un anneau continu qui
  // s'épaissit.
  const tailA = useMemo(() => sampleSerpentArc(SERPENT_A).at(-1), []);
  const tailB = useMemo(() => sampleSerpentArc(SERPENT_B).at(-1), []);
  const detailOpacity = 0.15 + (clamped / 100) * 0.75;

  return (
    <svg className={styles.svg} viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
      <path ref={pathARef} className={styles.serpent} d={outlineA} />
      <path ref={pathBRef} className={styles.serpent} d={outlineB} />
      <path className={styles.detail} style={{ opacity: detailOpacity }} d={snoutA} />
      <path className={styles.detail} style={{ opacity: detailOpacity }} d={snoutB} />
      <path className={styles.detail} style={{ opacity: detailOpacity }} d={tailFlareA} />
      <path className={styles.detail} style={{ opacity: detailOpacity }} d={tailFlareB} />
      <path className={styles.detail} style={{ opacity: detailOpacity }} d={ticksA} />
      <path className={styles.detail} style={{ opacity: detailOpacity }} d={ticksB} />
      {tailA && (
        <circle className={styles.ember} cx={tailA.x} cy={tailA.y} r={1.4} style={{ opacity: detailOpacity }} />
      )}
      {tailB && (
        <circle className={styles.ember} cx={tailB.x} cy={tailB.y} r={1.4} style={{ opacity: detailOpacity }} />
      )}
    </svg>
  );
}
