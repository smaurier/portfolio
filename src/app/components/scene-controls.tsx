"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./scene-controls.module.css";
import { cinematicProgress, shortcutAction, type SceneAction } from "@/lib/scene-controls";
import { buildInstantSearch, parseInstant, shouldOfferResume, type LastVisit } from "@/lib/instant-link";
import { tenochtitlanNow } from "@/lib/solar";
import { isShortcutsEnabled, subscribeShortcuts } from "@/lib/shortcuts";
import { useReadingMode } from "../../lib/reading-mode-context";
import { getSceneControls, hydrateSceneControls, setSceneControls, subscribeSceneControls, type SceneControlsState } from "./scene-controls-store";
import TracesPanel, { type TracesLabels } from "./traces-panel";

/**
 * SceneControls (05/09). Le bloc de controles de l'experience, au-dessus
 * du bouton son : texte, plein ecran, contemplation, photo, eco, lien de
 * l'instant. Chaque bouton est un vrai bouton (libelle, etat annonce par
 * aria-pressed, clavier), et chaque geste a sa lettre (H, F, T, P, E, L),
 * soumise au meme interrupteur RGAA que les autres raccourcis. Invisible
 * en mode recit accessible (il n'y a plus de scene a regarder).
 *
 * Le texte masque = classe `nahual-scene-only` sur <body> (globals.css
 * fond le contenu en opacite, la page garde sa hauteur : le scroll
 * continue de piloter l'arc). La contemplation fait defiler la page
 * elle-meme, en boucle nuit / midi (lib cinematicProgress) ; le moindre
 * geste de l'utilisateur l'arrete ; le curseur disparait (body
 * `nahual-cinematic`). La photo lit le canvas (preserveDrawingBuffer) et
 * propose le fichier. L'eco change le profil de rendu (scene-refs-
 * context). Le lien de l'instant met le moment de l'arc dans l'URL
 * (lib instant-link) ; a l'ouverture d'un tel lien, la page se place la
 * une fois le voile de chargement tombe. La derniere visite est gardee
 * et l'accueil propose de la reprendre.
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
  link: string;
  linkCopied: string;
  resume: string;
  resumeDismiss: string;
  traces: string;
  tenochtitlanOn: string;
  tenochtitlanOff: string;
  /** « Il est {time} à Tenochtitlan » */
  tenochtitlanClock: string;
  tenochtitlanNight: string;
};

const ARC_SCROLL_VIEWPORTS = 2;
const LAST_VISIT_KEY = "nahual-last-visit";

function arcPixels(): number {
  return window.innerHeight * ARC_SCROLL_VIEWPORTS;
}

