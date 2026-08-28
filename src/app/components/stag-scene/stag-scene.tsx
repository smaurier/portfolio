"use client";

import { getIntroOpacity, getNavEmphasis } from "@/lib/reveal-arc";
import CardinalLink from "./cardinal-link";
import FadingBlock from "./fading-block";
import SceneContent from "./scene-content";
import SceneStage from "./scene-stage";
import overlayStyles from "./scene-text-overlay.module.css";

export type HomeContent = {
  heroTitle: string;
  heroText: string;
  heroCta: string;
  aboutTitle: string;
  aboutText: string;
  githubCta: string;
  contactCta: string;
};

/**
 * Consommateur home de SceneStage. Le layout scrollable et le contenu 3D
 * sont partagés (cf scene-stage.tsx, scene-content.tsx) — cette page
 * n'apporte que son overlay HTML propre : hero visible dès le chargement
 * (getIntroOpacity, s'efface avec la pénombre) et à-propos révélé à
 * "chemins révélés" (getNavEmphasis, même moment que l'emphase de la
 * nav). Les pages écho (Services/Projets/Contact/Mémoire) suivent la
 * même structure, chacune avec son propre overlay HTML (cf memory
 * project-nahual-da, décision du 25/08 : plus de fenêtre 320×320, tout
 * le site partage la même scène plein écran).
 */
export default function StagScene({
  home,
  servicesHref,
  contactHref,
}: {
  home: HomeContent;
  servicesHref: string;
  contactHref: string;
}) {
  return (
    <SceneStage
      scene={({ progressRef, noticedRef, climaxRimColor, climaxAccentColor, fogTint }) => (
        <SceneContent
          progressRef={progressRef}
          noticedRef={noticedRef}
          climaxRimColor={climaxRimColor}
          climaxAccentColor={climaxAccentColor}
          fogTint={fogTint}
        />
      )}
      overlay={({ progressRef, reducedMotionRef }) => (
        <>
          <FadingBlock
            progressRef={progressRef}
            reducedMotionRef={reducedMotionRef}
            getOpacity={getIntroOpacity}
            initialOpacity={1}
          >
            <h1>{home.heroTitle}</h1>
            <p>{home.heroText}</p>
            <div className={overlayStyles.links}>
              <CardinalLink href={servicesHref} className={overlayStyles.cta}>
                {home.heroCta}
              </CardinalLink>
            </div>
          </FadingBlock>
          <FadingBlock
            progressRef={progressRef}
            reducedMotionRef={reducedMotionRef}
            getOpacity={getNavEmphasis}
            initialOpacity={0}
          >
            <h2>{home.aboutTitle}</h2>
            <p>{home.aboutText}</p>
            <div className={overlayStyles.links}>
              <CardinalLink href={contactHref} className={overlayStyles.cta}>
                {home.contactCta}
              </CardinalLink>
              <a
                href="https://github.com/smaurier"
                target="_blank"
                rel="noopener noreferrer"
                className={overlayStyles.secondaryLink}
              >
                {home.githubCta}
              </a>
            </div>
          </FadingBlock>
        </>
      )}
    />
  );
}
