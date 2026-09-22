# Le harnais, tranche A : le processus, les hooks, les lints, les types

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser la partie du harnais qui ne coute rien et prend effet des le commit suivant : la definition du fini dans `CLAUDE.md`, les hooks git qui la font respecter, les cinq regles de lint du pilier 2 avec leurs cliquets, et le deplacement des deux types que vingt et un fichiers de `lib/` importent a l'envers.

**Architecture:** Les regles de lint vivent dans un module a part (`eslint/harnais.mjs`) que `eslint.config.mjs` importe ; les cliquets (tailles de fichiers, violations du premier jour) sont deux JSON generes par un script et lus par la config, avec un test unitaire qui refuse qu'ils reculent ou qu'ils traînent des entrees perimees. Les hooks sont des scripts `sh` versionnes, installes par `prepare` via `core.hooksPath`. Chaque regle est prouvee par un test qui la fait echouer sur un extrait de code AVANT qu'elle existe.

**Tech Stack:** ESLint 9 (config plate, `defineConfig`), eslint-config-next 16, TypeScript, vitest 4, pnpm 10, git hooks `sh` (Git for Windows).

**Spec:** `docs/superpowers/specs/2026-09-21-harnais-design.md` — sections 1, 3, 4, 6 et criteres 1, 2, 7, 12.

**Conventions du depot a respecter :** commits sur `dev` ; messages de commit en francais sans accents, prefixe conventionnel, le POURQUOI dans le corps ; commentaires de code en francais sans accents dans les fichiers qui en sont deja depourvus ; le pied de commit :

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01D2Uafui7DR6tuf8uVBrPy4
```

**Verification avant de commencer :**

```bash
git status --short          # doit etre vide
git branch --show-current   # dev
pnpm test 2>&1 | tail -3    # 1032 passed
pnpm exec eslint . 2>&1 | tail -2   # 0 errors (1 warning pre-existant dans tests/e2e/veille.spec.ts)
```

---

## Carte des fichiers

| fichier | role | tache |
| --- | --- | --- |
| `src/lib/direction.ts` | **cree** — les types `DirectionKey` et `CardinalDirection`, seule source | 2 |
| `src/app/components/stag-scene/direction-colors.ts:13` | re-exporte `DirectionKey` depuis `lib` | 2 |
| `src/app/components/stag-scene/cardinal-transition-context.tsx:35` | re-exporte `CardinalDirection` depuis `lib` | 2 |
| 21 fichiers `src/lib/*.ts` | leur import de type change de chemin | 2 |
| `eslint/harnais.mjs` | **cree** — les regles du pilier 2 et la generation des derogations depuis les cliquets | 1, 3, 4, 5 |
| `eslint.config.mjs` | importe `harnais` | 1 |
| `tests/harnais/lints.test.ts` | **cree** — chaque regle prouvee rouge puis verte par l'API ESLint sur un extrait | 1, 3, 4, 5 |
| `scripts/harnais-baseline.mjs` | **cree** — genere les deux cliquets | 4, 5 |
| `scripts/lint-baseline.json` | **cree** — violations `useFrame` du premier jour, par fichier | 4 |
| `scripts/lines-baseline.json` | **cree** — fichiers au-dessus de 400 lignes, geles a leur taille | 4, 5 |
| `tests/harnais/cliquets.test.ts` | **cree** — les cliquets ne reculent pas et ne trainent pas | 4, 5 |
| `scripts/hooks/pre-commit`, `scripts/hooks/pre-push` | **crees** | 6 |
| `package.json` | scripts `prepare`, `harnais:baseline` | 4, 6 |
| `docs/harnais.md` | **cree** — la reference, tranche A | 7 |
| `CLAUDE.md` | section « Le harnais » | 7 |

---

### Task 1 : la regle « `lib/` n'importe jamais un composant », vue rouge

**Files:**
- Create: `eslint/harnais.mjs`
- Modify: `eslint.config.mjs`
- Create: `tests/harnais/lints.test.ts`

- [ ] **Step 1 : ecrire le test qui prouve la regle sur un extrait**

`tests/harnais/lints.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";

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
```

- [ ] **Step 2 : le voir rouge**

Run: `pnpm exec vitest run tests/harnais/lints.test.ts`
Expected: `1 failed | 1 passed` — le premier test echoue avec `expected [] to include 'no-restricted-imports'`.

- [ ] **Step 3 : ecrire la regle**

`eslint/harnais.mjs` :

```js
/**
 * LE HARNAIS, PILIER 2 : LES REGLES QUI SE LINTENT.
 *
 * Reference : docs/harnais.md. Chaque regle y a sa preuve. Ce fichier ne
 * contient que des regles du coeur d'ESLint : aucun plugin a installer,
 * rien qui puisse casser a la prochaine version de eslint-config-next.
 */

export const harnais = [
  {
    // Loi 1 : lib/ est pure et testee a l'unite ; les composants rendent.
    // Trouve le 21/09 : vingt et un fichiers de lib/ importaient un type
    // depuis un composant. Le sens est inverse ; le type descend dans lib/.
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "**/app/components/**"],
              message: "lib/ est pure : elle n'importe jamais un composant ni une page (docs/harnais.md, loi 1). Le type ou la constante descend dans lib/.",
            },
          ],
        },
      ],
    },
  },
];
```

`eslint.config.mjs` :

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import { harnais } from "./eslint/harnais.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  ...harnais,
]);

export default eslintConfig;
```

- [ ] **Step 4 : le voir vert sur l'extrait, et rouge sur le depot**

Run: `pnpm exec vitest run tests/harnais/lints.test.ts`
Expected: `2 passed`.

Run: `pnpm exec eslint src/lib 2>&1 | grep -c "no-restricted-imports"`
Expected: `21` — les vingt et un fichiers du premier jour. C'est le rouge attendu ; la tache 2 le ferme. **Ne pas commiter entre les deux** : un commit avec le lint rouge casserait le hook de la tache 6 le jour ou il sera installe.

---

### Task 2 : les types descendent dans `lib/direction.ts`

