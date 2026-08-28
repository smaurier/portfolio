"use client";

import { useEffect, useRef } from "react";
import { useCardinalTransition, TRANSITION_DURATION_MS, type CardinalDirection } from "./cardinal-transition-context";
import { DIRECTION_ACCENT_COMPLEMENTARY, DIRECTION_COLOR_VIVID } from "./direction-colors";

/**
 * Curtain 2D canvas fullscreen (28/08 après retour Sylvain "je ne vois
 * pas de désintégration"). Overlay HTML garanti visible : dessine
 * ~1800 pétales en grille dense couvrant tout le viewport, opaques au
 * click du CardinalLink, puis éjectées dans le vecteur cardinal cible
 * + fade au fil du burst.
 *
 * Complète PetalStorm (particules 3D dans la scène) — le rendu 3D
 * peut être diffus/subtil selon l'angle caméra. Le curtain 2D est
 * screen-space, impossible à rater visuellement. Le signal "toute la
 * scène se désintègre en cempasúchils vers la nouvelle direction"
 * devient lisible même à l'œil non entraîné.
 *
 * Cycle 1600ms (déborde sur le fade-in de la nouvelle page pour
 * masquer visuellement toute la coupure re-mount contenu HTML) :
 *  - 0→150ms : opacity monte de 0 à 1 (la scène est "voilée" par les
 *    pétales, aucune coupure visible dessous)
 *  - 150→1200ms : ejection + drift cardinal, fade progressif
 *  - 1200→1600ms : queue de fade + petites pétales résiduelles
 *
 * Canvas 2D pur (pas WebGL) — rendu très large (2000+ formes/frame)
 * marche parfaitement en 2D sur toute machine, aucun overhead GPU.
 */

const PARTICLE_COUNT = 1800;
const CURTAIN_LIFE_MS = TRANSITION_DURATION_MS + 400; // 1200 + 400 fade-in

type Petal = {
  // Position initiale normalisée 0..1 dans le viewport
  x: number;
  y: number;
  // Vitesse random pour dispersion naturelle
  vx: number;
  vy: number;
  // Rotation initiale + vitesse rotation
  rot: number;
  vrot: number;
  // Delay 0..0.15 (proportion du burst)
  delay: number;
  // Size random 0.6..1.4
  scale: number;
  // 0..1 : 0 = cardinal color, 1 = accent
  accent: number;
};

function makePetals(count: number): Petal[] {
  const petals: Petal[] = [];
  const cols = Math.ceil(Math.sqrt((count * 16) / 9)); // grid aspect ratio 16:9
  const rows = Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Position initiale = grille + jitter random pour éviter grille
    // apparente en début d'anim.
    const jx = (Math.random() - 0.5) * 0.05;
    const jy = (Math.random() - 0.5) * 0.05;
    petals.push({
      x: col / cols + jx,
      y: row / rows + jy,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 4,
      delay: Math.random() * 0.15,
      scale: 0.6 + Math.random() * 0.8,
      accent: Math.random() < 0.15 ? 1 : 0,
    });
  }
  return petals;
}

// Cardinal vector 2D screen-space (x = right, y = down en pixel).
const CARDINAL_SCREEN: Record<CardinalDirection, [number, number]> = {
  jade: [0, 0], // Centre : implosion douce (scale down)
  dore: [1, 0], // Est : droite
  turquoise: [0, 1], // Sud : bas
  cendre: [-1, 0], // Ouest : gauche
  obsidienne: [0, -1], // Nord : haut
};

export default function PetalCurtain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transition = useCardinalTransition();
  const petalsRef = useRef<Petal[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const directionRef = useRef<CardinalDirection | null>(null);
  const rafRef = useRef<number | null>(null);

  // Petals générés au mount, réutilisés à chaque burst
  useEffect(() => {
    petalsRef.current = makePetals(PARTICLE_COUNT);
  }, []);

  useEffect(() => {
    if (!transition) return;

    function tick() {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Resize si nécessaire
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.scale(dpr, dpr);
      }

      const active = transition!.transitionDirection !== null;
      if (active && startTimeRef.current === null) {
        startTimeRef.current = performance.now();
        directionRef.current = transition!.transitionDirection;
      }
      if (!active && startTimeRef.current !== null) {
        const elapsed = performance.now() - startTimeRef.current;
        if (elapsed > CURTAIN_LIFE_MS) {
          startTimeRef.current = null;
          directionRef.current = null;
          ctx.clearRect(0, 0, w, h);
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
      }

      if (startTimeRef.current === null) {
        ctx.clearRect(0, 0, w, h);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const elapsed = performance.now() - startTimeRef.current;
      const p = Math.min(1, elapsed / CURTAIN_LIFE_MS);
      const dir = directionRef.current!;
      const [cvx, cvy] = CARDINAL_SCREEN[dir];
      const colorMain = DIRECTION_COLOR_VIVID[dir];
      const colorAccent = DIRECTION_ACCENT_COMPLEMENTARY[dir];

      ctx.clearRect(0, 0, w, h);

      // Global opacity envelope :
      //  0→0.1 : fade in (voile monte)
      //  0.1→0.55 : plein (voile masque scène + ejection commence)
      //  0.55→1.0 : fade out (pétales dispersent + disparaissent)
      const envelope =
        p < 0.1
          ? p / 0.1
          : p < 0.55
            ? 1
            : Math.max(0, 1 - (p - 0.55) / 0.45);

      ctx.save();

      for (let i = 0; i < petalsRef.current.length; i++) {
        const petal = petalsRef.current[i];
        const localP = Math.max(0, (p - petal.delay) / (1 - petal.delay));
        if (localP <= 0) continue;

        // Ease-out sur ejection
        const eased = 1 - Math.pow(1 - localP, 3);
        // Position pixel : grid + ejection cardinal (x1200 amp) +
        // petit swirl via vx/vy
        const px = (petal.x + cvx * eased * 1.2 + petal.vx * eased * 0.3) * w;
        const py = (petal.y + cvy * eased * 1.2 + petal.vy * eased * 0.3) * h;

        // Skip hors viewport
        if (px < -100 || px > w + 100 || py < -100 || py > h + 100) continue;

        // Rotation
        const rot = petal.rot + petal.vrot * localP;

        // Taille pétale
        const size = 26 * petal.scale;

        // Alpha : local envelope × global
        const localAlpha = localP < 0.1 ? localP / 0.1 : Math.max(0, 1 - (localP - 0.55) / 0.45);
        const alpha = envelope * localAlpha * 0.95;
        if (alpha <= 0.01) continue;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = petal.accent > 0.5 ? colorAccent : colorMain;
        // Forme pétale : ellipse asymétrique (cempasúchil stylisé)
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.15, size * 0.35, size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [transition]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110, // au-dessus du header 100, sous LoadingVeil 200 et glyphBurst 140
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    />
  );
}
