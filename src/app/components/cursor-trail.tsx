"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor path traces (28/08 boite outil #10). Canvas 2D fullscreen
 * fixed, chaque frame : fade global léger + dot cardinal au current
 * mouse. Laisse une trainée subtile qui s'efface en ~1s. Signature
 * "traces des ancêtres qui te suivent".
 *
 * Actif seulement sur hover:fine (desktop), skip touch. Respect
 * reducedMotion. Composant transparent, pointer-events none.
 */

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener("resize", resize);

    let lastMoveT = 0;
    function onMove(e: PointerEvent) {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
      lastMoveT = performance.now();
    }
    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    let prevX = -1000;
    let prevY = -1000;

    function tick() {
      if (!ctx || !canvas) return;
      const now = performance.now();
      const idleMs = now - lastMoveT;
      // Fade rate adaptatif : 2% par frame si mouse active/recente
      // (persistance 6-7s), monte a 10% si idle > 1s (disparition
      // rapide 0.5s pour purge visuelle). Retour Sylvain "ligne ne
      // s'en va jamais".
      const fadeAlpha = idleMs > 1000 ? 0.1 : 0.02;
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      // Full clear apres 3s d'inactivite mouse (garantie disparition).
      if (idleMs > 3000) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
      // Draw ligne du prev au current seulement si mouse a bouge
      // recemment (< 500ms) — evite dessiner segment 0-length inutile.
      if (mouseRef.current.active && prevX > -500 && idleMs < 500) {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(0, 192, 120, 0.08)";
        ctx.lineWidth = 1;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
        ctx.stroke();
      }
      prevX = mouseRef.current.x;
      prevY = mouseRef.current.y;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 8500,
        mixBlendMode: "screen",
      }}
    />
  );
}