**Files:**
- Create: `src/lib/direction.ts`
- Modify: `src/app/components/stag-scene/direction-colors.ts:13`
- Modify: `src/app/components/stag-scene/cardinal-transition-context.tsx:35`
- Modify: les 21 fichiers de `src/lib/` listes par `pnpm exec eslint src/lib`

- [ ] **Step 1 : creer la seule source**

`src/lib/direction.ts` :

```ts
/**
 * LES CINQ DIRECTIONS (deplace ici le 21/09, tranche A du harnais).
 *
 * Ce type vivait dans `components/stag-scene/direction-colors.ts`, et un
 * second, identique, dans `cardinal-transition-context.tsx`. Vingt et un
 * fichiers de lib/ les importaient : lib/ dependait des composants, a
 * l'envers de la loi 1 (docs/harnais.md). Les deux noms sont gardes, les
 * composants re-exportent, rien ne casse.
 *
 *   jade        le Centre, Tlalxicco
 *   dore        l'Est, Tlahuizcalpan
 *   turquoise   le Sud, Huitztlampa
 *   cendre      l'Ouest, Cihuatlampa
 *   obsidienne  le Nord, Mictlampa
 */
export type DirectionKey = "jade" | "dore" | "turquoise" | "cendre" | "obsidienne";

/** Nom historique du meme type, celui du contexte de transition cardinale. */
export type CardinalDirection = DirectionKey;
```

- [ ] **Step 2 : les composants re-exportent**

Dans `src/app/components/stag-scene/direction-colors.ts`, remplacer la ligne 13 :

```ts
export type DirectionKey = "jade" | "dore" | "turquoise" | "cendre" | "obsidienne";
```

par :

```ts
import type { DirectionKey } from "@/lib/direction";
// Re-exporte pour les composants qui l'importent d'ici depuis le 25/08 ;
// la source est lib/direction.ts (21/09, loi 1 du harnais).
export type { DirectionKey };
```

Dans `src/app/components/stag-scene/cardinal-transition-context.tsx`, remplacer la ligne 35 :

```ts
export type CardinalDirection = "jade" | "dore" | "turquoise" | "cendre" | "obsidienne";
```

par :

```ts
import type { CardinalDirection } from "@/lib/direction";
// Meme type que DirectionKey, sous son nom historique ; source lib/direction.ts.
export type { CardinalDirection };
```

Attention : si le fichier a deja un bloc d'imports en tete, placer la ligne `import type` avec les autres imports (ESLint `import/first`), et garder le `export type { ... }` a la place de l'ancienne ligne.

- [ ] **Step 3 : deplacer les vingt et un imports d'un coup**

Run (Git Bash) :

```bash
grep -rl 'from "@/app/components/stag-scene/direction-colors"' src/lib | xargs sed -i 's#from "@/app/components/stag-scene/direction-colors"#from "@/lib/direction"#'
grep -rl 'from "@/app/components/stag-scene/cardinal-transition-context"' src/lib | xargs sed -i 's#from "@/app/components/stag-scene/cardinal-transition-context"#from "@/lib/direction"#'
grep -rn "app/components" src/lib/*.ts
```

Expected de la derniere commande : aucune ligne.

- [ ] **Step 4 : verifier types, lint, tests**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src && pnpm test 2>&1 | tail -3`
Expected: `tsc` muet, `eslint` muet, `1032 passed` (les tests de lib qui importaient le type passent par le nouveau chemin).

- [ ] **Step 5 : commit**

```bash
git add -A
git commit -F - <<'EOF'
refactor(lib): les deux types de direction descendent dans lib/direction.ts

Vingt et un fichiers de lib/ importaient DirectionKey (ou son jumeau
CardinalDirection) depuis un composant : lib/ dependait des composants, a
l'envers de la loi 1 du harnais. Une seule source dans lib/direction.ts,
les deux composants re-exportent, la regle no-restricted-imports le garde
(tests/harnais/lints.test.ts, vue rouge sur l'extrait et sur les vingt et
un fichiers avant ce commit).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01D2Uafui7DR6tuf8uVBrPy4
EOF
```

---

### Task 3 : aucune lecture synchrone du GPU en production

**Files:**
- Modify: `eslint/harnais.mjs`
- Modify: `tests/harnais/lints.test.ts`

- [ ] **Step 1 : le test**

Ajouter a `tests/harnais/lints.test.ts` :

```ts
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
    expect(await regles(extrait, "tests/e2e/essai-harnais.ts")).not.toContain("no-restricted-properties");
  });
});
```

- [ ] **Step 2 : rouge**

Run: `pnpm exec vitest run tests/harnais/lints.test.ts`
Expected: `6 failed | 3 passed`.

- [ ] **Step 3 : la regle**

Ajouter a `harnais` dans `eslint/harnais.mjs`, apres le premier bloc :

```js
  {
    // Pilier 2 : une lecture synchrone du GPU vide le pipeline et bloque le
    // fil principal jusqu'a ce que le GPU rattrape (MDN, WebGL best
    // practices). Verifie le 21/09 : src/ n'en contenait aucune ; la
    // chauffe lit COMPLETION_STATUS_KHR par program.isReady() de three,
    // que cette regle ne voit pas. Les tests et .scratch en ont besoin
    // pour mesurer : ils ne sont pas sous src/.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        ...["getError", "readPixels", "getParameter", "getProgramParameter", "checkFramebufferStatus", "getBufferSubData"].map((property) => ({
          property,
          message: `${property}() lit le GPU de facon synchrone et bloque le pipeline (docs/harnais.md, pilier 2). Mesure dans tests/ ou .scratch/, jamais dans le site.`,
        })),
      ],
    },
  },
```

- [ ] **Step 4 : vert, et le depot reste vert**

Run: `pnpm exec vitest run tests/harnais/lints.test.ts && pnpm exec eslint src 2>&1 | tail -1`
Expected: `9 passed` ; `eslint src` muet.

- [ ] **Step 5 : commit**

```bash
git add eslint/harnais.mjs tests/harnais/lints.test.ts
git commit -F - <<'EOF'
chore(harnais): aucune lecture synchrone du GPU sous src/

