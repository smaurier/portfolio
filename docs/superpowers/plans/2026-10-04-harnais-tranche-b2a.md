# Harnais, tranche B2a : la barre sur le telephone emule

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pnpm run perf:telephone` mesure les huit moments de B1 sur un Pixel 7 emule (processeur divise par quatre, Fast 3G pendant le voile), au budget de 33,3 ms, contre sa propre enveloppe dans `scripts/perf-baseline.json` ; la barre du bureau (`pnpm run perf`) ne change pas et reste seule a bloquer `main`.

**Architecture:** Un troisieme projet Playwright `perf-telephone` dans `playwright.perf.config.ts`, qui depend de `auto-test` comme `perf-bureau`. Les deux specs existantes (`voile.perf.ts`, `defilement.perf.ts`) ne se dupliquent pas : elles lisent un PROFIL par nom de projet (budget, emulation ou non) depuis une aide pure `tests/perf/aides/profil.ts`, et une aide d'E/S `emulerLeTelephone` dans `site.ts` pose le processeur /4 et le reseau par CDP avant la navigation. Le cliquet lit le `dpr` du projet, plus une variable d'environnement. `pnpm run perf` ne lance que `perf-bureau` (et sa dependance), `perf:telephone` lance le telephone : rapporte, pas bloquant.

**Tech Stack:** Playwright 1.62 (`devices["Pixel 7"]` : 412 x 839, dpr 2,625, tactile), CDP `Emulation.setCPUThrottlingRate`, `Network.emulateNetworkConditions`, le coeur pur de B1 (`tests/perf/aides/`), Vitest.

**Ce que B2a ne livre pas (B2b, plan a part) :** le vrai telephone par `adb`, le temps GPU (`EXT_disjoint_timer_query_webgl2`, qui sur un telephone emule mesurerait le GPU du PC), les cartes de source, les appels de rendu derriere le composer, l'attribution d'un blocage du fil principal a un intervalle long, les huit transitions par le Centre.

**Ce que B1 a etabli, et sur quoi ce plan repose :**

- Le design (section 2) fixe le profil : Pixel 7 emule, processeur /4, Fast 3G sur le seul moment du voile, budget 33 ms, p5 >= 45 ; pas de temps GPU rapporte. `BUDGET_TELEPHONE_MS = 33.3` existe deja dans `tests/perf/aides/images.ts`, et `resumer()` prend le budget en argument.
- La sonde `.scratch/apres-voile.mjs` (14/09) a deja emule ce profil : `Emulation.setCPUThrottlingRate { rate: 4 }`, puis `Network.enable` et `Network.emulateNetworkConditions { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }` (le Fast 3G des DevTools). Sous ce profil le voile se leve a ~21 s ; `attendreLeFoyer` a 120 s de delai, ca passe.
- `optionsDuProjet(info)` dans `barre.ts` copie deja `viewport`, `deviceScaleFactor`, `userAgent`, `isMobile`, `hasTouch` du projet vers chaque contexte neuf : le Pixel 7 passe par la sans rien changer.
- Le cliquet est une enveloppe par compte (`meilleur`, `maximum`, `plafond = maximum + ecart`), acquise par `pnpm run perf:enveloppe` en cinq jugements ; la ligne de base porte un `dpr` par projet et refuse de comparer deux dpr. Aujourd'hui ce `dpr` vient de `PERF_DPR` (variable d'environnement, 1 par defaut) : juste pour le bureau, faux pour le telephone, dont le dpr est celui de l'appareil.
- Le mode `enveloppe` (`PERF_ACQUERIR=enveloppe`) ne peut pas etre rouge ; `pnpm run perf:baseline` acquiert un progres sans toucher au plafond.
- Mesures connues du 14/09 et 18/09 (sonde, pas la barre) : Contact 30 Hz median le 14/09, 59,9 le 18/09 apres le gel du decor dormant, p5 30 ; Projets 59,9 / p5 30. Ce sont les ordres de grandeur attendus, pas la ligne de base.
- Les sept tests de la barre du bureau durent 328 s, construction comprise. Au processeur /4, compter deux a trois fois plus pour le telephone : un jugement ~10 min, l'acquisition en cinq jugements ~50 min, **machine libre** (pas de build en parallele, pas de navigateur ouvert).

---

## Structure des fichiers

| fichier | responsabilite |
| --- | --- |
| `tests/perf/aides/profil.ts` | **cree.** Le profil d'un projet par son nom : budget (ms), telephone ou non, les constantes du Fast 3G et du processeur /4. Pur. |
| `tests/perf/aides/profil.test.ts` | **cree.** Les tests Vitest du profil. |
| `tests/perf/aides/site.ts` | **modifie.** `emulerLeTelephone(page, { reseau })` : processeur /4 toujours, Fast 3G si `reseau`. E/S. |
| `tests/perf/aides/barre.ts` | **modifie.** `dprDuProjet(info)` remplace la variable d'environnement dans `juger`. |
| `tests/perf/voile.perf.ts` | **modifie.** Lit le profil ; sur le telephone, emule processeur + reseau avant la navigation ; budget du profil. |
| `tests/perf/defilement.perf.ts` | **modifie.** Lit le profil ; sur le telephone, emule le processeur seul ; budget du profil. |
| `playwright.perf.config.ts` | **modifie.** Projet `perf-telephone` (Pixel 7), dependance `auto-test`, delai par test porte a 15 min. |
| `package.json` | **modifie.** `perf` ne lance que `perf-bureau` ; `perf:telephone` lance le telephone. |
| `scripts/perf-baseline.json` | **modifie** par acquisition : la cle `perf-telephone`, `dpr` 2,625. |
| `docs/harnais.md`, design section 8 | **modifies.** La ligne `perf-telephone`, « rapportee, pas bloquante ». |

---

### Task 1 : le profil d'un projet (`profil.ts`)

**Files:**
- Create: `tests/perf/aides/profil.ts`
- Test: `tests/perf/aides/profil.test.ts`

- [ ] **Step 1 : ecrire le test, rouge**

`tests/perf/aides/profil.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { BUDGET_BUREAU_MS, BUDGET_TELEPHONE_MS } from "./images";
import { FAST_3G, PROCESSEUR_TELEPHONE, profilDuProjet } from "./profil";

