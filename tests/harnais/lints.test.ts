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
    // `toEqual([])` et non `not.toContain` : un chemin ignore ou une erreur
    // d'analyse rendraient aussi un tableau sans la regle, et le temoin
    // serait vert sans avoir ete linte.
    expect(await regles(extrait, "src/app/components/essai-harnais.tsx")).toEqual([]);
  });

  it("refuse aussi un import relatif d'une page ou d'un layout", async () => {
    const relatif = `import type { Metadata } from "next";
import { generateMetadata } from "../app/[locale]/[slug]/page";
export const m: Metadata = generateMetadata as unknown as Metadata;
`;
    expect(await regles(relatif, "src/lib/essai-harnais.ts")).toContain("no-restricted-imports");
  });
});

describe("pilier 2 : aucune lecture synchrone du GPU en production", () => {
  const cas = ["getError", "readPixels", "getParameter", "getProgramParameter", "checkFramebufferStatus", "getBufferSubData"];

  for (const nom of cas) {
    it(`refuse ${nom}() dans src/`, async () => {
      const extrait = `export function sonde(gl: WebGL2RenderingContext) { return gl.${nom}(); }\n`;
      expect(await regles(extrait, "src/app/components/stag-scene/essai-harnais.ts")).toContain("no-restricted-properties");
    });
  }

  it("laisse les sondes de tests et de .scratch tranquilles", async () => {
    const extrait = `export function sonde(gl: WebGL2RenderingContext) { return gl.getError(); }\n`;
    // toEqual([]) comme pour la loi 1 : un chemin ignore rendrait aussi un
    // tableau sans la regle, et le temoin serait vert sans avoir ete linte.
    expect(await regles(extrait, "tests/e2e/essai-harnais.ts")).toEqual([]);
  });

  it("ne confond pas un `get` legitime avec une lecture du GPU", async () => {
    // Le temoin est SOUS src/ : il prouve que la regle discrimine, pas
    // seulement qu'elle est bornee a un dossier. Le jour ou quelqu'un
    // ajouterait `get` a la liste, c'est ce test qui tomberait.
    const extrait = `export function instant(q: string) { return new URLSearchParams(q).get("t"); }\n`;
    expect(await regles(extrait, "src/app/components/stag-scene/essai-harnais.ts")).toEqual([]);
  });
});

describe("pilier 2 : la boucle d'image", () => {
  const CHEMIN = "src/app/components/stag-scene/essai-harnais.tsx";

  it("refuse une allocation three dans useFrame", async () => {
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
    expect(await regles(extrait, CHEMIN)).toContain("no-restricted-syntax");
  });

  it("accepte l'objet de travail cree dehors et reutilise dedans", async () => {
    const extrait = `import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
const scratch = new Vector3();
export function Essai() {
  useFrame(() => {
    scratch.set(0, 0, 0);
  });
  return null;
}
`;
    expect(await regles(extrait, CHEMIN)).toEqual([]);
  });

  it("refuse un setState appele depuis useFrame", async () => {
    const extrait = `import { useState } from "react";
import { useFrame } from "@react-three/fiber";
export function Essai() {
  const [, setNiveau] = useState(0);
  useFrame(() => {
    setNiveau(1);
  });
  return null;
}
`;
    expect(await regles(extrait, CHEMIN)).toContain("no-restricted-syntax");
  });

  it("ne confond pas une methode three avec un setState", async () => {
    const extrait = `import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
const scratch = new Vector3();
export function Essai() {
  useFrame(() => {
    scratch.setScalar(1);
  });
  return null;
}
`;
    expect(await regles(extrait, CHEMIN)).toEqual([]);
  });
});