Six appels interdits par no-restricted-properties, prouves sur des
extraits (vus rouges avant la regle). src/ n'en contenait aucun : la regle
garde un etat sain, elle ne repare rien.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01D2Uafui7DR6tuf8uVBrPy4
EOF
```

---

### Task 4 : rien d'alloue dans `useFrame`, pas de `setState` pilote par la boucle — avec le cliquet du premier jour

**Files:**
- Modify: `eslint/harnais.mjs`
- Modify: `tests/harnais/lints.test.ts`
- Create: `scripts/harnais-baseline.mjs`
- Create: `scripts/lint-baseline.json`
- Create: `tests/harnais/cliquets.test.ts`
- Modify: `package.json`

Pourquoi un cliquet ici : la regle est une erreur, mais des fichiers du
premier jour la violent peut-etre (la sonde du 21/09 compte des `new
Vector3(` dans vingt fichiers a `useFrame`, sans dire lesquels sont DANS le
rappel). On ne peut ni les laisser en erreur (rien ne se commiterait) ni
les corriger dans cette tranche (chaque site est un refactor a l'oeil). Le
cliquet gele leur compte : ils ne peuvent plus en gagner, et quand ils
tombent a zero ils sortent de la liste. ESLint ne tient qu'une severite
par regle et par fichier : les fichiers du cliquet passent en `warn`,
tous les autres restent en `error`. C'est ainsi que le spec « `setState`
en avertissement » se realise : par la derogation, pas par la severite.

- [ ] **Step 1 : le test des deux regles**

Ajouter a `tests/harnais/lints.test.ts` :

```ts
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
    expect(await regles(extrait, CHEMIN)).not.toContain("no-restricted-syntax");
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
    expect(await regles(extrait, CHEMIN)).not.toContain("no-restricted-syntax");
  });
});
```

- [ ] **Step 2 : rouge**

Run: `pnpm exec vitest run tests/harnais/lints.test.ts`
Expected: `2 failed | 11 passed` (les deux « refuse »).

- [ ] **Step 3 : la regle, avec ses selecteurs**

**Relecture de qualite des taches 1-2 (21/09)** : `eslint/harnais.mjs` doit
rester une liste lisible de lois ; la lecture des JSON des cliquets va dans
son propre module. Creer `eslint/cliquets.mjs` :

```js
/**
 * LES CLIQUETS, COTE ESLINT : lire les lignes de base.
 *
 * Deux JSON versionnes sous scripts/, generes par scripts/harnais-baseline.mjs
 * et gardes par tests/harnais/cliquets.test.ts. Ce module ne fait que les
 * lire, pour que eslint/harnais.mjs reste une liste de lois sans E/S.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (nom) => JSON.parse(readFileSync(join(ICI, "..", "scripts", nom), "utf8"));

/** Les fichiers du premier jour, geles a leur compte de violations de la boucle. */
export const cliquetBoucle = lire("lint-baseline.json");
/** Les fichiers au-dessus du plafond de lignes, geles a leur taille. */
export const cliquetLignes = lire("lines-baseline.json");
```

`scripts/lines-baseline.json` n'existe pas encore a cette etape : creer aussi
ce fichier avec `{}` (la tache 5 le remplit).

Dans `eslint/harnais.mjs`, ajouter en tete du fichier (avant `export const harnais`) :

```js
import { cliquetBoucle, cliquetLignes } from "./cliquets.mjs";

/** Ce qui ne se cree pas a chaque image : les objets three qui allouent. */
const OBJETS_THREE = "Vector2|Vector3|Vector4|Quaternion|Matrix3|Matrix4|Color|Euler|Box3|Sphere|Plane|Ray|Raycaster|Object3D";

/** Selecteurs AST (esquery) : ce qui est DANS un rappel useFrame. */
export const SELECTEUR_ALLOCATION = `CallExpression[callee.name='useFrame'] NewExpression[callee.name=/^(${OBJETS_THREE})$/]`;
export const SELECTEUR_SET_STATE = "CallExpression[callee.name='useFrame'] CallExpression[callee.type='Identifier'][callee.name=/^set[A-Z]/]";

export const REGLES_BOUCLE = [
  {
    selector: SELECTEUR_ALLOCATION,
    message: "Rien d'alloue dans useFrame : cree l'objet une fois, dehors (le motif `scratch` du depot), et reutilise-le. Une allocation par image nourrit le ramasse-miettes, qui rend des images longues (docs/harnais.md, pilier 2).",
  },
  {
    selector: SELECTEUR_SET_STATE,
    message: "Pas d'etat React pilote par la boucle : useFrame ecrit dans des refs, React ne re-rend pas a 60 images par seconde (docs/harnais.md, pilier 2, loi de la frontiere).",
  },
];

```

puis ajouter a `harnais`, apres le bloc GPU :

```js
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...REGLES_BOUCLE],
    },
  },
  // Le cliquet : les fichiers qui violaient la regle le jour ou elle est
  // arrivee passent en avertissement. Ils ne peuvent plus gagner de
  // violation (tests/harnais/cliquets.test.ts) ; a zero, ils sortent.
  ...Object.keys(cliquetBoucle).map((fichier) => ({
    files: [fichier],
    rules: {
      "no-restricted-syntax": ["warn", ...REGLES_BOUCLE],
    },
  })),
```

Creer `scripts/lint-baseline.json` avec un objet vide pour l'instant (et
`scripts/lines-baseline.json` de meme, si la tache l'a saute) :

```json
{}
```

Le selecteur `callee.type='Identifier'` est ce qui distingue `setNiveau(1)`
(un identifiant nu, un setter React) de `scratch.setScalar(1)` (un membre,
une methode three) : le quatrieme test le garde.

- [ ] **Step 4 : vert sur les extraits ; compter le rouge du depot**

Run: `pnpm exec vitest run tests/harnais/lints.test.ts`
Expected: `13 passed`.

Run: `pnpm exec eslint src -f unix 2>&1 | grep "no-restricted-syntax" | cut -d: -f1 | sort | uniq -c | sort -rn`
Expected: la liste des fichiers du premier jour avec leur compte (peut etre vide). **Noter ce que ca donne** : c'est le premier point zero de ce cliquet, et il va dans le message de commit.

- [ ] **Step 5 : le generateur des cliquets**

`scripts/harnais-baseline.mjs` :

```js
/**
 * LES CLIQUETS DU HARNAIS : les regenerer.
 *
 * Deux fichiers JSON, versionnes, lus par eslint/harnais.mjs :
 *   scripts/lint-baseline.json   fichiers qui violaient les regles de la
 *                                boucle d'image le jour de leur arrivee,
 *                                avec leur compte ;
 *   scripts/lines-baseline.json  fichiers au-dessus de 400 lignes, geles
 *                                a leur taille.
 *
 * Un cliquet ne redescend jamais : ce script ne s'execute que pour
 * CONSTATER qu'un fichier a maigri (il sort de la liste ou son compte
 * baisse). tests/harnais/cliquets.test.ts refuse tout le reste.
 *
 * Usage : pnpm run harnais:baseline
 */
