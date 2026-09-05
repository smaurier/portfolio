import { Vector2, type Texture } from "three";
import type { Renderer } from "three/webgpu";
import { Fn, float, vec2, vec4, uv, dot, exp, abs, max, clamp, smoothstep } from "three/tsl";
import { Blitter, PingPong, definePass } from "./gpgpu";
import { DEFAULT_RIPPLE_PARAMS, type RippleDrop, type RippleHull, type RippleParams, type RippleSim } from "../tezcatl-ripple-sim";

/**
 * La nappe d'eau du tezcatl en TSL (05/09, migration WebGPU) : le meme
 * schema d'onde (hauteur en x, hauteur precedente en y) que
 * tezcatl-ripple-sim.ts, en trois passes : coques (dipole proue/poupe),
 * gouttes, propagation amortie a bords absorbants.
 */

export class TezcatlRippleSimTsl implements RippleSim {
  private state: PingPong;
  private blitter: Blitter;
  private propagate;
  private drop;
  private hull;
  readonly texel: number;
  params: RippleParams;

  constructor(renderer: Renderer, size = 256, params: RippleParams = DEFAULT_RIPPLE_PARAMS) {
    this.params = { ...params };
    this.texel = 1 / size;
    this.state = new PingPong(size);
    this.blitter = new Blitter(renderer);
    const texel = new Vector2(this.texel, this.texel);

    this.propagate = definePass({ textures: ["uState"], floats: { uDamping: 0.985, uSpeed: 0.2 }, vec2s: { uTexel: texel } }, ({ tex, f, v2 }) =>
      Fn(() => {
        const p = uv();
        const s = tex.uState.sample(p).xy;
        const L = tex.uState.sample(p.sub(vec2(v2.uTexel.x, 0))).x;
        const R = tex.uState.sample(p.add(vec2(v2.uTexel.x, 0))).x;
        const T = tex.uState.sample(p.add(vec2(0, v2.uTexel.y))).x;
        const B = tex.uState.sample(p.sub(vec2(0, v2.uTexel.y))).x;
        const lap = L.add(R).add(T).add(B).sub(s.x.mul(4));
        const next = s.x.mul(2).sub(s.y).add(f.uSpeed.mul(lap)).mul(f.uDamping).toVar();
        // Bords absorbants : l'onde meurt en approchant du bord de la grille.
        const d = max(abs(p.x.sub(0.5)), abs(p.y.sub(0.5))).mul(2);
        next.mulAssign(float(1).sub(smoothstep(0.9, 1, d)));
        return vec4(next, s.x, 0, 1);
      })()
    );
    this.drop = definePass({ textures: ["uState"], floats: { uRadius: 0.0003, uAmount: 0 }, vec2s: { uPoint: new Vector2() } }, ({ tex, f, v2 }) =>
      Fn(() => {
        const p = uv();
        const s = tex.uState.sample(p).xy;
        const q = p.sub(v2.uPoint);
        const g = exp(dot(q, q).div(f.uRadius).negate());
        return vec4(s.x.add(g.mul(f.uAmount)), s.y, 0, 1);
      })()
    );
    this.hull = definePass({ textures: ["uState"], floats: { uLen: 0.03, uWidth: 0.01, uAmount: 0 }, vec2s: { uPoint: new Vector2(), uDir: new Vector2(1, 0) } }, ({ tex, f, v2 }) =>
      Fn(() => {
        const p = uv();
        const s = tex.uState.sample(p).xy;
        const q = p.sub(v2.uPoint);
        const along = dot(q, v2.uDir);
        const across = q.x.mul(v2.uDir.y).sub(q.y.mul(v2.uDir.x));
        const g = exp(along.mul(along).div(f.uLen.mul(f.uLen)).add(across.mul(across).div(f.uWidth.mul(f.uWidth))).negate());
        // Dipole : positif devant (along > 0), negatif derriere.
        const dipole = clamp(along.div(f.uLen), -1, 1);
        return vec4(s.x.add(g.mul(dipole).mul(f.uAmount)), s.y, 0, 1);
      })()
    );
  }

  get heightTexture(): Texture {
    return this.state.read.texture;
  }

  private blit(pass: { material: import("three/webgpu").NodeMaterial; tex: { uState: { value: Texture } } }): void {
    pass.tex.uState.value = this.state.read.texture;
    this.blitter.blit(this.state.write, pass.material);
    this.state.swap();
  }

  step(drops: RippleDrop[], substeps = 1, hulls: RippleHull[] = []): void {
    this.blitter.run(() => {
      for (const h of hulls) {
        this.hull.v2.uPoint.value.set(h.u, h.v);
        this.hull.v2.uDir.value.set(h.du, h.dv);
        this.hull.f.uLen.value = h.len;
        this.hull.f.uWidth.value = h.width;
        this.hull.f.uAmount.value = h.amount;
        this.blit(this.hull);
      }
      for (const d of drops) {
        this.drop.v2.uPoint.value.set(d.u, d.v);
        this.drop.f.uRadius.value = this.params.dropRadius;
        this.drop.f.uAmount.value = d.amount;
        this.blit(this.drop);
      }
      this.propagate.f.uDamping.value = this.params.damping;
      this.propagate.f.uSpeed.value = this.params.speed;
      for (let i = 0; i < substeps; i++) this.blit(this.propagate);
    });
  }

  dispose(): void {
    this.state.dispose();
    this.propagate.material.dispose();
    this.drop.material.dispose();
    this.hull.material.dispose();
    this.blitter.dispose();
  }
}
