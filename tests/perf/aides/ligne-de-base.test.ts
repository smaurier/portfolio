import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ecrireEntreeMachine, ecrireLigneDeBase, entreeMachine, lireLigneDeBase } from "./ligne-de-base";
import { MACHINE_PARTAGEE } from "./machine";

/**
 * LA LIGNE DE BASE SE RELIT TELLE QU'ELLE S'ECRIT, ET S'ECRIT TOUJOURS PAREIL.
 *
 * Un fichier versionne que plusieurs postes regenerent doit sortir
 * identique pour un meme contenu : cles triees sans localeCompare, un
 * retour a la ligne final. Et un fichier edite a la main qui ne se lit pas
 * doit nommer son chemin, pas jeter une SyntaxError nue.
 *
 * DEPUIS LE 01/11 : chaque projet porte une ligne de base PAR MACHINE
 * (`identifiantMachine()`, cf machine.ts) -- un poste plus faible que
 * celui qui a mesure l'original ne doit plus se comparer a lui. La cle
 * `MACHINE_PARTAGEE` garde l'historique d'avant ce changement en repli de
 * lecture, jamais reecrite.
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
  it("s'ecrit triee (projet ET machine), se relit egale, et se reecrit octet pour octet", () => {
    const chemin = join(dossier(), "perf-baseline.json");
    const base = {
      "perf-telephone": { [MACHINE_PARTAGEE]: { dpr: 2.6, moments: { "voile-attente": ligne(2) } } },
      "perf-bureau": {
        tour: { dpr: 1, moments: { "voile-ouverture": ligne(1), arrivee: ligne(0) } },
        [MACHINE_PARTAGEE]: { dpr: 1, moments: { arrivee: ligne(3) } },
      },
    };
    ecrireLigneDeBase(base, chemin);
    const texte = readFileSync(chemin, "utf8");
    expect(Object.keys(JSON.parse(texte))).toEqual(["perf-bureau", "perf-telephone"]);
    expect(Object.keys(JSON.parse(texte)["perf-bureau"])).toEqual([MACHINE_PARTAGEE, "tour"]);
    expect(Object.keys(JSON.parse(texte)["perf-bureau"].tour.moments)).toEqual(["arrivee", "voile-ouverture"]);
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

describe("entreeMachine", () => {
  const base = {
    "perf-bureau": {
      tour: { dpr: 1, moments: { arrivee: ligne(1) } },
      [MACHINE_PARTAGEE]: { dpr: 1, moments: { arrivee: ligne(9) } },
    },
  };
  it("un poste qui a sa propre entree l'utilise, jamais le repli", () => {
    expect(entreeMachine(base, "perf-bureau", "tour")).toEqual(base["perf-bureau"].tour);
  });
  it("un poste sans entree retombe sur la ligne de base partagee", () => {
    expect(entreeMachine(base, "perf-bureau", "portable-esn")).toEqual(base["perf-bureau"][MACHINE_PARTAGEE]);
  });
  it("un projet absent : rien, ni entree ni repli", () => {
    expect(entreeMachine(base, "perf-telephone", "tour")).toBeUndefined();
  });
});

describe("ecrireEntreeMachine", () => {
  it("cree l'entree du poste sans toucher aux autres postes du meme projet", () => {
    const base = {
      "perf-bureau": {
        [MACHINE_PARTAGEE]: { dpr: 1, moments: { arrivee: ligne(9) } },
      },
    };
    const apres = ecrireEntreeMachine(base, "perf-bureau", { dpr: 1, moments: { arrivee: ligne(1) } }, "portable-esn");
    expect(apres["perf-bureau"]["portable-esn"]).toEqual({ dpr: 1, moments: { arrivee: ligne(1) } });
    expect(apres["perf-bureau"][MACHINE_PARTAGEE]).toEqual(base["perf-bureau"][MACHINE_PARTAGEE]);
  });
  it("cree le projet s'il n'existait pas du tout", () => {
    const apres = ecrireEntreeMachine({}, "perf-telephone", { dpr: 2.6, moments: {} }, "tour");
    expect(apres).toEqual({ "perf-telephone": { tour: { dpr: 2.6, moments: {} } } });
  });
});
