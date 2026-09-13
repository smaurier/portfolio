"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./sound-design.module.css";
import { useCurrentDirection } from "./stag-scene/use-current-direction";
import { useCardinalTransition } from "./stag-scene/cardinal-transition-context";
import { arrivalCueFor, shouldPlayArrival } from "@/lib/journey-cues";
import { SHADERS_WARM_EVENT } from "./stag-scene/shader-warmup";
import { MIROIR_EVENT } from "@/lib/theme";
import { VEILLE_EVENT, noteVeille } from "@/lib/veille";
import type { DirectionKey } from "./stag-scene/direction-colors";
import { frostStore } from "./stag-scene/frost-store";
import { armChime, stepChime } from "@/lib/climax-chime";
import { arcProgress, getNavEmphasis } from "@/lib/reveal-arc";
import { dayAtArc } from "@/lib/arc-day";
import { copalIntensity } from "@/lib/copal";
import { xiuhcoatlStore } from "./stag-scene/xiuhcoatl-store";
import { tezcatlStore } from "./stag-scene/tezcatl-store";
import { SOUND_CHOICE_EVENT } from "./stag-scene/veil-sound-choice";

/**
 * Sound design cardinal (28/08 task #46). Sons génératifs Web Audio
 * API, zéro fichier externe :
 *  - Ambient drone : 3 sinus low très doux (F2, A2, C3) qui tournent
 *    en permanence quand unmute : respiration cosmique cardinal
 *  - Chime cardinal : bell timbre distinct par direction, joué au
 *    click sur un lien [data-cardinal-direction]
 *  - Whoosh : white noise burst filtré, joué au declenchement
 *    transition cardinale (bind sur custom event 'nahual:whoosh')
 *  - Vent de l'Ouest (06/09) : nappe de bruit filtré en passe-bande
 *    avec des rafales lentes, seulement sur la page Contact (Ehecatl
 *    balaie la route), fondu à l'arrivée et au départ
 *
 * Toggle mute persist localStorage (default = muted, respect
 * autoplay policies browser + retour utilisateur : le son démarre
 * seulement sur action explicite).
 */

const STORAGE_KEY = "nahual-sound-muted";
const VOLUME_KEY = "nahual-sound-volume";

const CHIME_FREQ: Record<string, number[]> = {
  jade: [432, 648], // Centre : bell claire
  dore: [523, 784, 1046], // Est : ocarina triadique
  turquoise: [660, 990], // Sud : flute quinte
  cendre: [220, 330], // Ouest : tambour basse
  obsidienne: [110, 165, 220], // Nord : gong grave
};

