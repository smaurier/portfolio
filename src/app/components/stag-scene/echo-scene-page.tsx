"use client";

import type { ReactNode } from "react";
import type { Dictionary, Locale } from "../../../dictionaries";
import { renderWithNahuatl } from "@/lib/nahuatl";
import Cantar, { type CantarTexts } from "../cantar";
import SeuilTete from "../seuil-tete";
import type { DirectionKey } from "./direction-colors";
import PageClosure from "./page-closure";
import SceneStage from "./scene-stage";

/**
 * Ossature des pages écho (Services/Projets/Contact/Mémoire) depuis le
 * 25/08 (cf memory project-nahual-da) : la scène 3D plein écran de la
 * home est généralisée à ces pages : plus de fenêtre 320×320. Le
 * canvas vit dans un layer fixe permanent (cf SceneStage), le contenu
 * texte s'empile au-dessus via `<main>` : l'utilisateur voit la scène
 * en fond tout le long de la lecture, elle ne s'arrête jamais.
 *
 * `directionKey` (25/08 soir) : sélectionne la teinte cible du fog +
 * du liseré du cerf + de l'emphase de nav pour cette page (Codex
 * Nahual section 03).
 *
 * LoadingVeil n'est plus rendu ici : géré une seule fois par
 * [locale]/layout.tsx, persiste entre navigations SPA (cf
 * scene-stage.tsx pour le contexte, retour Sylvain 25/08).
 */
export default function EchoScenePage({
  directionKey,
  locale,
  closure,
  sceneDescription,
  children,
  seuil,
  cantar,
}: {
  directionKey: DirectionKey;
  locale: Locale;
  closure: Dictionary["closure"];
  /** Le chant de la direction (M4) : textes communs du dictionnaire et le
   * libelle « nouvelle fenetre » pour le lien vers l'edition. */
  cantar: { texts: CantarTexts; newWindow: string };
  /** Description poetique-immersive de la scene 3D pour SR (29/08
   * chantier a11y "SR enrichi"). Injectee en tete du main pour que
   * l'utilisateur SR entende ou il est arrive avant le contenu
   * editorial de la page. */
  sceneDescription: string;
  /** La ligne de seuil de cette direction, conservee en tete de page (N1). */
  seuil?: string;
  children: ReactNode;
}) {
  return (
    <SceneStage
      directionKey={directionKey}
      /* LA CLOTURE DANS LE FLUX (13/09, X1 et X4 de l'audit). Passee en
         calque fixe, la cloture des pages echo se posait sur les cartes
         de contenu, qui vivent dans la meme colonne (capture Pixel 7,
         Memoire a 50 %). Sur ces pages, l'acte de sortie est le DERNIER
         bloc du contenu, apres le chant : il ne recouvre rien, il se lit
         en dernier, et le pied de page le suit. Le Centre, sans colonne de
         contenu, garde son panneau fixe (stag-scene.tsx). */
      closureInFlow={({ progressRef, reducedMotionRef }) => (
        <PageClosure
          directionKey={directionKey}
          locale={locale}
          closure={closure[directionKey]}
          progressRef={progressRef}
          reducedMotionRef={reducedMotionRef}
        />
      )}
    >
      <main id="main" data-direction={directionKey} tabIndex={-1}>
        <p className="sr-only">{renderWithNahuatl(sceneDescription)}</p>
        {/* La ligne de seuil, dans le calque fixe, en haut a gauche (13/09, X2). */}
        {seuil ? <SeuilTete texte={seuil} /> : null}
        {children}
        {/* Le chant ferme le contenu de la page, sous la scene, visible
            pour tout le monde et en mode lecture (M4, 11/09). */}
        <Cantar direction={directionKey} locale={locale} texts={cantar.texts} newWindow={cantar.newWindow} />
      </main>
    </SceneStage>
  );
}
