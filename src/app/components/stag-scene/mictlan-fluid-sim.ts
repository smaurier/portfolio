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
  Vector3,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from "three";

/**
 * TezcatlFluidSim (02/09, Nord) : un VRAI simulateur de fluide 2D sur GPU
 * (Navier-Stokes incompressible, methode des "stable fluids" de Jos Stam,
 * schema ping-pong de render targets popularise par Pavel Dobryakov) qui
 * anime la fumee du miroir de Tezcatlipoca. Demande Sylvain 02/09 : "comme
 * sur igloo.inc, des volutes, avec un vrai simulateur de fluide et de
 * fumee", confine au disque du tezcatl (option 1 + sim).
 *
 * Par pas de temps : forces (splats des emetteurs + souris) -> vorticite
 * (confinement : c'est elle qui enroule les volutes) -> divergence ->
 * pression (Jacobi) -> soustraction du gradient (champ a divergence
 * nulle) -> advection de la vitesse puis de l'encre (la fumee). Deux
 * grilles : vitesse/pression basse resolution, encre plus fine.
 *
 * Unites : vitesses en fraction de grille par seconde (1 = traverser le
 * disque en 1 s), coherent avec src/lib/tezcatl-fluid.ts. Half float
 * lineaire (WebGL2 : EXT_color_buffer_float, dispo Chrome/Firefox/Safari).
 * Une cellule hors du disque n'a pas de sens : la vitesse est contenue par
 * un masque radial a la soustraction du gradient, l'encre est masquee a
 * l'affichage.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const ADVECT = /* glsl */ `
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform float uDt;
  uniform float uDissipation;
  varying vec2 vUv;
  void main() {
    vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy;
    gl_FragColor = texture2D(uSource, coord) * uDissipation;
  }
`;

const SPLAT = /* glsl */ `
  uniform sampler2D uTarget;
  uniform vec2 uPoint;
  uniform vec3 uColor;
  uniform float uRadius;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - uPoint;
    float g = exp(-dot(p, p) / uRadius);
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + g * uColor, 1.0);
  }
`;

const CURL = /* glsl */ `
  uniform sampler2D uVelocity;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
    float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
    gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
  }
`;

const VORTICITY = /* glsl */ `
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform vec2 uTexel;
  uniform float uStrength;
  uniform float uDt;
  varying vec2 vUv;
  void main() {
    float L = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
    float T = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
    float B = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= uStrength * C;
    force.y *= -1.0;
    vec2 vel = texture2D(uVelocity, vUv).xy + force * uDt;
    gl_FragColor = vec4(clamp(vel, -10.0, 10.0), 0.0, 1.0);
  }
`;

const DIVERGENCE = /* glsl */ `
  uniform sampler2D uVelocity;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
    gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
  }
`;

const PRESSURE = /* glsl */ `
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float div = texture2D(uDivergence, vUv).x;
    gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
  }
`;

const GRADIENT_SUBTRACT = /* glsl */ `
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
    // Contention dans le disque : la fumee du tezcatl ne sort pas du
    // miroir. Amortissement doux vers le bord (jamais de smoothstep
    // inverse, comportement indefini GLSL).
    float d = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
    vel *= 1.0 - smoothstep(0.86, 1.0, d);
    gl_FragColor = vec4(vel, 0.0, 1.0);
  }
`;

