import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * GARDE-FOU DES COULEURS (07/09). Toutes les couleurs de l'interface ont ete
 * passees en tokens sur `:root` (globals.css) pour qu'un theme clair n'ait
 * qu'un seul bloc a redefinir. Ce test echoue si une couleur en dur
 * reapparait dans un module CSS : sans lui, le travail se defait en quelques
 * semaines et il faut le refaire.
 *
 * Les cinq couleurs cardinales ne sont pas concernees : elles vivent dans
 * globals.css et dans le code 3D, et sont volontairement identiques dans les
 * deux themes.
 */

const APP = join(process.cwd(), "src", "app");

function cssModules(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...cssModules(full));
    else if (entry.endsWith(".module.css")) out.push(full);
  }
  return out;
}

/** Retire les commentaires : ils citent parfois une couleur (le `fill="#fff"`
 * d'un SVG source, une valeur d'avant un correctif) et c'est legitime. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

const HARDCODED = /#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*\d/g;

describe("les modules CSS n'ecrivent aucune couleur en dur", () => {
  const files = cssModules(APP);

  it("trouve bien les modules a verifier", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [f.slice(APP.length + 1).replace(/\\/g, "/"), f] as const))(
    "%s",
    (_label, file) => {
      const found = stripComments(readFileSync(file, "utf8")).match(HARDCODED);
      // Message explicite : la valeur fautive et quoi faire.
      expect(found ?? [], `couleur(s) en dur : ${(found ?? []).join(", ")}. Ajoute un token dans globals.css (bloc « Couleurs de l'interface ») et utilise var(--...) ; pour une transparence, stocke les canaux (--x-rgb) et ecris rgba(var(--x-rgb), 0.4).`).toEqual([]);
    },
  );
});