/**
 * LE PROFIL PAR PROJET : les deux specs de la barre ne se dupliquent pas pour
 * le telephone, elles lisent leur budget et leur emulation ici, par le nom du
 * projet Playwright. Un nom inconnu est une erreur, pas un bureau par defaut :
 * un projet ajoute sans profil serait juge au mauvais budget en silence.
 */
describe("le profil d'un projet", () => {
  it("le bureau : 16,7 ms, pas d'emulation", () => {
    expect(profilDuProjet("perf-bureau")).toEqual({ budgetMs: BUDGET_BUREAU_MS, telephone: false });
  });
  it("le telephone : 33,3 ms, emule", () => {
    expect(profilDuProjet("perf-telephone")).toEqual({ budgetMs: BUDGET_TELEPHONE_MS, telephone: true });
  });
  it("un projet sans profil est une erreur qui le nomme", () => {
    expect(() => profilDuProjet("perf-tablette")).toThrow(/perf-tablette/);
  });
  it("les constantes de l'emulation sont celles des DevTools (Fast 3G) et du design (processeur divise par quatre)", () => {
    expect(PROCESSEUR_TELEPHONE).toBe(4);
    expect(FAST_3G).toEqual({ offline: false, latency: 562.5, downloadThroughput: 209_715.2, uploadThroughput: 96_000 });
  });
});
```

- [ ] **Step 2 : le voir rouge**

Run: `pnpm exec vitest run tests/perf/aides/profil.test.ts`
Expected: FAIL, `Cannot find module './profil'`.

- [ ] **Step 3 : `profil.ts`**

```ts
/**
 * LE PROFIL D'UN PROJET DE LA BARRE (B2a, 04/10).
 *
 * Les specs de la barre tournent sous plusieurs projets Playwright et ne se
 * dupliquent pas : elles demandent ici le budget d'image et l'emulation qui
 * vont avec le nom du projet. Le bureau juge a 16,7 ms sans emulation ; le
 * telephone a 33,3 ms (design, section 2 : Pixel 7, processeur divise par
 * quatre, Fast 3G sur le voile). Les valeurs du Fast 3G sont celles des
 * DevTools de Chrome : 1,6 Mbit/s en descente, 750 kbit/s en montee, 562,5
 * ms de latence (`.scratch/apres-voile.mjs`, 14/09). Ce module est pur.
 */
import { BUDGET_BUREAU_MS, BUDGET_TELEPHONE_MS } from "./images";

