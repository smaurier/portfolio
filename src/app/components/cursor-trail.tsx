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

    function onMove(e: PointerEvent) {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    }
    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    let prevX = -1000;
    let prevY = -1000;

    function tick() {
      if (!ctx || !canvas) return;
      // Fade global (destination-out) : efface progressivement le passe.
      // 0.06 → 0.15 (28/08 retour Sylvain "trace doit s'estomper au
      // bout de X secondes") — disparition complete en ~0.7s au lieu
      // de ~2s. Trace subtile mais transient.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      // Draw ligne du prev au current en jade subtile
      if (mouseRef.current.active && prevX > -500) {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(0, 192, 120, 0.35)";
        ctx.lineWidth = 1.5;
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
