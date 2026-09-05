/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : etat mute a 60 fps, lu par les deux chaines de post-traitement (meme precedent que arrow-vapor). */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector2 } from "three";

/**
 * L'onde d'Ollin (29/08), la partie qui ne depend pas du moteur : le
 * declencheur (pointerdown global, sauf reduced-motion, mode recit et
 * boutons), l'enveloppe temporelle (easeOut cubique sur 800 ms) et le
 * boost partage avec OrbitCamera (window.__nahualOllinBoost). Les deux
 * chaines de post-traitement (pmndrs en WebGL, TSL en WebGPU) lisent le
 * meme etat : centre, progression, amplitude.
 */

const DURATION_MS = 800;
const AMPLITUDE_PEAK = 0.04;

export type OllinWave = { center: Vector2; progress: number; amplitude: number };

type BoostWindow = { __nahualOllinBoost?: { current: number } };

function setBoost(value: number) {
  const win = typeof window !== "undefined" ? (window as unknown as BoostWindow) : null;
  if (!win) return;
  if (!win.__nahualOllinBoost) win.__nahualOllinBoost = { current: 0 };
  win.__nahualOllinBoost.current = value;
}

/** L'etat de l'onde, mis a jour chaque frame (objet stable, mute). */
export function useOllinWave(): OllinWave {
  const wave = useMemo<OllinWave>(() => ({ center: new Vector2(0.5, 0.5), progress: 1, amplitude: 0 }), []);
  const startedRef = useRef<number | null>(null);
  const centerRef = useRef(new Vector2(0.5, 0.5));

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function onPointerDown(e: PointerEvent) {
      // Mode recit accessible : canvas demonte, effet muet.
      if (document.body.classList.contains("reading-mode")) return;
      // Un clic sur un CTA lance la navigation, pas l'onde.
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('button, a, input, textarea, select, [role="button"]')) return;
      // UV origine bas-gauche (WebGL) ; la chaine TSL retourne l'axe Y.
      centerRef.current.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
      startedRef.current = performance.now();
    }
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useFrame(() => {
    const started = startedRef.current;
    if (started === null) {
      wave.amplitude = 0;
      setBoost(0);
      return;
    }
    const t = (performance.now() - started) / DURATION_MS;
    if (t >= 1) {
      startedRef.current = null;
      wave.progress = 1;
      wave.amplitude = 0;
      setBoost(0);
      return;
    }
    // easeOut cubique : impulsion nette au debut, decay doux.
    const eased = 1 - Math.pow(1 - t, 3);
    wave.progress = eased;
    wave.amplitude = AMPLITUDE_PEAK * (1 - eased);
    wave.center.copy(centerRef.current);
    // Le boost de la camera decroit avec l'onde.
    setBoost(1 - eased);
  });

  return wave;
}
