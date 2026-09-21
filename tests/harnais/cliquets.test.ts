import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { REGLES_BOUCLE } from "../../eslint/harnais.mjs";

/**
 * LES CLIQUETS NE RECULENT PAS, ET NE TRAINENT PAS.
 *
 * Un cliquet est une liste de fichiers geles a leur etat du jour ou la
 * regle est arrivee. Ce test garde deux choses :
 *   - aucun fichier gele ne fait pire que sa ligne de base ;
 *   - aucune ligne de base n'est perimee : un fichier qui a maigri sous le
 *     plafond doit sortir (`pnpm run harnais:baseline`), sinon la liste
 *     ment sur l'etat du depot.
 * Un fichier ABSENT de la liste est sous la regle pleine (erreur) : c'est
 * eslint lui-meme qui le garde, pas ce test.
 */
const PLAFOND_LIGNES = 400;
const lire = (nom: string): Record<string, number> => JSON.parse(readFileSync(`scripts/${nom}`, "utf8"));

describe("le cliquet de la boucle d'image", () => {
  const base = lire("lint-baseline.json");

  it("aucun fichier gele ne gagne de violation, et aucun n'est perime", async () => {
    const fichiers = Object.keys(base);
    if (fichiers.length === 0) return;
    const eslint = new ESLint({
      cwd: process.cwd(),
      overrideConfig: [{ files: ["src/**/*.{ts,tsx}"], rules: { "no-restricted-syntax": ["error", ...REGLES_BOUCLE] } }],
    });
    const resultats = await eslint.lintFiles(fichiers);
    for (const r of resultats) {
      const chemin = relative(process.cwd(), r.filePath).split("\\").join("/");
      const n = r.messages.filter((m) => m.ruleId === "no-restricted-syntax").length;
      expect(n, `${chemin} : ${n} violation(s), ligne de base ${base[chemin]} -- le cliquet ne recule pas`).toBeLessThanOrEqual(base[chemin]);
      expect(n, `${chemin} est a zero : il sort du cliquet, lance pnpm run harnais:baseline`).toBeGreaterThan(0);
    }
  }, 60_000);
});

describe("le cliquet des tailles de fichier", () => {
  const base = lire("lines-baseline.json");

  it("aucun fichier gele ne grossit, et aucun n'est perime", () => {
    for (const [chemin, plafond] of Object.entries(base)) {
      const compte = readFileSync(chemin, "utf8").split("\n").length;
      expect(compte, `${chemin} : ${compte} lignes, gele a ${plafond} -- le cliquet ne recule pas`).toBeLessThanOrEqual(plafond);
      expect(compte, `${chemin} est passe sous ${PLAFOND_LIGNES} : il sort du cliquet, lance pnpm run harnais:baseline`).toBeGreaterThan(PLAFOND_LIGNES);
    }
  });
});
