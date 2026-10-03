# Harnais, tranche B1 : la barre de performance, son socle et le bureau

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pnpm run perf` mesure les images PRESENTEES par le compositeur sur la production, moment par moment, contre un cliquet versionne ; un rouge nomme ce qui a occupe sa pire image ; la barre refuse de conclure quand son chemin de mesure est en defaut (auto-test ; le 22/09 ecrivait « sur une machine bruyante », mesure faux le 03/10, voir la tache 4) ; et le hook `pre-push` la lance deja sur `main`.

**Architecture:** Une seconde suite Playwright (`playwright.perf.config.ts`, serveur de production sur `:3100`), courte, hors de la suite par defaut. Le coeur est pur et teste a l'unite : des evenements de trace Chromium en entree, des trames, des intervalles, des comptes et un verdict en sortie (`tests/perf/aides/`). Les tests de la barre (`*.perf.ts`) ne font que conduire le site, tracer, et appeler ce coeur. Le cliquet vit dans `scripts/perf-baseline.json` (meilleur connu, cible a cote, `dpr` de mesure), acquis par `pnpm run perf:baseline`, jamais abaisse.

**Tech Stack:** Playwright 1.62 (`newCDPSession`, domaine `Tracing`), evenements `PipelineReporter` / `TimeStamp` / `FunctionCall` du tracage Chromium, Vitest pour le coeur, Next `build` + `start -p 3100`.

**Ce que la tranche B1 ne livre pas (B2, plan a part) :** le projet `perf-telephone` (Pixel 7, processeur /4, Fast 3G sur le voile), les huit transitions par le Centre, le budget reparti script / soumission / GPU et le temps GPU (`EXT_disjoint_timer_query_webgl2`), les noms de source de la pire image (cartes de source : en production les fonctions s'appellent `O`). B1 livre le socle sur lequel tout cela se pose, et les huit moments du bureau : l'attente du voile, l'ouverture, l'arrivee, le defilement des cinq pages.

**Ce que l'exploration du 22/09 a etabli (`.scratch/trace-images.mjs`, `.scratch/trace-reperes.mjs`), et sur quoi le code ci-dessous repose :**

- Categories a tracer : `disabled-by-default-devtools.timeline.frame`, `devtools.timeline`, `disabled-by-default-devtools.timeline`. Deux secondes et demie de voile : 37 000 evenements, ca passe en `ReportEvents`.
- Une trame = un evenement asynchrone `PipelineReporter` (`ph: "b"` puis `"e"`, apparies par `id2.local` dans le meme processus), emis sur le fil `Compositor` du processus de rendu (les fils sont nommes par les evenements `ph: "M"`, `name: "thread_name"`, `args.name`). Le `b` porte `args.frame_reporter.frame_sequence` et `args.frame_reporter.state` : `STATE_PRESENTED_ALL`, `STATE_PRESENTED_PARTIAL`, `STATE_DROPPED`, `STATE_NO_UPDATE_DESIRED`. Le `ts` du `e` est l'instant de presentation. Le processus navigateur emet aussi quelques `PipelineReporter` : on prend le processus dont le fil `Compositor` en a le plus.
- Une rotation CSS isolee (page `data:`, aucun script) presente 150 trames en 2,5 s, 2 perdues a la naissance de la page, aucune ensuite : c'est l'auto-test de mesure. L'attente du voile sur la production : 130 presentees (85 entieres, 45 partielles), 57 perdues, 13 sans mise a jour, en 2,5 s.
- `console.timeStamp("nom")` depuis la page devient un evenement `TimeStamp` (`args.data.message`) a l'horloge de la trace : c'est ainsi que les bornes des moments (`data-loaded`, `data-foyer=done`, debut et fin du balayage) entrent dans la trace sans conversion d'horloge. L'observateur d'attributs se pose a `DOMContentLoaded` (a l'instant du script d'initialisation, `document.documentElement` n'existe pas encore).
- Le fil principal s'appelle `CrRendererMain` ; ses evenements complets (`ph: "X"`, `dur` en us) sont `RunTask`, `FunctionCall` (`args.data.functionName`, `url`, `lineNumber`, `columnNumber`), `EvaluateScript`, `v8.compile`, `Layout`, `UpdateLayoutTree`, `Paint`, `Decode Image`, `TimerFire`, `FireAnimationFrame`... Ils sont proprement imbriques : le temps propre se calcule avec une pile.
- `pnpm run build` : 21 s. La barre reconstruit a chaque passe ; un serveur qui traine sur `:3100` serait une mesure d'un autre code, donc `reuseExistingServer: false`.
- Le compte d'images « au-dela du budget » tolere une demi-periode (8,3 ms) : une image presentee a 16,8 ms n'est pas en retard, une a 25 a manque un balayage.

---

## Structure des fichiers

| fichier | responsabilite |
| --- | --- |
| `tests/perf/aides/evenements.ts` | le type `Evenement` ; trouver le processus de rendu, le fil principal, les reperes `TimeStamp`. Pur. |
| `tests/perf/aides/images.ts` | des evenements aux trames, aux paires d'intervalles, au resume (au-dela, pire, 60/30/20 Hz, p5), aux perdues ; la mediane. Pur. |
| `tests/perf/aides/fil-principal.ts` | le temps propre par etiquette dans une fenetre du fil principal. Pur. |
| `tests/perf/aides/cliquet.ts` | le verdict d'une mesure contre une ligne de base, et l'acquisition. Pur. |
| `tests/perf/aides/ligne-de-base.ts` | lire et ecrire `scripts/perf-baseline.json`. E/S. |
| `tests/perf/aides/tracage.ts` | ouvrir et fermer un tracage CDP sur une page. E/S. |
| `tests/perf/aides/site.ts` | conduire le site : poser les reperes, attendre le foyer, lire `renderer.info`, balayer. E/S. |
| `tests/perf/aides/barre.ts` | mesurer une fenetre en une `Passe`, juger trois passes (mediane, verdict, rapport, acquisition). |
| `tests/perf/aides/*.test.ts` | les tests Vitest du coeur pur (lances par `pnpm test`). |
| `tests/perf/auto-test.perf.ts` | l'auto-test de mesure (projet `auto-test`, dont `perf-bureau` depend). |
| `tests/perf/voile.perf.ts` | trois moments : `voile-attente`, `voile-ouverture`, `arrivee`. |
| `tests/perf/defilement.perf.ts` | cinq moments : `defilement-fr`, `-services`, `-projets`, `-contact`, `-memoire`. |
| `playwright.perf.config.ts` | la seconde suite : projets `auto-test` et `perf-bureau`, serveur de production `:3100`. |
| `scripts/perf-baseline.mjs` | `pnpm run perf:baseline` : lance la barre en mode acquisition. |
| `scripts/perf-baseline.json` | le cliquet, versionne. |
| `package.json` | scripts `perf` et `perf:baseline`. |
| `docs/harnais.md` | la section « Pilier 1 » ecrite. |

Vitest ramasse `tests/perf/aides/*.test.ts` (sa config n'exclut que `tests/e2e`) ; Playwright n'y touche pas (`testMatch: /.*\.perf\.ts/`). La suite e2e par defaut (`testDir: ./tests/e2e`) ne voit rien de tout ceci.

---

### Task 1 : le coeur des images (`evenements.ts`, `images.ts`)

**Files:**
- Create: `tests/perf/aides/evenements.ts`
- Create: `tests/perf/aides/images.ts`
- Test: `tests/perf/aides/images.test.ts`

- [x] **Step 1 : ecrire les tests, rouges**

`tests/perf/aides/images.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Evenement } from "./evenements";
import { filPrincipal, processusDeRendu, reperes } from "./evenements";
import { BUDGET_BUREAU_MS, fenetre, mediane, paires, perdues, resumer, trames } from "./images";

/**
 * LE COEUR DE LA BARRE, SUR DES EVENEMENTS FABRIQUES.
 *
 * La forme des evenements est celle relevee le 22/09 sur le tracage
 * Chromium (`.scratch/trace-images.mjs`) : une trame est un PipelineReporter
 * `b`/`e` apparie par `id2.local`, sur le fil Compositor du processus de
 * rendu ; les fils sont nommes par des evenements `M`.
 */
const RENDU = 100;
const NAVIGATEUR = 1;
const fils: Evenement[] = [
  { name: "thread_name", ph: "M", pid: RENDU, tid: 11, ts: 0, args: { name: "CrRendererMain" } },
  { name: "thread_name", ph: "M", pid: RENDU, tid: 12, ts: 0, args: { name: "Compositor" } },
  { name: "thread_name", ph: "M", pid: NAVIGATEUR, tid: 2, ts: 0, args: { name: "CrBrowserMain" } },
];

/** Une trame : debut `ts`, presentee `dur` us plus tard, dans l'etat donne. */
function trame(pid: number, tid: number, sequence: number, ts: number, dur: number, etat: string, id = `0x${sequence.toString(16)}`): Evenement[] {
  return [
    { name: "PipelineReporter", ph: "b", pid, tid, ts, id2: { local: id }, args: { frame_reporter: { frame_sequence: sequence, state: etat } } },
    { name: "PipelineReporter", ph: "e", pid, tid, ts: ts + dur, id2: { local: id }, args: {} },
  ];
}

