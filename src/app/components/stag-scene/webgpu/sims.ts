import type { WebGLRenderer } from "three";
import type { Renderer } from "three/webgpu";
import { isWebGpu } from "./renderer-kind";
import { TezcatlRippleSim, type RippleSim } from "../tezcatl-ripple-sim";
import { TezcatlFluidSim, type FluidParams, type FluidSim } from "../mictlan-fluid-sim";
import { TezcatlRippleSimTsl } from "./ripple-sim-tsl";
import { TezcatlFluidSimTsl } from "./fluid-sim-tsl";

/** Les simulateurs GPGPU selon le moteur (05/09, migration WebGPU). Le
 * `gl` de r3f est un WebGLRenderer ou un WebGPURenderer selon le drapeau. */

export function createRippleSim(gl: unknown, size: number): RippleSim {
  return isWebGpu() ? new TezcatlRippleSimTsl(gl as Renderer, size) : new TezcatlRippleSim(gl as WebGLRenderer, size);
}

export function createFluidSim(gl: unknown, simSize: number, dyeSize: number, params: FluidParams): FluidSim {
  return isWebGpu() ? new TezcatlFluidSimTsl(gl as Renderer, simSize, dyeSize, params) : new TezcatlFluidSim(gl as WebGLRenderer, simSize, dyeSize, params);
}