const CLEAR = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uValue;
  varying vec2 vUv;
  void main() {
    gl_FragColor = uValue * texture2D(uTexture, vUv);
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

class DoubleFBO {
  read: WebGLRenderTarget;
  write: WebGLRenderTarget;
  texel: Vector2;
  constructor(size: number) {
    this.read = makeTarget(size);
    this.write = makeTarget(size);
    this.texel = new Vector2(1 / size, 1 / size);
  }
  swap() {
    const t = this.read;
    this.read = this.write;
    this.write = t;
  }
  dispose() {
    this.read.dispose();
    this.write.dispose();
  }
}

/** `dye` : multiplicateur d'encre du splat (1 par defaut ; les emetteurs
 * lointains en mettent moins, la nappe du fond reste un voile). */
export type FluidSplat = { u: number; v: number; du: number; dv: number; dye?: number };

export type FluidParams = {
  /** Confinement de vorticite : force des tourbillons (les volutes). */
  curl: number;
  /** Taux de dissipation par seconde (vitesse / encre). */
  velocityDissipation: number;
  dyeDissipation: number;
  pressureIterations: number;
  /** Rayon des splats (en uv^2, gaussienne exp(-d^2/r)). */
  emitterRadius: number;
  pointerRadius: number;
  /** Quantite d'encre injectee par emetteur et par seconde. */
  emitterDye: number;
  /** Gain de vitesse des emetteurs (multiplie du/dv des splats). */
  emitterPush: number;
  pointerPush: number;
};

export const DEFAULT_FLUID_PARAMS: FluidParams = {
  // Reglage 02/09 apres premiere capture (nappage blanc qui mangeait le
  // reflet) : peu d'encre, dissipation rapide, sources fines, plus de
  // vorticite : des filets qui s'enroulent, pas une nappe.
  curl: 18,
  velocityDissipation: 0.25,
  dyeDissipation: 0.3,
  pressureIterations: 14,
  emitterRadius: 0.0005,
  pointerRadius: 0.003,
  emitterDye: 1.3,
  emitterPush: 4.0,
  // 0.3 -> 0.7 (02/09) : la souris pousse aussi l'eau, il faut que ca
  // se voie.
  pointerPush: 0.7,
};

export class TezcatlFluidSim {
  private gl: WebGLRenderer;
  private velocity: DoubleFBO;
  private dye: DoubleFBO;
  private pressure: DoubleFBO;
  private curlRT: WebGLRenderTarget;
  private divergenceRT: WebGLRenderTarget;
  private scene = new Scene();
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: Mesh;
  private mat: Record<string, ShaderMaterial>;
  params: FluidParams;

  constructor(gl: WebGLRenderer, simSize = 128, dyeSize = 256, params: FluidParams = DEFAULT_FLUID_PARAMS) {
    this.gl = gl;
    this.params = { ...params };
    this.velocity = new DoubleFBO(simSize);
    this.pressure = new DoubleFBO(simSize);
    this.dye = new DoubleFBO(dyeSize);
    this.curlRT = makeTarget(simSize);
    this.divergenceRT = makeTarget(simSize);
    const make = (fragmentShader: string, uniforms: Record<string, { value: unknown }>) =>
      new ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    const texel = this.velocity.texel;
    this.mat = {
      advect: make(ADVECT, { uVelocity: { value: null }, uSource: { value: null }, uDt: { value: 0 }, uDissipation: { value: 1 } }),
      splat: make(SPLAT, { uTarget: { value: null }, uPoint: { value: new Vector2() }, uColor: { value: new Vector3() }, uRadius: { value: 0.001 } }),
      curl: make(CURL, { uVelocity: { value: null }, uTexel: { value: texel } }),
      vorticity: make(VORTICITY, { uVelocity: { value: null }, uCurl: { value: null }, uTexel: { value: texel }, uStrength: { value: 0 }, uDt: { value: 0 } }),
      divergence: make(DIVERGENCE, { uVelocity: { value: null }, uTexel: { value: texel } }),
      pressure: make(PRESSURE, { uPressure: { value: null }, uDivergence: { value: null }, uTexel: { value: texel } }),
      gradient: make(GRADIENT_SUBTRACT, { uPressure: { value: null }, uVelocity: { value: null }, uTexel: { value: texel } }),
      clear: make(CLEAR, { uTexture: { value: null }, uValue: { value: 0.8 } }),
    };
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.mat.advect);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** L'encre (la fumee), a echantillonner par le materiau d'affichage. */
  get dyeTexture(): Texture {
    return this.dye.read.texture;
  }

  /** Le champ de vitesse (xy), publie pour la deformation "air chaud" du
   * reflet menteur (tezcatl-store.ts). */
  get velocityTexture(): Texture {
    return this.velocity.read.texture;
  }

  /** Le champ de pression (x) : ses fronts dessinent la surface de l'eau
   * et refractent le reflet (tezcatl-store.ts). */
  get pressureTexture(): Texture {
    return this.pressure.read.texture;
  }

  /** 1/resolution de la grille vitesse/pression. */
  get texel(): number {
    return this.velocity.texel.x;
  }

  private blit(target: WebGLRenderTarget, material: ShaderMaterial) {
    this.quad.material = material;
    this.gl.setRenderTarget(target);
    this.gl.render(this.scene, this.camera);
  }

  private splat(fbo: DoubleFBO, u: number, v: number, r: number, g: number, radius: number) {
    const m = this.mat.splat;
    m.uniforms.uTarget.value = fbo.read.texture;
    (m.uniforms.uPoint.value as Vector2).set(u, v);
    (m.uniforms.uColor.value as Vector3).set(r, g, 0);
    m.uniforms.uRadius.value = radius;
    this.blit(fbo.write, m);
    fbo.swap();
  }

  /**
   * Un pas de simulation. `dt` en secondes (deja ralenti par l'appelant si
   * le temps s'epaissit au Nord). Les splats des emetteurs injectent encre
   * ET vitesse, le splat souris seulement de la vitesse.
   */
  step(dt: number, emitters: FluidSplat[], pointer: FluidSplat | null) {
    const gl = this.gl;
    const prevTarget = gl.getRenderTarget();
    const prevAutoClear = gl.autoClear;
    gl.autoClear = false;
    const p = this.params;

    // Forces : emetteurs + souris.
    for (const s of emitters) {
      this.splat(this.velocity, s.u, s.v, s.du * p.emitterPush, s.dv * p.emitterPush, p.emitterRadius);
      this.splat(this.dye, s.u, s.v, p.emitterDye * (s.dye ?? 1) * dt, 0, p.emitterRadius);
    }
    if (pointer) {
      this.splat(this.velocity, pointer.u, pointer.v, pointer.du * p.pointerPush, pointer.dv * p.pointerPush, p.pointerRadius);
    }

    // Vorticite (les volutes).
    this.mat.curl.uniforms.uVelocity.value = this.velocity.read.texture;
    this.blit(this.curlRT, this.mat.curl);
    const vort = this.mat.vorticity;
    vort.uniforms.uVelocity.value = this.velocity.read.texture;
    vort.uniforms.uCurl.value = this.curlRT.texture;
    vort.uniforms.uStrength.value = p.curl;
    vort.uniforms.uDt.value = dt;
    this.blit(this.velocity.write, vort);
    this.velocity.swap();

    // Projection : divergence -> pression -> gradient.
    this.mat.divergence.uniforms.uVelocity.value = this.velocity.read.texture;
    this.blit(this.divergenceRT, this.mat.divergence);
    this.mat.clear.uniforms.uTexture.value = this.pressure.read.texture;
    this.blit(this.pressure.write, this.mat.clear);
    this.pressure.swap();
    const pr = this.mat.pressure;
    pr.uniforms.uDivergence.value = this.divergenceRT.texture;
    for (let i = 0; i < p.pressureIterations; i++) {
      pr.uniforms.uPressure.value = this.pressure.read.texture;
      this.blit(this.pressure.write, pr);
      this.pressure.swap();
    }
    const grad = this.mat.gradient;
    grad.uniforms.uPressure.value = this.pressure.read.texture;
    grad.uniforms.uVelocity.value = this.velocity.read.texture;
    this.blit(this.velocity.write, grad);
    this.velocity.swap();

    // Advection : la vitesse se transporte elle-meme, puis l'encre.
    const adv = this.mat.advect;
    adv.uniforms.uDt.value = dt;
    adv.uniforms.uVelocity.value = this.velocity.read.texture;
    adv.uniforms.uSource.value = this.velocity.read.texture;
    adv.uniforms.uDissipation.value = Math.exp(-p.velocityDissipation * dt);
    this.blit(this.velocity.write, adv);
    this.velocity.swap();
    adv.uniforms.uVelocity.value = this.velocity.read.texture;
    adv.uniforms.uSource.value = this.dye.read.texture;
    adv.uniforms.uDissipation.value = Math.exp(-p.dyeDissipation * dt);
    this.blit(this.dye.write, adv);
    this.dye.swap();

    gl.setRenderTarget(prevTarget);
    gl.autoClear = prevAutoClear;
  }

  dispose() {
    this.velocity.dispose();
    this.dye.dispose();
    this.pressure.dispose();
    this.curlRT.dispose();
    this.divergenceRT.dispose();
    for (const m of Object.values(this.mat)) m.dispose();
    this.quad.geometry.dispose();
  }
}
