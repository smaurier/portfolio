"use client";

import { getChapterOpacity, getIntroOpacity, getNavEmphasis } from "@/lib/reveal-arc";
import RevealText from "../reveal-text";
import CardinalLink from "./cardinal-link";
import FadingBlock from "./fading-block";
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
  chapters: { kicker: string; line: string }[];
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
      overlay={({ progressRef, reducedMotionRef }) => (
        <main id="main">
          <FadingBlock
            progressRef={progressRef}
            reducedMotionRef={reducedMotionRef}
            getOpacity={getIntroOpacity}
            initialOpacity={1}
          >
            <RevealText as="h1" text={home.heroTitle} delayPerWord={50} />
            <p>{home.heroText}</p>
            <div className={overlayStyles.links}>
              <CardinalLink href={servicesHref} className={overlayStyles.cta}>
                {home.heroCta}
              </CardinalLink>
            </div>
          </FadingBlock>
          {/* Chapitres narratifs scroll-driven (28/08 task #63).
              Le chapitre 3 (face-a-face) est enveloppe dans un
              FaceAFacePin (boite outil #6) qui pin le contenu sur
              200vh de scroll extra + scrub PostFX bloom + camera fov
              via pinProgressRef partage. */}
          {/* FaceAFacePin desactive 28/08 (retour Sylvain "molette
              sur cerf glitche fort") — ScrollTrigger scrub 1 + Lenis
              smoothWheel + auto-release kill() creaient un feedback
              loop qui saccadait camera + PostFX. Chapter 3 face-a-face
              revient a un FadingBlock normal comme les autres.
              A ré-explorer session dédiée avec approche différente
              (position: sticky CSS pur? plus de ScrollTrigger?). */}
          {home.chapters.map((chapter, i) => (
            <FadingBlock
              key={i}
              progressRef={progressRef}
              reducedMotionRef={reducedMotionRef}
              getOpacity={(p) => getChapterOpacity(p, i)}
              initialOpacity={0}
            >
              <RevealText as="p" className={overlayStyles.chapterKicker} text={chapter.kicker} delayPerWord={30} />
              <RevealText as="p" className={overlayStyles.chapterLine} text={chapter.line} delayPerWord={35} />
            </FadingBlock>
          ))}
          <FadingBlock
            progressRef={progressRef}
            reducedMotionRef={reducedMotionRef}
            getOpacity={getNavEmphasis}
            initialOpacity={0}
          >
            <RevealText as="h2" text={home.aboutTitle} delayPerWord={50} />
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
        </main>
      )}
    />
  );
}
