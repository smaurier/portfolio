"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import SplitText from "./split-text";
import styles from "./nahual-intro.module.css";

/**
 * Intro cinematique WOW (28/08 task #45, refonte 30/08 "pleine WOW").
 * Signature "premier wow jury" du sprint 1 audit SOTY.
 *
 * Timeline 6.5s :
 *  - t=0..0.5   : letterbox top+bottom slide in + fond noir profond
 *  - t=0.4..1.8 : phrase Codex char-by-char (SplitText, stagger 40ms),
 *                 chromatic aberration decreasing (postFX CSS filter)
 *  - t=1.5..3.5 : Piedra del Sol apparait, scale 0.3→1.0 + rotate
 *                 0→180°, drop-shadow glow dore
 *  - t=2.8..4.2 : 5 dots cardinaux jaillissent en spirale depuis le
 *                 centre de la Piedra vers leurs positions cardinales
 *                 (Nord obsidienne, Est doré, Sud turquoise, Ouest
 *                 cendre, Centre jade)
 *  - t=3.8..4.8 : logo "Nahual" char-by-char (SplitText stagger 60ms)
 *  - t=5.0..6.5 : fondu global + letterbox retract → transition
 *                 fluide vers la home
 *  - t=6.5      : composant unmount
 *
 * Flag localStorage `nahual-intro-seen` : intro joue une seule fois
 * par navigateur/session. Skip button visible tout du long.
 * prefers-reduced-motion : durée écrasée à 0.4s linear (quasi-instant).
 *
 * Note son : Web Audio API bloque l'autoplay au 1er load (policy
 * navigateur, pas d'interaction utilisateur encore). Le sound design
 * est OMIS de cette intro pour cette raison (impossible techniquement
 * sans casser l'experience). Un ajout possible = bouton "activer le
 * son" au-dessus du skip, mais ajoute une friction.
 */

const INTRO_DURATION_MS = 6500;
const STORAGE_KEY = "nahual-intro-seen";

const CODEX_PHRASE: Record<string, { line: string; translation: string; skip: string }> = {
  fr: { line: "In xochitl, in cuicatl", translation: "Fleur et chant", skip: "Passer l'intro" },
  en: { line: "In xochitl, in cuicatl", translation: "Flower and song", skip: "Skip intro" },
  es: { line: "In xochitl, in cuicatl", translation: "Flor y canto", skip: "Saltar intro" },
};

// 5 directions cardinales avec leur couleur signature (cf Codex Nahual
// section 03 mapping direction → dieu → couleur).
const CARDINAL_DOTS = [
  { name: "north", color: "#6b3fa8", angle: -90 },  // haut / Mictlantecuhtli
  { name: "east", color: "#ffb400", angle: 0 },      // droite / Tonatiuh
  { name: "south", color: "#0f6bb8", angle: 90 },    // bas / Huitzilopochtli
  { name: "west", color: "#d76464", angle: 180 },    // gauche / Cihuateteo
  { name: "center", color: "#00c078", angle: 0 },    // centre / Xiuhtecuhtli (pas de deplacement)
] as const;

export default function NahualIntro({ locale }: { locale: string }) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {}
    // Pattern SSR-safe : initial state false pour eviter mismatch
    // hydratation, decision d'affichage deferree au premier mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // Marque body pour masquer l'UI ambiante (boussole, curseur, header,
    // footer, toggles) pendant que l'intro joue, retour Sylvain 30/08.
    document.body.classList.add("nahual-intro-active");
    const timer = setTimeout(() => {
      setDismissed(true);
      document.body.classList.remove("nahual-intro-active");
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
    }, INTRO_DURATION_MS);
    return () => {
      clearTimeout(timer);
      document.body.classList.remove("nahual-intro-active");
    };
  }, []);

  function handleSkip() {
    setDismissed(true);
    document.body.classList.remove("nahual-intro-active");
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }

  if (!mounted || dismissed) return null;

  const texts = CODEX_PHRASE[locale] ?? CODEX_PHRASE.fr;

  return (
    <>
      <div className={styles.overlay} aria-hidden="true" />
      <div className={styles.letterboxTop} aria-hidden="true" />
      <div className={styles.letterboxBottom} aria-hidden="true" />
      <div className={styles.content} role="presentation">
        <p className={styles.phrase}>
          <SplitText
            text={texts.line}
            className={styles.phraseText}
            ariaLabel={texts.line}
          />
          <small>
            <SplitText
              text={texts.translation}
              className={styles.phraseTranslation}
              ariaLabel={texts.translation}
            />
          </small>
        </p>
        <div className={styles.piedraStage} aria-hidden="true">
          <div className={styles.piedraWrap}>
            <Image
              src="/img/piedra-del-sol-v2.svg"
              alt=""
              width={320}
              height={320}
              priority
              unoptimized
            />
          </div>
          {/* 5 dots cardinaux qui jaillissent depuis le centre de la
              Piedra en spirale vers leurs positions cardinales. */}
          {CARDINAL_DOTS.map((dot, i) => (
            <span
              key={dot.name}
              className={`${styles.cardinalDot} ${styles[`dot_${dot.name}`]}`}
              style={{
                ["--dot-color" as string]: dot.color,
                ["--dot-angle" as string]: `${dot.angle}deg`,
                ["--dot-index" as string]: i,
              }}
            />
          ))}
        </div>
        <p className={styles.logo}>
          <SplitText text="Nahual" className={styles.logoText} ariaLabel="Nahual" />
        </p>
      </div>
      <button className={styles.skip} onClick={handleSkip} type="button">
        {texts.skip}
      </button>
    </>
  );
}
