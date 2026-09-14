import { describe, expect, it } from "vitest";
import { AMATE_GRAIN_OPTIONS, amatePattern, bakeAmate, bakeAmateGrain, bakeAmateGrainRows, bakeAmateGrainSeamless, bakeObsidianPolish, bakeObsidianPolishRows, bakeObsidianPolishSeamless, fadeToPaper } from "./amate-texture";

const NO_SPATTER = { spatters: 0, fray: 0.12 };

function mean(values: number[]) {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

describe("amatePattern (le papier d'ecorce, pas une feuille blanche)", () => {
  it("deterministe par graine", () => {
    expect(amatePattern(0.3, 0.5, 4)).toEqual(amatePattern(0.3, 0.5, 4));
    expect(amatePattern(0.3, 0.5, 4)).not.toEqual(amatePattern(0.3, 0.5, 5));
  });

  it("jamais blanc : creme-ocre tirant vers le brun, rouge > vert > bleu", () => {
    let whiteish = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      const px = amatePattern((i % 20) / 20 + 0.025, Math.floor(i / 20) / 20 + 0.025, 1, NO_SPATTER);
      expect(px.r).toBeGreaterThan(px.g);
      expect(px.g).toBeGreaterThan(px.b);
      if (px.r > 0.95 && px.g > 0.95 && px.b > 0.9) whiteish += 1;
    }
    expect(whiteish).toBe(0);
  });

  it("strie dans le sens des fibres : varie bien plus en travers (v) que le long (u)", () => {
    const alongU: number[] = [];
    const acrossV: number[] = [];
    for (let i = 0; i < 200; i++) {
      const t = i / 200;
      alongU.push(amatePattern(t, 0.5, 2, NO_SPATTER).r);
      acrossV.push(amatePattern(0.5, 0.2 + t * 0.6, 2, NO_SPATTER).r);
    }
    const roughness = (s: number[]) => mean(s.slice(1).map((v, i) => Math.abs(v - s[i])));
    expect(roughness(acrossV)).toBeGreaterThan(roughness(alongU) * 1.5);
  });

  it("le hule : des gouttes presque noires, absentes du papier nu", () => {
    const dark = (opts: { spatters: number; fray: number }) => {
      let n = 0;
      for (let y = 0; y < 40; y++) for (let x = 0; x < 120; x++) {
        const px = amatePattern((x + 0.5) / 120, (y + 0.5) / 40, 3, opts);
        if (px.r < 0.2 && px.g < 0.2) n += 1;
      }
      return n;
    };
    expect(dark(NO_SPATTER)).toBe(0);
    const withRubber = dark({ spatters: 7, fray: 0.12 });
    expect(withRubber).toBeGreaterThan(20);
    expect(withRubber).toBeLessThan(120 * 40 * 0.25);
  });

  it("bords effiloches : opaque au milieu, dechire pres des bords et au bout libre", () => {
    expect(amatePattern(0.4, 0.5, 6).a).toBeCloseTo(1, 6);
    expect(amatePattern(0.4, 0.005, 6).a).toBeLessThan(0.3);
    expect(amatePattern(0.4, 0.995, 6).a).toBeLessThan(0.3);
    expect(amatePattern(0.998, 0.5, 6).a).toBeLessThan(0.3);
    // Le bord n'est pas une ligne droite : l'alpha a une meme distance du
    // bord varie le long de la bande.
    const edge = Array.from({ length: 50 }, (_, i) => amatePattern(i / 50, 0.06, 6).a);
    expect(Math.max(...edge) - Math.min(...edge)).toBeGreaterThan(0.2);
  });

  it("bakeAmate : tampon RGBA de la bonne taille, alpha plein au centre", () => {
    const w = 64, h = 16;
    const data = bakeAmate(w, h, 9);
    expect(data.length).toBe(w * h * 4);
    const o = ((h >> 1) * w + (w >> 2)) * 4;
    expect(data[o + 3]).toBe(255);
    expect(data[o]).toBeGreaterThan(data[o + 2]);
  });
});