import { ESLint } from "eslint";
import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { REGLES_BOUCLE } from "../eslint/harnais.mjs";

const PLAFOND_LIGNES = 400;

const eslint = new ESLint({
  cwd: process.cwd(),
  // On force la regle en erreur partout pour compter sans les derogations.
  overrideConfig: [{ files: ["src/**/*.{ts,tsx}"], rules: { "no-restricted-syntax": ["error", ...REGLES_BOUCLE] } }],
});
const resultats = await eslint.lintFiles(["src/**/*.{ts,tsx}"]);

const boucle = {};
const lignes = {};
for (const r of resultats) {
  const chemin = relative(process.cwd(), r.filePath).split("\\").join("/");
  const n = r.messages.filter((m) => m.ruleId === "no-restricted-syntax").length;
  if (n > 0) boucle[chemin] = n;
  const compte = readFileSync(r.filePath, "utf8").split("\n").length;
  if (compte > PLAFOND_LIGNES) lignes[chemin] = compte;
}

const trier = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync("scripts/lint-baseline.json", JSON.stringify(trier(boucle), null, 2) + "\n");
writeFileSync("scripts/lines-baseline.json", JSON.stringify(trier(lignes), null, 2) + "\n");
console.log(`boucle : ${Object.keys(boucle).length} fichier(s) geles ; lignes : ${Object.keys(lignes).length} fichier(s) au-dessus de ${PLAFOND_LIGNES}`);
```

Dans `package.json`, ajouter au bloc `scripts` :

```json
    "harnais:baseline": "node scripts/harnais-baseline.mjs"
```

Run: `pnpm run harnais:baseline && cat scripts/lint-baseline.json`
Expected: le meme decompte qu'a l'etape 4, trie ; `scripts/lines-baseline.json` est aussi ecrit (la tache 6 l'utilise). Puis `pnpm exec eslint src 2>&1 | tail -1` : plus d'erreur, seulement des avertissements dans les fichiers geles.

- [ ] **Step 6 : le test qui interdit de reculer**

`tests/harnais/cliquets.test.ts` :

```ts
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
  });
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
```

Run: `pnpm exec vitest run tests/harnais/cliquets.test.ts`
Expected: `2 passed` (le cliquet des lignes lit le JSON ecrit a l'etape 5 ; il n'est pas encore branche dans ESLint, c'est la tache 6).

- [ ] **Step 7 : commit**

```bash
git add eslint/harnais.mjs eslint/cliquets.mjs tests/harnais scripts/harnais-baseline.mjs scripts/lint-baseline.json scripts/lines-baseline.json package.json
git commit -F - <<'EOF'
chore(harnais): rien d'alloue dans useFrame, pas de setState dans la boucle, et le cliquet du premier jour

Deux selecteurs AST sous no-restricted-syntax, prouves sur quatre extraits
(deux qui violent, deux temoins, vus rouges avant la regle). Le selecteur
callee.type='Identifier' distingue un setter React d'une methode three.

