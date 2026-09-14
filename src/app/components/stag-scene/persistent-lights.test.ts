import { describe, expect, it, vi } from "vitest";
import type { DirectionalLight, WebGLRenderer } from "three";
import { freezeShadow, thawShadow } from "./persistent-lights";

/**
 * LE GEL D'UNE OMBRE (14/09). Oracle ecrit apres avoir reproduit, en
 * production et a densite 2, le defaut ouvert depuis l'audit : le sol,
 * l'herbe, les montagnes et le cerf disparaissaient apres un saut de
 * defilement, le pilote refusant le tracé (« mismatch between texture
 * format and sampler type (shadow) »).
 *
 * La cause tient en trois lignes : geler coupait le rendu de profondeur EN
 * ATTENTE avant de regarder si la carte existait. Quand elle n'existait pas
 * encore, elle n'etait donc jamais creee, et les materiaux compiles avec
 * ombres echantillonnaient une carte absente.
 */
function fausseLumiere(avecCarte: boolean) {
  return {
    shadow: {
      autoUpdate: true,
      needsUpdate: false,
      map: avecCarte ? ({ isWebGLRenderTarget: true } as unknown) : null,
    },
  } as unknown as DirectionalLight;
}

function fauxRenderer() {
  const cible: unknown[] = [];
  return {
    gl: {
      getRenderTarget: () => null,
      setRenderTarget: (t: unknown) => cible.push(t),
      clear: vi.fn(),
    } as unknown as WebGLRenderer,
    cible,
  };
}

describe("geler une ombre", () => {
  it("sans carte : ne gele RIEN et reclame le rendu de profondeur", () => {
    const light = fausseLumiere(false);
    const { gl, cible } = fauxRenderer();
    expect(freezeShadow(gl, light)).toBe(false);
    // Ce qui manquait : la passe reste demandee, et surtout elle n'est pas annulee.
    expect(light.shadow.needsUpdate).toBe(true);
    expect(light.shadow.autoUpdate).toBe(true);
    expect(cible).toHaveLength(0);
  });

  it("avec carte : gele, vide la carte, et rend la cible precedente", () => {
    const light = fausseLumiere(true);
    const { gl, cible } = fauxRenderer();
    expect(freezeShadow(gl, light)).toBe(true);
    expect(light.shadow.autoUpdate).toBe(false);
    expect(light.shadow.needsUpdate).toBe(false);
    expect(cible).toHaveLength(2);
    expect(cible[0]).toBe(light.shadow.map);
    expect(cible[1]).toBeNull();
  });

  it("degeler rend la passe de profondeur a chaque image", () => {
    const light = fausseLumiere(true);
    light.shadow.autoUpdate = false;
    thawShadow(light);
    expect(light.shadow.autoUpdate).toBe(true);
  });
});
