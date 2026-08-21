"use client";

import { useEffect, useMemo, useRef } from "react";
import { buildSerpentPath, sampleSerpentArc, SERPENT_A, SERPENT_B } from "@/lib/serpent-loop";
import styles from "./loading-cycle.module.css";

/**
 * Les deux Xiuhcoatl (serpents de feu) qui encerclent le voile de
 * chargement — cf src/lib/serpent-loop.ts pour la géométrie et l'ancrage
 * mythologique (Piedra del Sol). Chaque <path> se dessine via
 * stroke-dasharray/dashoffset (technique classique de "line draw" SVG),
 * piloté par `progress` (0-100, même source que le pourcentage affiché à
 * côté) plutôt qu'une boucle infinie décorative : la fermeture de l'anneau
 * EST l'indicateur de chargement — les deux serpents se rejoignent
 * pile quand la scène est prête, pas avant.
 *
 * `getTotalLength()` exige le DOM (pas dispo en SSR) — recalculé à chaque
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

  // Pointe de chaque serpent (dernier point échantillonné, cf le sens de
  // tracé décrit dans serpent-loop.ts) — un petit repère "braise" dessus
  // pour lire "deux têtes qui avancent l'une vers l'autre", pas juste un
  // anneau continu qui s'épaissit. Opacité liée à `progress` : à peine
  // visible au début, net une fois la tête arrivée à destination.
  const headA = useMemo(() => sampleSerpentArc(SERPENT_A).at(-1), []);
  const headB = useMemo(() => sampleSerpentArc(SERPENT_B).at(-1), []);
  const headOpacity = 0.15 + (clamped / 100) * 0.75;

  return (
    <svg className={styles.svg} viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
      <path ref={pathARef} className={styles.serpent} d={buildSerpentPath(SERPENT_A)} />
      <path ref={pathBRef} className={styles.serpent} d={buildSerpentPath(SERPENT_B)} />
      {headA && (
        <circle className={styles.ember} cx={headA.x} cy={headA.y} r={1.4} style={{ opacity: headOpacity }} />
      )}
      {headB && (
        <circle className={styles.ember} cx={headB.x} cy={headB.y} r={1.4} style={{ opacity: headOpacity }} />
      )}
    </svg>
  );
}
