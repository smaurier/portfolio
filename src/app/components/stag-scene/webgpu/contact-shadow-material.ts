import { ShaderMaterial, type Material } from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { Fn, float, uv, length, smoothstep, pow, color } from "three/tsl";
import { isWebGpu } from "./renderer-kind";

/**
 * L'ombre de contact sous le cerf (cf ground.tsx) : un disque noir dont
 * l'alpha tombe du centre au bord. GLSL en WebGL, TSL en WebGPU, meme
 * dessin.
 */
export function createContactShadowMaterial(): Material {
  if (isWebGpu()) {
    const mat = new MeshBasicNodeMaterial();
    mat.transparent = true;
    mat.depthWrite = false;
    mat.colorNode = color(0x000000);
    mat.opacityNode = Fn(() => {
      const c = uv().sub(0.5);
      const r = length(c).mul(2);
      const alpha = pow(float(1).sub(smoothstep(0, 1, r)), 1.6);
      return alpha.mul(0.35);
    })();
    return mat;
  }
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {},
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec2 c = vUv - 0.5;
        float r = length(c) * 2.0;
        float alpha = 1.0 - smoothstep(0.0, 1.0, r);
        alpha = pow(alpha, 1.6);
        gl_FragColor = vec4(0.0, 0.0, 0.0, alpha * 0.35);
      }
    `,
  });
}