describe("le grain de la face claire : le papier sans ses bords", () => {
  it("est opaque partout : une tuile repetee n'a pas de couture", () => {
    const size = 24;
    const data = bakeAmateGrain(size, 3);
    expect(data).toHaveLength(size * size * 4);
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255);
  });

  it("garde le ton creme-ocre du papier, sans goutte de caoutchouc", () => {
    expect(AMATE_GRAIN_OPTIONS.spatters).toBe(0);
    expect(AMATE_GRAIN_OPTIONS.fray).toBe(0);
    const size = 32;
    const data = bakeAmateGrain(size, 5);
    let min = 255;
    let somme = 0;
    for (let i = 0; i < data.length; i += 4) {
      min = Math.min(min, data[i]);
      somme += data[i];
    }
    const moyenne = somme / (size * size);
    // Creme : la moyenne du rouge est haute, et rien ne tombe dans le noir
    // (une goutte de hule descendrait sous 40).
    expect(moyenne).toBeGreaterThan(170);
    expect(min).toBeGreaterThan(60);
  });

  it("varie : ce n'est pas un aplat", () => {
    const size = 32;
    const data = bakeAmateGrain(size, 7);
    const rouges = [];
    for (let i = 0; i < data.length; i += 4) rouges.push(data[i]);
    const moyenne = rouges.reduce((a, b) => a + b, 0) / rouges.length;
    const ecart = Math.sqrt(rouges.reduce((a, b) => a + (b - moyenne) ** 2, 0) / rouges.length);
    expect(ecart).toBeGreaterThan(3);
  });

  it("deterministe : la meme graine rend le meme papier", () => {
    expect(bakeAmateGrain(16, 2)).toEqual(bakeAmateGrain(16, 2));
    expect(bakeAmateGrain(16, 2)).not.toEqual(bakeAmateGrain(16, 9));
  });
});

describe("le papier sans couture : la tuile se repete sans se trahir", () => {
  const size = 64;

  function moyenneColonne(data: Uint8Array, x: number): number {
    let somme = 0;
    for (let y = 0; y < size; y++) somme += data[(y * size + x) * 4];
    return somme / size;
  }
  function moyenneLigne(data: Uint8Array, y: number): number {
    let somme = 0;
    for (let x = 0; x < size; x++) somme += data[(y * size + x) * 4];
    return somme / size;
  }

  /** Ce qui fait voir une couture : la difference de NIVEAU entre les deux
   * bords qui se touchent, pas le grain fin qui, lui, est partout. */
  function marcheVerticale(data: Uint8Array): number {
    return Math.abs(moyenneColonne(data, 0) - moyenneColonne(data, size - 1));
  }
  function marcheHorizontale(data: Uint8Array): number {
    return Math.abs(moyenneLigne(data, 0) - moyenneLigne(data, size - 1));
  }
  /** Le pas de niveau ordinaire entre deux colonnes voisines, au milieu. */
  function pasOrdinaire(data: Uint8Array): number {
    return Math.abs(moyenneColonne(data, 20) - moyenneColonne(data, 21));
  }

  it("la jointure ne fait plus de marche", () => {
    const brut = bakeAmateGrain(size, 4);
    const lisse = bakeAmateGrainSeamless(size, 4);
    // Le motif n'est pas periodique : brut, les deux bords ne sont pas au
    // meme niveau, et c'est ce que l'oeil voit comme une grille.
    expect(marcheVerticale(brut)).toBeGreaterThan(pasOrdinaire(brut) * 2);
    // Apres, les bords viennent de deux colonnes voisines du motif.
    expect(marcheVerticale(lisse)).toBeLessThanOrEqual(pasOrdinaire(lisse) * 1.5 + 0.5);
    expect(marcheHorizontale(lisse)).toBeLessThanOrEqual(pasOrdinaire(lisse) * 3 + 1);
  });

  it("reste du papier : opaque, creme, et varie", () => {
    const data = bakeAmateGrainSeamless(size, 4);
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255);
    let somme = 0;
    for (let i = 0; i < data.length; i += 4) somme += data[i];
    expect(somme / (size * size)).toBeGreaterThan(170);
    let ecart = 0;
    for (let y = 0; y < size; y++) ecart += Math.abs(data[(y * size + 20) * 4] - data[(y * size + 21) * 4]);
    expect(ecart / size).toBeGreaterThan(0.3);
  });

  it("deterministe", () => {
    expect(bakeAmateGrainSeamless(32, 6)).toEqual(bakeAmateGrainSeamless(32, 6));
  });
});

describe("la feuille posee sur la feuille", () => {
  const brut = bakeAmateGrainSeamless(32, 8);

  function ecart(d: Uint8Array): number {
    let somme = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) { somme += d[i]; n++; }
    const moy = somme / n;
    let v = 0;
    for (let i = 0; i < d.length; i += 4) v += (d[i] - moy) ** 2;
    return Math.sqrt(v / n);
  }

  it("k = 0 ne change rien, k = 1 rend une feuille blanche", () => {
    expect(fadeToPaper(brut, 0)).toEqual(brut);
    const blanc = fadeToPaper(brut, 1);
    for (let i = 0; i < blanc.length; i += 4) expect(blanc[i]).toBe(255);
  });

  it("la seconde feuille est plus claire, et sa fibre plus discrete", () => {
    const doux = fadeToPaper(brut, 0.72);
    let sombre = 0;
    let clair = 0;
    for (let i = 0; i < brut.length; i += 4) { sombre += brut[i]; clair += doux[i]; }
    expect(clair).toBeGreaterThan(sombre);
    expect(ecart(doux)).toBeLessThan(ecart(brut));
    expect(ecart(doux)).toBeGreaterThan(0);
  });

  it("l'opacite ne bouge pas : c'est du papier, pas un voile", () => {
    const doux = fadeToPaper(brut, 0.5);
    for (let i = 3; i < doux.length; i += 4) expect(doux[i]).toBe(255);
  });
});

