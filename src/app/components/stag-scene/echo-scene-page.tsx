"use client";

import type { ReactNode } from "react";
import SceneContent from "./scene-content";
import SceneStage, { type LoadingVeilProps } from "./scene-stage";

/**
 * Ossature des pages écho (Services/Projets/Contact/Mémoire) depuis le
 * 25/08 (cf memory project-nahual-da) : la scène 3D plein écran de la
 * home est généralisée à ces pages — plus de fenêtre 320×320. Le
 * canvas vit dans un layer fixe permanent (cf SceneStage), le contenu
 * texte s'empile au-dessus via `<main>` — l'utilisateur voit la scène
 * en fond tout le long de la lecture, elle ne s'arrête jamais.
 *
 * Pour l'instant, exactement la même scène que la home (aucune
 * variante par direction) — Sylvain, même échange : "même arc de
 * reveal que la home, mais il y aura des variantes... chaque scène
 * sera spécifique et enrichie." Enrichissements par page à faire
 * quand ils viendront (YAGNI).
 */
export default function EchoScenePage({
  loading,
  children,
}: {
  loading: LoadingVeilProps;
  children: ReactNode;
}) {
  return (
    <SceneStage
      loading={loading}
      scene={({ progressRef, noticedRef }) => (
        <SceneContent progressRef={progressRef} noticedRef={noticedRef} />
      )}
    >
      <main>{children}</main>
    </SceneStage>
  );
}
