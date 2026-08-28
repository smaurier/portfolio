"use client";

import type { ReactNode } from "react";
import type { Locale } from "../../../dictionaries";
import type { DirectionKey } from "./direction-colors";
import PageClosure from "./page-closure";
import SceneStage from "./scene-stage";

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
 * Nahual section 03).
 *
 * LoadingVeil n'est plus rendu ici — géré une seule fois par
 * [locale]/layout.tsx, persiste entre navigations SPA (cf
 * scene-stage.tsx pour le contexte, retour Sylvain 25/08).
 */
export default function EchoScenePage({
  directionKey,
  locale,
  children,
}: {
  directionKey: DirectionKey;
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <SceneStage
      directionKey={directionKey}
      overlay={({ progressRef, reducedMotionRef }) => (
        <PageClosure
          directionKey={directionKey}
          locale={locale}
          progressRef={progressRef}
          reducedMotionRef={reducedMotionRef}
        />
      )}
    >
      <main id="main" data-direction={directionKey}>{children}</main>
    </SceneStage>
  );
}