export type Profil = { budgetMs: number; telephone: boolean };

/** Le processeur du telephone emule : celui du PC divise par quatre (design, section 2). */
export const PROCESSEUR_TELEPHONE = 4;

/** Le Fast 3G des DevTools, en octets par seconde et millisecondes, tel que `Network.emulateNetworkConditions` le prend. */
export const FAST_3G = {
  offline: false,
  latency: 562.5,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
} as const;

const PROFILS: Record<string, Profil> = {
  "perf-bureau": { budgetMs: BUDGET_BUREAU_MS, telephone: false },
  "perf-telephone": { budgetMs: BUDGET_TELEPHONE_MS, telephone: true },
};

export function profilDuProjet(nom: string): Profil {
  const p = PROFILS[nom];
  if (!p) throw new Error(`le projet ${nom} n'a pas de profil dans tests/perf/aides/profil.ts : budget et emulation inconnus`);
  return p;
}
```

- [ ] **Step 4 : le voir vert, `tsc`, `eslint`, commit**

Run: `pnpm exec vitest run tests/perf/aides/profil.test.ts && pnpm exec tsc --noEmit && pnpm exec eslint tests/perf --cache --cache-location node_modules/.cache/eslint/`
Expected: 4 passed, rien d'autre.

```bash
git add tests/perf/aides/profil.ts tests/perf/aides/profil.test.ts
git commit -m "test(perf): le profil d'un projet de la barre, budget et emulation par nom, pur"
```

---

### Task 2 : l'emulation, le dpr du projet, et les deux specs qui lisent le profil

**Files:**
- Modify: `tests/perf/aides/site.ts` (ajout en fin de fichier)
- Modify: `tests/perf/aides/barre.ts` (`DPR` et `juger`)
- Modify: `tests/perf/voile.perf.ts`
- Modify: `tests/perf/defilement.perf.ts`

- [ ] **Step 1 : `emulerLeTelephone` dans `site.ts`**

Ajouter en fin de `tests/perf/aides/site.ts` :

```ts
/**
 * Le telephone emule (B2a) : processeur divise par quatre toujours, Fast 3G
 * si `reseau` (le design ne ralentit le reseau que pendant le voile : le
 * defilement se mesure sur une page deja chargee). A appeler AVANT la
 * navigation, sur une session CDP a part de celle du tracage.
 */
export async function emulerLeTelephone(page: Page, options: { reseau: boolean }): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: PROCESSEUR_TELEPHONE });
  if (options.reseau) {
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { ...FAST_3G });
  }
}
```

Et en tete du fichier, apres `import type { Page } from "@playwright/test";` :

```ts
import { FAST_3G, PROCESSEUR_TELEPHONE } from "./profil";
```

- [ ] **Step 2 : le dpr vient du projet dans `barre.ts`**

Remplacer la ligne :

```ts
export const DPR = Number(process.env.PERF_DPR ?? "1");
```

par :

```ts
/** Le dpr auquel ce projet mesure : celui de l'appareil emule (Pixel 7 : 2,625), 1 sur le bureau. La ligne de base le porte et refuse de comparer deux dpr. */
export function dprDuProjet(info: TestInfo): number {
  return info.project.use.deviceScaleFactor ?? 1;
}
```

Dans `juger`, remplacer :

```ts
  const base = lireLigneDeBase();
  const entree = base[projet];
  if (entree && entree.dpr !== DPR) {
    throw new Error(`la ligne de base de ${projet} a ete mesuree au dpr ${entree.dpr}, cette passe est au dpr ${DPR} : relance avec PERF_DPR=${entree.dpr}, ou acquiers une ligne neuve`);
  }
```

par :

```ts
  const dpr = dprDuProjet(info);
  const base = lireLigneDeBase();
  const entree = base[projet];
  if (entree && entree.dpr !== dpr) {
    throw new Error(`la ligne de base de ${projet} a ete mesuree au dpr ${entree.dpr}, cette passe est au dpr ${dpr} : le projet a change d'appareil, acquiers une ligne neuve (pnpm run perf:enveloppe -- --project=${projet})`);
  }
