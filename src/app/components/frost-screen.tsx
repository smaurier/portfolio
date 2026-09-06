"use client";

import { useEffect, useRef } from "react";
import { coverage, createFrostGrid, growFrost, meltFrost, seedFrost, type FrostGrid } from "@/lib/frost-screen";
import { frostStore } from "./stag-scene/frost-store";

/**
 * FrostScreen (06/09, Est) : quand on remonte la page Services sous le
 * seuil de regel, le givre gagne l'ECRAN depuis les bords (simulateur
 * lib/frost-screen : automate de croissance a fougeres), se tient, puis
 * fond pendant que le monde derriere est de nouveau gele. Un canvas 2D
 * basse resolution etire sur tout l'ecran, flou de fond qui monte avec la
 * couverture. Au-dessus de la scene et du texte, sous les controles ;
 * jamais d'interaction (pointer-events none, aria-hidden).
 */

const SCALE = 4; // un pixel de simulation = 4 px d'ecran
const MAX_STEPS_PER_FRAME = 1;
/** Le givre ne couvre jamais tout : on garde des trouees. */
const MAX_COVERAGE = 0.82;

export default function FrostScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let grid: FrostGrid | null = null;
    let image: ImageData | null = null;
    let peak = 0;
    let random = Math.random;
    let raf = 0;

    const reset = () => {
      const w = Math.max(32, Math.round(window.innerWidth / SCALE));
      const h = Math.max(20, Math.round(window.innerHeight / SCALE));
      canvas.width = w;
      canvas.height = h;
      grid = createFrostGrid(w, h);
      image = ctx.createImageData(w, h);
      let s = (Date.now() % 100000) + 1;
      random = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
      seedFrost(grid, random);
      peak = 0;
    };

    const draw = (g: FrostGrid, img: ImageData) => {
      const d = img.data;
      const { cells, tick } = g;
      for (let i = 0; i < cells.length; i++) {
        const v = cells[i];
        const o = i * 4;
        if (v === 0) {
          d[o + 3] = 0;
          continue;
        }
        // Les bords recents sont clairs, le coeur ancien plus translucide.
        const age = (tick - v) / Math.max(1, tick);
        const edge = 1 - Math.min(1, age * 3);
        d[o] = 200 + 55 * edge;
        d[o + 1] = 222 + 33 * edge;
        d[o + 2] = 255;
        d[o + 3] = Math.round(70 + 120 * edge);
      }
      ctx.putImageData(img, 0, 0);
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const target = frostStore.active ? frostStore.state.screen : 0;
      if (target <= 0.001) {
        if (grid) {
          grid = null;
          image = null;
          wrap.style.opacity = "0";
          wrap.style.backdropFilter = "";
        }
        return;
      }
      if (!grid || !image) reset();
      const g = grid!, img = image!;
      if (target >= peak) {
        peak = target;
        let steps = 0;
        while (coverage(g) < target * MAX_COVERAGE && steps < MAX_STEPS_PER_FRAME) {
          growFrost(g, 1, random);
          steps++;
        }
      } else {
        meltFrost(g, target / peak);
      }
      draw(g, img);
      const c = coverage(g);
      wrap.style.opacity = "1";
      wrap.style.backdropFilter = `blur(${(c * 6).toFixed(1)}px) saturate(${(1 - c * 0.4).toFixed(2)})`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 9000, pointerEvents: "none", opacity: 0, transition: "opacity 0.2s" }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", filter: "blur(1.6px)", mixBlendMode: "screen" }} />
    </div>
  );
}