describe("l'obsidienne polie : le pendant du papier, pour la nuit", () => {
  const size = 48;

  function moyenne(d: Uint8Array): number {
    let somme = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) { somme += d[i]; n++; }
    return somme / n;
  }

  it("est presque noire : elle fait glisser une lumiere, elle n'eclaire pas", () => {
    const d = bakeObsidianPolish(size, 2);
    expect(moyenne(d)).toBeLessThan(46);
    let max = 0;
    for (let i = 0; i < d.length; i += 4) max = Math.max(max, d[i]);
    expect(max).toBeLessThan(90);
  });

  it("est violette comme l'obsidienne du site : le bleu domine le rouge", () => {
    const d = bakeObsidianPolish(size, 2);
    let r = 0;
    let b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; b += d[i + 2]; }
    expect(b).toBeGreaterThan(r);
  });

  it("porte de vraies nappes : l'ecart vertical est net", () => {
    const d = bakeObsidianPolish(size, 2);
    let ecart = 0;
    for (let y = 0; y < size; y++) ecart += Math.abs(d[(y * size + 10) * 4] - d[(y * size + 11) * 4]);
    expect(ecart / size).toBeGreaterThan(0.2);
  });

  it("opaque, deterministe, et sans couture une fois passee par le rendu", () => {
    const d = bakeObsidianPolishSeamless(size, 5);
    for (let i = 3; i < d.length; i += 4) expect(d[i]).toBe(255);
    expect(bakeObsidianPolishSeamless(size, 5)).toEqual(d);
    const colonne = (x: number) => { let s2 = 0; for (let y = 0; y < size; y++) s2 += d[(y * size + x) * 4]; return s2 / size; };
    const marche = Math.abs(colonne(0) - colonne(size - 1));
    const pas = Math.abs(colonne(12) - colonne(13));
    expect(marche).toBeLessThanOrEqual(pas * 1.5 + 1);
  });
});

describe("bakeAmateGrainRows (cuire le papier par tranches)", () => {
  it("rend exactement la meme matiere qu'une cuisson d'un bloc", () => {
    // L'oracle qui compte : on decoupe pour ne pas bloquer le fil
    // principal (mesure du 14/09 : 349 ms sur un Pixel 7 au processeur
    // divise par quatre). Si le decoupage changeait un seul octet, ce ne
    // serait plus la meme matiere, et c'est la matiere qu'on garde.
    const taille = 64;
    const graine = 11;
    const attendu = bakeAmateGrain(taille, graine);

    const parTranches = new Uint8Array(taille * taille * 4);
    // Des tranches INEGALES, pour qu'un decoupage regulier ne masque pas un
    // hors-bord : 0-7, 7-40, 40-63, 63-64.
    for (const [a, b] of [[0, 7], [7, 40], [40, 63], [63, 64]]) {
      bakeAmateGrainRows(parTranches, taille, graine, a, b);
    }
    expect(parTranches).toEqual(attendu);
  });

  it("ne touche a rien hors de sa tranche", () => {
    const taille = 16;
    const out = new Uint8Array(taille * taille * 4).fill(7);
    bakeAmateGrainRows(out, taille, 3, 4, 6);
    // Avant la tranche, et apres, tout est reste tel quel.
    for (const y of [0, 3, 6, 15]) {
      expect(out[(y * taille + 0) * 4], `ligne ${y} intacte`).toBe(7);
    }
    // Dans la tranche, l'alpha a ete pose.
    for (const y of [4, 5]) {
      expect(out[(y * taille + 0) * 4 + 3], `ligne ${y} cuite`).toBe(255);
    }
  });

  it("borne les tranches hors limites plutot que de deborder", () => {
    const taille = 8;
    const out = new Uint8Array(taille * taille * 4);
    expect(() => bakeAmateGrainRows(out, taille, 1, -5, 999)).not.toThrow();
    expect(out[out.length - 1]).toBe(255);
  });
});

describe("bakeObsidianPolishRows (le poli par tranches)", () => {
  it("rend exactement le meme poli qu'une cuisson d'un bloc", () => {
    const taille = 64;
    const graine = 15;
    const attendu = bakeObsidianPolish(taille, graine);
    const parTranches = new Uint8Array(taille * taille * 4);
    for (const [a, b] of [[0, 9], [9, 33], [33, 64]]) {
      bakeObsidianPolishRows(parTranches, taille, graine, a, b);
    }
    expect(parTranches).toEqual(attendu);
  });
});