ESLint ne tient qu'une severite par regle et par fichier : les fichiers
qui violaient la regle le jour de son arrivee sont geles a leur compte
dans scripts/lint-baseline.json et passent en avertissement ; ils ne
peuvent plus en gagner, et a zero ils sortent (tests/harnais/cliquets).
Point zero : <coller ici le decompte de l'etape 4>.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01D2Uafui7DR6tuf8uVBrPy4
EOF
```

---

### Task 5 : le plafond de lignes, en cliquet

**Files:**
- Modify: `eslint/harnais.mjs`
- Modify: `tests/harnais/lints.test.ts`

**Etat au depart (22/09)** : la relecture de la tache 4 a deja livre ce que
cette tache prevoyait en amont — `scripts/compter-lignes.mjs` (le compte de
`max-lines` et de `wc -l`, prouve sur quatre cas), `PLAFOND_LIGNES`
exporte par `eslint/harnais.mjs`, `cliquetLignes` et `motifFichier`
exportes par `eslint/cliquets.mjs`, `scripts/lines-baseline.json` regenere
avec le bon compte, et le test des cliquets qui garde deja les tailles. Il
ne reste qu'a brancher la regle et ses derogations dans ESLint, et a le
prouver sur des extraits.

- [ ] **Step 1 : le test**

Ajouter a `tests/harnais/lints.test.ts` :

```ts
describe("pilier 2 : le plafond de lignes", () => {
  it("refuse un fichier nouveau de plus de 400 lignes", async () => {
    const extrait = Array.from({ length: 401 }, (_, i) => `export const ligne${i} = ${i};`).join("
") + "
";
    expect(await regles(extrait, "src/lib/essai-harnais-long.ts")).toContain("max-lines");
  });

  it("accepte 400 lignes, retour final compris", async () => {
    // 400 lignes + retour final = 400 pour max-lines (mesure du 22/09).
    const extrait = Array.from({ length: 400 }, (_, i) => `export const ligne${i} = ${i};`).join("
") + "
";
    expect(await regles(extrait, "src/lib/essai-harnais-long.ts")).toEqual([]);
  });
});
```

- [ ] **Step 2 : rouge**

Run: `pnpm exec vitest run tests/harnais/lints.test.ts`
Expected: `1 failed | 16 passed` (le premier ; le second est deja vert, la regle n'existe pas).

- [ ] **Step 3 : la regle et ses derogations generees**

Dans `eslint/harnais.mjs`, importer `cliquetLignes` depuis `./cliquets.mjs`
(a cote de `cliquetBoucle` et `motifFichier`), et ajouter a `harnais`, en
fin de tableau :

```js
  {
    // Pilier 3 : un fichier qu'on ne tient pas en tete d'un coup est un
    // fichier qu'on modifie mal. Lignes brutes, comme wc -l et comme le
    // compteur du harnais (scripts/compter-lignes.mjs) : la ligne vide
    // apres le dernier retour ne compte pas.
    files: SRC,
    rules: {
      "max-lines": ["error", { max: PLAFOND_LIGNES, skipBlankLines: false, skipComments: false }],
    },
  },
  // Le cliquet des tailles : les fichiers au-dessus du plafond le jour de
  // la regle sont geles a leur taille (scripts/lines-baseline.json) ; ils
  // ne peuvent plus grossir, chaque amaigrissement s'acquiert
  // (tests/harnais/cliquets.test.ts), et sous le plafond ils sortent.
  ...Object.entries(cliquetLignes).map(([fichier, taille]) => ({
    files: [motifFichier(fichier)],
    rules: {
      "max-lines": ["error", { max: taille, skipBlankLines: false, skipComments: false }],
    },
  })),
```

- [ ] **Step 4 : vert partout, y compris les deux chemins a crochets**

Run: `pnpm exec vitest run tests/harnais && pnpm exec eslint src 2>&1 | tail -1`
Expected: `25 passed` ; `eslint src` sans erreur — en particulier
`src/app/[locale]/layout.tsx` et `src/app/[locale]/[slug]/page.tsx`, geles
par un motif echappe, ne remontent aucune erreur `max-lines`. S'il en reste
une, c'est qu'un fichier a change de taille depuis la regeneration :
`pnpm run harnais:baseline`, puis relancer.

Verifier a l'oeil que le cliquet correspond au fichier :

Run: `wc -l src/app/components/sound-design.tsx && grep sound-design scripts/lines-baseline.json`
Expected: **le meme nombre des deux cotes**.

- [ ] **Step 5 : commit**

```bash
git add eslint/harnais.mjs tests/harnais/lints.test.ts
git commit -F - <<'EOF'
chore(harnais): plafond de 400 lignes par fichier, les gros geles a leur taille

max-lines en lignes brutes, comptees comme ESLint et wc -l les comptent.
Dix-huit fichiers etaient au-dessus le 21/09, le plus gros a 1322 lignes
(xolotl-companion.tsx) : chacun est gele a sa taille dans
scripts/lines-baseline.json par un motif echappe (deux d'entre eux vivent
sous src/app/[locale]/), ne peut plus grossir, acquiert chaque
amaigrissement, et sort de la liste sous 400 (tests/harnais/cliquets).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01D2Uafui7DR6tuf8uVBrPy4
EOF
```

---

### Task 6 : les hooks git, installes par `prepare`

**Files:**
- Create: `scripts/hooks/pre-commit`
- Create: `scripts/hooks/pre-push`
- Modify: `package.json`

Ce que chaque hook fait, et pourquoi pas plus : `pre-commit` verifie les
types et le lint (une dizaine de secondes) ; les tests unitaires (huit
secondes, mais sur tout le depot) et la barre de perf (minutes, tranche C)
vont dans `pre-push`, parce que ce depot commite vingt a cinquante fois par
jour et pousse `main` au plus une fois. Le spec disait « les tests bloquent
tout commit » : ils bloquent toute poussee, ce qui est le meme filet pour
`main` et un filet plus leger pour `dev`. La tache 8 le note dans le spec (la cloture).

- [ ] **Step 1 : les deux scripts**

`scripts/hooks/pre-commit` :

```sh
#!/usr/bin/env sh
# LE HARNAIS, PILIER 4 : rien ne se commite qui casse les types ou le lint.
# Installe par `pnpm install` (script prepare -> core.hooksPath).
# Pour un correctif de securite qui ne peut pas attendre : git commit --no-verify,
# en le disant dans le message.
set -e
echo "harnais : tsc"
pnpm exec tsc --noEmit
echo "harnais : eslint"
pnpm exec eslint .
```

`scripts/hooks/pre-push` :

```sh
#!/usr/bin/env sh
# LE HARNAIS, PILIER 4 : rien ne se pousse qui casse un test ; rien ne se
# pousse sur main qui recule sur la barre de performance.
# git passe sur stdin une ligne par ref : <ref locale> <sha> <ref distante> <sha>.
set -e
echo "harnais : tests unitaires"
pnpm test
while read -r ref_locale sha_local ref_distante sha_distant; do
  case "$ref_distante" in
    refs/heads/main)
      echo "harnais : poussee sur main, la barre de performance doit etre verte"
      # --if-present : la barre arrive avec la tranche C ; d'ici la, rien.
      pnpm run --if-present perf
      ;;
  esac
done
exit 0
```

- [ ] **Step 1 bis : `.scratch/` sort du lint**

Relecture de la tache 3 : `.scratch/` est gitignore mais `eslint .` le
linte (une config plate n'ignore pas les dossiers a point), et quatre des
cinq avertissements du depot en viennent. Un hook qui lint des fichiers
que git ne suit pas n'a pas de sens. Dans `eslint.config.mjs`, la ligne

```js
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
```

devient

```js
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".scratch/**"]),
```

Run: `pnpm exec eslint . 2>&1 | tail -2`
Expected: une seule ligne d'avertissement restante (`tests/e2e/veille.spec.ts`, pre-existante), zero erreur.

- [ ] **Step 2 : `prepare`, et les droits d'execution dans l'index**

Dans `package.json`, bloc `scripts`, ajouter :

```json
    "prepare": "git config core.hooksPath scripts/hooks"
