"use client";

import { useEffect, useRef } from "react";
import { MIROIR_EVENT, MIROIR_TIMING, codexDraw, miroirDuration, miroirPeakAt, smokeAlpha, smokePhase, type Theme } from "@/lib/theme";
import { codexStore } from "./stag-scene/codex-store";
import { applyTheme } from "./theme-store";

/**
 * LA FUMEE DU MIROIR (13/09). La ceremonie qui retourne le monde : la fumee
 * monte du disque d'obsidienne (la ou l'on a clique), couvre l'ecran, le
 * monde change derriere elle, puis elle se retire depuis le disque et
 * decouvre l'autre face. Dans les deux sens, le meme geste : c'est le
 * tezcatl ihpoca, le miroir qui fume.
 *
 * Rendu : un canvas 2D fixe, a un cinquieme de la resolution, agrandi par
 * le CSS avec un flou. Chaque image : pour chaque pixel, la distance au
 * disque et un bruit de valeur (deux octaves, precalcule) donnent l'alpha
 * (lib/theme.smokeAlpha, pur et teste) ; la couleur est celle de la fumee
 * de copal, gris-violet, plus claire la ou le bruit est fort. Le monde
 * change a `miroirPeakAt`, au milieu de la tenue, quand rien ne se voit.
 *
 * Mouvement reduit (RGAA 13.6) : pas de fumee, la face change tout de
 * suite ; les surfaces suivent par leur transition CSS courte.
 */
export type DemandeMiroir = { x: number; y: number; to: Theme };

const abonnes = new Set<(d: DemandeMiroir) => void>();
let occupe = false;

/** Lance la ceremonie depuis un point de l'ecran (px CSS). Ignore si une
 *  ceremonie est en cours. */
export function jouerMiroir(d: DemandeMiroir): void {
  if (occupe) return;
  window.dispatchEvent(new CustomEvent(MIROIR_EVENT, { detail: { to: d.to } }));
  if (abonnes.size === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    applyTheme(d.to);
    return;
  }
  for (const f of abonnes) f(d);
}

const NOISE_SIZE = 128;
const SCALE = 5;

/** Bruit de valeur, deux octaves, tuile de NOISE_SIZE. Calcule une fois. */
function makeNoise(): Float32Array {
  const n = NOISE_SIZE;
  const base = new Float32Array(n * n);
  let seed = 1337;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < base.length; i++) base[i] = rand();
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const sample = (x: number, y: number) => {
    const x0 = Math.floor(x) & (n - 1), y0 = Math.floor(y) & (n - 1);
    const x1 = (x0 + 1) & (n - 1), y1 = (y0 + 1) & (n - 1);
    const fx = x - Math.floor(x), fy = y - Math.floor(y);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(base[y0 * n + x0], base[y0 * n + x1], sx), lerp(base[y1 * n + x0], base[y1 * n + x1], sx), sy);
  };
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    out[y * n + x] = 0.65 * sample(x / 9, y / 9) + 0.35 * sample(x / 3.7 + 17, y / 3.7 + 31);
  }
  return out;
}

export default function MiroirFumant() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const noiseRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const jouer = (d: DemandeMiroir) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) { applyTheme(d.to); return; }
      occupe = true;
      const noise = (noiseRef.current ??= makeNoise());
      const W = Math.max(48, Math.ceil(window.innerWidth / SCALE));
      const H = Math.max(27, Math.ceil(window.innerHeight / SCALE));
      canvas.width = W;
      canvas.height = H;
      canvas.setAttribute("data-miroir", "en-cours");
      const img = ctx.createImageData(W, H);
      const data = img.data;
      const ox = d.x / SCALE, oy = d.y / SCALE;
      const maxDist = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy)) || 1;
      const duree = miroirDuration(MIROIR_TIMING);
      const peak = miroirPeakAt(MIROIR_TIMING);
      let bascule = false;
      const t0 = performance.now();
      let raf = 0;
      const frame = (now: number) => {
        const t = (now - t0) / 1000;
        const sp = smokePhase(t, MIROIR_TIMING);
        // LE TRACE (13/09) : la scene 3D se reduit a son dessin, puis se
        // recolore. Toute la choregraphie est dans lib/theme (pure et
        // testee) ; ici on ne fait que la poser pour le shader.
        const cd = codexDraw(t, MIROIR_TIMING);
        codexStore.amount = cd.amount;
        codexStore.front = cd.front;
        codexStore.sign = cd.sign;
        codexStore.x = d.x;
        codexStore.y = d.y;
        if (!bascule && t >= peak) { bascule = true; applyTheme(d.to); }
        const drift = t * 6;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const nx = (x + drift) & (NOISE_SIZE - 1), ny = (y + drift * 0.6) & (NOISE_SIZE - 1);
            const n = noise[(ny | 0) * NOISE_SIZE + (nx | 0)];
            const dist = Math.hypot(x - ox, y - oy) / maxDist;
            const a = smokeAlpha(sp, dist, n);
            // Fumee de copal : gris-violet, plus claire ou le bruit est fort.
            const l = 0.35 + 0.5 * n;
            data[i] = 58 + (150 - 58) * l;
            data[i + 1] = 50 + (140 - 50) * l;
            data[i + 2] = 70 + (160 - 70) * l;
            data[i + 3] = Math.round(255 * Math.min(1, a * 0.96));
          }
        }
        ctx.putImageData(img, 0, 0);
        if (t < duree) raf = requestAnimationFrame(frame);
        else {
          if (!bascule) applyTheme(d.to);
          codexStore.amount = 0;
          canvas.removeAttribute("data-miroir");
          ctx.clearRect(0, 0, W, H);
          occupe = false;
        }
      };
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    };
    abonnes.add(jouer);
    return () => {
      abonnes.delete(jouer);
      occupe = false;
      // Si la page change au milieu de la ceremonie, le monde resterait
      // dessine pour toujours : on le rend a ses couleurs.
      codexStore.amount = 0;
    };
  }, []);

  return <canvas ref={canvasRef} className="miroirFumant" aria-hidden="true" />;
}
