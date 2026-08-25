"use client";

import type { ReactNode } from "react";
import type { DirectionKey } from "./direction-colors";
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
 * `directionKey` (25/08 soir) : sélectionne la teinte cible du fog +
 * du liseré du cerf + de l'emphase de nav pour cette page (Codex
 * Nahual section 03). Le reste de la scène 3D reste identique — les
 * enrichissements par direction (pose du cerf, densité de flore,
 * ambiance) viendront quand nous les coderons (YAGNI).
 */
export default function EchoScenePage({
  loading,
  directionKey,
  children,
}: {
  loading: LoadingVeilProps;
  directionKey: DirectionKey;
  children: ReactNode;
}) {
  return (
    <SceneStage
      loading={loading}
      directionKey={directionKey}
      scene={({ progressRef, noticedRef, climaxRimColor, fogTint }) => (
        <SceneContent
          progressRef={progressRef}
          noticedRef={noticedRef}
          climaxRimColor={climaxRimColor}
          fogTint={fogTint}
        />
      )}
    >
      <main>{children}</main>
    </SceneStage>
  );
}
