import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_BOUCLE, PLAFOND_LIGNES, REGLES_BOUCLE, compterBoucle } from "../../eslint/harnais.mjs";
import { RACINE, cheminPosix, cliquetBoucle, cliquetLignes, motifFichier } from "../../eslint/cliquets.mjs";
import { compterLignes } from "../../scripts/compter-lignes.mjs";

/**
 * LES CLIQUETS NE RECULENT PAS, ET CHAQUE PROGRES S'ACQUIERT.
 *
 * Un cliquet est une liste de fichiers geles a leur MEILLEUR etat connu.
 * Ce test garde trois choses :
 *   - aucun fichier gele ne fait pire que sa ligne de base (rien ne recule) ;
 *   - aucun fichier gele ne fait mieux sans que la ligne de base l'ait
 *     inscrit (`pnpm run harnais:baseline`) : un progres non acquis se
 *     reperdrait sans bruit -- 9, puis 3, puis 9 passerait avec un plafond ;
 *   - aucune ligne de base n'est perimee : un fichier disparu ou passe a
 *     zero doit sortir.
 * Un fichier ABSENT de la liste est sous la regle pleine (erreur) : c'est
 * eslint lui-meme qui le garde, pas ce test.
 */
const REGENERER = "lance pnpm run harnais:baseline";

describe("le cliquet de la boucle d'image", () => {
  it("chaque fichier gele est exactement a son meilleur connu", async () => {
    const fichiers = Object.keys(cliquetBoucle);
    if (fichiers.length === 0) return;
    for (const f of fichiers) {
      expect(existsSync(join(RACINE, f)), `${f} n'existe plus : il sort du cliquet, ${REGENERER}`).toBe(true);
    }
    const eslint = new ESLint({ cwd: RACINE, overrideConfig: [CONFIG_BOUCLE] });
    const resultats = await eslint.lintFiles(fichiers);
    // Un fichier liste mais ignore par ESLint (globalIgnores) ne rendrait
    // pas de resultat, et le cliquet le croirait tenu. Un resultat par fichier.
    expect(resultats.length, "un fichier du cliquet n'a pas ete linte : est-il ignore par la config ?").toBe(fichiers.length);
    for (const r of resultats) {
      const chemin = cheminPosix(r.filePath);
      const n = compterBoucle(r);
      const base = cliquetBoucle[chemin];
      expect(n, `${chemin} : ${n} violation(s), meilleur connu ${base} -- le cliquet ne recule pas`).toBeLessThanOrEqual(base);
      expect(n, `${chemin} : ${n} violation(s), meilleur connu ${base} -- un progres s'acquiert, ${REGENERER}`).toBeGreaterThanOrEqual(base);
    }
  }, 60_000);

  it("une derogation sur un chemin a crochets s'applique, grace a l'echappement", async () => {
    // minimatch lit [locale] comme une classe de caracteres : sans
    // echappement, la derogation ne s'applique pas et la regle reste en
    // erreur sur ce fichier-la (relecture du 22/09).
    const chemin = "src/app/[locale]/essai-harnais.tsx";
    const extrait = `import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
export function Essai() {
  useFrame(() => {
    const v = new Vector3();
    v.set(0, 0, 0);
  });
  return null;
}
`;
    const severite = async (motif: string) => {
      const eslint = new ESLint({ cwd: RACINE, overrideConfig: [{ files: [motif], rules: { "no-restricted-syntax": ["warn", ...REGLES_BOUCLE] } }] });
      const [r] = await eslint.lintText(extrait, { filePath: chemin });
      return r.messages.find((m) => m.ruleId === "no-restricted-syntax")?.severity;
    };
    expect(motifFichier(chemin)).toBe("src/app/\\[locale\\]/essai-harnais.tsx");
    expect(await severite(chemin), "sans echappement la derogation est ignoree").toBe(2);
    expect(await severite(motifFichier(chemin)), "avec echappement elle s'applique").toBe(1);
  }, 60_000);
});

describe("le cliquet des tailles de fichier", () => {
  it("chaque fichier gele est exactement a sa taille connue", () => {
    for (const [chemin, base] of Object.entries(cliquetLignes)) {
      expect(existsSync(join(RACINE, chemin)), `${chemin} n'existe plus : il sort du cliquet, ${REGENERER}`).toBe(true);
      const compte = compterLignes(readFileSync(join(RACINE, chemin), "utf8"));
      expect(compte, `${chemin} : ${compte} lignes, meilleur connu ${base} -- le cliquet ne recule pas`).toBeLessThanOrEqual(base);
      expect(compte, `${chemin} : ${compte} lignes, meilleur connu ${base} -- un progres s'acquiert, ${REGENERER}`).toBeGreaterThanOrEqual(base);
      expect(compte, `${chemin} est passe sous ${PLAFOND_LIGNES} : il sort du cliquet, ${REGENERER}`).toBeGreaterThan(PLAFOND_LIGNES);
    }
  });
});
