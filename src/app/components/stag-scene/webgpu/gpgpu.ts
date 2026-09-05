import { ClampToEdgeWrapping, HalfFloatType, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, RGBAFormat, RenderTarget, Scene, Vector2, Vector3, type Texture } from "three";
import { NodeMaterial, type Node, type Renderer, type TextureNode, type UniformNode } from "three/webgpu";
import { texture, uniform, vec4, positionGeometry } from "three/tsl";
import { ZERO_TEXTURE } from "../tezcatl-store";

/**
 * GPGPU par blit (05/09, migration WebGPU) : les simulateurs de nappe
 * (tezcatl-ripple-sim) et de fluide (mictlan-fluid-sim) sont des passes
 * plein ecran en ping-pong. Ce module porte la plomberie une seule fois :
 * cibles float, quad, et une PASSE = un fragment TSL branche sur des
 * entrees nommees (textures a permuter, scalaires, vecteurs). Le
 * WebGPURenderer rend dans une RenderTarget comme le WebGLRenderer.
 */

export function makeSimTarget(size: number): RenderTarget {
  return new RenderTarget(size, size, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
}

/** Deux cibles que l'on permute : on lit `read`, on ecrit `write`. */
export class PingPong {
  read: RenderTarget;
  write: RenderTarget;
  readonly texel: Vector2;
  constructor(size: number) {
    this.read = makeSimTarget(size);
    this.write = makeSimTarget(size);
    this.texel = new Vector2(1 / size, 1 / size);
  }
  swap(): void {
    const t = this.read;
    this.read = this.write;
    this.write = t;
  }
  dispose(): void {
    this.read.dispose();
    this.write.dispose();
  }
}

export type PassInputs<T extends string, F extends string, V2 extends string, V3 extends string> = {
  tex: Record<T, TextureNode>;
  f: Record<F, UniformNode<"float", number>>;
  v2: Record<V2, UniformNode<"vec2", Vector2>>;
  v3: Record<V3, UniformNode<"vec3", Vector3>>;
};

export type PassSpec<T extends string, F extends string, V2 extends string, V3 extends string> = {
  textures?: readonly T[];
  floats?: Record<F, number>;
  vec2s?: Record<V2, Vector2>;
  vec3s?: Record<V3, Vector3>;
};

export type Pass<T extends string, F extends string, V2 extends string, V3 extends string> = PassInputs<T, F, V2, V3> & { material: NodeMaterial };

/** Une passe plein ecran : `build` recoit les noeuds d'entree et rend le
 * vec4 ecrit dans la cible. `pass.tex.X.value = rt.texture` permute une
 * entree, `pass.f.X.value = n` regle un scalaire. */
export function definePass<T extends string = never, F extends string = never, V2 extends string = never, V3 extends string = never>(
  spec: PassSpec<T, F, V2, V3>,
  build: (inputs: PassInputs<T, F, V2, V3>) => Node<"vec4">
): Pass<T, F, V2, V3> {
  const tex = {} as PassInputs<T, F, V2, V3>["tex"];
  for (const name of spec.textures ?? []) tex[name] = texture(ZERO_TEXTURE);
  const f = {} as PassInputs<T, F, V2, V3>["f"];
  for (const [name, value] of Object.entries(spec.floats ?? {}) as [F, number][]) f[name] = uniform(value);
  const v2 = {} as PassInputs<T, F, V2, V3>["v2"];
  for (const [name, value] of Object.entries(spec.vec2s ?? {}) as [V2, Vector2][]) v2[name] = uniform(value);
  const v3 = {} as PassInputs<T, F, V2, V3>["v3"];
  for (const [name, value] of Object.entries(spec.vec3s ?? {}) as [V3, Vector3][]) v3[name] = uniform(value);
  const inputs = { tex, f, v2, v3 };
  const material = new NodeMaterial();
  material.vertexNode = vec4(positionGeometry.xy, 0, 1);
  material.fragmentNode = build(inputs);
  material.depthTest = false;
  material.depthWrite = false;
  return { ...inputs, material };
}

/** Le quad plein ecran et son rendu dans une cible, sans effacement. */
export class Blitter {
  private scene = new Scene();
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: Mesh;
  constructor(private renderer: Renderer) {
    this.quad = new Mesh(new PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }
  /** Joue `passes` (chaque entree = [cible, materiau]) en restaurant l'etat du moteur. */
  run(passes: () => void): void {
    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevAutoClear = r.autoClear;
    r.autoClear = false;
    passes();
    r.setRenderTarget(prevTarget);
    r.autoClear = prevAutoClear;
  }
  blit(target: RenderTarget, material: NodeMaterial): void {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
  }
  dispose(): void {
    this.quad.geometry.dispose();
  }
}

export type { Texture };