function readLastVisit(): LastVisit | null {
  try {
    const raw = window.localStorage.getItem(LAST_VISIT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as LastVisit;
    return typeof v.path === "string" && typeof v.t === "number" && typeof v.at === "number" ? v : null;
  } catch {
    return null;
  }
}

function isHomePath(path: string): boolean {
  return /^\/[a-z]{2}\/?$/.test(path);
}

export default function SceneControls({ labels, traces, locale }: { labels: SceneControlsLabels; traces: TracesLabels; locale: string }) {
  const [tracesOpen, setTracesOpen] = useState(false);
  const readingMode = useReadingMode();
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<SceneControlsState>(() => getSceneControls());
  const [fullscreen, setFullscreen] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [shortcuts, setShortcuts] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [resume, setResume] = useState<LastVisit | null>(null);
  const cinematicRef = useRef<{ start: number; from: number; raf: number } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

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

  // Le lien de l'instant : `?t=` place la page une fois le voile tombe ;
  // `scene=1` masque le texte. Puis « reprendre » : sur l'accueil, si la
  // derniere visite etait ailleurs et engagee, on le propose.
  useEffect(() => {
    const instant = parseInstant(window.location.search);
    if (instant.sceneOnly && !getSceneControls().sceneOnly) setSceneControls({ sceneOnly: true });
    let cancelled = false;
    if (instant.t !== null) {
      const target = instant.t;
      const go = () => {
        if (cancelled) return;
        if (document.documentElement.getAttribute("data-loaded") === "true") {
          window.scrollTo({ top: target * arcPixels(), behavior: "auto" });
        } else {
          window.setTimeout(go, 120);
        }
      };
      go();
    } else if (isHomePath(pathname)) {
      const visit = readLastVisit();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture du stockage au montage, cote client
      if (shouldOfferResume(visit, pathname, Date.now())) setResume(visit);
    }
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // La derniere visite : page + moment de l'arc, ecrite au fil du scroll.
  useEffect(() => {
    let last = 0;
    const save = () => {
      const now = Date.now();
      if (now - last < 500) return;
      last = now;
      const arc = arcPixels();
      const t = arc > 0 ? Math.min(1, window.scrollY / arc) : 0;
      try {
        window.localStorage.setItem(LAST_VISIT_KEY, JSON.stringify({ path: pathname, t, at: now } satisfies LastVisit));
      } catch {
        /* stockage indisponible */
      }
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [pathname]);

  // Le texte masque et la contemplation : des classes sur <body>.
  useEffect(() => {
    document.body.classList.toggle("nahual-scene-only", state.sceneOnly);
    return () => document.body.classList.remove("nahual-scene-only");
  }, [state.sceneOnly]);
  useEffect(() => {
    document.body.classList.toggle("nahual-cinematic", state.cinematic);
    return () => document.body.classList.remove("nahual-cinematic");
  }, [state.cinematic]);

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
      window.scrollTo(0, cinematicProgress(elapsed, c.from) * arc);
      c.raf = requestAnimationFrame(tick);
    };
    cinematicRef.current = { start, from, raf: requestAnimationFrame(tick) };
  }, []);

  // L'heure de Tenochtitlan : on recalcule l'heure et la hauteur du soleil
  // a l'entree puis toutes les 30 s ; le mode se coupe au moindre geste.
  useEffect(() => {
    if (!state.tenochtitlan) return;
    const tick = () => {
      const n = tenochtitlanNow();
      setSceneControls({ tenochtitlanArc: n.arc, tenochtitlanAfternoon: n.afternoon });
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [state.tenochtitlan]);

  // Le moindre geste de l'utilisateur arrete la contemplation (les deux).
  useEffect(() => {
    if (!state.cinematic && !state.tenochtitlan) return;
    const stop = () => {
      stopCinematic();
      if (getSceneControls().tenochtitlan) setSceneControls({ tenochtitlan: false });
    };
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
  }, [state.cinematic, state.tenochtitlan, stopCinematic]);

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

  const copyLink = useCallback(() => {
    const arc = arcPixels();
    const t = arc > 0 ? window.scrollY / arc : 0;
    const url = `${window.location.origin}${pathname}${buildInstantSearch({ t, sceneOnly: getSceneControls().sceneOnly })}`;
    const done = () => showToast(labels.linkCopied);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, () => window.prompt(labels.link, url));
    else window.prompt(labels.link, url);
  }, [pathname, labels.link, labels.linkCopied, showToast]);

  const act = useCallback(
    (action: SceneAction) => {
      const s = getSceneControls();
      if (action === "text") setSceneControls({ sceneOnly: !s.sceneOnly });
      else if (action === "fullscreen") toggleFullscreen();
      else if (action === "cinematic") (s.cinematic ? stopCinematic : startCinematic)();
      else if (action === "photo") takePhoto();
      else if (action === "eco") setSceneControls({ eco: !s.eco });
      else if (action === "link") copyLink();
      else if (action === "tenochtitlan") {
        if (s.tenochtitlan) setSceneControls({ tenochtitlan: false });
        else {
          stopCinematic();
          const n = tenochtitlanNow();
          setSceneControls({ tenochtitlan: true, tenochtitlanArc: n.arc, tenochtitlanAfternoon: n.afternoon });
        }
      }
    },
    [toggleFullscreen, stopCinematic, startCinematic, takePhoto, copyLink]
  );

  // Raccourcis (H, F, T, P, E, L), soumis a l'interrupteur RGAA.
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

  const buttons: { action: SceneAction | "traces"; pressed: boolean | null; label: string; icon: React.ReactNode }[] = [
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
      action: "link",
      pressed: null,
      label: labels.link,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1.5 1.5M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1.5-1.5" />
        </svg>
      ),
    },
    {
      action: "tenochtitlan",
      pressed: state.tenochtitlan,
      label: state.tenochtitlan ? labels.tenochtitlanOff : labels.tenochtitlanOn,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8M12 9.5v2.5l1.6 1" />
        </svg>
      ),
    },
    {
      action: "traces",
      pressed: tracesOpen,
      label: labels.traces,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 4c-6 0-11 3-13 9l-3 7 2 0 2-4c5 1 9-1 11-6l1-6zM8 15c3-4 6-6 9-8" />
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
            onClick={() => (b.action === "traces" ? setTracesOpen(true) : act(b.action))}
            aria-label={b.label}
            title={b.label}
            aria-pressed={b.pressed === null ? undefined : b.pressed}
          >
            {b.icon}
          </button>
        ))}
      </div>
      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
      {state.tenochtitlan && !toast && (
        <div className={styles.toast} role="status">
          {(() => {
            const n = tenochtitlanNow();
            const time = `${n.clock.hours} h ${String(n.clock.minutes).padStart(2, "0")}`;
            return (n.arc <= 0 ? labels.tenochtitlanNight : labels.tenochtitlanClock).replace("{time}", time);
          })()}
        </div>
      )}
      {resume && (
        <div className={styles.toast} role="status">
          <button
            type="button"
            className={styles.toastAction}
            onClick={() => {
              const v = resume;
              setResume(null);
              router.push(`${v.path}${buildInstantSearch({ t: v.t, sceneOnly: false })}`);
            }}
          >
            {labels.resume}
          </button>
          <button type="button" className={styles.toastDismiss} onClick={() => setResume(null)} aria-label={labels.resumeDismiss}>
            ×
          </button>
        </div>
      )}
      {flashKey > 0 && <div key={flashKey} className={styles.flash} aria-hidden="true" />}
      {tracesOpen && <TracesPanel labels={traces} locale={locale} onClose={() => setTracesOpen(false)} />}
    </>
  );
}
