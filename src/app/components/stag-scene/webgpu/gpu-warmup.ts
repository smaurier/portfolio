/**
 * Le rendez-vous entre le voile de chargement et la compilation des
 * pipelines WebGPU (05/09). Sous le WebGPURenderer, les pipelines WGSL se
 * compilent a la premiere image de chaque materiau : sans precompilation,
 * les 3 a 4 premieres secondes apres le voile tombent a 1 ou 2 images par
 * seconde. `WebGpuWarmup` compile tout (`renderer.compileAsync`) pendant
 * que le voile est encore la, puis `markGpuWarm()` ; `LoadingSync` attend
 * cette promesse avant de poser `data-loaded`. En WebGL, ou si la scene
 * ne monte pas (robots, mode recit), la promesse est levee tout de suite
 * ou par le delai de garde.
 */

let resolveWarm: () => void = () => {};
let warm = false;

export const gpuWarmupDone = new Promise<void>((resolve) => {
  resolveWarm = resolve;
});

export function markGpuWarm(): void {
  if (warm) return;
  warm = true;
  resolveWarm();
}

export function isGpuWarm(): boolean {
  return warm;
}

/** Au-dela, on n'attend plus la compilation : le voile tombe quand meme. */
export const GPU_WARMUP_TIMEOUT_MS = 8000;