export default function SoundDesign({ label }: { label: { on: string; off: string; volume: string; landmark: string } }) {
  const [muted, setMuted] = useState(true);
  // Volume (05/09, controles de scene) : un vrai reglage, 0..1, persiste.
  const [volume, setVolume] = useState(0.5);
  const ctxRef = useRef<AudioContext | null>(null);
  const volumeRef = useRef(0.5);
  const ambientNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode }[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const limiterRef = useRef<DynamicsCompressorNode | null>(null);
  /** L'espace par direction (13/09) : une convolution generee et son
   *  niveau, crees a la demande, en fondu croise au changement. */
  const spacesRef = useRef(new Map<string, { conv: ConvolverNode; wet: GainNode }>());
  const windRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode; lfos: OscillatorNode[] } | null>(null);
  const direction = useCurrentDirection();
  // LE PONT ENTRE DEUX DIRECTIONS (13/09, X7). Les couches changeaient a
  // l'arrivee de la route, apres le voyage ; elles suivent maintenant la
  // direction VISEE des le clic, le temps du cadre nepantla : la nappe qui
  // part descend pendant que celle qui vient monte.
  const transition = useCardinalTransition();
  const soundDirection: DirectionKey = (transition?.transitionDirection as DirectionKey | null | undefined) ?? direction;

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
      const v = Number(window.localStorage.getItem(VOLUME_KEY));
      if (Number.isFinite(v) && v >= 0 && v <= 1 && window.localStorage.getItem(VOLUME_KEY) !== null) setVolume(v);
    } catch {}
  }, []);

  // Applique et persiste le volume.
  useEffect(() => {
    volumeRef.current = volume;
    const master = masterGainRef.current;
    if (master) master.gain.value = volume;
    try {
      window.localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {}
  }, [volume]);

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
    master.gain.value = volumeRef.current;
    // LE LIMITEUR (13/09, X7 de l'audit). Cinq couches et une cloche
    // pouvaient depasser 0 dB : ca s'entend sur telephone. Un compresseur
    // en fin de chaine, seuil -18 dB, ratio 8, attaque 3 ms, relache 250 ms.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    limiterRef.current = limiter;
    // Analyser insert entre master et destination (28/08 boite outil
    // #3 sound-reactive visuals). getByteFrequencyData chaque frame
    // via une rAF dediee → poste level normalise 0..1 dans un ref
    // global window.__nahualAudioLevel lu par PostFX pour pulser
    // bloom + par autres viewers eventuels.
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    master.connect(limiter);
    limiter.connect(analyser);
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

  // L'ESPACE (13/09, X7). Aucune reverberation jusqu'ici : le Nord (une
  // grotte, un bassin) et l'Est (le verre) sonnaient dans la meme piece.
  // Une convolution par direction, generee (bruit qui decroit), en envoi
  // depuis la sortie des couches, et un niveau qui se croise au voyage.
  const SPACES: Record<DirectionKey, { seconds: number; wet: number }> = useMemo(
    () => ({
      jade: { seconds: 0.5, wet: 0.06 },
      dore: { seconds: 0.35, wet: 0.16 },
      turquoise: { seconds: 0.4, wet: 0.05 },
      cendre: { seconds: 0.7, wet: 0.09 },
      obsidienne: { seconds: 1.1, wet: 0.32 },
    }),
    [],
  );
  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    const limiter = limiterRef.current;
    if (!ctx || !master || !limiter || muted) return;
    const spaces = spacesRef.current;
    let current = spaces.get(soundDirection);
    if (!current) {
      const spec = SPACES[soundDirection];
      const length = Math.max(1, Math.floor(ctx.sampleRate * spec.seconds));
      const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          // Decroissance exponentielle, un peu plus longue a gauche qu'a
          // droite pour que l'espace ait une largeur.
          const t = i / length;
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.4 + ch * 0.3);
        }
      }
      const conv = ctx.createConvolver();
      conv.buffer = impulse;
      const wet = ctx.createGain();
      wet.gain.value = 0;
      master.connect(conv).connect(wet).connect(limiter);
      current = { conv, wet };
      spaces.set(soundDirection, current);
    }
    const now = ctx.currentTime;
    for (const [dir, space] of spaces) {
      const cible = dir === soundDirection ? SPACES[dir as DirectionKey].wet : 0;
      space.wet.gain.setTargetAtTime(cible, now, 0.6);
    }
  }, [muted, soundDirection, SPACES]);

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
    const freqs = [87.31, 110, 130.81]; // F2, A2, C3 : accord mineur cosmique
    const nodes: { osc: OscillatorNode; gain: GainNode }[] = [];
    // LA RESPIRATION (13/09, X7) : la nappe monte et descend sur 40 s, un
    // tiers de sa force, pour que le silence existe. Un LFO sur le gain.
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 1 / 40;
    lfoDepth.gain.value = 0.013;
    lfo.connect(lfoDepth);
    lfo.start();
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.value = 0;
      // Fade in doux 2s
      gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2);
      lfoDepth.connect(gain.gain);
      osc.connect(gain).connect(master);
      osc.start();
      nodes.push({ osc, gain });
    }
    nodes.push({ osc: lfo, gain: lfoDepth });
    ambientNodesRef.current = nodes;

    return () => {
      // cleanup lors du re-render, mais géré aussi par le muted branch ci-dessus
    };
  }, [muted]);

  // Le vent de l'Ouest : demarre a l'arrivee sur Contact (si le son est
  // actif), s'eteint en quittant ou en coupant le son.
  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;
    const wantWind = !muted && soundDirection === "cendre";
    const current = windRef.current;
    if (!wantWind) {
      if (!current) return;
      current.gain.gain.cancelScheduledValues(ctx.currentTime);
      current.gain.gain.setValueAtTime(current.gain.gain.value, ctx.currentTime);
      current.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      windRef.current = null;
      window.setTimeout(() => {
        try { current.source.stop(); } catch {}
        for (const o of current.lfos) { try { o.stop(); } catch {} }
      }, 1700);
      return;
    }
    if (current) return;
    // Bruit rose approche (filtre recursif de Paul Kellet), 4 s en boucle.
    const seconds = 4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 420;
    band.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    // Les rafales : deux LFO lents et incommensurables sur le volume et la
    // hauteur du filtre, comme les nappes de rafales de l'herbe.
    const lfos: OscillatorNode[] = [];
    for (const [hz, depth, target] of [[0.11, 0.045, gain.gain], [0.073, 0.03, gain.gain], [0.09, 160, band.frequency]] as const) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = hz;
      lfoGain.gain.value = depth;
      lfo.connect(lfoGain).connect(target);
      lfo.start();
      lfos.push(lfo);
    }
    source.connect(band).connect(gain).connect(master);
    source.start();
    gain.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 2.5);
    windRef.current = { source, gain, lfos };
  }, [muted, soundDirection]);

  // Le gel de l'Est (06/09) : tant que le monde est gele, la glace craque
  // de loin en loin (tic aigu tres court, parfois un gemissement grave).
  useEffect(() => {
    if (muted || soundDirection !== "dore") return;
    let timer = 0;
    const tick = () => {
      const ctx = ctxRef.current;
      const master = masterGainRef.current;
      const frozen = frostStore.active ? frostStore.state.frost : 0;
      if (ctx && master && frozen > 0.5) {
        const now = ctx.currentTime;
        const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const src = ctx.createBufferSource();
        src.buffer = noise;
        const hp = ctx.createBiquadFilter();
        hp.type = "bandpass";
        hp.frequency.value = 1800 + Math.random() * 2500;
        hp.Q.value = 3;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.18 + Math.random() * 0.12, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        src.connect(hp).connect(g).connect(master);
        src.start(now);
        src.stop(now + 0.1);
        if (Math.random() < 0.3) {
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.setValueAtTime(95, now);
          o.frequency.exponentialRampToValueAtTime(58, now + 0.5);
          const og = ctx.createGain();
          og.gain.setValueAtTime(0.0001, now);
          og.gain.exponentialRampToValueAtTime(0.12, now + 0.06);
          og.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
          o.connect(og).connect(master);
          o.start(now);
          o.stop(now + 0.6);
        }
      }
      timer = window.setTimeout(tick, 1200 + Math.random() * 3200);
    };
    timer = window.setTimeout(tick, 800);
    return () => window.clearTimeout(timer);
  }, [muted, soundDirection]);

  // L'explosion du gel de l'Est (06/09) : un craquement de glace (bruit
  // blanc passe-haut, tres court) puis le coup sourd (bruit passe-bas et
  // sinus grave qui descend), sur l'evenement nahual:frost-shatter.
  useEffect(() => {
    function onShatter() {
      const ctx = ctxRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master || muted) return;
      const now = ctx.currentTime;
      const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // Le craquement.
      const crack = ctx.createBufferSource();
      crack.buffer = noise;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 2400;
      const crackGain = ctx.createGain();
      crackGain.gain.setValueAtTime(0.5, now);
      crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      crack.connect(hp).connect(crackGain).connect(master);
      crack.start(now);
      crack.stop(now + 0.15);
      // Le coup.
      const boom = ctx.createBufferSource();
      boom.buffer = noise;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(900, now + 0.05);
      lp.frequency.exponentialRampToValueAtTime(80, now + 1.2);
      const boomGain = ctx.createGain();
      boomGain.gain.setValueAtTime(0.0001, now);
      boomGain.gain.exponentialRampToValueAtTime(0.7, now + 0.06);
      boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      boom.connect(lp).connect(boomGain).connect(master);
      boom.start(now + 0.04);
      boom.stop(now + 1.5);
      const sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(70, now + 0.05);
      sub.frequency.exponentialRampToValueAtTime(32, now + 1.0);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.exponentialRampToValueAtTime(0.5, now + 0.08);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
      sub.connect(subGain).connect(master);
      sub.start(now + 0.05);
      sub.stop(now + 1.2);
    }
    window.addEventListener("nahual:frost-shatter", onShatter);
    return () => window.removeEventListener("nahual:frost-shatter", onShatter);
  }, [muted]);

  /**
   * L'accord d'une direction, enveloppe AR (attaque rapide, release
   * exponentiel). Extrait du gestionnaire de clic le 08/09 pour que la
   * cloche du climax joue exactement le meme son : un seul endroit ou
   * regler le timbre.
   */
  const playChime = useCallback(
    (dir: string) => {
      if (muted) return;
      const freqs = CHIME_FREQ[dir];
      if (!freqs) return;
      const ctx = ctxRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master) return;

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
    },
    [muted],
  );

  /**
   * L'ARRIVEE (11/09, C2) : un motif de l'element de la direction, joue
   * quand sa scene est prete (l'evenement de chauffe), jamais au premier
   * chargement. Les choix sont dans lib/journey-cues ; ici les timbres,
   * avec les memes ingredients que les nappes : bruit filtre, sinus courts.
   */
  const playArrival = useCallback(
    (dir: DirectionKey) => {
      if (muted) return;
      const ctx = ctxRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master) return;
      const cue = arrivalCueFor(dir);
      const now = ctx.currentTime;
      const bruit = (seconds: number) => {
        const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        return src;
      };
      const sinus = (fromHz: number, toHz: number, at: number, dur: number, peak: number) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(fromHz, at);
        o.frequency.exponentialRampToValueAtTime(toHz, at + dur * 0.7);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(peak, at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        o.connect(g).connect(master);
        o.start(at);
        o.stop(at + dur + 0.02);
      };
      if (cue.kind === "crackle") {
        for (let k = 0; k < cue.hits; k++) {
          const at = now + (k * cue.spacingMs) / 1000;
          const src = bruit(0.05);
          const f = ctx.createBiquadFilter();
          f.type = "bandpass";
          f.frequency.value = 1800 + Math.random() * 2000;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(0.08, at + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
          src.connect(f).connect(g).connect(master);
          src.start(at);
        }
      } else if (cue.kind === "breath") {
        const src = bruit(cue.seconds);
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.setValueAtTime(cue.fromHz, now);
        f.frequency.exponentialRampToValueAtTime(cue.toHz, now + cue.seconds);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.06, now + cue.seconds * 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, now + cue.seconds);
        src.connect(f).connect(g).connect(master);
        src.start(now);
      } else if (cue.kind === "crack") {
        const src = bruit(0.06);
        const f = ctx.createBiquadFilter();
        f.type = "highpass";
        f.frequency.value = 2500;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.1, now + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        src.connect(f).connect(g).connect(master);
        src.start(now);
        sinus(cue.thumpFromHz, cue.thumpToHz, now + 0.02, 0.5, 0.12);
      } else if (cue.kind === "gust") {
        const src = bruit(cue.seconds);
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = cue.centerHz;
        f.Q.value = 0.7;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.07, now + cue.seconds * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, now + cue.seconds);
        src.connect(f).connect(g).connect(master);
        src.start(now);
      } else {
        for (let k = 0; k < cue.hits; k++) {
          const at = now + (k * cue.spacingMs) / 1000;
          sinus(820 + Math.random() * 240 - k * 200, 320, at, 0.13, 0.09);
        }
      }
    },
    [muted],
  );

  // L'arrivee se joue a l'evenement de chauffe de la direction, une fois.
  const prevDirRef = useRef<DirectionKey | null>(null);
  const lastPlayedRef = useRef<DirectionKey | null>(null);
  useEffect(() => {
    const previous = prevDirRef.current;
    prevDirRef.current = direction;
    if (!shouldPlayArrival(previous, direction, lastPlayedRef.current)) return;
    let joue = false;
    const jouer = () => {
      if (joue) return;
      joue = true;
      lastPlayedRef.current = direction;
      playArrival(direction);
    };
    const onWarm = (event: Event) => {
      if ((event as CustomEvent<{ direction?: string }>).detail?.direction === direction) jouer();
    };
    window.addEventListener(SHADERS_WARM_EVENT, onWarm);
    // Secours : si la chauffe ne vient pas, on joue quand le contenu entre.
    const secours = window.setTimeout(jouer, 2500);
    return () => {
      window.removeEventListener(SHADERS_WARM_EVENT, onWarm);
      window.clearTimeout(secours);
    };
  }, [direction, playArrival]);

  // Plus de cloche au clic (13/09, X7) : elle doublait celle du climax, et
  // le voyage a maintenant son pont (les couches qui se croisent).

  // LA MUSIQUE DE LA VEILLE (13/09, lib/veille : Sylvain, « une contemplation
  // facon Miyazaki avec une musique de fond »). Ecrite ici en Web Audio,
  // comme tout le son du site : une melodie pentatonique lente et
  // deterministe (noteVeille), un timbre doux (sinus + triangle detune
  // sous un passe-bas), une enveloppe lente, dans la reverberation de la
  // direction. Elle entre en 4 s sous les couches ambiantes (qui baissent
  // de moitie) et sort en 1,5 s au premier geste. Une seule voix.
  const veilleRef = useRef<{ gain: GainNode; minuterie: number; index: number; precedent: number } | null>(null);
  useEffect(() => {
    const arreter = () => {
      const v = veilleRef.current;
      const ctx = ctxRef.current;
      if (!v) return;
      veilleRef.current = null;
      window.clearTimeout(v.minuterie);
      if (ctx) {
        const now = ctx.currentTime;
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setValueAtTime(v.gain.gain.value, now);
        v.gain.gain.linearRampToValueAtTime(0.0001, now + 1.5);
        window.setTimeout(() => v.gain.disconnect(), 1700);
        for (const n of ambientNodesRef.current) {
          n.gain.gain.cancelScheduledValues(now);
          n.gain.gain.setValueAtTime(n.gain.gain.value, now);
          n.gain.gain.linearRampToValueAtTime(n.gain.gain.value * 2, now + 1.5);
        }
      }
    };
    const onVeille = (e: Event) => {
      const etat = (e as CustomEvent<{ etat?: string }>).detail?.etat;
      if (etat !== "en-cours") {
        arreter();
        return;
      }
      const ctx = ctxRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master || muted || veilleRef.current) return;
      const now = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.0001, now);
      bus.gain.linearRampToValueAtTime(0.22, now + 4);
      const espace = spacesRef.current.get(direction);
      bus.connect(master);
      if (espace) bus.connect(espace.conv);
      for (const n of ambientNodesRef.current) {
        n.gain.gain.cancelScheduledValues(now);
        n.gain.gain.setValueAtTime(n.gain.gain.value, now);
        n.gain.gain.linearRampToValueAtTime(n.gain.gain.value * 0.5, now + 4);
      }
      const v = { gain: bus, minuterie: 0, index: 0, precedent: -1 };
      veilleRef.current = v;
      const jouer = () => {
        if (veilleRef.current !== v) return;
        const note = noteVeille(v.index++, v.precedent);
        if (note.degre !== null) {
          v.precedent = note.degre;
          const t = ctx.currentTime;
          const env = ctx.createGain();
          env.gain.setValueAtTime(0.0001, t);
          env.gain.exponentialRampToValueAtTime(1, t + 0.35);
          env.gain.setValueAtTime(1, t + note.duree * 0.45);
          env.gain.exponentialRampToValueAtTime(0.0001, t + note.duree + 1.2);
          const bas = ctx.createBiquadFilter();
          bas.type = "lowpass";
          bas.frequency.value = 1400;
          const o1 = ctx.createOscillator();
          o1.type = "sine";
          o1.frequency.value = note.frequence;
          const o2 = ctx.createOscillator();
          o2.type = "triangle";
          o2.frequency.value = note.frequence;
          o2.detune.value = 6;
          const g2 = ctx.createGain();
          g2.gain.value = 0.35;
          o1.connect(bas);
          o2.connect(g2).connect(bas);
          bas.connect(env).connect(bus);
          o1.start(t);
          o2.start(t);
          o1.stop(t + note.duree + 1.3);
          o2.stop(t + note.duree + 1.3);
        }
        v.minuterie = window.setTimeout(jouer, note.duree * 1000);
      };
      jouer();
    };
    window.addEventListener(VEILLE_EVENT, onVeille);
    return () => {
      window.removeEventListener(VEILLE_EVENT, onVeille);
      arreter();
    };
  }, [muted, direction]);

  // LE SOUFFLE DU MIROIR (13/09) : quand le disque d'obsidienne se
  // retourne, un souffle de fumee (bruit en bande qui monte puis s'eteint)
  // et un grave qui s'enfle, le temps de la ceremonie. Une seule voix.
  useEffect(() => {
    const onMiroir = (e: Event) => {
      const ctx = ctxRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master || muted) return;
      const versClair = (e as CustomEvent<{ to?: string }>).detail?.to === "light";
      const now = ctx.currentTime;
      const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2.4), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.Q.value = 1.4;
      band.frequency.setValueAtTime(versClair ? 260 : 1400, now);
      band.frequency.exponentialRampToValueAtTime(versClair ? 1600 : 220, now + 2.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.14, now + 0.7);
      g.gain.setValueAtTime(0.14, now + 1.1);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
      src.connect(band).connect(g).connect(master);
      src.start(now);
      src.stop(now + 2.45);
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(versClair ? 48 : 64, now);
      o.frequency.exponentialRampToValueAtTime(versClair ? 72 : 42, now + 2.2);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, now);
      og.gain.exponentialRampToValueAtTime(0.1, now + 0.9);
      og.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
      o.connect(og).connect(master);
      o.start(now);
      o.stop(now + 2.45);
    };
    window.addEventListener(MIROIR_EVENT, onMiroir);
    return () => window.removeEventListener(MIROIR_EVENT, onMiroir);
  }, [muted]);

  // LE SUD, LA CHALEUR (11/09). Un bourdon de midi : deux sinus graves un
  // peu desaccordes sous un passe-bas, dont le volume MONTE AVEC LE JOUR de
  // l'arc (lib/sud-arc via dayAtArc : la nuit de Coatepec, puis le zenith).
  // La nuit il est inaudible ; a midi il chauffe. Meme motif de vie que le
  // vent de l'Ouest : cree a l'arrivee, fondu au depart.
  const heatRef = useRef<{ oscs: OscillatorNode[]; gain: GainNode } | null>(null);
  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    const wantHeat = !muted && soundDirection === "turquoise";
    const current = heatRef.current;
    if (!wantHeat || !ctx || !master) {
      if (current && ctx) {
        current.gain.gain.cancelScheduledValues(ctx.currentTime);
        current.gain.gain.setValueAtTime(current.gain.gain.value, ctx.currentTime);
        current.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
        heatRef.current = null;
        window.setTimeout(() => {
          for (const o of current.oscs) { try { o.stop(); } catch {} }
        }, 1700);
      }
      return;
    }
    if (current) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 220;
    const oscs: OscillatorNode[] = [];
    for (const f of [55, 55.7, 110.3]) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      o.connect(lp);
      o.start();
      oscs.push(o);
    }
    lp.connect(gain).connect(master);
    heatRef.current = { oscs, gain };
    // Le volume suit le jour : lu au defilement, lisse par la rampe.
    let raf = 0;
    const suivre = () => {
      const day = dayAtArc("turquoise", arcProgress(window.scrollY, window.innerHeight));
      const cible = 0.07 * day * day;
      gain.gain.setTargetAtTime(cible, ctx.currentTime, 0.6);
      raf = window.requestAnimationFrame(suivre);
    };
    raf = window.requestAnimationFrame(suivre);
    return () => window.cancelAnimationFrame(raf);
  }, [muted, soundDirection]);

  // LE TONNERRE SEC DE LA FRAPPE (11/09). Le compteur strikeHit du store
  // avance quand le serpent touche l'anneau : un coup court, bruit
  // passe-bas et sinus qui tombe, plus sec que le coup du gel de l'Est.
  useEffect(() => {
    if (muted || soundDirection !== "turquoise") return;
    let vu = xiuhcoatlStore.strikeHit;
    const timer = window.setInterval(() => {
      const ctx = ctxRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master) return;
      if (xiuhcoatlStore.strikeHit === vu) return;
      vu = xiuhcoatlStore.strikeHit;
      const now = ctx.currentTime;
      const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(1400, now);
      lp.frequency.exponentialRampToValueAtTime(120, now + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.8, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      src.connect(lp).connect(g).connect(master);
      src.start(now);
      src.stop(now + 0.65);
      const sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(90, now);
      sub.frequency.exponentialRampToValueAtTime(40, now + 0.35);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.0001, now);
      sg.gain.exponentialRampToValueAtTime(0.5, now + 0.03);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      sub.connect(sg).connect(master);
      sub.start(now);
      sub.stop(now + 0.5);
    }, 90);
    return () => window.clearInterval(timer);
  }, [muted, soundDirection]);

  // LE NORD, L'EAU (11/09). Une nappe tres basse tant qu'on est au bassin,
  // et un « plip » a chaque pas de Xolotl dans l'eau : le simulateur
  // d'ondes recoit deja ses impacts (xolotl-companion), le store en tient
  // le compte, et le son suit le compte. Chaque pas qu'on VOIT pousser une
  // onde s'entend.
  const waterRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode; lfo: OscillatorNode } | null>(null);
  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    const wantWater = !muted && soundDirection === "obsidienne";
    const current = waterRef.current;
    if (!wantWater || !ctx || !master) {
      if (current && ctx) {
        current.gain.gain.cancelScheduledValues(ctx.currentTime);
        current.gain.gain.setValueAtTime(current.gain.gain.value, ctx.currentTime);
        current.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
        waterRef.current = null;
        window.setTimeout(() => {
          try { current.source.stop(); } catch {}
          try { current.lfo.stop(); } catch {}
        }, 1700);
      }
      return;
    }
    if (current) return;
    const seconds = 4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Bruit brun : un blanc integre, plus grave et plus liquide.
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 260;
    band.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();
    source.connect(band).connect(gain).connect(master);
    source.start();
    gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 2.5);
    waterRef.current = { source, gain, lfo };
    // Les pas : un compteur, jamais la longueur d'un tableau que le
    // simulateur vide a chaque image.
    let vu = tezcatlStore.impactSerial;
    const timer = window.setInterval(() => {
      const c = ctxRef.current;
      const m = masterGainRef.current;
      if (!c || !m) return;
      const nouveaux = tezcatlStore.impactSerial - vu;
      if (nouveaux <= 0) return;
      vu = tezcatlStore.impactSerial;
      const now = c.currentTime;
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(820 + Math.random() * 240, now);
      o.frequency.exponentialRampToValueAtTime(320, now + 0.09);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.09, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      // Le pas vient d'ou est le chien (13/09, X7) : panoramique sur sa
      // position dans le bassin, gauche et droite de l'axe du cerf.
      const pan = c.createStereoPanner();
      const xo = tezcatlStore.xolotl;
      pan.pan.value = xo ? Math.max(-1, Math.min(1, xo.x / 6)) : 0;
      o.connect(g).connect(pan).connect(m);
      o.start(now);
      o.stop(now + 0.13);
    }, 60);
    return () => window.clearInterval(timer);
  }, [muted, soundDirection]);

  // LE CENTRE, LE FEU (11/09). Le foyer qui ne s'eteint jamais : un lit
  // chaud (bruit brun passe-bas) et des crepitements courts dont la cadence
  // suit l'offrande, lib/copal, la meme intensite que les braseros a
  // l'ecran. docs/da/etat-de-l-art.md l'avait ecrit : « le son commence
  // ici, le feu qui crepite ».
  const fireRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);
  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    const wantFire = !muted && soundDirection === "jade";
    const current = fireRef.current;
    if (!wantFire || !ctx || !master) {
      if (current && ctx) {
        current.gain.gain.cancelScheduledValues(ctx.currentTime);
        current.gain.gain.setValueAtTime(current.gain.gain.value, ctx.currentTime);
        current.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
        fireRef.current = null;
        window.setTimeout(() => { try { current.source.stop(); } catch {} }, 1700);
      }
      return;
    }
    if (current) return;
    const seconds = 3;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.03 * white) / 1.03;
      data[i] = last * 3;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 180;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(lp).connect(gain).connect(master);
    source.start();
    fireRef.current = { source, gain };
    let timer = 0;
    const crepite = () => {
      const c = ctxRef.current;
      const m = masterGainRef.current;
      const offrande = copalIntensity(arcProgress(window.scrollY, window.innerHeight), 0);
      if (c && m) {
        gain.gain.setTargetAtTime(0.05 * offrande, c.currentTime, 0.8);
        const now = c.currentTime;
        const n = 1 + Math.floor(Math.random() * 3);
        for (let k = 0; k < n; k++) {
          const t0 = now + Math.random() * 0.25;
          const pop = c.createBuffer(1, Math.floor(c.sampleRate * 0.03), c.sampleRate);
          const d = pop.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
          const src = c.createBufferSource();
          src.buffer = pop;
          const bp = c.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = 900 + Math.random() * 2200;
          bp.Q.value = 2;
          const g = c.createGain();
          g.gain.setValueAtTime((0.05 + Math.random() * 0.1) * offrande, t0);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
          src.connect(bp).connect(g).connect(m);
          src.start(t0);
          src.stop(t0 + 0.04);
        }
      }
      // Plus l'offrande est haute, plus ca crepite.
      timer = window.setTimeout(crepite, 180 + Math.random() * (900 - 600 * offrande));
    };
    timer = window.setTimeout(crepite, 400);
    return () => window.clearTimeout(timer);
  }, [muted, soundDirection]);

  /**
   * LA CLOCHE DU CLIMAX (08/09). Jusqu'ici l'accord cardinal ne sonnait
   * qu'au CLIC : le son habillait l'interface au lieu de raconter le
   * parcours, et c'est l'ecart le plus net face aux laureats, qui font du
   * son une couche narrative (docs/da/etat-de-l-art.md, septieme
   * constante). Le meme accord sonne maintenant quand l'arc atteint son
   * climax, sur les cinq pages, sans une dependance nouvelle : le son
   * repond enfin au geste du visiteur.
   *
   * Le declenchement est dans src/lib/climax-chime.ts, pur et teste :
   * une cloche qui sonne deux fois, ou qui sonne a l'ouverture parce qu'on
   * arrive deja au-dela du seuil, s'entend immediatement.
   *
   * Rien sous mouvement reduit : l'arc y est fige a progress 0 (cf
   * scene-refs-context), donc il n'y a pas de climax a souligner.
   */
  useEffect(() => {
    if (muted || typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const emphasisNow = () => getNavEmphasis(arcProgress(window.scrollY, window.innerHeight));
    let state = armChime(emphasisNow());

    function onScroll() {
      const next = stepChime(state, emphasisNow());
      state = next.state;
      if (next.fire) playChime(direction);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [muted, direction, playChime]);

  // LE CHOIX DU VOILE (11/09). Deux boutons pendant l'attente ; celui qui
  // choisit le son declenche ici, dans son clic, la creation du contexte :
  // c'est le geste que le navigateur exige, et il ne se rejoue pas plus
  // tard. « Sans le son » ne fait rien de plus que persister le silence.
  useEffect(() => {
    function onChoice(e: Event) {
      const on = Boolean((e as CustomEvent<{ on: boolean }>).detail?.on);
      if (!on) {
        setMuted(true);
        return;
      }
      const ctx = ensureContext();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      setMuted(false);
    }
    window.addEventListener(SOUND_CHOICE_EVENT, onChoice);
    return () => window.removeEventListener(SOUND_CHOICE_EVENT, onChoice);
  }, [ensureContext]);

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

  // Un landmark (11/09, axe « region ») : le curseur de volume vivait hors de
  // tout landmark.
  return (
    <div className={styles.dock} role="region" aria-label={label.landmark}>
    <input
      type="range"
      className={styles.volume}
      min={0}
      max={100}
      step={5}
      value={Math.round(volume * 100)}
      aria-label={label.volume}
      onChange={(e) => setVolume(Number(e.target.value) / 100)}
    />
    <button
      type="button"
      className={styles.toggle} data-scene-controls=""
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
    </div>
  );
}
