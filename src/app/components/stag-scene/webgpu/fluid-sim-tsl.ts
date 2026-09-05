import { Vector2, Vector3, type RenderTarget, type Texture } from "three";
import type { Node, NodeMaterial, Renderer, TextureNode } from "three/webgpu";
import { Fn, float, vec2, vec4, uv, dot, exp, abs, max, length, clamp, smoothstep } from "three/tsl";
import { Blitter, PingPong, definePass, makeSimTarget } from "./gpgpu";
import { DEFAULT_FLUID_PARAMS, type FluidParams, type FluidSim, type FluidSplat } from "../mictlan-fluid-sim";

/**
 * Le fluide du tezcatl en TSL (05/09, migration WebGPU) : le solveur de
 * Stam de mictlan-fluid-sim.ts (splat, vorticite, projection, advection)
 * en passes plein ecran, memes parametres et meme API.
 */

/** Le voisinage en croix d'une texture. */
const cross = (tex: TextureNode, p: Node<"vec2">, texel: Node<"vec2">) => ({
  L: tex.sample(p.sub(vec2(texel.x, 0))),
  R: tex.sample(p.add(vec2(texel.x, 0))),
  T: tex.sample(p.add(vec2(0, texel.y))),
  B: tex.sample(p.sub(vec2(0, texel.y))),
});

export class TezcatlFluidSimTsl implements FluidSim {
  private velocity: PingPong;
  private dye: PingPong;
  private pressure: PingPong;
  private curlRT: RenderTarget;
  private divergenceRT: RenderTarget;
  private blitter: Blitter;
  private advect;
  private splatPass;
  private curl;
  private vorticity;
  private divergence;
  private pressurePass;
  private gradient;
  private clear;
  params: FluidParams;

  constructor(renderer: Renderer, simSize = 128, dyeSize = 256, params: FluidParams = DEFAULT_FLUID_PARAMS) {
    this.params = { ...params };
    this.velocity = new PingPong(simSize);
    this.pressure = new PingPong(simSize);
    this.dye = new PingPong(dyeSize);
    this.curlRT = makeSimTarget(simSize);
    this.divergenceRT = makeSimTarget(simSize);
    this.blitter = new Blitter(renderer);
    const texel = this.velocity.texel;

    this.advect = definePass({ textures: ["uVelocity", "uSource"], floats: { uDt: 0, uDissipation: 1 } }, ({ tex, f }) =>
      Fn(() => {
        const p = uv();
        const coord = p.sub(tex.uVelocity.sample(p).xy.mul(f.uDt));
        return tex.uSource.sample(coord).mul(f.uDissipation);
      })()
    );
    this.splatPass = definePass({ textures: ["uTarget"], floats: { uRadius: 0.001 }, vec2s: { uPoint: new Vector2() }, vec3s: { uColor: new Vector3() } }, ({ tex, f, v2, v3 }) =>
      Fn(() => {
        const p = uv();
        const q = p.sub(v2.uPoint);
        const g = exp(dot(q, q).div(f.uRadius).negate());
        const base = tex.uTarget.sample(p).xyz;
        return vec4(base.add(v3.uColor.mul(g)), 1);
      })()
    );
    this.curl = definePass({ textures: ["uVelocity"], vec2s: { uTexel: texel } }, ({ tex, v2 }) =>
      Fn(() => {
        const n = cross(tex.uVelocity, uv(), v2.uTexel);
        return vec4(n.R.y.sub(n.L.y).sub(n.T.x).add(n.B.x).mul(0.5), 0, 0, 1);
      })()
    );
    this.vorticity = definePass({ textures: ["uVelocity", "uCurl"], floats: { uStrength: 0, uDt: 0 }, vec2s: { uTexel: texel } }, ({ tex, f, v2 }) =>
      Fn(() => {
        const p = uv();
        const n = cross(tex.uCurl, p, v2.uTexel);
        const C = tex.uCurl.sample(p).x;
        const force = vec2(abs(n.T.x).sub(abs(n.B.x)), abs(n.R.x).sub(abs(n.L.x))).mul(0.5).toVar();
        force.divAssign(length(force).add(0.0001));
        force.mulAssign(f.uStrength.mul(C));
        force.y.mulAssign(-1);
        const vel = tex.uVelocity.sample(p).xy.add(force.mul(f.uDt));
        return vec4(clamp(vel, -10, 10), 0, 1);
      })()
    );
    this.divergence = definePass({ textures: ["uVelocity"], vec2s: { uTexel: texel } }, ({ tex, v2 }) =>
      Fn(() => {
        const n = cross(tex.uVelocity, uv(), v2.uTexel);
        return vec4(n.R.x.sub(n.L.x).add(n.T.y).sub(n.B.y).mul(0.5), 0, 0, 1);
      })()
    );
    this.pressurePass = definePass({ textures: ["uPressure", "uDivergence"], vec2s: { uTexel: texel } }, ({ tex, v2 }) =>
      Fn(() => {
        const p = uv();
        const n = cross(tex.uPressure, p, v2.uTexel);
        const div = tex.uDivergence.sample(p).x;
        return vec4(n.L.x.add(n.R.x).add(n.B.x).add(n.T.x).sub(div).mul(0.25), 0, 0, 1);
      })()
    );
    this.gradient = definePass({ textures: ["uPressure", "uVelocity"], vec2s: { uTexel: texel } }, ({ tex, v2 }) =>
      Fn(() => {
        const p = uv();
        const n = cross(tex.uPressure, p, v2.uTexel);
        const vel = tex.uVelocity.sample(p).xy.sub(vec2(n.R.x.sub(n.L.x), n.T.x.sub(n.B.x))).toVar();
        // Contention dans le disque : la fumee ne sort pas du miroir.
        const d = max(abs(p.x.sub(0.5)), abs(p.y.sub(0.5))).mul(2);
        vel.mulAssign(float(1).sub(smoothstep(0.86, 1, d)));
        return vec4(vel, 0, 1);
      })()
    );
    this.clear = definePass({ textures: ["uTexture"], floats: { uValue: 0.8 } }, ({ tex, f }) => tex.uTexture.sample(uv()).mul(f.uValue));
  }

