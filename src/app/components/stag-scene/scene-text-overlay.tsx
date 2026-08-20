"use client";

import type { ReactNode } from "react";
import styles from "./scene-text-overlay.module.css";

/**
 * Superposition HTML au-dessus du canvas (même principe que LoadingVeil) —
 * un seul point d'ancrage, en bas à gauche (retour de Sylvain le 20/08 :
 * hero ET à-propos tous les deux à cet endroit). Positionnement pur : ce
 * composant ne gère plus l'opacité lui-même (cf FadingBlock) — plusieurs
 * FadingBlock empilés ici en colonne ne se superposent jamais, même
 * lorsque plusieurs sont visibles en même temps (`prefers-reduced-motion`,
 * garde-fou du Codex Nahual : hero et à-propos doivent tous deux rester
 * atteignables sans dépendre du scroll).
 */
export default function SceneTextOverlay({ children }: { children: ReactNode }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.stack}>{children}</div>
    </div>
  );
}
