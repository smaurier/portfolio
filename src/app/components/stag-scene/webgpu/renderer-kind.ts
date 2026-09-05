import { GPU_STORAGE_KEY, rendererKindFrom, type RendererKind } from "@/lib/gpu-flag";

/**
 * Le moteur choisi pour la session (05/09, migration WebGPU). Lu par les
 * modules qui doivent brancher un effet de deux facons (patch GLSL sur
 * WebGL, etage TSL sur WebGPU) tant que la migration n'est pas finie.
 * Decide une fois, cote client, avant la creation du Canvas.
 */
let kind: RendererKind = "webgl";
let decided = false;

export function decideRendererKind(): RendererKind {
  if (decided || typeof window === "undefined") return kind;
  decided = true;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(GPU_STORAGE_KEY);
  } catch {
    stored = null;
  }
  kind = rendererKindFrom(window.location.search, stored);
  try {
    const q = new URLSearchParams(window.location.search).get("gpu");
    if (q === "1" || q === "0") window.localStorage.setItem(GPU_STORAGE_KEY, q);
  } catch {
    /* stockage indisponible */
  }
  return kind;
}

export function getRendererKind(): RendererKind {
  return kind;
}

export function isWebGpu(): boolean {
  return kind === "webgpu";
}
