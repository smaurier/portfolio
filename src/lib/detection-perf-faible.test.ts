import { describe, expect, it } from "vitest";
import { appareilFaible, tauxImagesEnRetard, REGLES_PAR_DEFAUT } from "./detection-perf-faible";

describe("tauxImagesEnRetard", () => {
  it("un tableau vide ne compte rien", () => {
    expect(tauxImagesEnRetard([], 33.3)).toBe(0);
  });

  it("toutes les images dans le budget : 0", () => {
    expect(tauxImagesEnRetard(Array(30).fill(16.7), 33.3)).toBe(0);
  });

  it("toutes les images en retard : 1", () => {
    expect(tauxImagesEnRetard(Array(30).fill(50), 33.3)).toBe(1);
  });

  it("mi-figue mi-raisin : la fraction exacte", () => {
    const deltas = [...Array(10).fill(16.7), ...Array(10).fill(50)];
    expect(tauxImagesEnRetard(deltas, 33.3)).toBeCloseTo(0.5, 5);
  });
});

describe("appareilFaible", () => {
  it("pas assez d'images mesurees : jamais faible, meme si toutes lentes", () => {
    const deltas = [...Array(REGLES_PAR_DEFAUT.imagesIgnorees).fill(16.7), ...Array(10).fill(200)];
    expect(appareilFaible(deltas)).toBe(false);
  });

  it("appareil sain : 60 images regulieres a 16,7 ms, jamais faible", () => {
    const deltas = Array(REGLES_PAR_DEFAUT.imagesIgnorees + 60).fill(16.7);
    expect(appareilFaible(deltas)).toBe(false);
  });

  it("appareil clairement faible : images a 50 ms de facon soutenue", () => {
    const deltas = Array(REGLES_PAR_DEFAUT.imagesIgnorees + 60).fill(50);
    expect(appareilFaible(deltas)).toBe(true);
  });

  it("le demarrage lent (compilation des shaders) n'est pas un signal : ignore seulement si au debut", () => {
    const demarrageLent = Array(REGLES_PAR_DEFAUT.imagesIgnorees).fill(300);
    const regimeStable = Array(60).fill(16.7);
    expect(appareilFaible([...demarrageLent, ...regimeStable])).toBe(false);
  });

  it("scenario realiste (telephone d'une amie) : alternance de bonnes et de tres mauvaises images", () => {
    const ignorees = Array(REGLES_PAR_DEFAUT.imagesIgnorees).fill(300);
    const regime: number[] = [];
    for (let i = 0; i < 80; i++) regime.push(i % 2 === 0 ? 18 : 90);
    expect(appareilFaible([...ignorees, ...regime])).toBe(true);
  });

  it("frontiere : juste sous le taux de declenchement, ne bascule pas", () => {
    // 39 % en retard (< 40 % par defaut)
    const n = 100;
    const lentes = 39;
    const regime = [...Array(lentes).fill(50), ...Array(n - lentes).fill(16.7)];
    expect(appareilFaible([...Array(REGLES_PAR_DEFAUT.imagesIgnorees).fill(16.7), ...regime])).toBe(false);
  });

  it("frontiere : au taux de declenchement, bascule", () => {
    const n = 100;
    const lentes = 40;
    const regime = [...Array(lentes).fill(50), ...Array(n - lentes).fill(16.7)];
    expect(appareilFaible([...Array(REGLES_PAR_DEFAUT.imagesIgnorees).fill(16.7), ...regime])).toBe(true);
  });

  it("des regles personnalisees remplacent les regles par defaut", () => {
    const deltas = Array(100).fill(20);
    expect(appareilFaible(deltas, { seuilMs: 10, tauxDeclenchement: 0.5, imagesIgnorees: 0, echantillonMinimal: 10 })).toBe(true);
    expect(appareilFaible(deltas, { seuilMs: 30, tauxDeclenchement: 0.5, imagesIgnorees: 0, echantillonMinimal: 10 })).toBe(false);
  });
});
