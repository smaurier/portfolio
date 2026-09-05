/**
 * Le drapeau WebGPU (05/09, chantier de migration). Tant que la branche
 * n'est pas a parite, `main` rend en WebGL ; `?gpu=1` bascule sur
 * WebGPURenderer (qui retombe seul sur son backend WebGL 2 si le
 * navigateur n'a pas WebGPU : meme code TSL, deux backends). Le choix
 * est garde en stockage local pour survivre a la navigation entre pages.
 * Pur.
 */

export type RendererKind = "webgl" | "webgpu";

export const GPU_STORAGE_KEY = "nahual-gpu";

export function rendererKindFrom(search: string, stored: string | null): RendererKind {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const q = params.get("gpu");
  if (q === "1") return "webgpu";
  if (q === "0") return "webgl";
  return stored === "1" ? "webgpu" : "webgl";
}
