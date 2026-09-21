import { describe, expect, it, vi } from "vitest";
import { ESLint } from "eslint";

// Le premier lintText charge toute la configuration (eslint-config-next,
// l'analyseur TypeScript) : 3,5 s seul, davantage quand vitest fait tourner
// plusieurs fichiers en parallele. Les 5 s par defaut ont expire deux fois
// le 21/09. Un delai large ici ne cache rien : ces tests ne mesurent pas un
// temps, ils verifient qu'une regle existe.
vi.setConfig({ testTimeout: 30_000 });

/**
 * LES REGLES DU HARNAIS, PROUVEES SUR DES EXTRAITS (tranche A).
 *
 * Chaque regle du pilier 2 est ici mise devant un extrait qui la viole et
 * un extrait temoin qui ne la viole pas. On passe par l'API ESLint avec la
 * configuration REELLE du depot : le chemin de fichier fourni decide quel
 * bloc de configuration s'applique, exactement comme a la ligne de
 * commande. Une regle qui n'est pas dans ce fichier n'est pas dans le
 * harnais.
 */
const eslint = new ESLint({ cwd: process.cwd() });

async function regles(code: string, filePath: string): Promise<string[]> {
  const [resultat] = await eslint.lintText(code, { filePath });
  return resultat.messages.map((m) => m.ruleId ?? "(fatal)");
}

describe("loi 1 : lib/ n'importe jamais un composant", () => {
  const extrait = `import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";
export const d: DirectionKey = "jade";
`;

  it("refuse l'import depuis lib/", async () => {
    expect(await regles(extrait, "src/lib/essai-harnais.ts")).toContain("no-restricted-imports");
  });

  it("l'autorise depuis un composant", async () => {
    expect(await regles(extrait, "src/app/components/essai-harnais.tsx")).not.toContain("no-restricted-imports");
  });
});
