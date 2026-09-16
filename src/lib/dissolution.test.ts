import { describe, expect, it } from "vitest";
import { Color, MeshStandardMaterial, type WebGLProgramParametersWithUniforms } from "three";
import { DISSOLUTION, attacherDissolution, seuilDepart } from "./dissolution";

/** Un faux jeu de shaders qui porte les trois points d'accroche de three. */
function faussesSources(): WebGLProgramParametersWithUniforms {
  return {
    vertexShader: "#include <common>\nvoid main(){\n#include <begin_vertex>\n}",
    fragmentShader: "#include <common>\nvoid main(){\n#include <dithering_fragment>\n}",
    uniforms: {},
  } as unknown as WebGLProgramParametersWithUniforms;
}

function compiler(m: MeshStandardMaterial): WebGLProgramParametersWithUniforms {
  const sources = faussesSources();
  m.onBeforeCompile(sources, null as never);
  return sources;
}

describe("seuilDepart (de la presence au seuil du bruit)", () => {
  it("presence pleine : seuil nul, donc rien n'est dissous", () => {
    expect(seuilDepart(1)).toBe(0);
  });

  it("presence nulle : le seuil DEPASSE le bruit maximal, lisere compris", () => {
    // Sinon il resterait une derniere plaque de matiere et un lisere allume
    // au moment ou l'objet est cense etre parti.
    expect(seuilDepart(0)).toBeGreaterThan(1);
  });

  it("ne remonte jamais quand la presence baisse", () => {
    let precedent = seuilDepart(1);
    for (let p = 0.98; p >= 0; p -= 0.02) {
      const s = seuilDepart(p);
      expect(s).toBeGreaterThanOrEqual(precedent);
      precedent = s;
    }
  });

  it("borne les presences aberrantes", () => {
    expect(seuilDepart(1.4)).toBe(seuilDepart(1));
    expect(seuilDepart(-0.3)).toBe(seuilDepart(0));
  });
});

describe("attacherDissolution", () => {
  it("AU REPOS, LE CODE INJECTE NE CONTIENT AUCUN `discard`", () => {
    // C'est tout l'enjeu. La documentation Arm : un fragment shader qui PEUT
    // appeler `discard` empeche le rejet de profondeur anticipe, et sur les
    // GPU a tuiles, c'est-a-dire tous les telephones, l'effet deborde du
    // dessin concerne. Une dissolution toujours presente couterait donc
    // l'Early-Z sur toutes les pages, tout le temps, pour un effet qui joue
    // deux secondes par passage.
    const m = new MeshStandardMaterial();
    attacherDissolution(m, new Color("#ffaa00"));
    const sources = compiler(m);
    expect(sources.fragmentShader).not.toContain("discard");
  });

  it("une fois active, le code porte le seuil et le lisere", () => {
    const m = new MeshStandardMaterial();
    const depart = attacherDissolution(m, new Color("#ffaa00"));
    depart.activer(true);
    const sources = compiler(m);
    expect(sources.fragmentShader).toContain("discard");
    expect(sources.fragmentShader).toContain("uDepartSeuil");
    expect(sources.fragmentShader).toContain("uDepartLisere");
    expect(sources.vertexShader).toContain("vDepartPos");
  });

  it("LA CLE DE PROGRAMME CHANGE AVEC L'ACTIVATION", () => {
    // Sans ca, three reutiliserait le programme deja compile : soit la
    // dissolution ne jouerait jamais, soit le `discard` resterait apres
    // coup. C'est la faute classique de `onBeforeCompile`.
    const m = new MeshStandardMaterial();
    const depart = attacherDissolution(m, new Color("#ffaa00"));
    const auRepos = m.customProgramCacheKey();
    depart.activer(true);
    expect(m.customProgramCacheKey()).not.toBe(auRepos);
  });

  it("ne redemande une compilation QUE si l'etat change vraiment", () => {
    // `needsUpdate` n'a pas de lecteur dans three (Material.js l.1204 :
    // `set needsUpdate( value ) { if ( value === true ) this.version ++ }`).
    // Ce qu'on observe, c'est donc `version`, qui est ce que le rendu lit
    // pour decider de relier un programme.
    const m = new MeshStandardMaterial();
    const depart = attacherDissolution(m, new Color("#ffaa00"));
    const depart0 = m.version;
    depart.activer(false);
    expect(m.version).toBe(depart0);
    depart.activer(true);
    expect(m.version).toBe(depart0 + 1);
    depart.activer(true);
    expect(m.version).toBe(depart0 + 1);
    depart.activer(false);
    expect(m.version).toBe(depart0 + 2);
  });

  it("IDEMPOTENT : attacher deux fois n'injecte pas deux fois", () => {
    // Un composant qui re-attache a chaque rendu doublerait le `discard` et
    // la declaration du bruit : le shader ne compilerait meme plus.
    const m = new MeshStandardMaterial();
    const a = attacherDissolution(m, new Color("#ffaa00"));
    const b = attacherDissolution(m, new Color("#ffaa00"));
    expect(b).toBe(a);
    a.activer(true);
    const sources = compiler(m);
    expect(sources.fragmentShader.split("discard").length - 1).toBe(1);
    expect(sources.fragmentShader.split("float bruitDepart").length - 1).toBe(1);
  });

  it("expose ses uniformes au shader, et ils partent a zero", () => {
    const m = new MeshStandardMaterial();
    const depart = attacherDissolution(m, new Color("#ffaa00"));
    depart.activer(true);
    const sources = compiler(m);
    expect(sources.uniforms.uDepartSeuil.value).toBe(0);
    expect(sources.uniforms.uDepartLisere.value).toBe(DISSOLUTION.lisere);
    expect(depart.seuil.value).toBe(0);
  });

  it("le seuil ecrit par le composant arrive dans l'uniforme partage", () => {
    const m = new MeshStandardMaterial();
    const depart = attacherDissolution(m, new Color("#ffaa00"));
    depart.activer(true);
    const sources = compiler(m);
    depart.seuil.value = seuilDepart(0.4);
    expect(sources.uniforms.uDepartSeuil.value).toBeCloseTo(seuilDepart(0.4), 6);
  });

  it("garde l'ancien onBeforeCompile du materiau, s'il en avait un", () => {
    // Nos materiaux sont deja injectes (xiuhcoatl, reflet...). Ecraser leur
    // onBeforeCompile les casserait en silence.
    const m = new MeshStandardMaterial();
    let vu = false;
    m.onBeforeCompile = () => {
      vu = true;
    };
    const depart = attacherDissolution(m, new Color("#ffaa00"));
    depart.activer(true);
    compiler(m);
    expect(vu).toBe(true);
  });
});
