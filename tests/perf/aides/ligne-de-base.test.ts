import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ecrireLigneDeBase, lireLigneDeBase } from "./ligne-de-base";

/**
 * LA LIGNE DE BASE SE RELIT TELLE QU'ELLE S'ECRIT, ET S'ECRIT TOUJOURS PAREIL.
 *
 * Un fichier versionne que plusieurs postes regenerent doit sortir
 * identique pour un meme contenu : cles triees sans localeCompare, un
 * retour a la ligne final. Et un fichier edite a la main qui ne se lit pas
 * doit nommer son chemin, pas jeter une SyntaxError nue.
 */
const dossiers: string[] = [];
const dossier = (): string => {
  const d = mkdtempSync(join(tmpdir(), "ligne-de-base-"));
  dossiers.push(d);
  return d;
};
afterEach(() => {
  for (const d of dossiers.splice(0)) rmSync(d, { recursive: true, force: true });
});

const ligne = (n: number) => ({
  meilleur: { auDela: n, perdues: n },
  maximum: { auDela: n + 1, perdues: n + 1 },
  plafond: { auDela: n + 2, perdues: n + 2 },
  cible: { auDela: 0, perdues: 0 },
  pire: n,
  date: "2026-09-22",
});

describe("la ligne de base", () => {
  it("absente, elle est vide", () => {
    expect(lireLigneDeBase(join(dossier(), "absent.json"))).toEqual({});
  });
  it("s'ecrit triee, se relit egale, et se reecrit octet pour octet", () => {
    const chemin = join(dossier(), "perf-baseline.json");
    const base = { "perf-telephone": { dpr: 2.6, moments: { "voile-attente": ligne(2) } }, "perf-bureau": { dpr: 1, moments: { "voile-ouverture": ligne(1), arrivee: ligne(0) } } };
    ecrireLigneDeBase(base, chemin);
    const texte = readFileSync(chemin, "utf8");
    expect(Object.keys(JSON.parse(texte))).toEqual(["perf-bureau", "perf-telephone"]);
    expect(Object.keys(JSON.parse(texte)["perf-bureau"].moments)).toEqual(["arrivee", "voile-ouverture"]);
    expect(texte.endsWith("}\n")).toBe(true);
    expect(lireLigneDeBase(chemin)).toEqual(base);
    ecrireLigneDeBase(lireLigneDeBase(chemin), chemin);
    expect(readFileSync(chemin, "utf8")).toBe(texte);
  });
  it("un fichier illisible nomme son chemin", () => {
    const chemin = join(dossier(), "perf-baseline.json");
    writeFileSync(chemin, "{ \"perf-bureau\": , }");
    expect(() => lireLigneDeBase(chemin)).toThrow(/perf-baseline\.json/);
  });
});