  get dyeTexture(): Texture {
    return this.dye.read.texture;
  }
  get velocityTexture(): Texture {
    return this.velocity.read.texture;
  }
  get pressureTexture(): Texture {
    return this.pressure.read.texture;
  }
  get texel(): number {
    return this.velocity.texel.x;
  }

  private blit(target: RenderTarget, material: NodeMaterial): void {
    this.blitter.blit(target, material);
  }

  private splat(fbo: PingPong, u: number, v: number, r: number, g: number, radius: number): void {
    const m = this.splatPass;
    m.tex.uTarget.value = fbo.read.texture;
    m.v2.uPoint.value.set(u, v);
    m.v3.uColor.value.set(r, g, 0);
    m.f.uRadius.value = radius;
    this.blit(fbo.write, m.material);
    fbo.swap();
  }

  step(dt: number, emitters: FluidSplat[], pointer: FluidSplat | null): void {
    const p = this.params;
    this.blitter.run(() => {
      // Forces : emetteurs + souris.
      for (const s of emitters) {
        this.splat(this.velocity, s.u, s.v, s.du * p.emitterPush, s.dv * p.emitterPush, p.emitterRadius);
        this.splat(this.dye, s.u, s.v, p.emitterDye * (s.dye ?? 1) * dt, 0, p.emitterRadius);
      }
      if (pointer) this.splat(this.velocity, pointer.u, pointer.v, pointer.du * p.pointerPush, pointer.dv * p.pointerPush, p.pointerRadius);

      // Vorticite (les volutes).
      this.curl.tex.uVelocity.value = this.velocity.read.texture;
      this.blit(this.curlRT, this.curl.material);
      this.vorticity.tex.uVelocity.value = this.velocity.read.texture;
      this.vorticity.tex.uCurl.value = this.curlRT.texture;
      this.vorticity.f.uStrength.value = p.curl;
      this.vorticity.f.uDt.value = dt;
      this.blit(this.velocity.write, this.vorticity.material);
      this.velocity.swap();

      // Projection : divergence -> pression -> gradient.
      this.divergence.tex.uVelocity.value = this.velocity.read.texture;
      this.blit(this.divergenceRT, this.divergence.material);
      this.clear.tex.uTexture.value = this.pressure.read.texture;
      this.blit(this.pressure.write, this.clear.material);
      this.pressure.swap();
      this.pressurePass.tex.uDivergence.value = this.divergenceRT.texture;
      for (let i = 0; i < p.pressureIterations; i++) {
        this.pressurePass.tex.uPressure.value = this.pressure.read.texture;
        this.blit(this.pressure.write, this.pressurePass.material);
        this.pressure.swap();
      }
      this.gradient.tex.uPressure.value = this.pressure.read.texture;
      this.gradient.tex.uVelocity.value = this.velocity.read.texture;
      this.blit(this.velocity.write, this.gradient.material);
      this.velocity.swap();

      // Advection : la vitesse se transporte elle-meme, puis l'encre.
      this.advect.f.uDt.value = dt;
      this.advect.tex.uVelocity.value = this.velocity.read.texture;
      this.advect.tex.uSource.value = this.velocity.read.texture;
      this.advect.f.uDissipation.value = Math.exp(-p.velocityDissipation * dt);
      this.blit(this.velocity.write, this.advect.material);
      this.velocity.swap();
      this.advect.tex.uVelocity.value = this.velocity.read.texture;
      this.advect.tex.uSource.value = this.dye.read.texture;
      this.advect.f.uDissipation.value = Math.exp(-p.dyeDissipation * dt);
      this.blit(this.dye.write, this.advect.material);
      this.dye.swap();
    });
  }

  dispose(): void {
    this.velocity.dispose();
    this.dye.dispose();
    this.pressure.dispose();
    this.curlRT.dispose();
    this.divergenceRT.dispose();
    for (const pass of [this.advect, this.splatPass, this.curl, this.vorticity, this.divergence, this.pressurePass, this.gradient, this.clear]) pass.material.dispose();
    this.blitter.dispose();
  }
}
