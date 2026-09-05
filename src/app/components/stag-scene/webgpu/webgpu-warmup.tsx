"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import type { WebGPURenderer } from "three/webgpu";
import { isWebGpu } from "./renderer-kind";
import { isGpuWarm, markGpuWarm } from "./gpu-warmup";

/** Autant d'images consecutives sous FAST_FRAME_MS pour declarer le rendu
 * chaud : la compilation des pipelines, les premiers envois de textures et
 * les cibles des simulateurs sont alors derriere nous. */
const STABLE_FRAMES = 12;
const FAST_FRAME_MS = 40;

/**
 * Derriere le voile, une fois les assets charges (useProgress = 100) :
 * precompile les pipelines (`compileAsync`) puis attend que les images
 * s'enchainent vite (ce que la compilation seule ne garantit pas : les
 * objets caches ou les cibles de rendu se materialisent a la premiere
 * image), et leve `gpuWarmupDone` (cf gpu-warmup.ts). Monte dans le Canvas.
 */
export default function WebGpuWarmup() {
  const { gl, scene, camera } = useThree();
  const { progress } = useProgress();
  const compiledRef = useRef(false);
  const fastRef = useRef(0);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!isWebGpu()) {
      markGpuWarm();
      return;
    }
    if (progress < 100 || compiledRef.current) return;
    compiledRef.current = true;
    (gl as unknown as WebGPURenderer)
      .compileAsync(scene, camera)
      .catch(() => undefined);
  }, [progress, gl, scene, camera]);

  useFrame(() => {
    if (!compiledRef.current || isGpuWarm()) return;
    const now = performance.now();
    const dt = lastRef.current ? now - lastRef.current : 0;
    lastRef.current = now;
    fastRef.current = dt > 0 && dt < FAST_FRAME_MS ? fastRef.current + 1 : 0;
    if (fastRef.current >= STABLE_FRAMES) markGpuWarm();
  });

  return null;
}
