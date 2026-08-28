"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./nahual-intro.module.css";

/**
 * Intro cinématique one-shot par session (28/08 task #45). Signature
 * "premier wow jury" du sprint 1 audit SOTY.
 *
 * Séquence 3.5s :
 *  - t=0..0.4  : letterbox top+bottom slide in (bandes noires cadre cinéma)
 *  - t=0.3..1  : phrase Codex "In xochitl, in cuicatl" fade in
 *  - t=1..2    : Piedra del Sol rotate + fade in centrée
 *  - t=2..2.5  : logo Nahual fade in
 *  - t=2.7..3.5: tout fade out, letterbox retire
 *  - t=3.5     : composant unmount
 *
 * Flag localStorage `nahual-intro-seen` : intro joue une seule fois
 * par navigateur/session, jamais rejouée tant que Sylvain n'a pas
 * clear son storage. Skip button visible pendant toute la durée.
 * prefers-reduced-motion : durée écrasée à 0.4s linear, intro
 * quasi-instantanée.
 */

const INTRO_DURATION_MS = 3500;
const STORAGE_KEY = "nahual-intro-seen";

const CODEX_PHRASE: Record<string, { line: string; translation: string; skip: string }> = {
  fr: { line: "In xochitl, in cuicatl", translation: "Fleur et chant", skip: "Passer l'intro" },
  en: { line: "In xochitl, in cuicatl", translation: "Flower and song", skip: "Skip intro" },
  es: { line: "In xochitl, in cuicatl", translation: "Flor y canto", skip: "Saltar intro" },
};

export default function NahualIntro({ locale }: { locale: string }) {
  // SSR-safe : initial state false, on check localStorage au mount client.
  // Décision montage/démontage post-hydratation évite les mismatches.
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // storage bloqué (private mode strict, iframe cross-origin, etc.)
      // — on joue quand même l'intro, pas de crash sur exception.
    }
    setMounted(true);
    const timer = setTimeout(() => {
      setDismissed(true);
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
    }, INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  function handleSkip() {
    setDismissed(true);
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
          {texts.line}
          <small>{texts.translation}</small>
        </p>
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
        <p className={styles.logo}>Nahual</p>
      </div>
      <button className={styles.skip} onClick={handleSkip} type="button">
        {texts.skip}
      </button>
    </>
  );
}
