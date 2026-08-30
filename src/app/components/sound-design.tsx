"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./sound-design.module.css";

/**
 * Sound design cardinal (28/08 task #46). Sons génératifs Web Audio
 * API, zéro fichier externe :
 *  - Ambient drone : 3 sinus low très doux (F2, A2, C3) qui tournent
 *    en permanence quand unmute — respiration cosmique cardinal
 *  - Chime cardinal : bell timbre distinct par direction, joué au
 *    click sur un lien [data-cardinal-direction]
 *  - Whoosh : white noise burst filtré, joué au declenchement
 *    transition cardinale (bind sur custom event 'nahual:whoosh')
 *
 * Toggle mute persist localStorage (default = muted, respect
 * autoplay policies browser + retour utilisateur : le son démarre
 * seulement sur action explicite).
 */

const STORAGE_KEY = "nahual-sound-muted";

const CHIME_FREQ: Record<string, number[]> = {
  jade: [432, 648], // Centre — bell claire
  dore: [523, 784, 1046], // Est — ocarina triadique
  turquoise: [660, 990], // Sud — flute quinte
  cendre: [220, 330], // Ouest — tambour basse
  obsidienne: [110, 165, 220], // Nord — gong grave
};

export default function SoundDesign({ label }: { label: { on: string; off: string } }) {
  const [muted, setMuted] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);
  const ambientNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode }[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);

  // Lecture initiale de l'état muté depuis localStorage. Pattern
  // SSR-safe : initial state true, correction post-hydratation cote
  // client si preference persistee. eslint-disable justifie.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // Default true (muté). Seul "0" = unmute persisté.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "0") setMuted(false);
    } catch {}
  }, []);

  // Écrit l'état muté à chaque changement
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch {}
  }, [muted]);

  // Setup AudioContext + ambient au premier unmute (respect autoplay
  // policies : contexte doit être créé après user gesture).
  const ensureContext = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    // Chrome/Safari : AudioContext créé APRES click, reste en 'running'.
    // Cast car webkitAudioContext legacy Safari.
    const WindowAny = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
      __nahualAudioLevel?: { current: number };
    };
    const Ctor = WindowAny.AudioContext ?? WindowAny.webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0.5;
    // Analyser insert entre master et destination (28/08 boite outil
    // #3 sound-reactive visuals). getByteFrequencyData chaque frame
    // via une rAF dediee → poste level normalise 0..1 dans un ref
    // global window.__nahualAudioLevel lu par PostFX pour pulser
    // bloom + par autres viewers eventuels.
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    master.connect(analyser);
    analyser.connect(ctx.destination);
    const levelRef = { current: 0 };
    WindowAny.__nahualAudioLevel = levelRef;
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    function tick() {
      analyser.getByteFrequencyData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i];
      levelRef.current = sum / buffer.length / 255; // 0..1
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    ctxRef.current = ctx;
    masterGainRef.current = master;
    return ctx;
  }, []);

  // Démarrage/arrêt ambient drone
  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    if (muted) {
      // Fade out puis stop
      for (const { gain } of ambientNodesRef.current) {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      }
      window.setTimeout(() => {
        for (const { osc } of ambientNodesRef.current) {
          try { osc.stop(); } catch {}
        }
        ambientNodesRef.current = [];
      }, 600);
      return;
    }

    // Ambient : 3 sinus low avec léger detuning pour donner épaisseur
    const freqs = [87.31, 110, 130.81]; // F2, A2, C3 — accord mineur cosmique
    const nodes: { osc: OscillatorNode; gain: GainNode }[] = [];
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.value = 0;
      // Fade in doux 2s
      gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2);
      osc.connect(gain).connect(master);
      osc.start();
      nodes.push({ osc, gain });
    }
    ambientNodesRef.current = nodes;

    return () => {
      // cleanup lors du re-render, mais géré aussi par le muted branch ci-dessus
    };
  }, [muted]);

  // Chime cardinal au click sur data-cardinal-direction
  useEffect(() => {
    if (typeof document === "undefined") return;

    function onClick(e: MouseEvent) {
      if (muted) return;
      const target = e.target as HTMLElement | null;
      const cardinal = target?.closest?.("[data-cardinal-direction]") as HTMLElement | null;
      if (!cardinal) return;
      const dir = cardinal.getAttribute("data-cardinal-direction");
      if (!dir) return;
      const freqs = CHIME_FREQ[dir];
      if (!freqs) return;
      const ctx = ctxRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master) return;

      // Play chime : petit envelope AR (attack rapide, release exponentiel)
      const now = ctx.currentTime;
      for (const f of freqs) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(0.12 / freqs.length, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
        osc.connect(gain).connect(master);
        osc.start(now);
        osc.stop(now + 1.6);
      }
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [muted]);

  function handleToggle() {
    const nextMuted = !muted;
    if (!nextMuted) {
      // Unmute : setup contexte si pas encore fait
      const ctx = ensureContext();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
    }
    setMuted(nextMuted);
  }

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={handleToggle}
      aria-label={muted ? label.on : label.off}
      title={muted ? label.on : label.off}
    >
      {muted ? (
        // Icon speaker muted
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.59 3L20 15.41 21.41 14l-3.41-3.41L21.41 7.17 20 5.76l-3.41 3.41L13.17 5.76 11.76 7.17 15.17 10.58 11.76 14l1.41 1.41L16.59 12z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 9v6h4l5 5V4L7 9H3zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      )}
    </button>
  );
}