/** Six trames a 16 667 us, la quatrieme perdue : un trou de 33 ms entre la 3 et la 5. */
const reguliere: Evenement[] = [
  ...fils,
  ...trame(NAVIGATEUR, 2, 1, 0, 5_000, "STATE_PRESENTED_ALL"),
  ...trame(RENDU, 12, 1, 0, 10_000, "STATE_PRESENTED_ALL"),
  ...trame(RENDU, 12, 2, 16_667, 10_000, "STATE_PRESENTED_ALL"),
  ...trame(RENDU, 12, 3, 33_334, 10_000, "STATE_PRESENTED_PARTIAL"),
  ...trame(RENDU, 12, 4, 50_001, 10_000, "STATE_DROPPED"),
  ...trame(RENDU, 12, 5, 66_668, 10_000, "STATE_PRESENTED_ALL"),
  ...trame(RENDU, 12, 6, 83_335, 10_000, "STATE_PRESENTED_ALL"),
];

describe("le processus et les fils", () => {
  it("le processus de rendu est celui dont le fil Compositor porte le plus de trames", () => {
    expect(processusDeRendu(reguliere)).toBe(RENDU);
  });
  it("sans fil Compositor, la trace ne porte pas d'images et on le dit", () => {
    expect(() => processusDeRendu(fils)).toThrow(/aucun fil Compositor/);
  });
  it("le fil principal est CrRendererMain du processus de rendu", () => {
    expect(filPrincipal(reguliere, RENDU)).toBe(11);
  });
  it("les reperes TimeStamp donnent le premier instant de chaque nom", () => {
    const evts: Evenement[] = [
      { name: "TimeStamp", ph: "I", pid: RENDU, tid: 11, ts: 500, args: { data: { message: "nahual:data-loaded" } } },
      { name: "TimeStamp", ph: "I", pid: RENDU, tid: 11, ts: 900, args: { data: { message: "nahual:data-loaded" } } },
      { name: "TimeStamp", ph: "I", pid: RENDU, tid: 11, ts: 1200, args: { data: { message: "nahual:data-foyer-done" } } },
    ];
    expect([...reperes(evts)]).toEqual([["nahual:data-loaded", 500], ["nahual:data-foyer-done", 1200]]);
  });
});