```

Run (Git Bash) :

```bash
git update-index --add --chmod=+x scripts/hooks/pre-commit scripts/hooks/pre-push
pnpm run prepare
git config core.hooksPath
```

Expected de la derniere commande : `scripts/hooks`.

Note Windows : git lance les hooks avec son propre `sh` ; le shebang et
les fins de ligne LF suffisent. Verifier `file scripts/hooks/pre-commit`
ne dit pas `CRLF`.

- [ ] **Step 3 : les voir refuser, puis accepter**

Un commit qui casse le lint doit etre refuse :

```bash
printf 'import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";\nexport const d: DirectionKey = "jade";\n' > src/lib/essai-hook.ts
git add src/lib/essai-hook.ts
git commit -m "essai" ; echo "code de sortie : $?"
```

Expected: le hook imprime `harnais : eslint`, une erreur `no-restricted-imports` sur `src/lib/essai-hook.ts`, et `code de sortie : 1`. Aucun commit n'est cree (`git log --oneline -1` montre le commit precedent).

Nettoyer :

```bash
git rm -q --cached src/lib/essai-hook.ts && rm src/lib/essai-hook.ts && git status --short
```

Expected: `git status --short` ne montre que les fichiers de cette tache.

- [ ] **Step 4 : commit (le hook s'applique a lui-meme)**

```bash
git add scripts/hooks package.json eslint.config.mjs
git commit -F - <<'EOF'
chore(harnais): hooks pre-commit et pre-push, installes par prepare

Il n'existait aucun hook git dans le depot : « bloque tout commit »
etait une regle sans mecanisme. pre-commit verifie les types et le lint ;
pre-push lance les tests unitaires, et la barre de performance quand la
ref poussee est main (--if-present : elle arrive avec la tranche C).
core.hooksPath est pose par `pnpm install` via prepare. Un correctif de
securite passe avec --no-verify, en le disant.

Vu refuser : un fichier de lib/ qui importe un composant, commit refuse
avec code 1, aucun commit cree.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01D2Uafui7DR6tuf8uVBrPy4
EOF
```

Expected: le hook `pre-commit` tourne (`harnais : tsc`, `harnais : eslint`) et le commit passe.

---

### Task 7 : `docs/harnais.md` et la section de `CLAUDE.md`

**Files:**
- Create: `docs/harnais.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1 : la reference, tranche A**

`docs/harnais.md` :