```

et, plus bas, `base[projet] = { dpr: DPR, moments: ... }` devient `base[projet] = { dpr, moments: ... }`.

`PERF_DPR` reste lu par `playwright.perf.config.ts` pour le bureau (c'est lui qui fixe `deviceScaleFactor` du projet) : une seule source, le projet.

- [ ] **Step 3 : `voile.perf.ts` lit le profil**

Remplacer les imports :

```ts
import { BUDGET_BUREAU_MS, trames } from "./aides/images";
import { REPERE, attendreLeFoyer, infoRendu, poserLesReperes } from "./aides/site";
```

par :

```ts
import { trames } from "./aides/images";
import { profilDuProjet } from "./aides/profil";
import { REPERE, attendreLeFoyer, emulerLeTelephone, infoRendu, poserLesReperes } from "./aides/site";
```

Dans le test, apres `const passes: Record<...> = ...;`, ajouter :

```ts
  const profil = profilDuProjet(info.project.name);
```

Apres `await poserLesReperes(page);`, ajouter :

```ts
    if (profil.telephone) await emulerLeTelephone(page, { reseau: true });
```

Et remplacer les trois `BUDGET_BUREAU_MS` des appels a `mesurer` par `profil.budgetMs`.

- [ ] **Step 4 : `defilement.perf.ts` lit le profil**

Remplacer les imports :

```ts
import { BUDGET_BUREAU_MS } from "./aides/images";
import { REPERE, attendreLeFoyer, defiler, infoRendu } from "./aides/site";
```

par :

```ts
import { profilDuProjet } from "./aides/profil";
import { REPERE, attendreLeFoyer, defiler, emulerLeTelephone, infoRendu } from "./aides/site";
```

Dans le test, avant la boucle des passes :

```ts
    const profil = profilDuProjet(info.project.name);
```

Apres `const page = await ctx.newPage();` :

```ts
      if (profil.telephone) await emulerLeTelephone(page, { reseau: false });
```

Et `BUDGET_BUREAU_MS` dans l'appel a `mesurer` devient `profil.budgetMs`.

- [ ] **Step 5 : `tsc`, `eslint`, la barre du bureau inchangee**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint tests/perf --cache --cache-location node_modules/.cache/eslint/ && pnpm run perf`
Expected: rien pour `tsc` et `eslint` ; `7 passed`, tous `tenu` ou `progres a acquerir`, en ~5,5 min. Le bureau n'a pas bouge : le profil `perf-bureau` rend exactement le budget d'avant et n'emule rien.

- [ ] **Step 6 : commit**

```bash
git add tests/perf/aides/site.ts tests/perf/aides/barre.ts tests/perf/voile.perf.ts tests/perf/defilement.perf.ts
git commit -m "perf(barre): les specs lisent leur profil par projet ; emulation du telephone par CDP ; le dpr vient du projet"
```

---

### Task 3 : le projet `perf-telephone` et les scripts

**Files:**
- Modify: `playwright.perf.config.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1 : le projet dans la config**

Dans `playwright.perf.config.ts`, apres `const BUREAU = ...`, ajouter :

```ts
// Le telephone (B2a) : Pixel 7 emule tel que Playwright le decrit (412 x 839,
// dpr 2,625, tactile). Le processeur /4 et le Fast 3G se posent par CDP dans
// chaque passe (`aides/site.ts`), pas ici : la config ne sait pas le faire.
const { defaultBrowserType: _telephone, ...TELEPHONE } = devices["Pixel 7"];
```

Remplacer `timeout: 600_000,` par :

```ts
  // Quinze minutes par test : au processeur /4, le defilement d'une page (trois passes) tient en ~3 min, le voile (quatre navigations a 21 s de voile) en ~4 min ; la marge couvre une machine chargee.
  timeout: 900_000,
```

Et dans `projects`, apres le projet `perf-bureau` :

```ts
    { name: "perf-telephone", dependencies: ["auto-test"], testIgnore: /auto-test\.perf\.ts/, use: TELEPHONE },
```

Mettre a jour le commentaire d'en-tete : apres la ligne `` * `pnpm run perf` ; obligatoire avant toute poussee sur `main` (hook `` ajouter :

```ts
 * `pnpm run perf:telephone` : le Pixel 7 emule, RAPPORTE et pas bloquant
 * (B2a) ; il bloquera quand son enveloppe aura tenu quelques semaines.
```

- [ ] **Step 2 : les scripts**

Dans `package.json`, remplacer :

```json
    "perf": "playwright test -c playwright.perf.config.ts",
```

par :

```json
    "perf": "playwright test -c playwright.perf.config.ts --project=perf-bureau",
    "perf:telephone": "playwright test -c playwright.perf.config.ts --project=perf-telephone",