describe("les trames", () => {
  it("apparie b et e par identifiant, dans le seul processus de rendu, triees par sequence", () => {
    const t = trames(reguliere);
    expect(t.map((x) => x.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(t[0]).toEqual({ sequence: 1, debut: 0, fin: 10_000, etat: "STATE_PRESENTED_ALL" });
    expect(t[3].etat).toBe("STATE_DROPPED");
  });
  it("un identifiant reutilise apres sa fin donne deux trames, pas une", () => {
    const evts = [...fils, ...trame(RENDU, 12, 1, 0, 1_000, "STATE_PRESENTED_ALL", "0xa"), ...trame(RENDU, 12, 2, 5_000, 1_000, "STATE_PRESENTED_ALL", "0xa")];
    expect(trames(evts).map((x) => x.sequence)).toEqual([1, 2]);
  });
  it("un b sans e est une trame encore en vol : ignoree", () => {
    const evts = [...fils, ...trame(RENDU, 12, 1, 0, 1_000, "STATE_PRESENTED_ALL"), { name: "PipelineReporter", ph: "b", pid: RENDU, tid: 12, ts: 20_000, id2: { local: "0x9" }, args: { frame_reporter: { frame_sequence: 2, state: "STATE_PRESENTED_ALL" } } } as Evenement];
    expect(trames(evts)).toHaveLength(1);
  });
  it("la fenetre garde les trames dont la presentation tombe entre deux instants, perdues comprises", () => {
    const t = trames(reguliere);
    expect(fenetre(t, 20_000, 60_001).map((x) => x.sequence)).toEqual([2, 3, 4]);
  });
});

describe("les paires d'intervalles", () => {
  it("mesure entre deux presentations consecutives, et une perdue entre elles allonge l'intervalle", () => {
    const p = paires(trames(reguliere));
    expect(p.map((x) => Math.round(x.ms * 10) / 10)).toEqual([16.7, 16.7, 33.3, 16.7]);
    expect(p[2]).toEqual({ debut: 43_334, fin: 76_668, ms: 33.334 });
  });
  it("une trame sans mise a jour coupe la serie : rien n'etait a dessiner", () => {
    const evts = [
      ...fils,
      ...trame(RENDU, 12, 1, 0, 1_000, "STATE_PRESENTED_ALL"),
      ...trame(RENDU, 12, 2, 16_667, 1_000, "STATE_NO_UPDATE_DESIRED"),
      ...trame(RENDU, 12, 3, 500_000, 1_000, "STATE_PRESENTED_ALL"),
      ...trame(RENDU, 12, 4, 516_667, 1_000, "STATE_PRESENTED_ALL"),
    ];
    expect(paires(trames(evts)).map((x) => Math.round(x.ms))).toEqual([17]);
  });
});

describe("le resume", () => {
  it("compte les images au-dela du budget avec une demi-periode de tolerance, la pire, la repartition, le p5", () => {
    const r = resumer([16.7, 16.8, 25.1, 33.3, 41.7, 50, 100, 16.6, 16.7, 16.7], BUDGET_BUREAU_MS);
    expect(r).toEqual({ images: 10, auDela: 5, pire: 100, hz60: 50, hz30: 20, hz20: 30, p5Fps: 10 });
  });
  it("une serie vide est un resume a zero, pas une division par zero", () => {
    expect(resumer([], BUDGET_BUREAU_MS)).toEqual({ images: 0, auDela: 0, pire: 0, hz60: 0, hz30: 0, hz20: 0, p5Fps: 0 });
  });
  it("les perdues sont les trames STATE_DROPPED", () => {
    expect(perdues(trames(reguliere))).toBe(1);
  });
});

describe("la mediane", () => {
  it("impair, pair, et vide", () => {
    expect(mediane([3, 1, 2])).toBe(2);
    expect(mediane([4, 1, 3, 2])).toBe(2.5);
    expect(() => mediane([])).toThrow(/vide/);
  });
});
```

- [x] **Step 2 : les voir rouges**

Run: `pnpm exec vitest run tests/perf/aides/images.test.ts`
Expected: FAIL, `Cannot find module './evenements'` (ou `./images`).

- [x] **Step 3 : `evenements.ts`**

```ts
/**
 * LES EVENEMENTS DE TRACE, ET COMMENT S'Y REPERER.
 *
 * Un evenement de tracage Chromium tel que `Tracing.dataCollected` le livre
 * (forme relevee le 22/09, `.scratch/trace-images.mjs`). Les instants `ts`
 * et les durees `dur` sont en microsecondes, a l'horloge de la trace.
 * Ce module est pur : des evenements en entree, des identifiants en sortie.
 */
export type Evenement = {
  name: string;
  ph: string;
  cat?: string;
  pid: number;
  tid: number;
  ts: number;
  dur?: number;
  id2?: { local?: string };
  args?: Record<string, unknown>;
};

/** Les fils nommes par les evenements de metadonnees : "pid/tid" -> nom. */
export function filsNommes(evts: Evenement[]): Map<string, string> {
  const fils = new Map<string, string>();
  for (const e of evts) {
    if (e.ph !== "M" || e.name !== "thread_name") continue;
    fils.set(`${e.pid}/${e.tid}`, ((e.args as { name?: string } | undefined)?.name) ?? "");
  }
  return fils;
}

/**
 * Le processus de rendu de la page : celui dont le fil `Compositor` porte
 * le plus de trames. Le processus navigateur en emet aussi quelques-unes
 * (son propre compositeur), jamais autant.
 */
export function processusDeRendu(evts: Evenement[]): number {
  const fils = filsNommes(evts);
  const comptes = new Map<number, number>();
  for (const e of evts) {
    if (e.name !== "PipelineReporter" || e.ph !== "b") continue;
    if (fils.get(`${e.pid}/${e.tid}`) !== "Compositor") continue;
    comptes.set(e.pid, (comptes.get(e.pid) ?? 0) + 1);
  }
  let pid = -1;
  let meilleur = -1;
  for (const [p, c] of comptes) {
    if (c > meilleur) {
      meilleur = c;
      pid = p;
    }
  }
  if (pid < 0) throw new Error("aucun fil Compositor avec des trames : la trace ne porte pas d'images");
  return pid;
}

/** Le fil principal (`CrRendererMain`) d'un processus. */
export function filPrincipal(evts: Evenement[], pid: number): number {
  for (const [cle, nom] of filsNommes(evts)) {
    const [p, t] = cle.split("/").map(Number);
    if (p === pid && nom === "CrRendererMain") return t;
  }
  throw new Error(`pas de fil CrRendererMain dans le processus ${pid}`);
}

/**
 * Les reperes poses depuis la page par `console.timeStamp(nom)` : nom ->
 * instant de trace, le PREMIER de chaque nom (un observateur d'attributs
 * peut poser le meme repere plusieurs fois).
 */
export function reperes(evts: Evenement[]): Map<string, number> {
  const r = new Map<string, number>();
  for (const e of evts) {
    if (e.name !== "TimeStamp") continue;
    const nom = (e.args as { data?: { message?: string } } | undefined)?.data?.message;
    if (nom && !r.has(nom)) r.set(nom, e.ts);
  }
  return r;
}
```

- [x] **Step 4 : `images.ts`**

```ts
/**
 * DES EVENEMENTS AUX IMAGES PRESENTEES.
 *
 * Ce que la barre mesure, c'est ce que le compositeur a PRESENTE, pas la
 * cadence du script : `requestAnimationFrame` ne voit ni la 2D du voile
 * (animee sur le fil du compositeur) ni une image perdue. Une trame est
 * un `PipelineReporter` du fil Compositor du processus de rendu ; son etat
 * dit si elle a ete presentee, perdue, ou si rien n'etait a dessiner.
 * Ce module est pur.
 */
import type { Evenement } from "./evenements";
import { processusDeRendu } from "./evenements";

export type Trame = { sequence: number; debut: number; fin: number; etat: string };
export type Paire = { debut: number; fin: number; ms: number };
export type Resume = { images: number; auDela: number; pire: number; hz60: number; hz30: number; hz20: number; p5Fps: number };

/** Une demi-periode de balayage : une image presentee a 16,8 ms n'est pas en retard, une a 25 a manque un balayage. */
export const TOLERANCE_MS = 8.3;
export const BUDGET_BUREAU_MS = 16.7;
export const BUDGET_TELEPHONE_MS = 33.3;

type Rapporteur = { frame_sequence: number; state: string };

/**
 * Les trames du compositeur du processus de rendu, `b` et `e` apparies par
 * identifiant local dans l'ordre du temps (un identifiant est reutilise
 * une fois sa trame finie), triees par sequence. Une trame sans `e` est
 * encore en vol : ignoree.
 */
export function trames(evts: Evenement[], pid = processusDeRendu(evts)): Trame[] {
  const propres = evts
    .filter((e) => e.name === "PipelineReporter" && e.pid === pid && e.id2?.local !== undefined)
    .sort((a, b) => a.ts - b.ts);
  const enVol = new Map<string, Evenement>();
  const t: Trame[] = [];
  for (const e of propres) {
    const id = e.id2?.local;
    if (id === undefined) continue;
    if (e.ph === "b") {
      enVol.set(id, e);
      continue;
    }
    if (e.ph !== "e") continue;
    const b = enVol.get(id);
    if (!b) continue;
    enVol.delete(id);
    const r = (b.args as { frame_reporter?: Rapporteur } | undefined)?.frame_reporter;
    if (r) t.push({ sequence: r.frame_sequence, debut: b.ts, fin: e.ts, etat: r.state });
  }
  return t.sort((a, b) => a.sequence - b.sequence);
}

export const presentee = (t: Trame): boolean => t.etat.startsWith("STATE_PRESENTED");
export const perdue = (t: Trame): boolean => t.etat === "STATE_DROPPED";

/** Les trames dont la presentation tombe dans [debut, fin] (us de trace). */
export function fenetre(t: Trame[], debut: number, fin: number): Trame[] {
  return t.filter((x) => x.fin >= debut && x.fin <= fin);
}

/**
 * Les intervalles entre presentations consecutives, avec leurs bornes : une
 * trame perdue entre deux presentees allonge l'intervalle (c'est l'image en
 * retard) ; une trame sans mise a jour coupe la serie (rien n'etait a
 * dessiner, ce n'est pas une image en retard).
 */
export function paires(t: Trame[]): Paire[] {
  const out: Paire[] = [];
  let precedente: Trame | null = null;
  for (const x of t) {
    if (x.etat === "STATE_NO_UPDATE_DESIRED") {
      precedente = null;
      continue;
    }
    if (!presentee(x)) continue;
    if (precedente) out.push({ debut: precedente.fin, fin: x.fin, ms: (x.fin - precedente.fin) / 1000 });
    precedente = x;
  }
  return out;
}

const dixieme = (n: number): number => Math.round(n * 10) / 10;

/** Le resume d'une serie d'intervalles (ms) contre un budget (ms). */
export function resumer(intervallesMs: number[], budgetMs: number): Resume {
  const n = intervallesMs.length;
  if (n === 0) return { images: 0, auDela: 0, pire: 0, hz60: 0, hz30: 0, hz20: 0, p5Fps: 0 };
  const seuil = budgetMs + TOLERANCE_MS;
  const seuil60 = BUDGET_BUREAU_MS + TOLERANCE_MS;
  const seuil30 = BUDGET_TELEPHONE_MS + TOLERANCE_MS;
  const tri = [...intervallesMs].sort((a, b) => a - b);
  const part = (garde: (d: number) => boolean): number => dixieme((intervallesMs.filter(garde).length / n) * 100);
  return {
    images: n,
    auDela: intervallesMs.filter((d) => d > seuil).length,
    pire: dixieme(tri[n - 1]),
    hz60: part((d) => d <= seuil60),
    hz30: part((d) => d > seuil60 && d <= seuil30),
    hz20: part((d) => d > seuil30),
    p5Fps: dixieme(1000 / tri[Math.min(n - 1, Math.floor(n * 0.95))]),
  };
}

export const perdues = (t: Trame[]): number => t.filter(perdue).length;

/** La mediane, pour tenir le bruit d'une machine a trois passes. */
export function mediane(nombres: number[]): number {
  if (nombres.length === 0) throw new Error("mediane d'une serie vide");
  const tri = [...nombres].sort((a, b) => a - b);
  const m = Math.floor(tri.length / 2);
  return tri.length % 2 ? tri[m] : (tri[m - 1] + tri[m]) / 2;
}
```

- [x] **Step 5 : les voir verts**

Run: `pnpm exec vitest run tests/perf/aides/images.test.ts`
Expected: 14 passed. Si `p5Fps` ou la repartition ne tombent pas juste, verifier l'arithmetique du test (10 intervalles : 5 au-dela de 25 ms ; 5 a 60 Hz, 2 a 30 Hz, 3 en dessous ; le p95 est le 10e = 100 ms, soit 10 fps) avant de toucher au code.

- [x] **Step 6 : `tsc` et `eslint` sur les fichiers, puis commit**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint tests/perf`
Expected: aucune erreur.

```bash
git add tests/perf/aides/evenements.ts tests/perf/aides/images.ts tests/perf/aides/images.test.ts
git commit -m "test(perf): le coeur des images presentees, pur et teste sur des evenements fabriques"
```

---

### Task 2 : le temps propre de la pire image (`fil-principal.ts`)

**Files:**
- Create: `tests/perf/aides/fil-principal.ts`
- Test: `tests/perf/aides/fil-principal.test.ts`

- [x] **Step 1 : ecrire le test, rouge**

```ts
import { describe, expect, it } from "vitest";
import type { Evenement } from "./evenements";
import { tempsPropre } from "./fil-principal";

/**
 * UN ROUGE N'EST JAMAIS NU : la pire image dit ce qui l'a occupee.
 *
 * Les evenements complets du fil principal sont imbriques : un RunTask
 * contient un FunctionCall qui contient un Layout. Le temps propre d'un
 * evenement est sa duree moins celle de ses enfants. On decoupe a la
 * fenetre de l'image.
 */
const PID = 100;
const TID = 11;
const X = (name: string, ts: number, dur: number, args: Record<string, unknown> = {}): Evenement => ({ name, ph: "X", pid: PID, tid: TID, ts, dur, args });

describe("le temps propre", () => {
  it("retire les enfants, etiquette les appels de fonction, trie du plus lourd au plus leger", () => {
    const evts = [
      X("RunTask", 0, 10_000),
      X("FunctionCall", 1_000, 8_000, { data: { functionName: "tick", url: "http://localhost:3100/_next/static/chunks/abc.js?x=1", lineNumber: 4, columnNumber: 12 } }),
      X("Layout", 2_000, 3_000),
      X("Paint", 6_000, 1_000),
      // Un autre fil, un autre processus : ignores.
      { name: "RunTask", ph: "X", pid: PID, tid: 99, ts: 0, dur: 50_000, args: {} },
      { name: "RunTask", ph: "X", pid: 7, tid: TID, ts: 0, dur: 50_000, args: {} },
    ];
    expect(tempsPropre(evts, PID, TID, 0, 10_000)).toEqual([
      { nom: "tick abc.js:5:12", propreMs: 4 },
      { nom: "Layout", propreMs: 3 },
      { nom: "RunTask", propreMs: 2 },
      { nom: "Paint", propreMs: 1 },
    ]);
  });
  it("decoupe a la fenetre : ce qui deborde n'est compte que dedans", () => {
    const evts = [X("RunTask", 0, 10_000), X("Decode Image", 8_000, 6_000)];
    expect(tempsPropre(evts, PID, TID, 5_000, 10_000)).toEqual([
      { nom: "RunTask", propreMs: 3 },
      { nom: "Decode Image", propreMs: 2 },
    ]);
  });
  it("agrege par etiquette et s'arrete a la limite", () => {
    const evts = [X("RunTask", 0, 1_000), X("RunTask", 2_000, 1_000), X("Paint", 4_000, 500)];
    expect(tempsPropre(evts, PID, TID, 0, 10_000, 1)).toEqual([{ nom: "RunTask", propreMs: 2 }]);
  });
  it("une fenetre vide rend une liste vide", () => {
    expect(tempsPropre([], PID, TID, 0, 10)).toEqual([]);
  });
});
```

- [x] **Step 2 : le voir rouge**

Run: `pnpm exec vitest run tests/perf/aides/fil-principal.test.ts`
Expected: FAIL, `Cannot find module './fil-principal'`.

- [x] **Step 3 : `fil-principal.ts`**

```ts
/**
 * LE TEMPS PROPRE DU FIL PRINCIPAL DANS UNE FENETRE.
 *
 * Pour la pire image d'un moment rouge, ce qui l'a occupee : chaque
 * evenement complet (`ph: "X"`) du fil, decoupe a la fenetre, moins ses
 * enfants (les evenements d'un fil sont proprement imbriques, une pile
 * suffit), agrege par etiquette. `RunTask` contient tout : son temps propre
 * est ce que rien ne nomme, on le garde tel quel.
 *
 * LIMITE CONNUE (22/09) : en production les fonctions s'appellent `O` et
 * vivent a `chunk.js:1:3115`. Les categories (`EvaluateScript`, `Decode
 * Image`, `Layout`, `v8.compile`...) parlent deja ; les noms de source
 * viendront avec les cartes de source (tranche B2).
 */
import type { Evenement } from "./evenements";

export type Part = { nom: string; propreMs: number };

type Donnees = { functionName?: string; url?: string; lineNumber?: number; columnNumber?: number };

const fichier = (url: string | undefined): string => (url ?? "").split("/").pop()?.split("?")[0] ?? "";

function etiquette(e: Evenement): string {
  const d = (e.args as { data?: Donnees } | undefined)?.data;
  if (e.name === "FunctionCall" && d) return `${d.functionName || "(anonyme)"} ${fichier(d.url)}:${(d.lineNumber ?? 0) + 1}:${d.columnNumber ?? 0}`;
  if ((e.name === "EvaluateScript" || e.name === "v8.compile") && d?.url) return `${e.name} ${fichier(d.url)}`;
  return e.name;
}

export function tempsPropre(evts: Evenement[], pid: number, tid: number, debut: number, fin: number, limite = 8): Part[] {
  const dans = evts
    .filter((e) => e.ph === "X" && e.pid === pid && e.tid === tid && e.dur !== undefined && e.ts < fin && e.ts + e.dur > debut)
    .map((e) => ({ e, debut: Math.max(e.ts, debut), fin: Math.min(e.ts + (e.dur ?? 0), fin), enfants: 0 }))
    .sort((a, b) => a.debut - b.debut || b.fin - a.fin);
  const pile: typeof dans = [];
  for (const x of dans) {
    while (pile.length > 0 && pile[pile.length - 1].fin <= x.debut) pile.pop();
    const parent = pile[pile.length - 1];
    if (parent) parent.enfants += x.fin - x.debut;
    pile.push(x);
  }
  const propre = new Map<string, number>();
  for (const x of dans) {
    const ms = (x.fin - x.debut - x.enfants) / 1000;
    if (ms <= 0) continue;
    const nom = etiquette(x.e);
    propre.set(nom, (propre.get(nom) ?? 0) + ms);
  }
  return [...propre.entries()]
    .map(([nom, ms]) => ({ nom, propreMs: Math.round(ms * 10) / 10 }))
    .sort((a, b) => b.propreMs - a.propreMs)
    .slice(0, limite);
}
```

- [x] **Step 4 : le voir vert, `tsc`, `eslint`, commit**

Run: `pnpm exec vitest run tests/perf/aides/fil-principal.test.ts && pnpm exec tsc --noEmit && pnpm exec eslint tests/perf`
Expected: 4 passed, rien d'autre.

```bash
git add tests/perf/aides/fil-principal.ts tests/perf/aides/fil-principal.test.ts
git commit -m "test(perf): le temps propre de la pire image, par une pile sur le fil principal"
```

---

### Task 3 : le cliquet (`cliquet.ts`, `ligne-de-base.ts`)

**Files:**
- Create: `tests/perf/aides/cliquet.ts`
- Create: `tests/perf/aides/ligne-de-base.ts`
- Test: `tests/perf/aides/cliquet.test.ts`

- [x] **Step 1 : ecrire le test, rouge**

```ts
import { describe, expect, it } from "vitest";
import { acquerir, verdict, type Ligne } from "./cliquet";

/**
 * LE CLIQUET DE LA BARRE : rouge = pire que le meilleur connu, sur un
 * COMPTE (images au-dela du budget, images perdues), jamais sur une duree.
 * Un progres s'acquiert (`pnpm run perf:baseline`) ; la cible est ecrite a
 * cote et ne bouge pas ; une acquisition ne recule jamais.
 */
const ligne: Ligne = { meilleur: { auDela: 9, perdues: 20 }, cible: { auDela: 0, perdues: 0 }, pire: 767, date: "2026-09-22" };

describe("le verdict", () => {
  it("sans ligne de base, rien n'est rouge et tout est a acquerir", () => {
    const v = verdict({ auDela: 9, perdues: 20 }, undefined);
    expect(v.rouge).toBe(false);
    expect(v.progres).toBe(true);
    expect(v.message).toMatch(/aucune ligne de base/);
  });
  it("tenu : ni pire ni mieux", () => {
    const v = verdict({ auDela: 9, perdues: 20 }, ligne);
    expect(v).toMatchObject({ rouge: false, progres: false });
    expect(v.message).toMatch(/^tenu/);
  });
  it("rouge des qu'un compte est pire, meme si l'autre est meilleur", () => {
    expect(verdict({ auDela: 10, perdues: 0 }, ligne).rouge).toBe(true);
    expect(verdict({ auDela: 0, perdues: 21 }, ligne).rouge).toBe(true);
    expect(verdict({ auDela: 10, perdues: 0 }, ligne).message).toMatch(/^RECUL/);
  });
  it("progres a acquerir quand un compte est meilleur et l'autre tenu", () => {
    const v = verdict({ auDela: 3, perdues: 20 }, ligne);
    expect(v).toMatchObject({ rouge: false, progres: true });
    expect(v.message).toMatch(/perf:baseline/);
  });
});

describe("l'acquisition", () => {
  it("sans ligne, la mesure devient le meilleur connu, la cible est celle donnee", () => {
    expect(acquerir(undefined, { auDela: 9, perdues: 20, pire: 767 }, { auDela: 0, perdues: 0 }, "2026-09-22")).toEqual(ligne);
  });
  it("avec une ligne, chaque compte au mieux des deux, la cible inchangee, la pire et la date de la mesure", () => {
    expect(acquerir(ligne, { auDela: 3, perdues: 25, pire: 300 }, { auDela: 5, perdues: 5 }, "2026-09-23")).toEqual({
      meilleur: { auDela: 3, perdues: 20 },
      cible: { auDela: 0, perdues: 0 },
      pire: 300,
      date: "2026-09-23",
    });
  });
});
```

- [x] **Step 2 : le voir rouge**

Run: `pnpm exec vitest run tests/perf/aides/cliquet.test.ts`
Expected: FAIL, `Cannot find module './cliquet'`.

- [x] **Step 3 : `cliquet.ts`**

```ts
/**
 * LE CLIQUET DE LA BARRE (pilier 1).
 *
 * Une barre a zero qui bloque `main` des le premier jour empecherait aussi
 * le correctif de securite. Donc chaque moment tient son MEILLEUR RESULTAT
 * CONNU, et rouge = pire que lui : une regression. La cible est ecrite a
 * cote, toujours ; quand un moment l'atteint, le cliquet s'y verrouille.
 * On juge des COMPTES (images au-dela du budget, images perdues), pas des
 * durees : une duree varie de quarante points d'une passe a l'autre sur
 * cette machine, un compte median de trois passes tient. Ce module est pur.
 */
export type Compte = { auDela: number; perdues: number };
export type Mesure = Compte & { pire: number };
export type Ligne = { meilleur: Compte; cible: Compte; pire: number; date: string };
export type Verdict = { rouge: boolean; progres: boolean; message: string };

export function verdict(mesure: Compte, ligne: Ligne | undefined): Verdict {
  if (!ligne) return { rouge: false, progres: true, message: "aucune ligne de base : a acquerir (pnpm run perf:baseline)" };
  const detail =
    `au-dela ${mesure.auDela} (meilleur connu ${ligne.meilleur.auDela}, cible ${ligne.cible.auDela}), ` +
    `perdues ${mesure.perdues} (meilleur connu ${ligne.meilleur.perdues}, cible ${ligne.cible.perdues})`;
  const recul = mesure.auDela > ligne.meilleur.auDela || mesure.perdues > ligne.meilleur.perdues;
  if (recul) return { rouge: true, progres: false, message: `RECUL : ${detail}` };
  const mieux = mesure.auDela < ligne.meilleur.auDela || mesure.perdues < ligne.meilleur.perdues;
  if (mieux) return { rouge: false, progres: true, message: `progres a acquerir (pnpm run perf:baseline) : ${detail}` };
  return { rouge: false, progres: false, message: `tenu : ${detail}` };
}

/** La ligne apres acquisition : chaque compte au mieux des deux, la cible de la ligne si elle existe. */
export function acquerir(ligne: Ligne | undefined, mesure: Mesure, cible: Compte, date: string): Ligne {
  if (!ligne) return { meilleur: { auDela: mesure.auDela, perdues: mesure.perdues }, cible, pire: mesure.pire, date };
  return {
    meilleur: { auDela: Math.min(ligne.meilleur.auDela, mesure.auDela), perdues: Math.min(ligne.meilleur.perdues, mesure.perdues) },
    cible: ligne.cible,
    pire: mesure.pire,
    date,
  };
}
```

- [x] **Step 4 : `ligne-de-base.ts`**

```ts
/**
 * LA LIGNE DE BASE DE LA BARRE : `scripts/perf-baseline.json`, versionne.
 *
 *   { "<projet>": { "dpr": 1, "moments": { "<moment>": Ligne } } }
 *
 * Le `dpr` de mesure est ecrit : comparer deux dpr n'a pas de sens. Tri
 * deterministe, independant de la locale du poste (comme les autres
 * cliquets du depot). Seule E/S du cliquet.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Ligne } from "./cliquet";

export type Projet = { dpr: number; moments: Record<string, Ligne> };
export type LigneDeBase = Record<string, Projet>;

export const CHEMIN_LIGNE_DE_BASE = join(process.cwd(), "scripts", "perf-baseline.json");

export function lireLigneDeBase(chemin = CHEMIN_LIGNE_DE_BASE): LigneDeBase {
  return existsSync(chemin) ? (JSON.parse(readFileSync(chemin, "utf8")) as LigneDeBase) : {};
}

const trier = <T>(o: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

export function ecrireLigneDeBase(base: LigneDeBase, chemin = CHEMIN_LIGNE_DE_BASE): void {
  const propre: LigneDeBase = {};
  for (const [projet, p] of Object.entries(trier(base))) propre[projet] = { dpr: p.dpr, moments: trier(p.moments) };
  writeFileSync(chemin, JSON.stringify(propre, null, 2) + "\n");
}
```

- [x] **Step 5 : le voir vert, `tsc`, `eslint`, commit**

Run: `pnpm exec vitest run tests/perf/aides/cliquet.test.ts && pnpm exec tsc --noEmit && pnpm exec eslint tests/perf`
Expected: 6 passed, rien d'autre.

```bash
git add tests/perf/aides/cliquet.ts tests/perf/aides/ligne-de-base.ts tests/perf/aides/cliquet.test.ts
git commit -m "test(perf): le cliquet de la barre, verdict et acquisition purs, la ligne de base a part"
```

---

### Task 4 : la seconde suite et l'auto-test de mesure

**Files:**
- Create: `tests/perf/aides/tracage.ts`
- Create: `tests/perf/aides/site.ts`
- Create: `tests/perf/aides/barre.ts`
- Create: `tests/perf/auto-test.perf.ts`
- Create: `playwright.perf.config.ts`
- Create: `scripts/perf-baseline.mjs`
- Modify: `package.json` (scripts)

- [x] **Step 1 : `tracage.ts`**

```ts
/**
 * OUVRIR ET FERMER UN TRACAGE CHROMIUM SUR UNE PAGE.
 *
 * Playwright 1.62 n'expose pas de raccourci : on ouvre une session CDP et
 * on parle au domaine `Tracing`. Les trois categories donnent les trames
 * du compositeur, les reperes `TimeStamp` et les evenements du fil
 * principal (relevees le 22/09, `.scratch/trace-images.mjs`).
 */
import type { Page } from "@playwright/test";
import type { Evenement } from "./evenements";

export const CATEGORIES = ["disabled-by-default-devtools.timeline.frame", "devtools.timeline", "disabled-by-default-devtools.timeline"];

export async function tracer(page: Page): Promise<{ arreter: () => Promise<Evenement[]> }> {
  const cdp = await page.context().newCDPSession(page);
  const evts: Evenement[] = [];
  cdp.on("Tracing.dataCollected", (e) => evts.push(...(e.value as Evenement[])));
  const fin = new Promise<void>((r) => cdp.once("Tracing.tracingComplete", () => r()));
  await cdp.send("Tracing.start", { traceConfig: { includedCategories: CATEGORIES }, transferMode: "ReportEvents" });
  return {
    arreter: async () => {
      await cdp.send("Tracing.end");
      await fin;
      await cdp.detach();
      return evts;
    },
  };
}
```

- [x] **Step 2 : `site.ts`**

```ts
/**
 * CONDUIRE LE SITE POUR LA BARRE.
 *
 * Les bornes des moments sont posees DEPUIS LA PAGE par `console.timeStamp`
 * : elles tombent dans la trace a son horloge, sans conversion. L'observateur
 * d'attributs se pose a DOMContentLoaded (au moment du script
 * d'initialisation, `document.documentElement` n'existe pas encore).
 */
import type { Page } from "@playwright/test";

export const REPERE = {
  charge: "nahual:data-loaded",
  foyer: "nahual:data-foyer-done",
  debutDefilement: "nahual:defilement-debut",
  finDefilement: "nahual:defilement-fin",
} as const;

/** A poser AVANT la navigation. */
export async function poserLesReperes(page: Page): Promise<void> {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const racine = document.documentElement;
      const noter = () => {
        if (racine.getAttribute("data-loaded") === "true") console.timeStamp("nahual:data-loaded");
        if (racine.getAttribute("data-foyer") === "done") console.timeStamp("nahual:data-foyer-done");
      };
      new MutationObserver(noter).observe(racine, { attributes: true, attributeFilter: ["data-loaded", "data-foyer"] });
      noter();
    });
  });
}

export async function attendreLeFoyer(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 120_000 });
}

export type InfoRendu = { appels: number; triangles: number; programmes: number; geometries: number; textures: number };

/** `renderer.info` a la fin d'un moment : appels, triangles, programmes, geometries, textures. */
export async function infoRendu(page: Page): Promise<InfoRendu> {
  return page.evaluate(() => {
    type Info = { render: { calls: number; triangles: number }; programs?: unknown[] | null; memory: { geometries: number; textures: number } };
    const w = window as unknown as { __nahualR3f?: { gl: { info: Info } } };
    const info = w.__nahualR3f?.gl.info;
    if (!info) throw new Error("__nahualR3f absent : la scene n'est pas montee");
    return {
      appels: info.render.calls,
      triangles: info.render.triangles,
      programmes: info.programs?.length ?? 0,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    };
  });
}

/** Le balayage du jure : du haut au bas a vitesse constante, en `dureeMs`, borne par deux reperes. */
export async function defiler(page: Page, dureeMs: number): Promise<void> {
  await page.evaluate(
    (duree) =>
      new Promise<void>((fini) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const t0 = performance.now();
        console.timeStamp("nahual:defilement-debut");
        const pas = (t: number) => {
          const p = Math.min(1, (t - t0) / duree);
          window.scrollTo(0, max * p);
          if (p < 1) requestAnimationFrame(pas);
          else {
            console.timeStamp("nahual:defilement-fin");
            fini();
          }
        };
        requestAnimationFrame(pas);
      }),
    dureeMs,
  );
}
```

- [x] **Step 3 : `barre.ts`**

```ts
/**
 * MESURER UNE FENETRE, JUGER TROIS PASSES.
 *
 * Une passe = une fenetre de trace resumee (images, au-dela, pire, 60/30/20
 * Hz, p5, perdues) et le temps propre de sa pire image. Trois passes se
 * jugent a la MEDIANE, compte par compte, contre le cliquet ; le rapport
 * complet part dans les annotations du test et sur la sortie, vert ou
 * rouge. En mode acquisition (PERF_ACQUERIR=1, `pnpm run perf:baseline`),
 * un progres ou un moment nouveau s'inscrit dans la ligne de base ; un
 * recul ne s'inscrit jamais.
 */
import { expect, type BrowserContextOptions, type TestInfo } from "@playwright/test";
import type { Evenement } from "./evenements";
import { acquerir, verdict, type Compte, type Ligne } from "./cliquet";
import { tempsPropre, type Part } from "./fil-principal";
import { fenetre, mediane, paires, perdues, resumer, trames, type Resume } from "./images";
import { ecrireLigneDeBase, lireLigneDeBase } from "./ligne-de-base";
import type { InfoRendu } from "./site";

export type Passe = { resume: Resume; perdues: number; pireFonctions: Part[]; rendu?: InfoRendu };

export const ACQUERIR = process.env.PERF_ACQUERIR === "1";
export const DPR = Number(process.env.PERF_DPR ?? "1");
export const PASSES = 3;
export const CIBLE_BUREAU: Compte = { auDela: 0, perdues: 0 };

/** Les options de contexte du projet courant, pour ouvrir un contexte neuf par passe. */
export function optionsDuProjet(info: TestInfo): BrowserContextOptions {
  const { viewport, deviceScaleFactor, userAgent, isMobile, hasTouch } = info.project.use;
  return { viewport, deviceScaleFactor, userAgent, isMobile, hasTouch };
}

export function mesurer(evts: Evenement[], pid: number, tid: number, debut: number, fin: number, budgetMs: number, rendu?: InfoRendu): Passe {
  const dans = fenetre(trames(evts, pid), debut, fin);
  const p = paires(dans);
  const pire = p.length > 0 ? p.reduce((a, b) => (b.ms > a.ms ? b : a)) : null;
  return {
    resume: resumer(p.map((x) => x.ms), budgetMs),
    perdues: perdues(dans),
    pireFonctions: pire ? tempsPropre(evts, pid, tid, pire.debut, pire.fin) : [],
    rendu,
  };
}

export function juger(projet: string, moment: string, passes: Passe[], cible: Compte, info: TestInfo): void {
  const mesure = {
    auDela: mediane(passes.map((p) => p.resume.auDela)),
    perdues: mediane(passes.map((p) => p.perdues)),
    pire: mediane(passes.map((p) => p.resume.pire)),
  };
  const base = lireLigneDeBase();
  const entree = base[projet];
  if (entree && entree.dpr !== DPR) {
    throw new Error(`la ligne de base de ${projet} a ete mesuree au dpr ${entree.dpr}, cette passe est au dpr ${DPR} : relance avec PERF_DPR=${entree.dpr}, ou acquiers une ligne neuve`);
  }
  const ligne: Ligne | undefined = entree?.moments[moment];
  const v = verdict(mesure, ligne);
  const lignes = passes.map(
    (p, i) =>
      `  passe ${i + 1} : ${p.resume.images} images, ${p.resume.auDela} au-dela, pire ${p.resume.pire} ms, ${p.perdues} perdues, ` +
      `60/30/20 Hz ${p.resume.hz60}/${p.resume.hz30}/${p.resume.hz20} %, p5 ${p.resume.p5Fps} fps` +
      (p.rendu ? ` ; rendu : ${p.rendu.appels} appels, ${p.rendu.triangles} triangles, ${p.rendu.programmes} programmes, ${p.rendu.geometries} geometries, ${p.rendu.textures} textures` : ""),
  );
  const pire = passes.reduce((a, b) => (b.resume.pire > a.resume.pire ? b : a));
  const fonctions = pire.pireFonctions.map((f) => `    ${f.propreMs} ms  ${f.nom}`);
  const rapport = [`${projet} / ${moment} : ${v.message}`, ...lignes, `  la pire image (${pire.resume.pire} ms), temps propre du fil principal :`, ...fonctions].join("\n");
  info.annotations.push({ type: "mesure", description: rapport });
  console.log(rapport);
  if (ACQUERIR && !v.rouge && v.progres) {
    base[projet] = { dpr: DPR, moments: { ...(entree?.moments ?? {}), [moment]: acquerir(ligne, mesure, cible, new Date().toISOString().slice(0, 10)) } };
    ecrireLigneDeBase(base);
  }
  expect(v.rouge, rapport).toBe(false);
  if (!ACQUERIR) expect(ligne !== undefined, `${projet} / ${moment} n'a pas de ligne de base : pnpm run perf:baseline`).toBe(true);
}
```

- [x] **Step 4 : `auto-test.perf.ts`**

```ts
import { expect, test } from "@playwright/test";
import { BUDGET_BUREAU_MS, fenetre, paires, perdues, resumer, trames } from "./aides/images";
import { tracer } from "./aides/tracage";

/**
 * L'AUTO-TEST DE MESURE : une barre qui ne sait pas quand elle ne peut pas
 * mesurer ment.
 *
 * Avant de conclure sur le site, la suite mesure une rotation CSS isolee :
 * une page `data:` sans un octet de script, une animation que le
 * compositeur tient seul. Si des images y manquent, c'est la machine qui
 * est bruyante, et le projet `perf-bureau` (qui depend de celui-ci) ne
 * tourne pas. Le design du 21/09 nommait « la rotation CSS de la Piedra du
 * voile » ; on prefere une rotation HORS du site : l'auto-test ne doit pas
 * dependre du site qu'il sert a mesurer.
 *
 * Releve du 22/09 : 150 trames en 2,5 s, 2 perdues a la naissance de la
 * page, 0 ensuite. Les 500 premieres ms sont donc exclues.
 */
const PAGE =
  "data:text/html," +
  encodeURIComponent(
    `<!doctype html><style>body{margin:0;background:#111}div{width:200px;height:200px;margin:100px;background:#c84;will-change:transform;animation:r 2s linear infinite}@keyframes r{to{transform:rotate(360deg)}}</style><div></div>`,
  );
const NAISSANCE_US = 500_000;

test("la machine presente une rotation CSS sans image en retard ni perdue", async ({ page }, info) => {
  const t = await tracer(page);
  await page.goto(PAGE);
  await page.waitForTimeout(3000);
  const toutes = trames(await t.arreter());
  const apres = fenetre(toutes, toutes[0].fin + NAISSANCE_US, Number.MAX_SAFE_INTEGER);
  const r = resumer(paires(apres).map((x) => x.ms), BUDGET_BUREAU_MS);
  const p = perdues(apres);
  const rapport = `auto-test : ${r.images} images, ${r.auDela} au-dela du budget, pire ${r.pire} ms, ${p} perdues`;
  info.annotations.push({ type: "mesure", description: rapport });
  console.log(rapport);
  expect(r.images, `${rapport} -- trop peu d'images : le compositeur ne presente pas en continu`).toBeGreaterThan(120);
  expect(r.auDela + p, `${rapport} -- la machine est bruyante, la barre refuse de conclure`).toBe(0);
});
```

- [x] **Step 5 : `playwright.perf.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

/**
 * LA BARRE DE PERFORMANCE (harnais, pilier 1, tranche B).
 *
 * Une seconde suite, courte, sur la PRODUCTION : on ne melange pas mesurer
 * et verifier (la suite de 24 minutes reste sur le serveur de dev). Elle
 * reconstruit le site a chaque passe (21 s) et REFUSE un serveur qui
 * trainerait sur :3100 : ce serait la mesure d'un autre code.
 *
 * `pnpm run perf` ; obligatoire avant toute poussee sur `main` (hook
 * pre-push). `pnpm run perf:baseline` acquiert les progres.
 *
 * Le `dpr` de mesure vient de PERF_DPR (1 par defaut) et s'ecrit dans la
 * ligne de base : comparer deux dpr n'a pas de sens.
 */
const DPR = Number(process.env.PERF_DPR ?? "1");
const BUREAU = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, deviceScaleFactor: DPR };

