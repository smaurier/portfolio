"use client";

import { getChapterOpacity, getIntroOpacity } from "@/lib/reveal-arc";
import { renderWithNahuatl } from "@/lib/nahuatl";
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
  sceneDescription,
}: {
  home: HomeContent;
  servicesHref: string;
  /** Conserve pour compat call-site (page.js passe encore contactHref).
   * A retirer au prochain nettoyage de dictionnaire home (aboutText,
   * aboutTitle, contactCta, githubCta ne sont plus utilises non plus
   * depuis la sortie du bloc "A propos" de la home le 29/08). */
  contactHref?: string;
  /** Description poetique-immersive de la scene 3D pour les lecteurs
   * d'ecran (29/08 chantier a11y "SR enrichi"). Injectee en tete du
   * sr-only pour donner a l'utilisateur SR une image mentale
   * equivalente a la scene visuelle. */
  sceneDescription: string;
}) {
  return (
    <SceneStage
      overlay={({ progressRef, reducedMotionRef }) => (
        <main id="main" tabIndex={-1}>
          {/* Recit canonique pour lecteurs d'ecran (29/08 chantier
              a11y). Le tree accessibility est structure : description
              scene + h1 hero + texte + section chapitres ordonnee.
              Toujours dans le flux, jamais cache par les FadingBlock
              scroll-driven qui vivent en aria-hidden ci-dessous. Le
              CTA reste dans le bloc visuel pour ne pas doubler le
              focus clavier. */}
          <div className="sr-only">
            <p>{renderWithNahuatl(sceneDescription)}</p>
            <h1>{renderWithNahuatl(home.heroTitle)}</h1>
            <p>{renderWithNahuatl(home.heroText)}</p>
            <section aria-label="Recit du cerf, quatre chapitres">
              <ol>
                {home.chapters.map((chapter, i) => (
                  <li key={i}>
                    <strong>{chapter.kicker}</strong> — {renderWithNahuatl(chapter.line)}
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <FadingBlock
            progressRef={progressRef}
            reducedMotionRef={reducedMotionRef}
            getOpacity={getIntroOpacity}
            initialOpacity={1}
          >
            {/* Textes du hero : deja lus via sr-only, aria-hidden pour
                eviter le doublon. Le CardinalLink reste focusable et
                cliquable pour tous (souris, clavier, SR focus mode). */}
            <div aria-hidden="true">
              <RevealText as="h1" text={home.heroTitle} delayPerWord={50} />
              <p>{home.heroText}</p>
            </div>
            <div className={overlayStyles.links}>
              <CardinalLink href={servicesHref} className={overlayStyles.cta}>
                {home.heroCta}
              </CardinalLink>
            </div>
          </FadingBlock>
          {/* Chapitres narratifs scroll-driven (28/08 task #63).
              aria-hidden : contenu equivalent deja dans le sr-only
              ci-dessus, evite lecture en doublon. */}
          {home.chapters.map((chapter, i) => (
            <FadingBlock
              key={i}
              progressRef={progressRef}
              reducedMotionRef={reducedMotionRef}
              getOpacity={(p) => getChapterOpacity(p, i)}
              initialOpacity={0}
            >
              <div aria-hidden="true">
                <RevealText as="p" className={overlayStyles.chapterKicker} text={chapter.kicker} delayPerWord={30} />
                <RevealText as="p" className={overlayStyles.chapterLine} text={chapter.line} delayPerWord={35} />
              </div>
            </FadingBlock>
          ))}
        </main>
      )}
    />
  );
}