```markdown
# Le harnais

*La base sur laquelle on itere sans la remettre en question. Design :
`docs/superpowers/specs/2026-09-21-harnais-design.md`. Ce document est la
reference : chaque regle y a un **mecanisme** (ce qui la fait respecter) et
une **preuve** (la mesure du depot qui l'a justifiee). Une regle sans
mecanisme n'entre pas ici.*

Etat : **tranche A** (processus, hooks, lints, types) — 21/09/2026.
Tranches suivantes : B la barre de performance, C les oracles de cause,
D les bases du temps reel, E l'infrastructure.

---

## La definition du fini

Valable pour toute demande, une ligne de CSS comme une nouvelle direction.
Reprise dans `CLAUDE.md`, relue a chaque session.

1. **L'oracle d'abord, vu rouge.** Aucun correctif ni mecanique sans un
   test qui echoue avant et passe apres. Un test jamais vu rouge ne garde
   rien.
2. **Toute mecanique nait pure.** Une lib avec graine et progres en entree,
   testee a l'unite ; le composant qui la rend est mince.
3. **Les regles de code passent** : `tsc`, `eslint`, les tests unitaires.
   Zero erreur, zero avertissement nouveau.
4. **Rien n'a recule.** `perf-bureau` au vert (cliquet) avant toute
   poussee sur `main` ; `perf-telephone` rapportee. Un rouge sur la barre
   se ferme par un oracle de cause, jamais par un seuil. *(Tranche B.)*
5. **Rien n'a disparu.** Aucun element de scene retire pour tenir une
   barre ; le mouvement reduit montre tout ; la premiere image apres le
   voile est complete.
6. **La cloture rapproche.** `close-the-books` : chaque critere
   d'acceptation coche avec sa preuve, la dette nouvelle inscrite, ce
   document mis a jour si une regle ou un mecanisme a bouge.

### Ce qui bloque quoi

| quoi | mecanisme | contournement |
| --- | --- | --- |
| les types et le lint bloquent tout commit | `scripts/hooks/pre-commit` (`eslint --cache`, le cache sous `node_modules/.cache/eslint/` : vingt secondes a froid, un hook a vingt secondes se contourne) | `git commit --no-verify`, dit dans le message, pour une faille de securite seulement |
| les tests unitaires bloquent toute poussee | `scripts/hooks/pre-push` | idem |
| la barre de performance bloque `main` | `scripts/hooks/pre-push`, `pnpm run perf` *(tranche B)* | idem |

Les hooks sont installes par `pnpm install` (`prepare` pose
`core.hooksPath`, et sort en 0 sans `.git` pour qu'une archive ou un
`COPY` Docker s'installe quand meme). S'ils ne tournent pas :
`pnpm run prepare`. Ils restent en LF quel que soit `core.autocrlf` du
poste (`.gitattributes`). Mesure du 22/09 : le hook de commit prend 9 a
12 s a chaud (tsc 4,7 s, eslint en cache 5,7 s), 20 s a froid ; le cache
d'ESLint est cle par la config et la version d'ESLint, pas par le code
des regles — apres une mise a jour d'`eslint-config-next` sans bump
d'`eslint`, supprimer `node_modules/.cache/eslint/`. Les hooks verifient
l'arbre de travail, pas l'index : avec `git add -p`, un commit peut
contenir ce que le hook n'a pas vu ; c'est le prix des cliquets, qui ont
besoin de l'arbre entier.

---

## Pilier 2 : les regles qui se lintent

Toutes dans `eslint/harnais.mjs`, regles du coeur d'ESLint, prouvees sur
des extraits dans `tests/harnais/lints.test.ts`.

| regle | mecanisme | preuve |
| --- | --- | --- |
| `lib/` n'importe jamais un composant ni une page (`@/app/**` et `**/app/**`, par alias ou chemin relatif) | `no-restricted-imports` sous `src/lib/**` | 21/09 : vingt et un fichiers de `lib/` importaient `DirectionKey` depuis un composant. Le type vit dans `lib/direction.ts`. **Limite connue** : la regle ne voit pas un `import()` dynamique ; dans une lib pure il n'y en a pas, et la relecture le garde. |
| aucune lecture synchrone du GPU sous `src/` (`getError`, `readPixels`, `getParameter`, `getProgramParameter`, `checkFramebufferStatus`, `getBufferSubData`), sur n'importe quel objet | `no-restricted-properties` | MDN, WebGL best practices : ces appels vident le pipeline. `src/` n'en avait aucun ; les sondes de `tests/` et `.scratch/` en ont besoin et ne sont pas sous `src/`. Sans restriction d'objet a dessein : les contextes du depot s'appellent `g`, `ctx` ou `gl.getContext()`. **Limite connue** : la liste du design fixe six noms ; `finish`, `getShaderParameter`, `getProgramInfoLog`, `getShaderInfoLog`, `clientWaitSync`, `getSyncParameter`, `getUniform` sont aussi synchrones et passent aujourd'hui — a amender dans le design (tache 8). |
| rien d'alloue dans `useFrame` (objets three : `Vector2/3/4`, `Quaternion`, `Matrix3/4`, `Color`, `Euler`, `Box3`, `Sphere`, `Plane`, `Ray`, `Raycaster`, `Object3D`) | `no-restricted-syntax`, selecteur sur le rappel, a toute profondeur | R3F, performance pitfalls : une allocation par image nourrit le ramasse-miettes. Le motif du depot est `scratch`, cree une fois dehors. **Angles morts connus** : `useFrame(tick)` avec `tick` declare ailleurs, `.clone()` (alloue autant que `new`), `new Float32Array` par image. La relecture les garde. |
| pas de `setState` pilote par la boucle | `no-restricted-syntax`, identifiant nu `set[A-Z]...` **a un seul argument** dans `useFrame` | R3F : React ne re-rend pas a 60 images par seconde ; la boucle ecrit dans des refs. Un setter React prend un argument ; les aides `setXxx(uniforms, valeur)` du depot en prennent deux ou trois (22/09 : 16 des 28 hits du premier jour etaient de celles-la). **Angles morts** : une aide a un argument nommee `setFoo`, un setter renomme, `dispatch` de `useReducer`. |
| plafond de 400 lignes par fichier | `max-lines`, lignes brutes | un fichier qu'on ne tient pas en tete d'un coup se modifie mal. |

### Les cliquets

Deux listes versionnees, lues par la config et gardees par
`tests/harnais/cliquets.test.ts` :

- `scripts/lint-baseline.json` : les fichiers qui violaient les regles de
  la boucle le jour de leur arrivee, geles a leur **meilleur compte connu**
  (en avertissement, les autres en erreur). Point zero du 22/09 : 12
  violations dans 7 fichiers (xolotl-companion 3, background-flora 3,
  milpa 3, frost-world 2, xiuhcoatl-companion 1, grass 1,
  huitzilin-birds 1).
- `scripts/lines-baseline.json` : les fichiers au-dessus de 400 lignes,
  geles a leur taille, comptee comme `max-lines` la compte
  (`scripts/compter-lignes.mjs` ; egal a `wc -l` sur un fichier termine
  par un retour a la ligne, ce que sont tous les fichiers du depot). Dix-huit fichiers le 22/09, le plus gros
  a 1322 (`xolotl-companion.tsx`).

**C'est un cliquet, pas un plafond.** Un fichier gele ne peut ni faire
pire (rien ne recule) ni faire mieux sans que la ligne de base l'inscrive :
`pnpm run harnais:baseline` **acquiert** le progres, sinon 9 puis 3 puis 9
passerait sans bruit. A zero, ou sous 400, le fichier sort. Les chemins a
crochets (`src/app/[locale]/...`) sont echappes avant d'etre donnes a
ESLint, sinon minimatch y lit une classe de caracteres et la derogation
ne s'applique pas — le test le prouve.

`pnpm run lint` sort en 0 avec des avertissements : les derogations sont
invisibles a la ligne de commande, c'est `tests/harnais/cliquets.test.ts`
qui les garde.

---

## Pilier 3 : les trois lois

1. `lib/` est pure et testee a l'unite ; les composants ne font que rendre.
   *Mecanisme : l'import interdit ci-dessus, `tsc` strict, `pnpm test`.*
2. Une regle a une seule source de verite. *Preuve : le 16/09, trois
   lecteurs de l'arc calculaient trois verites ; le 20/09, quarante
   composants court-circuitaient le mouvement reduit chacun a sa facon.*
3. Un oracle garde un comportement, jamais un mecanisme. *Preuve : le
   12/09, deux tests du voile visaient une classe CSS et sont morts avec
   elle.*

### L'inventaire de dette

| dette | viole | cout | depuis |
| --- | --- | --- | --- |
| Quarante composants court-circuitent `reducedMotionRef` chacun a sa facon | loi 2 | a fait echouer la pose au repos (`docs/da/pose-au-repos.md`) ; une regle a la place de quarante la rouvrira | 21/09 |
| Dix-huit fichiers au-dessus de 400 lignes, le plus gros a 1322 (`xolotl-companion.tsx`) | lisibilite | geles par le cliquet | 21/09 |
| « Mode recit » et « mouvement reduit » sont deux mecanismes pour une idee | loi 2 | a unifier | 21/09 |
| ~~`DirectionKey` et `CardinalDirection` vivaient dans des composants, et une troisieme copie (`NepantlaDirection`) dans `lib/nepantla.ts`~~ | lois 1 et 2 | corrige le 21/09, tranche A : une seule source, `lib/direction.ts` | — |

---

## Pilier 2 : ce qui se relit

Pas de mecanisme automatique ; a verifier a la relecture, avec la preuve
qui dit pourquoi.

- Instanciation et faisceaux pour ce qui se repete. *Preuve : 23 appels
  de rendu de moins a l'Ouest en groupant douze papiers et quatorze plumes.*
- Materiaux et geometries partages, jamais clones par objet.
- `transparent` seulement si l'opacite bouge. *Preuve : 11/09, basculer
  `transparent` change la cle du programme, 300 ms de gel en plein voyage.*
- `will-change` pose au moment du besoin et retire apres.
- `delta`, jamais un pas fixe.
- Mipmaps des qu'une texture se voit de loin.
- Toute variante nouvelle de materiau nait sous le voile, jamais en cours
  d'arc. *Mecanisme : les oracles `programmes-tardifs` et
  `materiaux-stables` (tranche C les rattache ici).*

---

## Sources

- MDN, *WebGL best practices* : https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- React Three Fiber, *Performance pitfalls* : https://r3f.docs.pmnd.rs/advanced/pitfalls
- web.dev, *Animations guide* : https://web.dev/articles/animations-guide
```

- [ ] **Step 2 : la section de `CLAUDE.md`**

Ajouter a la fin de `CLAUDE.md` :

```markdown

# Le harnais

**Reference : `docs/harnais.md`. Design : `docs/superpowers/specs/2026-09-21-harnais-design.md`.**
Decide le 21/09/2026 : la base sur laquelle on itere sans la remettre en
question. Valable pour TOUTE demande, une ligne de CSS comme une nouvelle
direction. La definition du fini :

1. **L'oracle d'abord, vu rouge.** Aucun correctif ni mecanique sans un test
   qui echoue avant et passe apres.
2. **Toute mecanique nait pure.** Une lib avec graine et progres en entree,
   testee a l'unite ; le composant qui la rend est mince.
3. **Les regles de code passent** : `tsc`, `eslint`, `pnpm test`. Zero
   erreur, zero avertissement nouveau. Les hooks de `scripts/hooks/` le
   font respecter ; `--no-verify` pour une faille de securite seulement,
   dit dans le message.
4. **Rien n'a recule.** `pnpm run perf` au vert avant toute poussee sur
   `main` (cliquet) ; un rouge sur la barre se ferme par un oracle de
   cause, jamais par un seuil.
5. **Rien n'a disparu.** Aucun element de scene retire pour tenir une
   barre ; le mouvement reduit montre tout ; la premiere image apres le
   voile est complete.
6. **La cloture rapproche.** `close-the-books` : chaque critere
   d'acceptation coche avec sa preuve, la dette nouvelle inscrite dans
   `docs/harnais.md`, qui est mis a jour si une regle ou un mecanisme a
   bouge.
```

- [ ] **Step 3 : verifier que rien ne casse, et commit**

Run: `pnpm exec eslint . 2>&1 | tail -1 && pnpm test 2>&1 | tail -2`
Expected: pas d'erreur ; `1049 passed` (1032 + 17 tests du harnais).

```bash
git add docs/harnais.md CLAUDE.md
git commit -F - <<'EOF'
docs(harnais): la reference et la definition du fini, tranche A

docs/harnais.md : chaque regle avec son mecanisme et sa preuve, les trois
lois, l'inventaire de dette date. CLAUDE.md : la definition du fini en six
lignes, relue a chaque session -- c'est ce qui rend le harnais present a
chaque demande.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01D2Uafui7DR6tuf8uVBrPy4
EOF
```

---

### Task 8 : la cloture de la tranche

**Files:**
- Modify: `docs/superpowers/specs/2026-09-21-harnais-design.md` (section 8)

- [ ] **Step 1 : rapprocher contre les criteres du spec**

Dans le spec, section 8, marquer ce que cette tranche livre :

- critere 1 : `docs/harnais.md` existe, regles avec mecanisme et preuve, dette datee — **fait, tranche A** (la partie barre et oracles arrive avec B et C) ;
- critere 2 : `CLAUDE.md`, section « Le harnais », six lignes — **fait** ;
- critere 7 : cinq lints, aucun import inverse, `max-lines` en cliquet — **fait** ;
- critere 12 : hooks installes par `prepare` — **fait, avec une precision** : les tests unitaires bloquent la poussee, pas le commit (vingt a cinquante commits par jour, huit secondes chacun ; le filet est le meme pour `main`).

Et un **amendement du design**, trouve par la relecture de la tache 3 : la
liste des lectures GPU synchrones (section 3 du spec) fixe six noms, or
`finish`, `getShaderParameter`, `getProgramInfoLog`, `getShaderInfoLog`,
`clientWaitSync`, `getSyncParameter` et `getUniform` sont aussi
synchrones. Ajouter au spec, dans la ligne de cette regle : « liste
ouverte ; `finish` en premier candidat ; toute extension passe par le
test des extraits ». L'extension elle-meme est une tache de la tranche C
(un nom ajoute = un extrait rouge puis vert).

Remplacer dans la section 6 du spec (« Ce qui bloque quoi ») la phrase
`tsc`, `eslint` et `pnpm test` bloquent tout commit` par :

```markdown
`tsc` et `eslint` bloquent tout commit ; `pnpm test` bloque toute poussee
(vingt a cinquante commits par jour, le filet est le meme pour `main`).
```

- [ ] **Step 2 : la preuve complete, une derniere fois**

Run: `git status --short && pnpm exec tsc --noEmit && pnpm exec eslint . 2>&1 | tail -1 && pnpm test 2>&1 | tail -2 && git config core.hooksPath`
Expected: arbre propre ; `tsc` muet ; eslint sans erreur ; `1049 passed` ; `scripts/hooks`.

- [ ] **Step 3 : commit, et la memoire**

```bash
git add docs/superpowers/specs/2026-09-21-harnais-design.md
git commit -F - <<'EOF'
docs(harnais): tranche A close, quatre criteres rapproches

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01D2Uafui7DR6tuf8uVBrPy4
EOF
```

Puis, dans le hub memoire (`project_nahual_da.md`, entree du 21/09 sur le
harnais) : « tranche A livree : commits `<shas>`, 1049 tests, hooks
installes, 21 imports deplaces, point zero des cliquets : <decomptes> ».

---

## Ce que cette tranche ne fait pas, et qui suit

- **Tranche B, la barre** : `playwright.perf.config.ts`, `tests/perf/`,
  les dix-sept moments, les deux projets, le cliquet
  `scripts/perf-baseline.json`, l'auto-test de mesure, `pnpm run perf`
  (que `pre-push` attend deja avec `--if-present`).
- **Tranche C, les oracles de cause** : textures (y compris dans les
  `.glb`), profil telephone et lumieres a ombre, la 2D du voile (rouge le
  premier jour, noeuds nommes), zero erreur GL et console.
- **Tranche D, les bases du temps reel** : budget reparti, temps GPU,
  plafond de programmes, budget d'octets, budget de surdessin.
- **Tranche E, l'infrastructure** : les cinq premieres marches, dont
  `lib/ordonnanceur.ts`.
