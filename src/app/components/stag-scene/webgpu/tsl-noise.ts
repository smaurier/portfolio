import type { Node } from "three/webgpu";
import { Fn, vec3, floor, fract, mix } from "three/tsl";

/**
 * Le bruit maison en TSL (05/09, migration WebGPU) : le hash et le bruit
 * de valeur que les GLSL du site repetent (xiuhcoatl, poil, reflet de
 * braise). Une seule definition, importee partout.
 */

export const hash3 = Fn(([p]: [Node<"vec3">]) => {
  const q = fract(p.mul(0.3183099).add(vec3(0.1, 0.2, 0.3))).mul(17).toVar();
  return fract(q.x.mul(q.y).mul(q.z).mul(q.x.add(q.y).add(q.z)));
});

export const vnoise = Fn(([p]: [Node<"vec3">]) => {
  const i = floor(p);
  const f = fract(p).toVar();
  f.assign(f.mul(f).mul(f.mul(-2).add(3)));
  const c = (x: number, y: number, z: number) => hash3(i.add(vec3(x, y, z)));
  return mix(
    mix(mix(c(0, 0, 0), c(1, 0, 0), f.x), mix(c(0, 1, 0), c(1, 1, 0), f.x), f.y),
    mix(mix(c(0, 0, 1), c(1, 0, 1), f.x), mix(c(0, 1, 1), c(1, 1, 1), f.x), f.y),
    f.z
  );
});