```

Playwright lance toujours les dependances d'un projet : `--project=perf-bureau` lance `auto-test` avant, comme aujourd'hui.

- [ ] **Step 3 : verifier sans mesurer**

Run: `pnpm exec playwright test -c playwright.perf.config.ts --list --project=perf-bureau`
Expected: `Total: 7 tests in 3 files` (1 auto-test, 1 voile, 5 defilements), tous `[auto-test]` ou `[perf-bureau]`.

Run: `pnpm exec playwright test -c playwright.perf.config.ts --list --project=perf-telephone`
Expected: `Total: 7 tests in 3 files`, le premier `[auto-test]`, les six autres `[perf-telephone]`.

Run: `pnpm exec playwright test -c playwright.perf.config.ts --list`
Expected: `Total: 13 tests` (1 + 6 + 6) : c'est ce que `perf:enveloppe` sans `--project` lancerait, d'ou le `--project` obligatoire a la tache 4.

- [ ] **Step 4 : `tsc`, `eslint`, commit**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint playwright.perf.config.ts --cache --cache-location node_modules/.cache/eslint/`
Expected: rien.

```bash
git add playwright.perf.config.ts package.json
git commit -m "perf(barre): le projet perf-telephone (Pixel 7 emule) ; pnpm run perf ne lance que le bureau, perf:telephone le telephone"
```

---

### Task 4 : le point zero du telephone, par acquisition de l'enveloppe

**Files:**
- Modify: `scripts/perf-baseline.json` (par acquisition)

- [ ] **Step 1 : machine libre**

Fermer les navigateurs, ne rien construire en parallele. Verifier qu'aucun serveur ne traine : `netstat -ano | grep ":3100" | grep LISTENING` doit etre vide.

- [ ] **Step 2 : un jugement d'essai, pour lire les durees**

Run: `pnpm run perf:telephone 2>&1 | grep -E "auto-test :|perf-telephone / |passe [0-9] :|passed|failed|Error"`
Expected: l'auto-test vert ; puis `perf-telephone / voile-attente : aucune ligne de base : a acquerir ...` et, en mode jugement sans ligne de base, **un rouge** sur chaque moment : `n'a pas de ligne de base : pnpm run perf:enveloppe`. C'est le rouge attendu d'un moment jamais acquis. Noter la duree totale : c'est le cout d'un jugement (~10 min attendu). Lire les trois passes de l'attente : au processeur /4 et Fast 3G, le voile doit se lever (sinon `attendreLeFoyer` sort en 120 s : relever le delai a 240 s dans `site.ts` et le dire dans le commit).

Si un moment ne presente pas 20 images (`la barre ne peut pas conclure sur ce moment`), ne pas baisser le plancher : lire la passe, et chercher pourquoi la page n'a rien presente (reseau trop lent pour le moment choisi, repere absent).

- [ ] **Step 3 : l'enveloppe en cinq jugements**

Run: `pnpm run perf:enveloppe -- --project=perf-telephone 2>&1 | grep -E "=== enveloppe|perf-telephone / |passed|failed|Error"`
Expected: cinq fois `7 passed` (auto-test compris), ~50 min, chaque ligne `enveloppe elargie : au-dela N (a a b, plafond c), perdues ...`. A la fin, `scripts/perf-baseline.json` porte `"perf-telephone": { "dpr": 2.625, "moments": { ... } }` avec les huit moments.

Verifier : `node -e 'const j=JSON.parse(require("fs").readFileSync("scripts/perf-baseline.json","utf8"));console.log(j["perf-telephone"].dpr, Object.keys(j["perf-telephone"].moments).length)'` -> `2.625 8`.

- [ ] **Step 4 : la barre tient sur elle-meme**

Run: `pnpm run perf:telephone 2>&1 | grep -E "perf-telephone / |passed|failed"`
Expected: `7 passed`, huit `tenu :` ou `progres a acquerir`. Un RECUL ici, sans code change, veut dire que cinq jugements n'ont pas suffi a mesurer le bruit du processeur /4 : le dire dans le rapport avec les chiffres, ne pas toucher au plafond a la main, et relancer `perf:enveloppe` (qui elargit) en le disant dans le commit.

- [ ] **Step 5 : le voir ROUGE par la ligne de base**

Sauvegarder le JSON hors du depot (`cp scripts/perf-baseline.json "$TEMP/perf-baseline.sauvegarde.json"`), puis y mettre `"auDela": 0` et `"perdues": 0` a `perf-telephone.moments.voile-attente.plafond`.

Run: `pnpm run perf:telephone ; echo "code $?"`
Expected: `1 failed`, code 1, `perf-telephone / voile-attente : RECUL : au-dela N (meilleur connu N, maximum connu N, plafond 0, cible 0)...`, et les huit lignes de temps propre de la pire image.

Restaurer : `cp "$TEMP/perf-baseline.sauvegarde.json" scripts/perf-baseline.json`, puis verifier que `plafond` est revenu.

- [ ] **Step 6 : commit, avec les chiffres**

```bash
git add scripts/perf-baseline.json
git commit -F - <<'EOF'
perf(barre): le telephone emule, point zero acquis en cinq jugements

