"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector2 } from "three";
import { OllinShockwaveEffect } from "./ollin-shockwave-effect";

/**
 * OllinShockwave (29/08). Composant R3F qui monte l'effet post-process
 * OllinShockwaveEffect dans l'EffectComposer parent (PostFX) + gere le
 * cycle de vie de l'onde a chaque pointerdown.
 *
 * Trigger : pointerdown global (fenetre, pas juste canvas — n'importe
 * quel toucher declenche l'onde d'Ollin). Skip si :
 *  - prefers-reduced-motion active (troubles vestibulaires)
 *  - mode recit accessible actif (canvas deja demonte, plus rien a
 *    deformer)
 *
 * Coordonnees du centre : convertit clientX/clientY en UV normalise
 * (0..1) selon window.innerWidth/Height. L'axe Y est flippe (WebGL UV
 * origine en bas gauche, DOM origine en haut gauche).
 *
 * Enveloppe temporelle : easeOut cubique sur 800ms. uProgress lerp
 * 0 -> 1, uAmplitude decroit de AMPLITUDE_PEAK vers 0. Une seule
 * onde active a la fois (nouveau press ecrase la precedente).
 */

const DURATION_MS = 800;
const AMPLITUDE_PEAK = 0.04;

export default function OllinShockwave() {
  const effect = useMemo(() => new OllinShockwaveEffect(), []);
  const startedRef = useRef<number | null>(null);
  const centerRef = useRef(new Vector2(0.5, 0.5));

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function onPointerDown(e: PointerEvent) {
      // Skip si mode recit accessible : canvas demonte, effet muet.
      if (document.body.classList.contains("reading-mode")) return;
      // Skip clicks sur boutons UI (focus mode intentionnel, pas
      // "toucher le voile"). Un click sur un CTA lance l'onde ET la
      // navigation — casse la lisibilite du feedback nav. Filtre.
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('button, a, input, textarea, select, [role="button"]')) return;
      const uvX = e.clientX / window.innerWidth;
      const uvY = 1 - e.clientY / window.innerHeight;
      centerRef.current.set(uvX, uvY);
      startedRef.current = performance.now();
    }
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useFrame(() => {
    const uProgress = effect.uniforms.get("uProgress");
    const uAmp = effect.uniforms.get("uAmplitude");
    const uCenter = effect.uniforms.get("uCenter");
    if (!uProgress || !uAmp || !uCenter) return;

    // Boost partage OrbitCamera parallax (29/08 retour Sylvain
    // "camera doit suivre le joueur"). Pendant l'onde d'Ollin, la
    // camera amplifie sa reponse au parallax souris — sensation
    // "l'onde tire aussi le regard du cerf". Pattern identique a
    // __nahualAudioLevel pose par SoundDesign pour bloom pulse.
    const win = typeof window !== "undefined"
      ? (window as unknown as { __nahualOllinBoost?: { current: number } })
      : null;
    if (win && !win.__nahualOllinBoost) win.__nahualOllinBoost = { current: 0 };

    const started = startedRef.current;
    if (started === null) {
      // Repos : shader passe transparent (amplitude 0).
      uAmp.value = 0;
      if (win?.__nahualOllinBoost) win.__nahualOllinBoost.current = 0;
      return;
    }
    const elapsed = performance.now() - started;
    const t = elapsed / DURATION_MS;
    if (t >= 1) {
      startedRef.current = null;
      uProgress.value = 1;
      uAmp.value = 0;
      if (win?.__nahualOllinBoost) win.__nahualOllinBoost.current = 0;
      return;
    }
    // easeOut cubique — impulsion nette au debut, decay doux.
    const eased = 1 - Math.pow(1 - t, 3);
    uProgress.value = eased;
    uAmp.value = AMPLITUDE_PEAK * (1 - eased);
    (uCenter.value as Vector2).copy(centerRef.current);
    // Boost decroit avec l'onde. Peak 1.0 au debut, 0 en fin.
    if (win?.__nahualOllinBoost) win.__nahualOllinBoost.current = 1 - eased;
  });

  return <primitive object={effect} />;
}
