"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./easter-egg.module.css";

/**
 * Easter egg (28/08 task #56). Toast discret révélé quand
 * l'utilisateur tape le mot "nahual" au clavier n'importe où sur
 * le site (pas dans un input). Signature "site vivant" cachée aux
 * curieux, aucun indice visible avant activation.
 *
 * Ne s'active pas dans un contexte de saisie (input/textarea/
 * contenteditable) pour ne pas piéger les vrais utilisateurs qui
 * tapent le mot dans le formulaire de contact par exemple.
 *
 * Localisation : messages fr/en/es via prop.
 */

const TRIGGER = "nahual";
const TOAST_DURATION_MS = 5000;

const MESSAGES: Record<string, { label: string; line: string }> = {
  fr: {
    label: "Tú también eres nahual",
    line: "Toi aussi tu es nahual · l'essence qui se révèle sous la forme animale véritable.",
  },
  en: {
    label: "Tú también eres nahual",
    line: "You too are nahual · the essence that reveals itself in its true animal form.",
  },
  es: {
    label: "Tú también eres nahual",
    line: "Tú también eres nahual · la esencia que se revela bajo la verdadera forma animal.",
  },
};

export default function EasterEgg({ locale }: { locale: string }) {
  const [visible, setVisible] = useState(false);
  const bufferRef = useRef<string>("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function onKeyDown(e: KeyboardEvent) {
      // Ignore si l'utilisateur tape dans un champ de saisie
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;

      // Seulement les lettres a-z (28/08 fix debug). Filtre plus strict
      // que "length === 1" qui laissait passer espace, ponctuation,
      // chiffres — cassait le buffer entre les lettres tapees.
      // ".toLowerCase" pour supporter shift+N = 'N' → 'n'.
      const ch = e.key.toLowerCase();
      if (!/^[a-z]$/.test(ch)) return;

      bufferRef.current = (bufferRef.current + ch).slice(-TRIGGER.length);
      if (bufferRef.current === TRIGGER) {
        bufferRef.current = "";
        setVisible(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setVisible(false), TOAST_DURATION_MS);
      }
    }

    // Capture phase pour attraper l'event AVANT que Lenis ou tout
    // autre listener global preventDefault. useCapture=true garantit
    // priorite descendante.
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const msg = MESSAGES[locale] ?? MESSAGES.fr;

  return (
    <div className={styles.toast} data-visible={visible ? "true" : "false"} role="status" aria-live="polite">
      <em>{msg.label}</em>
      {msg.line}
    </div>
  );
}