Pixel 7, processeur /4, Fast 3G sur le voile, budget 33,3 ms, dpr 2,625.
<les huit enveloppes : moment, au-dela min-max (plafond), perdues min-max (plafond), pire ms, p5>
<la duree d'un jugement et de l'acquisition>

Vu rouge avec un plafond a zero : RECUL, code 1, la pire image nommee.
Tient sur elle-meme : tenu x8. Rapporte, pas bloquant : `pnpm run perf`
reste le bureau seul.
EOF
```

---

### Task 5 : la documentation et la cloture

**Files:**
- Modify: `docs/harnais.md` (section « Pilier 1 », table des mecanismes, et « Ce qui n'y est pas encore »)
- Modify: `docs/superpowers/specs/2026-09-21-harnais-design.md` (section 8, critere 3 ; section 6 ter, chantier 2)
- Modify: `docs/superpowers/plans/2026-10-04-harnais-tranche-b2a.md` (cocher)

- [ ] **Step 1 : `docs/harnais.md`**

Dans la table des mecanismes du pilier 1, apres la ligne `tests/perf/defilement.perf.ts`, ajouter (les N sont les chiffres du commit de la tache 4) :

```markdown
| projet `perf-telephone`, `pnpm run perf:telephone` | les memes huit moments sur un Pixel 7 emule (412 x 839, dpr 2,625) : processeur divise par quatre par CDP, Fast 3G des DevTools pendant le voile seulement, budget 33,3 ms ; chaque spec lit son profil par nom de projet (`aides/profil.ts`), le dpr vient du projet | point zero du 04/10, cinq jugements : attente N / N, ouverture N, arrivee N, defilements N ; **rapporte, pas bloquant** : `pnpm run perf` reste le bureau seul, le telephone bloquera quand son enveloppe aura tenu. Le 14/09, Contact etait a 30 Hz median sous ce profil. |
```

Dans « Ce qui n'y est pas encore (B2) », retirer `perf-telephone (Pixel 7, processeur /4, Fast 3G sur le voile, cible 33 ms et p5 >= 45)` et ecrire a la place `le vrai telephone par adb`, en tete de liste. Mettre a jour la ligne d'etat en tete du document : `**Tranche B2a** (le telephone emule) : plan 04/10, livree <date>.`

- [ ] **Step 2 : le design**

Section 8, critere 3, apres le texte de B1 : `— **B2a (<date>)** : perf-telephone, huit moments, rapporte et pas bloquant ; le temps GPU et le budget reparti restent en B2b.`

Section 6 ter, ligne du chantier 2 (« Un vrai telephone ») : ajouter dans la colonne de la premiere marche : `B2a (<date>) : l'emulation est en place et mesuree ; la marche adb reste a faire.`

- [ ] **Step 3 : cocher, `pnpm test`, commit**

Cocher toutes les cases de ce plan.

Run: `pnpm test`
Expected: 1096 + 4 = 1100 tests verts (les 4 du profil).

```bash
git add docs/harnais.md docs/superpowers/specs/2026-09-21-harnais-design.md docs/superpowers/plans/2026-10-04-harnais-tranche-b2a.md
git commit -m "docs(harnais): B2a livree, le telephone emule rapporte ; adb, temps GPU et cartes de source en B2b"
```

- [ ] **Step 4 : la poussee**

`dev` est pousse a chaque tache. `main` : avance rapide quand il y a quelque chose a montrer (regle de `CLAUDE.md`) ; le hook `pre-push` y lance `pnpm run perf` (le bureau seul, ~5,5 min), pas le telephone.
