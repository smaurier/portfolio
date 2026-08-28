"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./easter-egg.module.css";

/**
 * Easter eggs (28/08 tasks #56 + #64). Toasts discrets révélés par
 * mots-clés tapés au clavier OU konami code. Ne s'active pas dans
 * un contexte de saisie.
 *
 * Triggers :
 *  - "nahual"  : Tu es nahual — essence forme animale
 *  - "muertos" : Los que se fueron siguen aquí — présence des morts
 *  - "mazatl"  : Le cerf te regarde — reveal du regard
 *  - Konami (↑↑↓↓←→←→ba) : palette flash cardinal + toast
 */

const TOAST_DURATION_MS = 5000;
const KONAMI = ["arrowup","arrowup","arrowdown","arrowdown","arrowleft","arrowright","arrowleft","arrowright","b","a"];

type MessageSet = Record<string, { label: string; line: string }>;

const NAHUAL: MessageSet = {
  fr: { label: "Tú también eres nahual", line: "Toi aussi tu es nahual · l'essence qui se révèle sous la forme animale véritable." },
  en: { label: "Tú también eres nahual", line: "You too are nahual · the essence that reveals itself in its true animal form." },
  es: { label: "Tú también eres nahual", line: "Tú también eres nahual · la esencia que se revela bajo la verdadera forma animal." },
};

const MUERTOS: MessageSet = {
  fr: { label: "Los que se fueron siguen aquí", line: "Ceux qui sont partis restent ici · la mémoire est un chemin, pas une frontière." },
  en: { label: "Los que se fueron siguen aquí", line: "Those who left remain here · memory is a path, not a border." },
  es: { label: "Los que se fueron siguen aquí", line: "Los que se fueron siguen aquí · la memoria es un camino, no una frontera." },
};

const MAZATL: MessageSet = {
  fr: { label: "Mazātl", line: "Le cerf te regarde. Sois digne de son silence." },
  en: { label: "Mazātl", line: "The stag is watching you. Be worthy of its silence." },
  es: { label: "Mazātl", line: "El ciervo te mira. Sé digno de su silencio." },
};

const KONAMI_MSG: MessageSet = {
  fr: { label: "Ce n'est pas un jeu", line: "Mais tu joues comme il faut. Cinq directions, tu les connais toutes maintenant." },
  en: { label: "This isn't a game", line: "But you're playing right. Five directions, you know them all now." },
  es: { label: "No es un juego", line: "Pero juegas bien. Cinco direcciones, ya las conoces todas." },
};

const TRIGGERS: { word: string; msg: MessageSet }[] = [
  { word: "nahual", msg: NAHUAL },
  { word: "muertos", msg: MUERTOS },
  { word: "mazatl", msg: MAZATL },
];

const MAX_WORD_LEN = Math.max(...TRIGGERS.map((t) => t.word.length));

export default function EasterEgg({ locale }: { locale: string }) {
  const [current, setCurrent] = useState<MessageSet | null>(null);
  const wordBufRef = useRef<string>("");
  const konamiIdxRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const konamiFlashRef = useRef<boolean>(false);

  function showMessage(msg: MessageSet, konamiFlash = false) {
    konamiFlashRef.current = konamiFlash;
    if (konamiFlash) {
      // Palette flash cardinal — cycle rapide direction sur body via
      // data-attribute anime en CSS (voir globals.css .konami-flash)
      document.body.classList.add("konami-flash");
      window.setTimeout(() => document.body.classList.remove("konami-flash"), 2000);
    }
    setCurrent(msg);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCurrent(null), TOAST_DURATION_MS);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;

      const raw = e.key.toLowerCase();

      // Konami detect (arrowup, arrowdown, etc + b, a)
      const expected = KONAMI[konamiIdxRef.current];
      if (raw === expected) {
        konamiIdxRef.current++;
        if (konamiIdxRef.current === KONAMI.length) {
          konamiIdxRef.current = 0;
          showMessage(KONAMI_MSG, true);
          return;
        }
      } else if (KONAMI.includes(raw)) {
        // Restart konami si on tape 1er char correct
        konamiIdxRef.current = raw === KONAMI[0] ? 1 : 0;
      } else {
        konamiIdxRef.current = 0;
      }

      // Word buffer
      if (!/^[a-z]$/.test(raw)) return;
      wordBufRef.current = (wordBufRef.current + raw).slice(-MAX_WORD_LEN);
      for (const t of TRIGGERS) {
        if (wordBufRef.current.endsWith(t.word)) {
          wordBufRef.current = "";
          showMessage(t.msg);
          return;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const msg = current?.[locale] ?? current?.fr ?? null;
  const visible = current !== null;

  return (
    <div className={styles.toast} data-visible={visible ? "true" : "false"} role="status" aria-live="polite">
      {msg && (
        <>
          <em>{msg.label}</em>
          {msg.line}
        </>
      )}
    </div>
  );
}
