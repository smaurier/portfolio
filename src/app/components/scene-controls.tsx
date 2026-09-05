"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./scene-controls.module.css";
import { cinematicProgress, shortcutAction, type SceneAction } from "@/lib/scene-controls";
import { isShortcutsEnabled, subscribeShortcuts } from "@/lib/shortcuts";
import { useReadingMode } from "../../lib/reading-mode-context";
import { getSceneControls, hydrateSceneControls, setSceneControls, subscribeSceneControls, type SceneControlsState } from "./scene-controls-store";

/**
 * SceneControls (05/09). Le bloc de controles de l'experience, au-dessus
 * du bouton son : texte, plein ecran, contemplation, photo, eco. Chaque
 * bouton est un vrai bouton (libelle, etat annonce par aria-pressed,
 * clavier), et chaque geste a sa lettre (H, F, T, P, E), soumise au meme
 * interrupteur RGAA que les autres raccourcis. Invisible en mode recit
 * accessible (il n'y a plus de scene a regarder).
 *
 * Le texte masque = classe `nahual-scene-only` sur <body> (globals.css
 * fond le contenu en opacite, la page garde sa hauteur : le scroll
 * continue de piloter l'arc). La contemplation fait defiler la page
 * elle-meme (lib cinematicProgress) ; le moindre geste de l'utilisateur
 * l'arrete. La photo lit le canvas (preserveDrawingBuffer) et propose le
 * fichier. L'eco change le profil de rendu (scene-refs-context).
 */

export type SceneControlsLabels = {
  textHide: string;
  textShow: string;
  fullscreenOn: string;
  fullscreenOff: string;
  cinematicOn: string;
  cinematicOff: string;
  photo: string;
  ecoOn: string;
  ecoOff: string;
};

const ARC_SCROLL_VIEWPORTS = 2;

function arcPixels(): number {
  return window.innerHeight * ARC_SCROLL_VIEWPORTS;
}

export default function SceneControls({ labels }: { labels: SceneControlsLabels }) {
  const readingMode = useReadingMode();
  const [state, setState] = useState<SceneControlsState>(() => getSceneControls());
  const [fullscreen, setFullscreen] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [shortcuts, setShortcuts] = useState(true);
  const cinematicRef = useRef<{ start: number; from: number; raf: number } | null>(null);

  // Etat partage + stockage (client seulement).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydratation volontaire depuis le stockage, apres le rendu serveur
    setState({ ...hydrateSceneControls() });
    const unsub = subscribeSceneControls((s) => setState({ ...s }));
    setShortcuts(isShortcutsEnabled());
    const unsubShortcuts = subscribeShortcuts(setShortcuts);
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      unsub();
      unsubShortcuts();
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, []);

  // Le texte masque : une classe sur <body>.
  useEffect(() => {
    document.body.classList.toggle("nahual-scene-only", state.sceneOnly);
    return () => document.body.classList.remove("nahual-scene-only");
  }, [state.sceneOnly]);

  const stopCinematic = useCallback(() => {
    const c = cinematicRef.current;
    if (c) cancelAnimationFrame(c.raf);
    cinematicRef.current = null;
    if (getSceneControls().cinematic) setSceneControls({ cinematic: false });
  }, []);

  const startCinematic = useCallback(() => {
    const arc = arcPixels();
    if (arc <= 0) return;
    const from = Math.min(1, window.scrollY / arc);
    const start = performance.now();
    setSceneControls({ cinematic: true });
    const tick = () => {
      const c = cinematicRef.current;
      if (!c) return;
      const elapsed = (performance.now() - c.start) / 1000;
      const p = cinematicProgress(elapsed, c.from);
      window.scrollTo(0, p * arc);
      if (p >= 1) {
        stopCinematic();
        return;
      }
      c.raf = requestAnimationFrame(tick);
    };
    cinematicRef.current = { start, from, raf: requestAnimationFrame(tick) };
  }, [stopCinematic]);

  // Le moindre geste de l'utilisateur arrete la contemplation.
  useEffect(() => {
    if (!state.cinematic) return;
    const stop = () => stopCinematic();
    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener("wheel", stop, opts);
    window.addEventListener("touchstart", stop, opts);
    window.addEventListener("keydown", stop);
    window.addEventListener("pointerdown", stop, opts);
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
      window.removeEventListener("pointerdown", stop);
    };
  }, [state.cinematic, stopCinematic]);

  const takePhoto = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    setFlashKey((k) => k + 1);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dir = document.querySelector("main")?.getAttribute("data-direction") ?? "nahual";
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `nahual-${dir}-${stamp}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }, []);

  const act = useCallback(
    (action: SceneAction) => {
      const s = getSceneControls();
      if (action === "text") setSceneControls({ sceneOnly: !s.sceneOnly });
      else if (action === "fullscreen") toggleFullscreen();
      else if (action === "cinematic") (s.cinematic ? stopCinematic : startCinematic)();
      else if (action === "photo") takePhoto();
      else if (action === "eco") setSceneControls({ eco: !s.eco });
    },
    [toggleFullscreen, stopCinematic, startCinematic, takePhoto]
  );

  // Raccourcis (H, F, T, P, E), soumis a l'interrupteur RGAA.
  useEffect(() => {
    if (!shortcuts || readingMode.active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const action = shortcutAction(e.key);
      if (!action) return;
      e.preventDefault();
      act(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts, readingMode.active, act]);

  if (readingMode.active) return null;

  const buttons: { action: SceneAction; pressed: boolean | null; label: string; icon: React.ReactNode }[] = [
    {
      action: "text",
      pressed: state.sceneOnly,
      label: state.sceneOnly ? labels.textShow : labels.textHide,
      icon: state.sceneOnly ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10.4 10.4 0 0112 5c5 0 9 4.5 10 7-0.4 1-1.3 2.3-2.6 3.5M6.6 6.6C4.4 8 2.8 10.2 2 12c1 2.5 5 7 10 7 1.6 0 3.1-.4 4.4-1" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      action: "fullscreen",
      pressed: fullscreen,
      label: fullscreen ? labels.fullscreenOff : labels.fullscreenOn,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
        </svg>
      ),
    },
    {
      action: "cinematic",
      pressed: state.cinematic,
      label: state.cinematic ? labels.cinematicOff : labels.cinematicOn,
      icon: state.cinematic ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5v14M16 5v14" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4l12 8-12 8z" />
        </svg>
      ),
    },
    {
      action: "photo",
      pressed: null,
      label: labels.photo,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      ),
    },
    {
      action: "eco",
      pressed: state.eco,
      label: state.eco ? labels.ecoOff : labels.ecoOn,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19c3-4 6-7 10-9" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <div className={styles.cluster} role="group" aria-label={labels.textHide.split(" ")[0]}>
        {buttons.map((b) => (
          <button
            key={b.action}
            type="button"
            className={styles.button}
            onClick={() => act(b.action)}
            aria-label={b.label}
            title={b.label}
            aria-pressed={b.pressed === null ? undefined : b.pressed}
          >
            {b.icon}
          </button>
        ))}
      </div>
      {flashKey > 0 && <div key={flashKey} className={styles.flash} aria-hidden="true" />}
    </>
  );
}
