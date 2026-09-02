import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from "three";

/**
 * TezcatlRippleSim (02/09, Nord) : le simulateur d'EAU de la nappe.
 * Equation des ondes 2D discretisee sur GPU (schema explicite d'ordre 2
 * en temps : h(t+1) = 2h(t) - h(t-1) + c^2 * laplacien(h)), amortie, en
 * ping-pong : chaque texel garde (x = hauteur courante, y = hauteur
 * precedente), une seule paire de render targets suffit. La souris depose
 * une bosse gaussienne proportionnelle a sa vitesse : l'onde se propage en
 * ANNEAUX, s'amortit, meurt sur des bords absorbants. Au repos : plat.
 *
 * Pourquoi ce modele et pas le simulateur de fluide
 * (tezcatl-fluid-sim.ts) : Navier-Stokes fait un fluide qui s'etale et
 * tourbillonne, une fumee ("mais c'est de la fumee en bas ? moi je
 * voulais un simulateur d'eau", Sylvain 02/09). Une surface d'eau calme
 * que l'on touche, ce sont des ondes : ce modele-ci.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const PROPAGATE = /* glsl */ `
  uniform sampler2D uState;
  uniform vec2 uTexel;
  uniform float uDamping;
  uniform float uSpeed;
  varying vec2 vUv;
  void main() {
    vec2 s = texture2D(uState, vUv).xy;
    float L = texture2D(uState, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uState, vUv + vec2(uTexel.x, 0.0)).x;
    float T = texture2D(uState, vUv + vec2(0.0, uTexel.y)).x;
    float B = texture2D(uState, vUv - vec2(0.0, uTexel.y)).x;
    float lap = L + R + T + B - 4.0 * s.x;
    float next = (2.0 * s.x - s.y + uSpeed * lap) * uDamping;
    // Bords absorbants : l'onde meurt en approchant du bord de la grille
    // au lieu de rebondir eternellement.
    float d = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
    next *= 1.0 - smoothstep(0.9, 1.0, d);
    gl_FragColor = vec4(next, s.x, 0.0, 1.0);
  }
`;

const DROP = /* glsl */ `
  uniform sampler2D uState;
  uniform vec2 uPoint;
  uniform float uRadius;
  uniform float uAmount;
  varying vec2 vUv;
  void main() {
    vec2 s = texture2D(uState, vUv).xy;
    vec2 p = vUv - uPoint;
    float g = exp(-dot(p, p) / uRadius);
    gl_FragColor = vec4(s.x + g * uAmount, s.y, 0.0, 1.0);
  }
`;

function makeTarget(size: number): WebGLRenderTarget {
  return new WebGLRenderTarget(size, size, {
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

export type RippleDrop = { u: number; v: number; amount: number };

export type RippleParams = {
  /** c^2 du schema : stable sous 0.5, plus haut = ondes plus rapides. */
  speed: number;
  /** Amortissement par pas (0.99 = ondes longues, 0.95 = eau visqueuse). */
  damping: number;
  /** Rayon des gouttes (uv^2). */
  dropRadius: number;
};

export const DEFAULT_RIPPLE_PARAMS: RippleParams = {
  speed: 0.2,
  damping: 0.985,
  dropRadius: 0.0003,
};

export class TezcatlRippleSim {
  private gl: WebGLRenderer;
  private read: WebGLRenderTarget;
  private write: WebGLRenderTarget;
  private scene = new Scene();
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: Mesh;
  private propagate: ShaderMaterial;
  private drop: ShaderMaterial;
  readonly texel: number;
  params: RippleParams;

  constructor(gl: WebGLRenderer, size = 256, params: RippleParams = DEFAULT_RIPPLE_PARAMS) {
    this.gl = gl;
    this.params = { ...params };
    this.texel = 1 / size;
    this.read = makeTarget(size);
    this.write = makeTarget(size);
    const texel = new Vector2(this.texel, this.texel);
    this.propagate = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: PROPAGATE,
      uniforms: { uState: { value: null }, uTexel: { value: texel }, uDamping: { value: 0.985 }, uSpeed: { value: 0.2 } },
      depthTest: false,
      depthWrite: false,
    });
    this.drop = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: DROP,
      uniforms: { uState: { value: null }, uPoint: { value: new Vector2() }, uRadius: { value: 0.0003 }, uAmount: { value: 0 } },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.propagate);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  get heightTexture(): Texture {
    return this.read.texture;
  }

  private blit(material: ShaderMaterial) {
    this.quad.material = material;
    this.gl.setRenderTarget(this.write);
    this.gl.render(this.scene, this.camera);
    const t = this.read;
    this.read = this.write;
    this.write = t;
  }

  /** Un pas (pas de temps fixe par frame : le schema est calibre pour
   * ~60 fps, `substeps` permet de rattraper une frame lente). */
  step(drops: RippleDrop[], substeps = 1) {
    const gl = this.gl;
    const prevTarget = gl.getRenderTarget();
    const prevAutoClear = gl.autoClear;
    gl.autoClear = false;
    for (const d of drops) {
      this.drop.uniforms.uState.value = this.read.texture;
      (this.drop.uniforms.uPoint.value as Vector2).set(d.u, d.v);
      this.drop.uniforms.uRadius.value = this.params.dropRadius;
      this.drop.uniforms.uAmount.value = d.amount;
      this.blit(this.drop);
    }
    this.propagate.uniforms.uDamping.value = this.params.damping;
    this.propagate.uniforms.uSpeed.value = this.params.speed;
    for (let i = 0; i < substeps; i++) {
      this.propagate.uniforms.uState.value = this.read.texture;
      this.blit(this.propagate);
    }
    gl.setRenderTarget(prevTarget);
    gl.autoClear = prevAutoClear;
  }

  dispose() {
    this.read.dispose();
    this.write.dispose();
    this.propagate.dispose();
    this.drop.dispose();
    this.quad.geometry.dispose();
  }
}