export default defineConfig({
  testDir: "./tests/perf",
  testMatch: /.*\.perf\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 600_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    // ANGLE sur d3d11, comme la suite e2e : sans ces drapeaux, Chromium
    // sous Windows rend en logiciel.
    launchOptions: { args: ["--use-angle=d3d11", "--use-gl=angle", "--ignore-gpu-blocklist"] },
  },
  projects: [
    { name: "auto-test", testMatch: /auto-test\.perf\.ts/, use: BUREAU },
    { name: "perf-bureau", dependencies: ["auto-test"], testIgnore: /auto-test\.perf\.ts/, use: BUREAU },
  ],
  webServer: {
    command: "pnpm run build && pnpm exec next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
```

- [x] **Step 6 : `scripts/perf-baseline.mjs` et `package.json`**

`scripts/perf-baseline.mjs` (pnpm lance ses scripts par `cmd.exe` sous Windows : `PERF_ACQUERIR=1 playwright ...` n'y passerait pas, d'ou ce lanceur) :

```js
/**
 * LA BARRE EN MODE ACQUISITION : `pnpm run perf:baseline`.
 *
 * Lance la barre avec PERF_ACQUERIR=1 : chaque moment nouveau ou meilleur
 * que son meilleur connu s'inscrit dans scripts/perf-baseline.json. Un
 * recul ne s'inscrit jamais, et reste rouge. Les autres arguments passent
 * a Playwright (`pnpm run perf:baseline -- --grep voile`).
 */
import { spawnSync } from "node:child_process";

const r = spawnSync("pnpm", ["exec", "playwright", "test", "-c", "playwright.perf.config.ts", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PERF_ACQUERIR: "1" },
});
process.exit(r.status ?? 1);
```

Dans `package.json`, apres `"test:e2e"` :

```json
    "perf": "playwright test -c playwright.perf.config.ts",
    "perf:baseline": "node scripts/perf-baseline.mjs",
```

- [x] **Step 7 : `tsc`, `eslint`, puis l'auto-test, vert**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint tests/perf playwright.perf.config.ts scripts/perf-baseline.mjs`
Expected: rien.

Verifier qu'aucun serveur ne traine : `netstat -ano | grep ":3100" | grep LISTENING` doit etre vide (sinon `taskkill //PID <pid> //T //F`).

Run: `pnpm run perf --project=auto-test`
Expected: la construction (21 s), puis `1 passed`, et sur la sortie `auto-test : ~150 images, 0 au-dela du budget, pire ~17 ms, 0 perdues`.

- [x] **Step 8 : le voir ROUGE**

**Tel qu'ecrit le 22/09, cette etape etait fausse, et c'est la mesure du 03/10 qui l'a dit.** La recette prevue (douze a vingt-quatre boucles `node -e "for(;;){}"`, « la machine est bruyante ») ne fait PAS rougir l'auto-test : une rotation `transform` vit sur le fil du compositeur, et Windows arbitre en faveur du navigateur. Releve du 03/10, 12 coeurs :

| bruit essaye | auto-test ou sonde (`.scratch/sonde-bruit.mjs`) | verdict |
| --- | --- | --- |
| 24 boucles CPU, priorite normale (le build a pris 2 min au lieu de 37 s) | 191 presentees, 0 au-dela, pire 19,1 ms, 0 perdues | vert |
| idem, page avec 8 ms de script par image | 197 presentees, 0 au-dela, pire 19,3 ms | vert |
| rendu logiciel force (`--disable-gpu`) | 178 presentees, 0 au-dela, pire 18,9 ms | vert |
| 24 boucles CPU en priorite HAUTE | Chromium ne charge plus la page : la sonde plante, la mesure n'existe plus | pas un rouge |
| second Chromium, shader plein ecran 60 000 iterations (`.scratch/bruit-gpu.mjs`) | compteur GPU Windows a 0,14 %, contexte perdu par TDR ; sonde 179 presentees, 0 au-dela | vert, le GPU n'est pas sature |
| script qui bloque 40 ms par image, rotation `transform` gardee | 246 presentees, 0 au-dela, pire 18,9 ms | vert |
| **sabotage : rotation en animation NON composee (`margin-left` par rAF) + 40 ms de blocage** | **143 presentees, 72 au-dela, pire 40,7 ms, 102 perdues** | **ROUGE, code 1** |

Ce que l'auto-test garde donc : le CHEMIN DE MESURE (un compositeur dans la trace, le vsync, le GPU et les drapeaux ANGLE). Ce qu'il ne garde pas : le bruit de la machine, porte par la mediane de trois passes et le cliquet sur des comptes. Le mot « bruyante » sort du test, de ce plan et du design (section 2 et criteres 4 et 14).

Pour le revoir rouge : remplacer dans `PAGE` l'animation par `<style>div{animation:none}</style><script>const s=document.querySelector("div");function f(t){const a=performance.now();while(performance.now()-a<40);s.style.marginLeft=(t/10%300)+"px";requestAnimationFrame(f)}requestAnimationFrame(f)</script>`, lancer `pnpm run perf --project=auto-test`, lire `1 failed` et le message « le chemin de mesure est en defaut », puis retirer le sabotage.

- [x] **Step 9 : commit**

```bash
git add tests/perf/aides/tracage.ts tests/perf/aides/site.ts tests/perf/aides/barre.ts tests/perf/auto-test.perf.ts playwright.perf.config.ts scripts/perf-baseline.mjs package.json
git commit -m "perf(barre): la seconde suite sur la production, et l'auto-test du chemin de mesure (vu rouge par une animation non composee sous 40 ms de blocage ; le bruit CPU ou GPU ne le fait pas rougir, mesure)"
```

---

### Task 5 : le voile, trois moments

**Files:**
- Create: `tests/perf/voile.perf.ts`
- Create: `scripts/perf-baseline.json` (par acquisition)

- [ ] **Step 1 : `voile.perf.ts`**

```ts
import { test } from "@playwright/test";
import { CIBLE_BUREAU, PASSES, juger, mesurer, optionsDuProjet, type Passe } from "./aides/barre";
import { filPrincipal, processusDeRendu, reperes } from "./aides/evenements";
import { BUDGET_BUREAU_MS, trames } from "./aides/images";
import { REPERE, attendreLeFoyer, infoRendu, poserLesReperes } from "./aides/site";
import { tracer } from "./aides/tracage";

/**
 * LE VOILE : L'ATTENTE, L'OUVERTURE, L'ARRIVEE (moments 1 a 3 de la barre).
 *
 *   voile-attente   du premier octet a data-loaded (la Piedra tourne, le
 *                   texte se revele, le script charge) ;
 *   voile-ouverture de data-loaded a data-foyer=done (la fumee se retire) ;
 *   arrivee         trois secondes immobiles apres l'ouverture.
 *
 * Une navigation par passe, dans un contexte NEUF (cache navigateur vide :
 * c'est la premiere visite), plus une navigation d'echauffement jamais
 * mesuree (caches du serveur). Point zero du 21/09, sonde indulgente a 50
 * ms : 9 a 10 images longues a l'attente, pire 617 a 767 ms.
 */
const ARRIVEE_US = 3_000_000;
const MOMENTS = ["voile-attente", "voile-ouverture", "arrivee"] as const;

test("le voile : l'attente, l'ouverture, l'arrivee", async ({ browser }, info) => {
  const passes: Record<(typeof MOMENTS)[number], Passe[]> = { "voile-attente": [], "voile-ouverture": [], arrivee: [] };
  for (let i = 0; i <= PASSES; i++) {
    const ctx = await browser.newContext(optionsDuProjet(info));
    const page = await ctx.newPage();
    await poserLesReperes(page);
    const t = await tracer(page);
    await page.goto("/fr?shaders-prod", { waitUntil: "commit" });
    await attendreLeFoyer(page);
    await page.waitForTimeout(ARRIVEE_US / 1000);
    const evts = await t.arreter();
    const rendu = await infoRendu(page);
    await ctx.close();
    if (i === 0) continue; // l'echauffement n'est pas mesure
    const pid = processusDeRendu(evts);
    const tid = filPrincipal(evts, pid);
    const rep = reperes(evts);
    const charge = rep.get(REPERE.charge);
    const foyer = rep.get(REPERE.foyer);
    if (charge === undefined || foyer === undefined) throw new Error(`reperes absents de la trace (${[...rep.keys()].join(", ")})`);
    const debut = trames(evts, pid)[0].debut;
    passes["voile-attente"].push(mesurer(evts, pid, tid, debut, charge, BUDGET_BUREAU_MS));
    passes["voile-ouverture"].push(mesurer(evts, pid, tid, charge, foyer, BUDGET_BUREAU_MS));
    passes.arrivee.push(mesurer(evts, pid, tid, foyer, foyer + ARRIVEE_US, BUDGET_BUREAU_MS, rendu));
  }
  for (const moment of MOMENTS) juger(info.project.name, moment, passes[moment], CIBLE_BUREAU, info);
});
```

Note : `juger` fait `expect` ; si `voile-attente` est rouge, les deux autres moments ne sont pas juges dans cette passe. C'est voulu au premier jour ; la tranche B2 pourra passer par `expect.soft`.

- [ ] **Step 2 : `tsc`, `eslint`**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint tests/perf`
Expected: rien.

- [ ] **Step 3 : le point zero, par acquisition**

Run: `pnpm run perf:baseline -- --grep voile`
Expected: construction, auto-test vert, puis le test du voile vert avec trois rapports `aucune ligne de base : a acquerir` et, a la fin, `scripts/perf-baseline.json` cree :

```json
{
  "perf-bureau": {
    "dpr": 1,
    "moments": {
      "arrivee": { "meilleur": { "auDela": N, "perdues": N }, "cible": { "auDela": 0, "perdues": 0 }, "pire": N, "date": "2026-09-22" },
      "voile-attente": { ... },
      "voile-ouverture": { ... }
    }
  }
}
```

Lire les trois rapports sur la sortie et les recopier dans le message de commit (images, au-dela, pire, perdues, repartition, et les huit lignes de temps propre de la pire image de l'attente).

- [ ] **Step 4 : la barre tient sur elle-meme**

Run: `pnpm run perf -- --grep voile`
Expected: vert, trois `tenu :` ou `progres a acquerir` (le bruit joue dans le bon sens). Si un moment est ROUGE ici, sans que le code ait bouge, la mediane de trois passes ne suffit pas sur cette machine : relancer une fois ; si c'est encore rouge, ne pas elargir la tolerance mais le dire dans le rapport final (BLOCKED), avec les six rapports.

- [ ] **Step 5 : le voir ROUGE par la ligne de base**

Editer `scripts/perf-baseline.json` : mettre `"auDela": 0` et `"perdues": 0` a `voile-attente.meilleur` (une ligne de base meilleure que le site).

Run: `pnpm run perf -- --grep voile ; echo "code $?"`
Expected: `1 failed`, code 1, le rapport commence par `perf-bureau / voile-attente : RECUL : au-dela N (meilleur connu 0, cible 0)...` et se termine par les huit lignes de temps propre de la pire image.

Restaurer : `git checkout -- scripts/perf-baseline.json` ne marche pas (fichier non versionne) ; relancer `pnpm run perf:baseline -- --grep voile`, qui reecrit les vrais meilleurs connus (l'acquisition n'ecrit que si `progres` : avec `meilleur` a 0 elle serait rouge et n'ecrirait rien -- donc **supprimer le fichier** puis relancer l'acquisition : `rm scripts/perf-baseline.json && pnpm run perf:baseline -- --grep voile`).

- [ ] **Step 6 : commit, avec les chiffres**

```bash
git add tests/perf/voile.perf.ts scripts/perf-baseline.json
git commit -F - <<'EOF'
perf(barre): le voile, trois moments, point zero acquis

<les trois rapports de l'acquisition, tels quels>

Vu rouge avec une ligne de base a zero : RECUL, code 1, la pire image nommee.
EOF
```

---

### Task 6 : le defilement des cinq pages

**Files:**
- Create: `tests/perf/defilement.perf.ts`
- Modify: `scripts/perf-baseline.json` (par acquisition)

- [ ] **Step 1 : `defilement.perf.ts`**

```ts
import { test } from "@playwright/test";
import { CIBLE_BUREAU, PASSES, juger, mesurer, optionsDuProjet, type Passe } from "./aides/barre";
import { filPrincipal, processusDeRendu, reperes } from "./aides/evenements";
import { BUDGET_BUREAU_MS } from "./aides/images";
import { REPERE, attendreLeFoyer, defiler, infoRendu } from "./aides/site";
import { tracer } from "./aides/tracage";

/**
 * LE DEFILEMENT DE CHAQUE PAGE (moments 4 de la barre, cinq pages).
 *
 * La methode du jure : un balayage a vitesse constante du haut au bas, six
 * secondes, apres trois secondes d'arrivee. `veille=off` : la mise en
 * veille de la boucle ne doit pas se declencher pendant la mesure. Pas
 * d'echauffement ici : le serveur est chaud depuis le voile, et chaque
 * passe ouvre son contexte. Point zero du 16/09 (Pixel 7, processeur /4) :
 * Contact a 56 % d'images a 60 Hz ; sur le bureau, a mesurer.
 */
const PAGES = ["fr", "fr/services", "fr/projets", "fr/contact", "fr/memoire"];
const BALAYAGE_MS = 6000;

for (const chemin of PAGES) {
  test(`le defilement de /${chemin}`, async ({ browser }, info) => {
    const passes: Passe[] = [];
    for (let i = 1; i <= PASSES; i++) {
      const ctx = await browser.newContext(optionsDuProjet(info));
      const page = await ctx.newPage();
      await page.goto(`/${chemin}?shaders-prod&veille=off`, { waitUntil: "commit" });
      await attendreLeFoyer(page);
      await page.waitForTimeout(3000);
      const t = await tracer(page);
      await defiler(page, BALAYAGE_MS);
      const evts = await t.arreter();
      const rendu = await infoRendu(page);
      await ctx.close();
      const pid = processusDeRendu(evts);
      const tid = filPrincipal(evts, pid);
      const rep = reperes(evts);
      const debut = rep.get(REPERE.debutDefilement);
      const fin = rep.get(REPERE.finDefilement);
      if (debut === undefined || fin === undefined) throw new Error(`reperes du balayage absents (${[...rep.keys()].join(", ")})`);
      passes.push(mesurer(evts, pid, tid, debut, fin, BUDGET_BUREAU_MS, rendu));
    }
    juger(info.project.name, `defilement-${chemin.replace("/", "-")}`, passes, CIBLE_BUREAU, info);
  });
}
```

- [ ] **Step 2 : `tsc`, `eslint`**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint tests/perf`
Expected: rien.

- [ ] **Step 3 : le point zero des cinq pages**

Run: `pnpm run perf:baseline -- --grep defilement`
Expected: cinq tests verts, cinq lignes nouvelles dans `scripts/perf-baseline.json` (`defilement-fr`, `defilement-fr-services`, `defilement-fr-projets`, `defilement-fr-contact`, `defilement-fr-memoire`). Recopier les cinq rapports (une ligne de resume par page suffit, plus les temps propres de la pire image de la pire page).

- [ ] **Step 4 : la suite entiere, telle que le hook la lancera**

Run: `pnpm run perf ; echo "code $?"`
Expected: `7 passed` (auto-test, voile, cinq defilements), code 0, en moins de six minutes construction comprise. Noter la duree.

- [ ] **Step 5 : commit**

```bash
git add tests/perf/defilement.perf.ts scripts/perf-baseline.json
git commit -F - <<'EOF'
perf(barre): le defilement des cinq pages, point zero acquis

<les cinq resumes, et la duree de la suite entiere>
EOF
```

---

### Task 7 : la documentation et la cloture

**Files:**
- Modify: `docs/harnais.md` (section « Pilier 1 : la barre de performance », aujourd'hui `*Tranche B.*`)
- Modify: `docs/superpowers/specs/2026-09-21-harnais-design.md` (section 8, criteres 3, 4, 5, 6, 9)
- Modify: `docs/superpowers/plans/2026-09-22-harnais-tranche-b1.md` (cocher)

- [ ] **Step 1 : la section du pilier 1 dans `docs/harnais.md`**

Remplacer `*Tranche B.*` par (les N sont les chiffres reels des commits des taches 5 et 6) :

```markdown
*Tranche B1, livree le 22/09/2026 : le socle et les huit moments du bureau.
B2 apportera le telephone, les transitions, le budget reparti et le temps GPU.*

**Ce qui est mesure.** Les images PRESENTEES par le compositeur, lues dans
le tracage Chromium (session CDP, domaine `Tracing`) : une trame est un
`PipelineReporter` du fil `Compositor` du processus de rendu, presentee,
partielle, perdue ou sans mise a jour. `requestAnimationFrame` ne voit ni
la 2D du voile ni une image perdue ; le tracage, si. Le coeur est pur et
teste a l'unite (`tests/perf/aides/`, 24 tests) : des evenements en
entree, des trames, des intervalles, des comptes, un verdict.

**Une image en retard** : un intervalle entre deux presentations au-dela
du budget plus une demi-periode (16,7 + 8,3 = 25 ms sur le bureau : elle a
manque un balayage). Une trame perdue entre deux presentees allonge
l'intervalle ; une trame sans mise a jour coupe la serie (rien n'etait a
dessiner).

| mecanisme | ce qu'il fait | preuve |
| --- | --- | --- |
| `playwright.perf.config.ts`, `pnpm run perf` | une seconde suite, sur la PRODUCTION (`build` + `start -p 3100`, 21 s) ; refuse un serveur qui traine sur `:3100` ; projets `auto-test` puis `perf-bureau` (1280 x 800, `dpr` de `PERF_DPR`, 1 par defaut) | on ne melange pas mesurer et verifier ; un serveur d'un autre code serait une mesure d'un autre code. |
| `tests/perf/auto-test.perf.ts` | avant tout, une rotation CSS isolee (page `data:`, aucun script) doit presenter sans image en retard ni perdue, sinon `perf-bureau` ne tourne pas | 22/09 : 150 trames en 2,5 s, 2 perdues a la naissance de la page, 0 ensuite. 03/10 : vu ROUGE par sabotage (animation non composee sous 40 ms de blocage : 143 presentees, 72 au-dela, pire 40,7 ms, 102 perdues) ; 24 boucles CPU, priorite haute, rendu logiciel, blocage seul : vert. Il garde le chemin de mesure, pas le bruit. |
| `tests/perf/voile.perf.ts` | `voile-attente` (premier octet a `data-loaded`), `voile-ouverture` (a `data-foyer=done`), `arrivee` (trois secondes immobiles) ; contexte neuf par passe (premiere visite), un echauffement non mesure | point zero du 22/09 : attente N au-dela / pire N ms / N perdues ; ouverture N ; arrivee N. |
| `tests/perf/defilement.perf.ts` | le balayage du jure : haut en bas a vitesse constante, six secondes, sur les cinq pages | point zero du 22/09 : fr N, services N, projets N, contact N, memoire N (images au-dela du budget). |
| `scripts/perf-baseline.json`, `pnpm run perf:baseline` | le cliquet : par projet et par moment, le meilleur connu (`auDela`, `perdues`), la cible a cote, la pire duree et la date de mesure, le `dpr` ; **rouge = pire que le meilleur connu, sur un compte** ; un progres s'acquiert, un recul ne s'inscrit jamais | vu rouge le 22/09 avec une ligne de base a zero : RECUL, code 1. |
| le bruit | trois passes, mediane par compte ; les comptes avant les durees. L'auto-test n'en fait PAS partie (03/10) | note du 16/09 : une duree varie de quarante points d'une passe a l'autre. |
| un rouge n'est jamais nu | chaque rapport porte, pour la pire image, le temps propre du fil principal par etiquette (`FunctionCall`, `EvaluateScript`, `Decode Image`, `Layout`...), et `renderer.info` a la fin du moment | **limite connue** : en production les fonctions s'appellent `O` ; les noms de source viennent avec les cartes de source (B2). |
| `scripts/hooks/pre-push` | lance `pnpm run perf` quand la ref poussee est `main` | en place depuis la tranche A (`--if-present`), actif depuis B1. |

**Les bornes des moments** sont posees depuis la page par
`console.timeStamp` (`tests/perf/aides/site.ts`) : elles tombent dans la
trace a son horloge, sans conversion.

**Ce qui n'y est pas encore (B2)** : `perf-telephone` (Pixel 7, processeur
/4, Fast 3G sur le voile, cible 33 ms et p5 >= 45), les huit transitions
par le Centre, le budget reparti script / soumission / GPU, le temps GPU
(`EXT_disjoint_timer_query_webgl2`), les noms de source.
```

- [ ] **Step 2 : la section 8 du design**

Dans `docs/superpowers/specs/2026-09-21-harnais-design.md`, section 8, ajouter apres chaque critere concerne :

- 3 : `— **Tranche B1 (22/09)** : perf-bureau, huit moments (voile x3, defilement x5), compte / pire / repartition / renderer.info ; le budget reparti, le temps GPU et perf-telephone sont en B2.`
- 4 : `— **Fait, B1 (03/10), critere amende** : rotation CSS isolee hors du site (et non la Piedra : l'auto-test ne depend pas du site qu'il mesure). Il garde le chemin de mesure, PAS le bruit : 24 boucles CPU, priorite haute, rendu logiciel et 40 ms de blocage l'ont laisse vert ; vu rouge par une animation non composee sous blocage.`
- 5 : `— **Fait, B1** (scripts/perf-baseline.json, vu rouge avec une ligne a zero).`
- 6 : `— **Fait, B1**, avec la limite des noms minifies (cartes de source en B2).`
- 9 : `— **B1** : voile.mjs et fps-bureau.mjs sont montes (tests/perf/voile.perf.ts, defilement.perf.ts) ; profil-voile.mjs et transition.mjs restent pour B2.`

- [ ] **Step 3 : cocher ce plan, `tsc`, commit**

Cocher toutes les cases des taches 1 a 7 dans ce fichier.

```bash
git add docs/harnais.md docs/superpowers/specs/2026-09-21-harnais-design.md docs/superpowers/plans/2026-09-22-harnais-tranche-b1.md
git commit -m "docs(harnais): le pilier 1 ecrit, la barre livree en B1, ce qui reste en B2"
```

- [ ] **Step 4 : la suite unitaire entiere, comme le hook la lancera**

Run: `pnpm test`
Expected: 1057 + 24 = 1081 tests verts (14 images, 4 fil principal, 6 cliquet).
