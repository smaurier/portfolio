# La partition du texte du Centre : plan d'execution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sur l'Accueil, un seul bloc de texte parle a la fois, chacun dans sa fenetre de l'arc, avec un silence autour du climax 0,75 ; tout ce qui redit la scene est retire (paragraphe du hero, chapitres III et V, ligne poetique des clotures, etiquette et citation longue du chant).

**Architecture:** une lib pure `partition-texte` porte les fenetres du Centre, les silences, la grammaire entree/tenue/sortie (`etatBloc`) et le validateur (`partitionValide`). Un hook `usePiloteFenetre` applique `etatBloc` par image (rAF, comme aujourd'hui) sur un element : opacite, `data-phase`, `--avancement` ; les pixels du mouvement (12 px / -8 px) vivent en CSS. `FadingBlock` (calque fixe), `BlocEnFlux` (le chant, dans le flux) et `PageClosure` (la cloture) lisent tous la meme fenetre. `getIntroOpacity`, `getChapterOpacity` et leur table sortent de `reveal-arc.ts`.

**Tech Stack:** TypeScript, vitest (libs pures), React 19 / Next.js (composants client), CSS modules + globals.css, Playwright (e2e et capture `.scratch`).

Spec : `docs/superpowers/specs/2026-10-10-partition-texte-design.md`. Les deux coupes de chapitres (III et V) sont validees par Sylvain le 11/10.

---

## Fichiers

- Create `src/lib/partition-texte.ts` : fenetres, silences, constantes, `etatBloc`, `tenueDe`, `partitionValide`. Pur.
- Create `src/lib/partition-texte.test.ts`.
- Modify `src/dictionaries/fr.json`, `en.json`, `es.json` : `home.heroText` supprime, `home.chapters` 5 -> 3, `closure.*.poetic` supprime, `common.cantar.ourTranslation` supprime, `common.cantar.source` raccourci.
- Modify `src/lib/i18n-parity.test.ts` : `poetic` sort des champs de la cloture.
- Modify `src/app/components/stag-scene/stag-scene.tsx` : plus de paragraphe du hero, trois chapitres, fenetres de la partition, chant dans `BlocEnFlux`, cloture par fenetre.
- Delete `src/app/components/stag-scene/hero-texte-mobile.tsx`, `src/lib/hero-mobile.ts`, `src/lib/hero-mobile.test.ts`.
- Modify `src/app/components/stag-scene/scene-text-overlay.module.css` : `.heroTexte` part, la grammaire `[data-phase]` arrive.
- Modify `src/app/components/stag-scene/page-closure.tsx` + `page-closure.module.css` : plus de ligne poetique ; prop `fenetre`.
- Modify `src/app/components/cantar.tsx` : plus d'etiquette, source courte.
- Modify `src/app/globals.css` : `.cantarLabel` part ; `.cantarFlow` se place par `--arc-h` ; `.blocEnFlux`.
- Create `src/app/components/stag-scene/use-pilote-fenetre.ts` : le hook partage.
- Modify `src/app/components/stag-scene/fading-block.tsx` : prend `fenetre` + `nom`.
- Create `src/app/components/stag-scene/bloc-en-flux.tsx`.
- Modify `src/app/components/reveal-text.tsx` : `pilote="fenetre"`.
- Modify `src/lib/reveal-arc.ts` + `reveal-arc.test.ts` : `getIntroOpacity`, `CHAPTER_WINDOWS`, `CHAPTER_FADE_SHARE`, `CHAPTER_COUNT`, `getChapterOpacity` et leurs oracles sortent.
- Modify `src/app/components/stag-scene/scene-refs-context.tsx` : pose `--arc-h`.
- Modify `tests/e2e/calque-fixe.spec.ts`, `tests/e2e/cantares.spec.ts` ; Create `tests/e2e/partition-centre.spec.ts`.
- Create `.scratch/partition-centre.mjs` : la capture.
- Modify `docs/da/plans/centre.md`, `CLAUDE.md`.

Conventions du depot a respecter : commentaires en francais sans accents dans le code (comme les fichiers voisins), pas de tiret cadratin, pas d'etat React par image (rAF + ecriture DOM directe, motif de `FadingBlock`), aucune lecture de mise en page dans un rappel d'image (oracle `lectures-de-mise-en-page`), `pnpm` partout. Branche `dev`, jamais `main` dans ce plan. Les dictionnaires sont en CRLF et strictement egaux a `JSON.stringify(obj, null, 2)` : on les reecrit par script, jamais a la main.

Verification apres CHAQUE tache (sauf mention) :

```powershell
pnpm test
pnpm exec tsc --noEmit
pnpm exec eslint <fichiers touches>
```

Expected : vitest vert (le nombre de fichiers change au fil des taches), `tsc` muet, eslint sans erreur (13 avertissements preexistants dans des fichiers non touches sont connus et toleres).

---

### Task 1 : la lib pure `partition-texte`

**Files:**
- Create: `src/lib/partition-texte.ts`
- Create: `src/lib/partition-texte.test.ts`

- [x] **Step 1 : ecrire les tests (rouges)**

```ts
// src/lib/partition-texte.test.ts
import { describe, expect, it } from "vitest";
import {
  PARTITION_CENTRE,
  PART_ENTREE,
  PART_SORTIE,
  SILENCES_CENTRE,
  TENUE_MIN,
  etatBloc,
  partitionValide,
  tenueDe,
  type Fenetre,
} from "./partition-texte";

/**
 * LA PARTITION DU TEXTE (11/10/2026, spec 2026-10-10-partition-texte-design).
 * Sylvain, sur l'audit visuel du 10/10 : « un seul panneau a la fois, mais
 * surtout on doit aussi enlever du texte [...] C'est l'image qui prevaut. »
 * Ces oracles remplacent « les chapitres du Centre : assez longtemps pour
 * etre lus » (13/09) : la tenue minimale et « jamais deux ensemble » vivent
 * desormais dans partitionValide ; « au plus 5 % de vide » est abandonne a
 * dessein, c'est l'inverse de la regle du jour (des silences reserves).
 */
describe("partitionValide : la regle d'une partition", () => {
  const base = { a: { debut: 0.1, fin: 0.3 }, cloture: { debut: 0.9, fin: 1 } };
  const sansTenueCloture = { ignorerTenue: ["cloture"] };

  it("accepte la partition du Centre", () => {
    expect(partitionValide(PARTITION_CENTRE, SILENCES_CENTRE, { ignorerTenue: ["cloture"] })).toEqual([]);
  });

  it("refuse deux fenetres qui se chevauchent", () => {
    const v = partitionValide({ ...base, b: { debut: 0.25, fin: 0.5 } }, [], sansTenueCloture);
    expect(v.some((m) => m.includes("chevauchent"))).toBe(true);
  });

  it("refuse un ecart de 0,01 entre deux fenetres", () => {
    const v = partitionValide({ ...base, b: { debut: 0.31, fin: 0.5 } }, [], sansTenueCloture);
    expect(v.some((m) => m.includes("ecart"))).toBe(true);
  });

  it("refuse une fenetre qui touche un silence", () => {
    const v = partitionValide(base, [{ debut: 0.2, fin: 0.4 }], sansTenueCloture);
    expect(v.some((m) => m.includes("silence"))).toBe(true);
  });

  it("refuse une tenue de 7 %", () => {
    // 0,10 d'arc, moins 15 % d'entree et 15 % de sortie : 7 % de tenue.
    expect(tenueDe({ debut: 0.5, fin: 0.6 })).toBeCloseTo(0.07);
    const v = partitionValide({ ...base, b: { debut: 0.5, fin: 0.6 } }, [], sansTenueCloture);
    expect(v.some((m) => m.startsWith("b : tenue"))).toBe(true);
  });

  it("refuse une cloture suivie d'un autre bloc", () => {
    const v = partitionValide(
      { a: { debut: 0.1, fin: 0.3 }, cloture: { debut: 0.5, fin: 0.7 }, b: { debut: 0.8, fin: 1 } },
      [],
      sansTenueCloture,
    );
    expect(v.some((m) => m.includes("dernier"))).toBe(true);
  });

  it("refuse une fenetre hors de l'arc, inversee, ou NaN", () => {
    for (const f of [{ debut: 0.5, fin: 1.5 }, { debut: 0.6, fin: 0.4 }, { debut: NaN, fin: 0.5 }]) {
      expect(partitionValide({ a: f }, [], { ignorerTenue: ["a"], dernier: "a" }).some((m) => m.includes("invalide")), JSON.stringify(f)).toBe(true);
    }
  });

  it("sur le Centre, chaque tenue vaut au moins 8 % de l'arc, cloture mise a part", () => {
    for (const [nom, f] of Object.entries(PARTITION_CENTRE)) {
      if (nom === "cloture") continue;
      expect(tenueDe(f), nom).toBeGreaterThanOrEqual(TENUE_MIN);
    }
  });

  it("le climax 0,75 du Centre est dans un silence", () => {
    expect(SILENCES_CENTRE.some((s) => s.debut <= 0.75 && 0.75 <= s.fin)).toBe(true);
  });
});

describe("etatBloc : la grammaire d'apparition", () => {
  const f: Fenetre = { debut: 0.2, fin: 0.4 };

  it("est a 0 avant et apres la fenetre", () => {
    expect(etatBloc(0, f)).toEqual({ opacite: 0, phase: "avant", avancement: 0 });
    expect(etatBloc(0.19, f).phase).toBe("avant");
    expect(etatBloc(0.4, f)).toEqual({ opacite: 0, phase: "apres", avancement: 1 });
    expect(etatBloc(0.9, f).phase).toBe("apres");
  });

  it("entre sur les premiers 15 % de la fenetre", () => {
    expect(etatBloc(0.2, f)).toEqual({ opacite: 0, phase: "entree", avancement: 0 });
    const mi = etatBloc(0.2 + (0.2 * PART_ENTREE) / 2, f);
    expect(mi.phase).toBe("entree");
    expect(mi.opacite).toBeCloseTo(0.5);
    expect(mi.avancement).toBeCloseTo(0.5);
  });

  it("tient a 1 au milieu", () => {
    const m = etatBloc(0.3, f);
    expect(m.opacite).toBe(1);
    expect(m.phase).toBe("tenue");
    expect(m.avancement).toBeCloseTo(0.5);
  });

  it("sort sur les derniers 15 %, et finit a 0 exactement a la fin", () => {
    const debutSortie = 0.2 + 0.2 * (1 - PART_SORTIE);
    expect(etatBloc(debutSortie, f).phase).toBe("sortie");
    expect(etatBloc(debutSortie, f).opacite).toBeCloseTo(1);
    expect(etatBloc(0.4 - 1e-6, f).opacite).toBeCloseTo(0, 4);
    expect(etatBloc(0.4, f).opacite).toBe(0);
  });

  it("une fenetre qui commence a 0 n'a pas d'entree : le hero est la a l'arrivee", () => {
    expect(etatBloc(0, PARTITION_CENTRE.hero)).toEqual({ opacite: 1, phase: "tenue", avancement: 0 });
  });

  it("une fenetre qui finit a 1 ne sort jamais : la cloture reste posee pendant l'acte de sortie", () => {
    expect(etatBloc(1, PARTITION_CENTRE.cloture)).toEqual({ opacite: 1, phase: "tenue", avancement: 1 });
    expect(etatBloc(2, PARTITION_CENTRE.cloture).opacite).toBe(1);
  });

  it("borne le progres et ne rend jamais NaN", () => {
    expect(etatBloc(-1, f).phase).toBe("avant");
    expect(etatBloc(NaN, f).phase).toBe("avant");
    expect(Number.isNaN(etatBloc(NaN, PARTITION_CENTRE.hero).opacite)).toBe(false);
  });
});

describe("la partition du Centre : un seul bloc a la fois", () => {
  it("a aucun progres deux blocs n'ont une opacite non nulle", () => {
    for (let i = 0; i <= 1000; i++) {
      const p = i / 1000;
      const visibles = Object.values(PARTITION_CENTRE).filter((f) => etatBloc(p, f).opacite > 0).length;
      expect(visibles, `a p=${p.toFixed(3)}`).toBeLessThanOrEqual(1);
    }
    // Au-dela de l'arc (l'acte de sortie, progres borne a 1) : la cloture seule.
    expect(Object.values(PARTITION_CENTRE).filter((f) => etatBloc(2, f).opacite > 0).length).toBe(1);
  });

  it("rien n'est visible au climax 0,75", () => {
    expect(Object.values(PARTITION_CENTRE).every((f) => etatBloc(0.75, f).opacite === 0)).toBe(true);
  });
});
```

- [x] **Step 2 : verifier qu'ils echouent**

Run: `pnpm exec vitest run src/lib/partition-texte.test.ts`
Expected : FAIL, `Cannot find module './partition-texte'`.

- [x] **Step 3 : ecrire la lib**

```ts
// src/lib/partition-texte.ts
/**
 * LA PARTITION DU TEXTE (11/10/2026).
 *
 * Spec : docs/superpowers/specs/2026-10-10-partition-texte-design.md.
 * Audit visuel du 10/10 : le Centre empilait cinq systemes de texte dans le
 * meme coin, chacun avec sa propre horloge (hero 0 -> 0,25, cinq chapitres
 * par phase, le chant en flux de 0 a 0,82, la cloture de 0,75 a 1) ; a
 * t=0,15 trois panneaux se lisaient ensemble, a t=0,4 le chant cachait le
 * cerf. Sylvain : « un seul panneau a la fois, mais surtout on doit aussi
 * enlever du texte [...] C'est l'image qui prevaut. »
 *
 * La regle :
 *  1. une partition par page : chaque bloc recoit une fenetre [debut, fin]
 *     dans l'arc ; deux fenetres ne se chevauchent jamais et gardent au
 *     moins ECART_MIN entre elles ; des silences sont reserves, aucune
 *     fenetre ne les approche a moins de ECART_MIN ;
 *  2. l'image prevaut : le climax (0,75) est dans un silence ;
 *  3. une grammaire pour tous : entree sur les premiers 15 % de la
 *     fenetre, tenue, sortie sur les derniers 15 %, la sortie finit DANS
 *     la fenetre (l'ecart entre deux blocs est un vrai vide) ;
 *  4. lisible : toute tenue dure au moins TENUE_MIN de l'arc (8 %, soit
 *     140 px sur l'Accueil a 800 px de haut, deux crans de molette ; la
 *     regle du 13/09, « l'encadre apparait un court moment, c'est un
 *     bug », passee de 12 a 8 % parce que les blocs sont des one-liners
 *     et qu'on garde un silence de 12 % et le chant dans l'arc).
 *
 * Deux cas de bord qui sont des intentions : une fenetre qui commence a 0
 * n'a pas d'entree (le hero est la quand on arrive, avant tout
 * defilement) ; une fenetre qui finit a 1 ne sort jamais (la cloture reste
 * posee pendant l'acte de sortie, le dernier 0,55 vh hors arc, ou le
 * progres de l'arc vaut 1).
 *
 * Seule la cloture est exemptee de TENUE_MIN (0,04 d'arc sans sortie :
 * 3,4 %) ; le hero, lui, tient 8,5 % et la regle s'applique.
 *
 * Pur : aucune lecture du DOM ici. Le composant qui applique l'etat par
 * image est use-pilote-fenetre.ts.
 */
import { clampProgress } from "./camera-path";

export type Fenetre = { readonly debut: number; readonly fin: number };
export type Phase = "avant" | "entree" | "tenue" | "sortie" | "apres";
export type EtatBloc = {
  /** 0 avant et apres ; monte pendant l'entree, 1 en tenue, descend en sortie. */
  opacite: number;
  phase: Phase;
  /** La position dans la phase courante, 0 -> 1 (pour le CSS : `--avancement`). */
  avancement: number;
};

/** L'ecart minimal entre deux fenetres, et entre une fenetre et un silence. */
export const ECART_MIN = 0.02;
/** La part de la fenetre consommee par l'entree, puis par la sortie. */
export const PART_ENTREE = 0.15;
export const PART_SORTIE = 0.15;
/** La tenue minimale d'un bloc, en fraction de l'arc. */
export const TENUE_MIN = 0.08;

export type BlocCentre = "hero" | "chapitre-0" | "chant" | "chapitre-1" | "chapitre-2" | "cloture";

/**
 * La partition du Centre (docs/da/plans/centre.md pour la scene a chaque
 * moment) : le hero a l'arrivee ; I · L'approche dans la penombre ; le
 * chant quand la lumiere monte et que le mais pousse ; II · Le regard
 * quand la tete se tourne ; le silence du face-a-face, climax compris ;
 * IV · Les chemins quand ils se revelent ; la cloture sur l'image finale.
 * Les chapitres gardes sont I, II et IV (III « Un silence. » est dit par
 * le silence lui-meme, V « L'Ollin » par la cloture qui est deja le
 * depart) ; les index 0, 1, 2 suivent l'ordre du dictionnaire.
 */
export const PARTITION_CENTRE: Record<BlocCentre, Fenetre> = {
  hero: { debut: 0, fin: 0.1 },
  "chapitre-0": { debut: 0.12, fin: 0.3 },
  chant: { debut: 0.32, fin: 0.5 },
  "chapitre-1": { debut: 0.52, fin: 0.64 },
  "chapitre-2": { debut: 0.8, fin: 0.94 },
  cloture: { debut: 0.96, fin: 1 },
};

/** Le face-a-face tenu, et le climax 0,75 dedans : l'image seule. */
export const SILENCES_CENTRE: readonly Fenetre[] = [{ debut: 0.66, fin: 0.78 }];

/** Tolerance des comparaisons : 0,64 + 0,02 n'est pas exactement 0,66 en flottant. */
const EPSILON = 1e-9;

/** La duree de la tenue d'une fenetre, en fraction de l'arc. */
export function tenueDe(fenetre: Fenetre): number {
  const entree = fenetre.debut <= 0 ? 0 : PART_ENTREE;
  const sortie = fenetre.fin >= 1 ? 0 : PART_SORTIE;
  return (fenetre.fin - fenetre.debut) * (1 - entree - sortie);
}

export function etatBloc(progress: number, fenetre: Fenetre): EtatBloc {
  const p = clampProgress(progress);
  const { debut, fin } = fenetre;
  const sansEntree = debut <= 0;
  const sansSortie = fin >= 1;
  if (p < debut) return { opacite: 0, phase: "avant", avancement: 0 };
  if (p >= fin && !sansSortie) return { opacite: 0, phase: "apres", avancement: 1 };
  const t = fin > debut ? (p - debut) / (fin - debut) : 1;
  // Les frontieres de phase portent la meme tolerance que partitionValide :
  // (0,37 - 0,2) / 0,2 vaut 0,8499999999999999 en flottant, pas 0,85.
  if (!sansEntree && t < PART_ENTREE - EPSILON) {
    const a = Math.min(1, Math.max(0, t / PART_ENTREE));
    return { opacite: a, phase: "entree", avancement: a };
  }
  const debutSortie = 1 - PART_SORTIE;
  if (!sansSortie && t >= debutSortie - EPSILON) {
    const a = Math.min(1, Math.max(0, (t - debutSortie) / PART_SORTIE));
    return { opacite: 1 - a, phase: "sortie", avancement: a };
  }
  const debutTenue = sansEntree ? 0 : PART_ENTREE;
  const finTenue = sansSortie ? 1 : debutSortie;
  const a = finTenue > debutTenue ? Math.max(0, Math.min(1, (t - debutTenue) / (finTenue - debutTenue))) : 1;
  return { opacite: 1, phase: "tenue", avancement: a };
}

/**
 * Les violations d'une partition, vide si tout va. Un oracle unitaire
 * l'applique a PARTITION_CENTRE : la prochaine fenetre deplacee a la main
 * qui mord sur le silence ou sur sa voisine fait rougir la suite.
 */
export function partitionValide(
  partition: Record<string, Fenetre>,
  silences: readonly Fenetre[],
  options: { ignorerTenue?: readonly string[]; dernier?: string } = {},
): string[] {
  const ignorer = new Set(options.ignorerTenue ?? []);
  const dernier = options.dernier ?? "cloture";
  const violations: string[] = [];
  const blocs = Object.entries(partition).sort((a, b) => a[1].debut - b[1].debut);
  for (const [nom, f] of blocs) {
    if (!(f.debut >= 0 && f.fin <= 1 && f.debut < f.fin)) {
      violations.push(`${nom} : fenetre invalide [${f.debut}, ${f.fin}]`);
    }
    const tenue = tenueDe(f);
    if (!ignorer.has(nom) && tenue + EPSILON < TENUE_MIN) {
      violations.push(`${nom} : tenue ${(tenue * 100).toFixed(1)} % < ${TENUE_MIN * 100} %`);
    }
    for (const s of silences) {
      const avant = f.fin + ECART_MIN <= s.debut + EPSILON;
      const apres = f.debut + EPSILON >= s.fin + ECART_MIN;
      if (!avant && !apres) violations.push(`${nom} : touche le silence [${s.debut}, ${s.fin}]`);
    }
  }
  for (let i = 1; i < blocs.length; i++) {
    const [nomA, a] = blocs[i - 1];
    const [nomB, b] = blocs[i];
    if (b.debut + EPSILON < a.fin) {
      violations.push(`${nomA} et ${nomB} se chevauchent`);
    } else if (b.debut - a.fin + EPSILON < ECART_MIN) {
      violations.push(`${nomA} et ${nomB} : ecart ${(b.debut - a.fin).toFixed(3)} < ${ECART_MIN}`);
    }
  }
  if (Object.hasOwn(partition, dernier) && blocs[blocs.length - 1][0] !== dernier) {
    violations.push(`${dernier} n'est pas le dernier bloc`);
  }
  return violations;
}
```

- [x] **Step 4 : verifier que les tests passent**

Run: `pnpm exec vitest run src/lib/partition-texte.test.ts`
Expected : PASS, 17 tests.

- [x] **Step 5 : tsc + eslint, puis commit**

```powershell
pnpm exec tsc --noEmit
pnpm exec eslint src/lib/partition-texte.ts src/lib/partition-texte.test.ts
git add src/lib/partition-texte.ts src/lib/partition-texte.test.ts
git commit -m "feat(texte): la partition, lib pure -- fenetres du Centre, silences, grammaire entree/tenue/sortie, validateur"
```

---

### Task 2 : ce qui part (dictionnaires, hero, chapitres, poetique, chant)

Tout ce que la scene dit deja sort du texte. Les trois dictionnaires sont reecrits par script (CRLF, `JSON.stringify(obj, null, 2)`, verifie le 11/10 : les fichiers sont deja strictement dans ce format, le diff ne portera que sur les cles touchees).

**Decision prise ici, a dire a Sylvain :** le paragraphe du hero (Mazatl, 60 mots) n'est PAS recopie dans `codex.totem.text`. Verifie dans `fr.json` le 11/10 : `codex.totem.text` dit deja « Le nahual est cette essence qui se revele dans sa forme animale veritable [...] messager entre les mondes, associe a la grace, a la vigilance, et a la faculte de cacher sa vraie nature aux autres », et `codex.tonalpohualli.text` dit deja « Le cerf est le septieme signe ». Les deux faits du paragraphe y sont mot pour mot ; l'ajouter en ferait une repetition dans la meme page du Codex. La cle est simplement supprimee.

**Files:**
- Modify: `src/dictionaries/fr.json`, `src/dictionaries/en.json`, `src/dictionaries/es.json`
- Modify: `src/lib/i18n-parity.test.ts:76-94`
- Modify: `src/app/components/stag-scene/stag-scene.tsx`
- Delete: `src/app/components/stag-scene/hero-texte-mobile.tsx`, `src/lib/hero-mobile.ts`, `src/lib/hero-mobile.test.ts`
- Modify: `src/app/components/stag-scene/scene-text-overlay.module.css:70-77`
- Modify: `src/app/components/stag-scene/page-closure.tsx:124`, `src/app/components/stag-scene/page-closure.module.css:145-160,209`
- Modify: `src/app/components/cantar.tsx:72,92-97`
- Modify: `src/app/globals.css` (`.cantarLabel`)

- [x] **Step 1 : l'oracle i18n (rouge) : `poetic` n'existe plus, la non-copie se verifie sur `nextLabel`**

Dans `src/lib/i18n-parity.test.ts`, remplacer le dernier `it` (lignes 76 a 94) par :

```ts
  it("les cinq sorties de scene sont traduites, cardinal et suite", () => {
    // Le defaut jumeau du 09/09 : la table des sorties de scene vivait dans
    // le composant, en francais seulement, donc les DIX pages etrangeres
    // finissaient sur « Le nombril du monde. D'ou partent les chemins. »
    // C'est la derniere chose qu'un jury lit sur chaque page.
    // 11/10 : la ligne poetique est partie (partition du texte, KISS : la
    // cloture ne garde que le titre cardinal et le lien vers la suite).
    for (const dir of ["jade", "dore", "turquoise", "cendre", "obsidienne"]) {
      for (const champ of ["cardinal", "nextLabel"]) {
        const cle = `closure.${dir}.${champ}`;
        for (const loc of ["fr", "en", "es"] as const) {
          expect(dicos[loc].get(cle), `${loc} ${cle}`).toBeTruthy();
        }
      }
      expect(dicos.fr.has(`closure.${dir}.poetic`), `${dir} : la ligne poetique est partie`).toBe(false);
      // Et elles ne sont pas juste recopiees du francais.
      const frSuite = dicos.fr.get(`closure.${dir}.nextLabel`);
      for (const loc of ["en", "es"] as const) {
        expect(dicos[loc].get(`closure.${dir}.nextLabel`), `${loc} ${dir} : suite non traduite`).not.toBe(frSuite);
      }
    }
  });

  it("le Centre raconte trois chapitres, I, II et IV", () => {
    // 11/10, partition du texte : III « Un silence. » est dit par le silence
    // lui-meme, V « L'Ollin » par la cloture qui est deja le depart.
    const chapitresPartition = Object.keys(PARTITION_CENTRE).filter((k) => k.startsWith("chapitre-")).length;
    for (const loc of ["fr", "en", "es"] as const) {
      expect(dicos[loc].get("home.chapters[0].kicker"), loc).toMatch(/^I /);
      expect(dicos[loc].get("home.chapters[1].kicker"), loc).toMatch(/^II /);
      expect(dicos[loc].get("home.chapters[2].kicker"), loc).toMatch(/^IV /);
      expect(dicos[loc].has("home.chapters[3].kicker"), loc).toBe(false);
      expect(dicos[loc].has(`home.chapters[${chapitresPartition}].kicker`), `${loc} : autant de chapitres que de fenetres dans la partition`).toBe(false);
      expect(dicos[loc].has(`home.chapters[${chapitresPartition - 1}].kicker`), loc).toBe(true);
      expect(dicos[loc].has("home.heroText"), `${loc} : le paragraphe du hero est parti`).toBe(false);
      expect(dicos[loc].has("common.cantar.ourTranslation"), `${loc} : la citation longue est partie`).toBe(false);
    }
  });

  it("la source du chant porte le chant et la strophe, jamais le folio", () => {
    // 11/10 : source courte ; un `{folio}` oublie s'afficherait tel quel.
    for (const loc of ["fr", "en", "es"] as const) {
      const source = dicos[loc].get("common.cantar.source") ?? "";
      expect(source, loc).toContain("{chant}");
      expect(source, loc).toContain("{strophe}");
      expect(source, loc).not.toContain("{folio}");
    }
  });
```

Run: `pnpm exec vitest run src/lib/i18n-parity.test.ts`
Expected : FAIL (poetic existe encore, cinq chapitres, heroText present).

- [x] **Step 2 : reecrire les trois dictionnaires par script**

Creer `.scratch/partition-dictionnaires.mjs` :

```js
// .scratch/partition-dictionnaires.mjs : ce qui part des dictionnaires (11/10,
// partition du texte). Reecrit fr/en/es en CRLF, 2 espaces, comme ils sont.
import fs from "node:fs";

const SOURCE = {
  fr: "Cantares mexicanos, {chant} · {strophe}",
  en: "Cantares mexicanos, {chant} · {strophe}",
  es: "Cantares mexicanos, {chant} · {strophe}",
};

for (const l of ["fr", "en", "es"]) {
  const chemin = `src/dictionaries/${l}.json`;
  const d = JSON.parse(fs.readFileSync(chemin, "utf8"));
  delete d.home.heroText;
  // I, II, IV : index 0, 1, 3 de l'ancienne table.
  d.home.chapters = [d.home.chapters[0], d.home.chapters[1], d.home.chapters[3]];
  for (const dir of Object.keys(d.closure)) delete d.closure[dir].poetic;
  delete d.common.cantar.ourTranslation;
  d.common.cantar.source = SOURCE[l];
  fs.writeFileSync(chemin, (JSON.stringify(d, null, 2) + "\n").replace(/\n/g, "\r\n"));
  console.log(l, "chapitres :", d.home.chapters.map((c) => c.kicker).join(" / "));
}
```

Run :

```powershell
node .scratch/partition-dictionnaires.mjs
git diff --stat src/dictionaries
```

Expected : trois lignes « I · ... / II · ... / IV · ... » ; le diff stat montre environ 20 lignes retirees par fichier et 1 modifiee (`source`), rien d'autre. Si le diff depasse 40 lignes par fichier, le format a bouge : `git checkout src/dictionaries` et chercher pourquoi avant de continuer.

- [x] **Step 3 : le hero sans paragraphe, trois chapitres, dans `stag-scene.tsx`**

Dans `src/app/components/stag-scene/stag-scene.tsx` :

- supprimer la ligne `import HeroTexteMobile from "./hero-texte-mobile";` ;
- dans `HomeContent`, supprimer `heroText: string;` ;
- dans le bloc sr-only, supprimer `<p>{renderWithNahuatl(home.heroText)}</p>` et remplacer `aria-label="Recit du cerf, quatre chapitres"` par `aria-label="Recit du cerf, trois chapitres"` ;
- dans le `FadingBlock` du hero, supprimer les deux lignes :

```tsx
              {/* Sur telephone, le paragraphe n'entre qu'au premier defilement (04/10, lib/hero-mobile). */}
              <HeroTexteMobile progressRef={progressRef}>{home.heroText}</HeroTexteMobile>
```

et ajouter, a la place, ce commentaire au-dessus de `<div aria-hidden="true">` :

```tsx
            {/* Le hero tient en titre + ligne de seuil + appel (11/10, partition du
                texte) : le paragraphe sur Mazatl est parti, le Codex (totem,
                tonalpohualli) en disait deja chaque mot. C'etait deja le cas sur
                telephone depuis le 04/10 ; le bureau rejoint. */}
```

- [x] **Step 4 : supprimer l'accueil mobile du 04/10, qui n'a plus de sujet**

```powershell
git rm src/app/components/stag-scene/hero-texte-mobile.tsx src/lib/hero-mobile.ts src/lib/hero-mobile.test.ts
```

Dans `src/app/components/stag-scene/scene-text-overlay.module.css`, supprimer les lignes 70 a 77 (le commentaire « L'ACCUEIL MOBILE (04/10, lib/hero-mobile) » et la regle `.heroTexte:not([data-visible]) { display: none; }`).

Dans `src/app/globals.css` ligne 1967, remplacer le commentaire :

```css
/* 400 -> 767 px le 04/10 (l'accueil mobile, lib/hero-mobile) : sur tout
   telephone la carte du hero tient en titre + appel, le cerf garde le
   centre ; a 412 px la ligne de seuil faisait trois lignes et la carte
   remontait jusqu'a la tete du cerf. */
```

par :

```css
/* 400 -> 767 px le 04/10 (l'accueil mobile) : sur tout telephone la carte
   du hero tient en titre + appel, le cerf garde le centre ; a 412 px la
   ligne de seuil faisait trois lignes et la carte remontait jusqu'a la
   tete du cerf. (Le paragraphe du hero, lui, est parti partout le 11/10.) */
```

- [x] **Step 5 : la cloture sans ligne poetique**

Dans `src/app/components/stag-scene/page-closure.tsx`, supprimer la ligne 124 :

```tsx
      <p className={styles.poetic}>{closure.poetic}</p>
```

et, dans le commentaire d'en-tete (ligne 20), remplacer `underline dorée qui se dessine, micro-glyphe cardinal en marge, CTA pill avec chevron animé.` par `underline dorée qui se dessine, micro-glyphe cardinal en marge, CTA pill avec chevron animé. Sans ligne poetique depuis le 11/10 (partition du texte) : titre cardinal + lien vers la suite, rien d'autre.`

Dans `src/app/components/stag-scene/page-closure.module.css` :
- supprimer le bloc `.poetic { ... }` (lignes 145 a 155) et le bloc `.revealed .poetic { ... }` (157 a 160) ;
- dans la liste sous `@media (prefers-reduced-motion: reduce)` (ligne 209), retirer la ligne `  .poetic,` ;
- dans le commentaire d'en-tete, remplacer `underline → poétique → CTA (~700ms total)` par `underline → CTA (~700ms total)`.

- [x] **Step 6 : le chant sans etiquette ni citation longue**

Dans `src/app/components/cantar.tsx` :
- supprimer la ligne 72 `<p className="cantarLabel">{texts.label}</p>` ;
- remplacer le `figcaption` (lignes 92 a 97) par :

```tsx
      {/* La source courte (11/10, partition du texte) : le chant, la strophe,
          et le lien vers l'edition ouverte. L'attribution complete (edition
          Leon-Portilla, UNAM 2011, nos traductions faites d'apres son
          espagnol) vit dans lib/cantares.ts et docs/da/cantares-choix.md. */}
      <figcaption className="cantarSource">
        <cite>{source}</cite>
        {" · "}
        <a href={CANTARES_EDITION_URL} target="_blank" rel="noopener noreferrer" hrefLang="es">
          {texts.editionLink} ({newWindow})
        </a>
      </figcaption>
```

- dans le commentaire d'en-tete (lignes 21-22), remplacer « La source est dans un `<cite>` et le lien vers l'edition ouverte est explicite » par « La source courte est dans un `<cite>` (chant · strophe) et le lien vers l'edition ouverte est explicite ; l'etiquette visible « Un chant de cette direction » est partie le 11/10, `common.cantar.label` ne sert plus qu'a l'`aria-label` de la section du Centre ».

Dans `src/app/globals.css`, supprimer le bloc `.cantarLabel { ... }` (lignes 2008 a 2014).

- [x] **Step 7 : verifier**

```powershell
pnpm test
pnpm exec tsc --noEmit
pnpm exec eslint src/app/components/stag-scene/stag-scene.tsx src/app/components/stag-scene/page-closure.tsx src/app/components/cantar.tsx src/lib/i18n-parity.test.ts
git grep -n "heroText\|ourTranslation\|\.poetic\|cantarLabel\|hero-mobile\|HeroTexteMobile" -- src
```

Expected : vitest vert (un fichier de tests en moins : hero-mobile), `tsc` muet, eslint propre, le `git grep` ne renvoie RIEN.

- [x] **Step 8 : commit**

```powershell
git add -A src
# `.scratch/` est ignore par git (decision anterieure : scripts de sonde locaux) : le script reste sur le disque, pas dans le depot.
git commit -m "feat(texte): ce qui part -- paragraphe du hero, chapitres III et V, ligne poetique des clotures, etiquette et citation longue du chant (KISS, l'image prevaut)"
```

---

### Task 3 : `FadingBlock` pilote par fenetre, la grammaire en CSS, et `reveal-arc` allege

**Files:**
- Create: `src/app/components/stag-scene/use-pilote-fenetre.ts`
- Modify: `src/app/components/stag-scene/fading-block.tsx`
- Modify: `src/app/components/stag-scene/scene-text-overlay.module.css` (apres `.block`)
- Modify: `src/app/components/stag-scene/stag-scene.tsx`
- Modify: `src/lib/reveal-arc.ts:197-273`, `src/lib/reveal-arc.test.ts:2,167-184,344-409`
- Modify: `tests/e2e/calque-fixe.spec.ts:20-48`

- [x] **Step 1 : le hook partage**

```ts
// src/app/components/stag-scene/use-pilote-fenetre.ts
"use client";

import { useEffect, type MutableRefObject, type RefObject } from "react";
import { etatBloc, type EtatBloc, type Fenetre } from "@/lib/partition-texte";

/**
 * LE PILOTE D'UN BLOC DE TEXTE (11/10, partition du texte). Un seul
 * mecanisme pour le calque fixe (FadingBlock), le chant dans le flux
 * (BlocEnFlux) et, par etatBloc directement, la cloture : a chaque image,
 * l'etat de la fenetre est lu depuis le progres de l'arc et pose sur
 * l'element. Opacite et pointer-events en style ; `data-phase` pour le
 * CSS et pour RevealText (qui rejoue sa cascade a chaque entree) ;
 * `--avancement` (0 -> 1 dans la phase) pour que le mouvement de 12 px a
 * l'entree et de 8 px a la sortie vive en CSS, pas ici.
 *
 * Meme discipline que FadingBlock depuis le 19/08 : requestAnimationFrame
 * et ecriture DOM directe, jamais d'etat React par image, aucune lecture
 * de mise en page (lire un attribut n'en est pas une).
 *
 * `masquer` : le calque fixe empile ses blocs en colonne, un bloc invisible
 * doit sortir du flux (display none, bug du 19/08 : le hero colle en haut)
 * ; un bloc EN flux garde sa place (visibility hidden), sinon la page
 * changerait de hauteur et l'arc avec.
 */
export const ETAT_PLEIN: EtatBloc = { opacite: 1, phase: "tenue", avancement: 0 };

export function appliquerEtat(el: HTMLElement, etat: EtatBloc, masquer: boolean): void {
  el.style.opacity = String(etat.opacite);
  el.style.pointerEvents = etat.opacite > 0.05 ? "auto" : "none";
  if (masquer) el.style.display = etat.opacite > 0.001 ? "flex" : "none";
  else el.style.visibility = etat.opacite > 0.001 ? "visible" : "hidden";
  el.style.setProperty("--avancement", etat.avancement.toFixed(3));
  // Ecrit seulement au changement : un MutationObserver (RevealText) ecoute
  // cet attribut, et setAttribute a valeur egale le reveillerait quand meme.
  if (el.dataset.phase !== etat.phase) el.dataset.phase = etat.phase;
}

export function usePiloteFenetre(
  ref: RefObject<HTMLElement | null>,
  fenetre: Fenetre,
  progressRef: MutableRefObject<number>,
  reducedMotionRef: MutableRefObject<boolean>,
  options: { masquer: boolean; actif: boolean },
): void {
  const { masquer, actif } = options;
  useEffect(() => {
    if (!actif) return;
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) appliquerEtat(el, reducedMotionRef.current ? ETAT_PLEIN : etatBloc(progressRef.current, fenetre), masquer);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref, fenetre, progressRef, reducedMotionRef, masquer, actif]);
}
```

- [x] **Step 2 : `FadingBlock` prend `fenetre` et `nom`**

Remplacer tout `src/app/components/stag-scene/fading-block.tsx` par :

```tsx
"use client";

import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { etatBloc, type Fenetre } from "@/lib/partition-texte";
import { isBot } from "@/lib/is-bot";
import styles from "./scene-text-overlay.module.css";
import { ETAT_PLEIN, usePiloteFenetre } from "./use-pilote-fenetre";

/**
 * Bloc de texte du calque fixe, dont l'opacite suit sa FENETRE dans l'arc
 * (11/10, partition du texte, lib/partition-texte) : en flux normal, pas
 * positionne lui-meme, c'est SceneTextOverlay (le parent) qui empile
 * plusieurs FadingBlock verticalement, pour que deux blocs cohabitant au
 * meme coin ne se superposent jamais quand les deux sont visibles
 * (`prefers-reduced-motion`, garde-fou du Codex Nahual). Hors mouvement
 * reduit, la partition garantit qu'un seul bloc est visible a la fois.
 *
 * `display: none` en plus de l'opacite quand le bloc est totalement
 * invisible : un bloc a opacite 0 reste sinon present dans le flux et
 * pousse le voisin visible loin de son ancrage reel (bug constate le
 * 19/08 : hero colle en haut au lieu du bas).
 *
 * L'opacite de tout premier rendu est posee en style inline depuis
 * `etatBloc(0, fenetre)` : sans ca, un bloc cense demarrer invisible
 * flashait plein pot avant le premier calcul (bug reel du 19/08).
 *
 * `data-bloc` nomme le bloc pour les oracles (partition-centre.spec.ts) ;
 * `data-phase` et `--avancement` sont poses par le pilote.
 */
export default function FadingBlock({
  progressRef,
  reducedMotionRef,
  fenetre,
  nom,
  children,
}: {
  progressRef: MutableRefObject<number>;
  reducedMotionRef: MutableRefObject<boolean>;
  fenetre: Fenetre;
  nom: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Bots (Lighthouse/PageSpeed/crawlers) : skip rAF permanent + force
  // contenu visible (les chapitres demarrent invisibles, seul le hero
  // serait crawle sinon). Detection post-hydration = pas de mismatch SSR.
  const [bot, setBot] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isBot()) setBot(true);
  }, []);

  usePiloteFenetre(rootRef, fenetre, progressRef, reducedMotionRef, { masquer: true, actif: !bot });

  const initial = bot ? ETAT_PLEIN : etatBloc(0, fenetre);
  const inlineStyle = {
    opacity: initial.opacite,
    pointerEvents: (initial.opacite > 0.05 ? "auto" : "none") as "auto" | "none",
    display: (initial.opacite > 0.001 ? "flex" : "none") as "flex" | "none",
  };

  return (
    <div ref={rootRef} className={styles.block} style={inlineStyle} data-bloc={nom} data-phase={initial.phase}>
      {children}
    </div>
  );
}
```

- [x] **Step 3 : la grammaire en CSS**

Dans `src/app/components/stag-scene/scene-text-overlay.module.css`, juste apres le bloc `@media (prefers-reduced-motion: reduce) { .block { transition: none; } }` (ligne 117 a 121), ajouter :

```css
/* LA GRAMMAIRE D'APPARITION (11/10, partition du texte, lib/partition-texte).
   Le bloc entre en montant de 12 px sur les premiers 15 % de sa fenetre,
   tient, puis sort en derivant de 8 px vers le haut sur les derniers 15 %.
   `--avancement` (0 -> 1 dans la phase) et `data-phase` sont poses par
   image depuis l'arc (use-pilote-fenetre) ; les pixels, eux, vivent ici,
   et le mouvement est scrube par le defilement, pas par une horloge. */
.block[data-phase="entree"] {
  transform: translateY(calc(12px * (1 - var(--avancement, 1))));
}
.block[data-phase="sortie"] {
  transform: translateY(calc(-8px * var(--avancement, 0)));
}
@media (prefers-reduced-motion: reduce) {
  .block[data-phase] {
    transform: none;
  }
}
```

- [x] **Step 4 : `stag-scene.tsx` lit la partition**

- Remplacer `import { getChapterOpacity, getIntroOpacity } from "@/lib/reveal-arc";` par `import { PARTITION_CENTRE, type BlocCentre } from "@/lib/partition-texte";`.
- Au-dessus de `export default function StagScene`, ajouter :

```tsx
/** Les trois chapitres gardes (I, II, IV), dans l'ordre du dictionnaire. */
const CHAPITRES: readonly BlocCentre[] = ["chapitre-0", "chapitre-1", "chapitre-2"];
```

- Le `FadingBlock` du hero devient :

```tsx
          <FadingBlock progressRef={progressRef} reducedMotionRef={reducedMotionRef} fenetre={PARTITION_CENTRE.hero} nom="hero">
```

- La boucle des chapitres devient :

```tsx
          {/* Chapitres narratifs scroll-driven (28/08 task #63), trois depuis le
              11/10, chacun dans sa fenetre de la partition. aria-hidden :
              contenu equivalent deja dans le sr-only ci-dessus. */}
          {home.chapters.map((chapter, i) => {
            const nom = CHAPITRES[i];
            if (!nom) return null;
            return (
              <FadingBlock key={nom} progressRef={progressRef} reducedMotionRef={reducedMotionRef} fenetre={PARTITION_CENTRE[nom]} nom={nom}>
                <div aria-hidden="true" className={overlayStyles.chapter}>
                  <RevealText as="p" className={overlayStyles.chapterKicker} text={chapter.kicker} delayPerWord={30} />
                  <RevealText as="p" className={overlayStyles.chapterLine} text={chapter.line} delayPerWord={35} />
                </div>
              </FadingBlock>
            );
          })}
```

- Dans le commentaire d'en-tete du composant (lignes 26-35), remplacer `hero visible dès le chargement (getIntroOpacity, s'efface avec la pénombre) et à-propos révélé à "chemins révélés" (getNavEmphasis, même moment que l'emphase de la nav).` par `chaque bloc de texte dans sa fenetre de la partition du Centre (lib/partition-texte, 11/10) : hero a l'arrivee, I, le chant, II, un silence au climax, IV, la cloture.`

- [x] **Step 5 : `reveal-arc.ts` perd ce qui n'a plus de consommateur**

Dans `src/lib/reveal-arc.ts`, supprimer les lignes 197 a 273 : le commentaire et la fonction `getIntroOpacity`, le commentaire des chapitres, `type ChapterWindow`, `CHAPTER_WINDOWS`, `CHAPTER_FADE_SHARE`, `CHAPTER_COUNT`, `getChapterOpacity`. A la place, laisser ce repere :

```ts
// Le hero (getIntroOpacity, 19/08) et les chapitres du Centre (CHAPTER_WINDOWS,
// 28/08, elargis le 13/09) ont quitte ce fichier le 11/10 : le texte du Centre
// suit desormais une partition unique, lib/partition-texte.ts, qui porte ses
// propres oracles (tenue minimale, jamais deux blocs ensemble, silences).
```

Dans `src/lib/reveal-arc.test.ts` :
- ligne 2, l'import devient `import { EXIT_SCROLL_VIEWPORTS, arcProgress, arcScrollHeight, exitProgress, getAmbientIntensity, getDirectionalIntensity, getFogColor, getHeadTurnAmount, getIdleClipName, getMilpaGrowth, getNavEmphasis, getRevealFloor, getRevealPhase } from "./reveal-arc";` ;
- supprimer le `describe("getIntroOpacity", ...)` (lignes 167 a 184) ;
- supprimer le `describe("les chapitres du Centre : assez longtemps pour etre lus", ...)` (lignes 344 a 409, jusqu'a la fin du fichier).

- [x] **Step 6 : verifier**

```powershell
pnpm test
pnpm exec tsc --noEmit
pnpm exec eslint src/app/components/stag-scene src/lib/reveal-arc.ts src/lib/reveal-arc.test.ts
git grep -n "getIntroOpacity\|getChapterOpacity\|CHAPTER_COUNT\|CHAPTER_WINDOWS" -- src tests
```

Expected : vert, muet, propre, `git grep` vide.

- [x] **Step 7 : l'oracle du calque fixe vise les fenetres de la partition**

L'ancien `calque-fixe.spec.ts` allait a 35, 60 et 95 % du DEFILEMENT et comptait sur un chapitre allume ; avec la partition, 35 % du defilement tombe pendant le chant (en flux, pas dans le calque), 60 % dans le silence. Il vise desormais le milieu de chaque chapitre dans l'ARC.

Dans `tests/e2e/calque-fixe.spec.ts`, remplacer les lignes 20 a 48 par :

```ts
import { defilerDansLArc } from "./arc";

async function aller(page: import("@playwright/test").Page, f: number) {
  await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f), f);
  await page.waitForTimeout(1800);
}

test("accueil : au milieu de chaque chapitre, le bloc allume est dans la fenetre", async ({ page }) => {
  // 11/10, partition du texte : I, II et IV ont chacun leur fenetre dans
  // l'arc (lib/partition-texte, PARTITION_CENTRE) ; on vise leur milieu.
  test.setTimeout(150_000);
  await page.goto("/fr?shaders-prod");
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
  await page.waitForTimeout(2500);
  for (const [f, attendu] of [[0.21, "chapitre-0"], [0.58, "chapitre-1"], [0.87, "chapitre-2"]] as const) {
    await defilerDansLArc(page, f);
    await page.waitForTimeout(1800);
    const blocs = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-scene-overlay] [data-bloc]")]
        .filter((b) => Number(getComputedStyle(b).opacity) > 0.9 && getComputedStyle(b).display !== "none")
        .map((b) => {
          const r = b.getBoundingClientRect();
          return { nom: b.dataset.bloc, top: Math.round(r.top), bottom: Math.round(r.bottom) };
        }),
    );
    expect(blocs.map((b) => b.nom), `a ${Math.round(f * 100)} % de l'arc`).toEqual([attendu]);
    expect(blocs[0].top, `${attendu} commence dans la fenetre`).toBeGreaterThanOrEqual(0);
    expect(blocs[0].bottom, `${attendu} finit dans la fenetre`).toBeLessThanOrEqual(800);
  }
});
```

(L'import `defilerDansLArc` va en tete de fichier avec l'autre import ; `aller` reste pour les quatre tests des pages echo.)

Run: `pnpm exec playwright test tests/e2e/calque-fixe.spec.ts --project=chromium`
Expected : 5 passed (le serveur `pnpm run dev` est lance par la config).

- [x] **Step 8 : commit**

```powershell
git add src/app/components/stag-scene/use-pilote-fenetre.ts src/app/components/stag-scene/fading-block.tsx src/app/components/stag-scene/scene-text-overlay.module.css src/app/components/stag-scene/stag-scene.tsx src/lib/reveal-arc.ts src/lib/reveal-arc.test.ts tests/e2e/calque-fixe.spec.ts
git commit -m "feat(texte): le calque fixe suit la partition -- FadingBlock pilote par fenetre, data-phase + --avancement, mouvement en CSS ; getIntroOpacity et les chapitres quittent reveal-arc"
```

---

### Task 4 : `RevealText` rejoue sa cascade a chaque entree

**Files:**
- Modify: `src/app/components/reveal-text.tsx`
- Modify: `src/app/components/stag-scene/stag-scene.tsx` (les `RevealText` du hero et des chapitres)

- [x] **Step 1 : la prop `pilote`**

Dans `src/app/components/reveal-text.tsx` :

- dans le commentaire d'en-tete, apres « IntersectionObserver seuil 0.2 ... », ajouter :

```
 * `pilote="fenetre"` (11/10, partition du texte) : dans le calque fixe du
 * Centre, un bloc entre et sort plusieurs fois (on remonte, on redescend)
 * et l'IntersectionObserver ne dit rien d'un bloc fixe. La cascade suit
 * alors le `data-phase` de l'ancetre le plus proche (pose par
 * use-pilote-fenetre) : revelee en entree/tenue/sortie, rearmee en
 * avant/apres, donc rejouee a chaque entree. Un MutationObserver sur cet
 * attribut, pas d'etat par image.
```

- la signature devient :

```tsx
export default function RevealText({
  text,
  as = "span",
  className,
  delayPerWord = DEFAULT_DELAY_PER_WORD_MS,
  startDelay = 0,
  pilote = "observateur",
}: {
  text: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "div";
  className?: string;
  delayPerWord?: number;
  startDelay?: number;
  pilote?: "observateur" | "fenetre";
}) {
```

- remplacer l'effet existant en entier (de `useEffect(() => {` jusqu'a `}, [revealed]);`) par :

```tsx
  useEffect(() => {
    // Bots (Lighthouse/PageSpeed/crawlers) : revele instantanement
    // sans IntersectionObserver. Sans ca, .inner reste opacity:0
    // (fade CSS suspendu) et LCP Lighthouse mesure du vide.
    if (isBot()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealed(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    if (pilote === "fenetre") {
      const hote = node.closest<HTMLElement>("[data-phase]");
      if (!hote) return;
      const lire = () => {
        const ph = hote.dataset.phase;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reaction a un attribut DOM, pas une boucle d'image
        setRevealed(ph === "entree" || ph === "tenue" || ph === "sortie");
      };
      lire();
      const mo = new MutationObserver(lire);
      mo.observe(hote, { attributes: true, attributeFilter: ["data-phase"] });
      return () => mo.disconnect();
    }
    if (revealed) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
            return;
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [revealed, pilote]);
```

(Si eslint refuse un commentaire de desactivation parce que la regle ne se declenche pas a cet endroit, le retirer.)

- [x] **Step 2 : le Centre l'utilise**

Dans `src/app/components/stag-scene/stag-scene.tsx`, ajouter `pilote="fenetre"` aux trois `RevealText` : celui du hero (`as="h1"`) et les deux des chapitres (`chapterKicker`, `chapterLine`).

- [x] **Step 3 : verifier**

```powershell
pnpm exec tsc --noEmit
pnpm exec eslint src/app/components/reveal-text.tsx src/app/components/stag-scene/stag-scene.tsx
pnpm test
```

Puis, a l'oeil dans le navigateur (`pnpm run dev`, `http://localhost:3000/fr`) : descendre jusqu'au chapitre I, remonter, redescendre : les mots du chapitre doivent re-cascader a la seconde entree. Le titre du hero cascade a l'arrivee comme avant.

- [x] **Step 4 : commit**

```powershell
git add src/app/components/reveal-text.tsx src/app/components/stag-scene/stag-scene.tsx
git commit -m "feat(texte): RevealText pilote par la fenetre -- la cascade des mots rejoue a chaque entree (MutationObserver sur data-phase)"
```

---

### Task 5 : le chant du Centre, un seul noeud, dans le flux, dans sa fenetre

**Files:**
- Modify: `src/app/components/stag-scene/scene-refs-context.tsx:126-141`
- Create: `src/app/components/stag-scene/bloc-en-flux.tsx`
- Modify: `src/app/globals.css` (`.cantarFlow`, `.blocEnFlux`)
- Modify: `src/app/components/stag-scene/stag-scene.tsx:150-156`
- Modify: `tests/e2e/cantares.spec.ts`

- [x] **Step 1 : `--arc-h`, pose par `scene-refs-context`**

Dans `src/app/components/stag-scene/scene-refs-context.tsx`, remplacer la fonction `handleScroll` (lignes 126 a 138) et les deux lignes qui suivent par :

```tsx
    // LA LONGUEUR DE L'ARC EN CSS (11/10, partition du texte). Le chant du
    // Centre est dans le flux et doit se trouver sous le haut du cadre quand
    // l'arc vaut 0,32 : `.cantarFlow` se place par `--arc-h`. Posee ici,
    // ou maxScroll est deja lu (une lecture par evenement, jamais par
    // image), et seulement quand elle change : une ecriture de style a
    // valeur egale coute quand meme un recalcul.
    let dernierArcH = -1;
    function poserArcH(vh: number, maxScroll: number) {
      const h = Math.round(arcScrollHeight(vh, maxScroll));
      if (h === dernierArcH) return;
      dernierArcH = h;
      document.documentElement.style.setProperty("--arc-h", `${h}px`);
    }

    function handleScroll() {
      if (reducedMotionRef.current) return;
      // UNE SEULE LECTURE DE MISE EN PAGE POUR LES DEUX (20/09). L'arc et la
      // sortie comptent desormais sur la meme page, donc ils lisent la meme
      // valeur au meme endroit -- et il y en a moins qu'avant, pas plus.
      // Gratuit ici : un ecouteur `scroll` s'execute quand la mise en page
      // est deja a jour, contrairement a un rappel d'image (oracle
      // `lectures-de-mise-en-page`, 16/09).
      const vh = window.innerHeight;
      const maxScroll = document.documentElement.scrollHeight - vh;
      progressRef.current = arcProgress(window.scrollY, vh, maxScroll);
      exitRef.current = exitProgress(window.scrollY, vh, maxScroll);
      poserArcH(vh, maxScroll);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    // Au redimensionnement aussi : la longueur de l'arc depend de la hauteur
    // de la fenetre, et rien ne defile forcement apres.
    window.addEventListener("resize", handleScroll, { passive: true });
```

Et dans le nettoyage de l'effet, apres `window.removeEventListener("scroll", handleScroll);`, ajouter `window.removeEventListener("resize", handleScroll);`.

Note : sous mouvement reduit `handleScroll` sort tout de suite et `--arc-h` n'est jamais posee ; le CSS a un repli (`200vh`, le plancher de l'arc) et le chant est de toute facon force visible et en place par le mouvement reduit (ETAT_PLEIN). Pas de boucle de mise en page : `.cantarFlow` garde `min-height: 300vh`, et son contenu (0,32 arc + 120 px + la figure, soit environ 1,3 fenetre) reste bien en dessous.

- [x] **Step 2 : `BlocEnFlux`**

```tsx
// src/app/components/stag-scene/bloc-en-flux.tsx
"use client";

import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { etatBloc, type Fenetre } from "@/lib/partition-texte";
import { isBot } from "@/lib/is-bot";
import { useSceneRefs } from "./scene-refs-context";
import { ETAT_PLEIN, usePiloteFenetre } from "./use-pilote-fenetre";

/**
 * UN BLOC DE TEXTE DANS LE FLUX, DANS SA FENETRE (11/10, partition du
 * texte). Le chant du Centre reste un seul noeud, l'original, dans
 * `.cantarFlow` : pas de copie dans le calque, pas de `sticky`. Il defile
 * pendant sa tenue, comme une carte des pages echo, et son opacite, son
 * `data-phase` et son `--avancement` viennent de sa fenetre par le meme
 * pilote que FadingBlock. Il garde sa place quand il est invisible
 * (`visibility: hidden`, pas `display: none`) : la page ne change pas de
 * hauteur, donc l'arc non plus. En mode recit (`body.reading-mode`), le
 * CSS le force visible : il est dans le flux, il se lit.
 */
const REF_ZERO: MutableRefObject<number> = { current: 0 };
const REF_PLEIN: MutableRefObject<boolean> = { current: true };

export default function BlocEnFlux({ fenetre, nom, children }: { fenetre: Fenetre; nom: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const refs = useSceneRefs();
  const [bot, setBot] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isBot()) setBot(true);
  }, []);
  // Hors provider (rendu sans scene) : pas de pilote, le bloc reste visible.
  usePiloteFenetre(ref, fenetre, refs?.progressRef ?? REF_ZERO, refs?.reducedMotionRef ?? REF_PLEIN, {
    masquer: false,
    actif: refs !== null && !bot,
  });
  const initial = bot || !refs ? ETAT_PLEIN : etatBloc(0, fenetre);
  const inlineStyle = {
    opacity: initial.opacite,
    visibility: (initial.opacite > 0.001 ? "visible" : "hidden") as "visible" | "hidden",
    pointerEvents: (initial.opacite > 0.05 ? "auto" : "none") as "auto" | "none",
  };
  return (
    <div ref={ref} className="blocEnFlux" style={inlineStyle} data-bloc={nom} data-phase={initial.phase}>
      {children}
    </div>
  );
}
```

- [x] **Step 3 : le CSS du chant et du bloc en flux**

Dans `src/app/globals.css`, remplacer le commentaire et le bloc `.cantarFlow` (depuis la ligne `/* Sur la home, le chant vit dans le flux vide de 300vh` jusqu'a l'accolade qui ferme la media query mobile de `.cantarFlow`, juste avant `body.reading-mode .cantar`) par :

```css
/* Sur la home, le chant vit dans le flux vide de 300vh, le seul contenu
   qui defile par-dessus la scene. Il n'est PAS ancre en bas : l'image
   finale du Centre (validee le 11/09, nette, le monde entier) doit rester
   libre. Depuis le 11/10 (partition du texte), il a sa FENETRE dans l'arc,
   0,32 -> 0,50 (la lumiere monte, le mais pousse), et sa place dans le
   document est posee pour qu'il soit a 120 px du haut du cadre quand l'arc
   vaut 0,32 : `--arc-h` est la longueur de l'arc de cette page, posee par
   scene-refs-context (repli 200vh = le plancher de l'arc). Il defile
   pendant sa tenue (0,18 d'arc, 310 px sur l'Accueil), en colonne droite
   (les chapitres vivent en bas a gauche). */
.cantarFlow {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-end;
  min-height: 300vh;
  padding: calc(0.32 * var(--arc-h, 200vh) + 120px) 6vw 0;
  box-sizing: border-box;
}
.cantarFlow .cantar {
  margin-top: 0;
}
@media (max-width: 767px) {
  .cantarFlow {
    /* Le couloir des controles (13/09, X3) : le bloc ne passe plus sous la
       colonne de boutons. */
    align-items: flex-start;
    padding: calc(0.32 * var(--arc-h, 200vh) + 120px) 5vw 0 72px;
  }
}

/* LE BLOC EN FLUX (11/10, partition du texte, bloc-en-flux.tsx) : meme
   grammaire que le calque fixe (scene-text-overlay.module.css), le
   mouvement scrube par `--avancement`. En mode recit, visible quoi qu'il
   arrive : il est dans le flux, il se lit. */
.blocEnFlux {
  transition: opacity 0.6s ease-out;
}
.blocEnFlux[data-phase="entree"] {
  transform: translateY(calc(12px * (1 - var(--avancement, 1))));
}
.blocEnFlux[data-phase="sortie"] {
  transform: translateY(calc(-8px * var(--avancement, 0)));
}
body.reading-mode .blocEnFlux {
  opacity: 1 !important;
  visibility: visible !important;
  transform: none;
  pointer-events: auto !important;
}
@media (prefers-reduced-motion: reduce) {
  .blocEnFlux {
    transition: none;
  }
  .blocEnFlux[data-phase] {
    transform: none;
  }
}
```

- [x] **Step 4 : `stag-scene.tsx` enveloppe le chant**

Ajouter `import BlocEnFlux from "./bloc-en-flux";` et remplacer la section du chant (le commentaire « LE CHANT DU CENTRE (M4, 11/09) » et la `<section>`) par :

```tsx
      {/* LE CHANT DU CENTRE (M4, 11/09). Le texte de la home vit dans
          l'overlay fixe ; le chant, lui, est dans le flux (le seul contenu
          des 300vh) et reste visible en mode lecture. Depuis le 11/10 il a
          sa fenetre dans la partition (0,32 -> 0,50) : un seul noeud, qui
          defile pendant sa tenue. Le nom accessible du chant est porte par
          la figure (cantar.tsx), sur les cinq pages. */}
      <section className="cantarFlow">
        <BlocEnFlux fenetre={PARTITION_CENTRE.chant} nom="chant">
          <Cantar direction="jade" locale={locale} texts={cantar.texts} newWindow={cantar.newWindow} />
        </BlocEnFlux>
      </section>
```

- [x] **Step 5 : l'oracle du chant du Centre**

Dans `tests/e2e/cantares.spec.ts`, ajouter a la fin :

```ts
/**
 * LE CHANT DU CENTRE TIENT SA FENETRE (11/10, partition du texte) : visible
 * au milieu de sa fenetre (0,41), efface dans le silence du climax (0,72),
 * et toujours dans le flux, lisible, en mode recit.
 */
async function opaciteEffective(page: import("@playwright/test").Page, selecteur: string): Promise<number> {
  return page.evaluate((sel) => {
    let n: Element | null = document.querySelector(sel);
    let o = 1;
    for (; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity || "1");
    return o;
  }, selecteur);
}

test("/fr : le chant parle a 0,41, se tait a 0,72, se lit en mode recit", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/fr?t=0.41&v=2&shaders-prod");
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
  await page.waitForTimeout(2500);
  const figure = page.locator("figure.cantar");
  expect(await opaciteEffective(page, "figure.cantar"), "visible au milieu de sa fenetre").toBeGreaterThan(0.9);
  const box = await figure.boundingBox();
  expect(box, "la figure a une boite").not.toBeNull();
  expect(box!.y, "dans la fenetre, sous le bandeau").toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height, "entiere dans la fenetre").toBeLessThanOrEqual(800);

  await page.goto("/fr?t=0.72&v=2&shaders-prod");
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
  await page.waitForTimeout(2500);
  expect(await opaciteEffective(page, "figure.cantar"), "efface dans le silence du climax").toBeLessThan(0.05);

  await page.getByRole("button", { name: /mode récit accessible/i }).first().click();
  await expect(page.locator("body")).toHaveClass(/reading-mode/);
  await figure.scrollIntoViewIfNeeded();
  await expect(figure).toBeVisible();
  expect(await opaciteEffective(page, "figure.cantar"), "lisible en mode recit").toBeGreaterThan(0.9);
});
```

Et dans le test existant par page, le commentaire d'en-tete (lignes 14-18) gagne une phrase : « Sur le Centre, la figure a aussi une fenetre dans l'arc (11/10) : l'oracle dedie est en bas de ce fichier. »

- [x] **Step 6 : verifier**

```powershell
pnpm exec tsc --noEmit
pnpm exec eslint src/app/components/stag-scene/bloc-en-flux.tsx src/app/components/stag-scene/scene-refs-context.tsx src/app/components/stag-scene/stag-scene.tsx tests/e2e/cantares.spec.ts
pnpm test
pnpm exec playwright test tests/e2e/cantares.spec.ts tests/e2e/lectures-de-mise-en-page.spec.ts --project=chromium
```

Expected : tout vert. Si le test « 0,41 » echoue sur `box.y + height <= 800`, c'est le dosage de 120 px (ou la hauteur de la figure) : NE PAS changer l'oracle, mesurer `box` et le dire dans le rapport, Sylvain tranche sur la capture (Task 8).

- [x] **Step 7 : commit**

```powershell
git add src/app/components/stag-scene/scene-refs-context.tsx src/app/components/stag-scene/bloc-en-flux.tsx src/app/globals.css src/app/components/stag-scene/stag-scene.tsx tests/e2e/cantares.spec.ts
git commit -m "feat(texte): le chant du Centre dans sa fenetre -- un seul noeud en flux (BlocEnFlux), place par --arc-h, visible 0,32 -> 0,50, force visible en mode recit"
```

---

### Task 6 : la cloture du Centre, par sa fenetre, sans ligne poetique

**Files:**
- Modify: `src/app/components/stag-scene/page-closure.tsx`
- Modify: `src/app/components/stag-scene/stag-scene.tsx` (le `PageClosure` du Centre)

- [x] **Step 1 : la prop `fenetre`**

Dans `src/app/components/stag-scene/page-closure.tsx` :

- ajouter `import { etatBloc, type Fenetre } from "@/lib/partition-texte";` ;
- dans la signature, ajouter la prop :

```tsx
  /** LA FENETRE DU CENTRE (11/10, partition du texte) : la cloture du calque
   *  fixe se revele sur [0,96, 1] et reste posee pendant l'acte de sortie
   *  (une fenetre qui finit a 1 ne sort jamais, lib/partition-texte). Sans
   *  fenetre (les pages echo, en flux) : getNavEmphasis, comme avant. */
  fenetre?: Fenetre;
```

- remplacer le corps du `tick` (lignes 82 a 93) par :

```tsx
    function tick() {
      const el = rootRef.current;
      if (el) {
        const reduced = reducedMotionRef.current;
        let emphasis: number;
        if (reduced) {
          emphasis = 1;
        } else if (fenetre) {
          const etat = etatBloc(progressRef.current, fenetre);
          emphasis = etat.opacite;
          if (el.dataset.phase !== etat.phase) el.dataset.phase = etat.phase;
        } else {
          emphasis = getNavEmphasis(progressRef.current);
        }
        const shouldReveal = emphasis > 0.05;
        el.classList.toggle(styles.revealed, shouldReveal);
        // pointer-events uniquement quand la card est visible : évite
        // qu'un CTA invisible reste cliquable en début de scroll.
        el.style.pointerEvents = emphasis > 0.15 ? "auto" : "none";
      }
      raf = requestAnimationFrame(tick);
    }
```

- le tableau de dependances de cet effet devient `[progressRef, reducedMotionRef, fenetre]` ;
- la racine gagne le nom du bloc quand il y a une fenetre :

```tsx
    <div ref={rootRef} className={styles.closure} style={style} aria-hidden="true" data-bloc={fenetre ? "cloture" : undefined}>
```

- dans le commentaire d'en-tete (lignes 31-34), apres « La classe `.revealed` est posée en fonction de getNavEmphasis > 0.05 », ajouter « (ou de la fenetre de la partition quand la page en passe une : le Centre, 11/10) ».

- [x] **Step 2 : le Centre passe sa fenetre**

Dans `src/app/components/stag-scene/stag-scene.tsx`, le `PageClosure` du Centre gagne `fenetre={PARTITION_CENTRE.cloture}`.

- [x] **Step 3 : verifier**

```powershell
pnpm exec tsc --noEmit
pnpm exec eslint src/app/components/stag-scene/page-closure.tsx src/app/components/stag-scene/stag-scene.tsx
pnpm test
pnpm exec playwright test tests/e2e/calque-fixe.spec.ts tests/e2e/acte-de-sortie.spec.ts --project=chromium
```

Expected : vert (les quatre pages echo de calque-fixe ne passent pas de fenetre et gardent le comportement du 13/09).

- [x] **Step 4 : commit**

```powershell
git add src/app/components/stag-scene/page-closure.tsx src/app/components/stag-scene/stag-scene.tsx
git commit -m "feat(texte): la cloture du Centre se revele sur sa fenetre [0,96, 1] et reste posee pendant l'acte de sortie"
```

---

### Task 7 : l'oracle de la partition, de bout en bout

**Files:**
- Create: `tests/e2e/partition-centre.spec.ts`

- [x] **Step 1 : le test**

```ts
// tests/e2e/partition-centre.spec.ts
import { test, expect, devices, type Page } from "@playwright/test";

/**
 * LA PARTITION DU CENTRE (11/10, spec 2026-10-10-partition-texte-design).
 *
 * Audit visuel du 10/10 : a t=0,15 trois panneaux de texte se lisaient
 * ensemble, a t=0,4 le chant cachait le cerf. Sylvain : « un seul panneau
 * a la fois [...] C'est l'image qui prevaut. »
 *
 * L'oracle lit le site, pas la lib : a sept instants de l'arc (`?t=`, lien
 * de l'instant v2), parmi TOUS les blocs nommes (`data-bloc` : le calque
 * fixe, le chant en flux, la cloture), au plus un est visible, c'est celui
 * de la partition, et au climax (0,72, dans le silence 0,66 -> 0,78) il
 * n'y en a aucun. Pour les chapitres, la cascade des mots est bien jouee
 * (RevealText pilote par la fenetre).
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

const ATTENDU: readonly [number, string | null][] = [
  [0.05, "hero"],
  [0.21, "chapitre-0"],
  [0.41, "chant"],
  [0.59, "chapitre-1"],
  [0.72, null],
  [0.86, "chapitre-2"],
  [0.98, "cloture"],
];

async function blocsVisibles(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const eff = (n: Element | null) => {
      let o = 1;
      for (; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity || "1");
      return o;
    };
    return [...document.querySelectorAll<HTMLElement>("[data-bloc]")]
      .filter((b) => {
        const cs = getComputedStyle(b);
        return cs.display !== "none" && cs.visibility !== "hidden" && eff(b) > 0.05;
      })
      .map((b) => b.dataset.bloc ?? "?");
  });
}

for (const [t, bloc] of ATTENDU) {
  test(`/fr?t=${t} : ${bloc ? `seul « ${bloc} » parle` : "le silence, l'image seule"}`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto(`/fr?t=${t}&v=2&shaders-prod`);
    await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
    // Le lien de l'instant defile une fois le voile tombe ; puis les
    // transitions d'opacite (0,6 s) et de la cloture (0,4 s) finissent.
    await page.waitForTimeout(2500);
    expect(await blocsVisibles(page), `a t=${t}`).toEqual(bloc ? [bloc] : []);
    if (bloc?.startsWith("chapitre")) {
      // Les deux RevealText du chapitre (kicker + ligne) ont joue leur cascade.
      await expect(page.locator(`[data-bloc="${bloc}"] [class*="revealed"]`)).toHaveCount(2);
    }
  });
}
```

- [x] **Step 2 : lancer**

Run: `pnpm exec playwright test tests/e2e/partition-centre.spec.ts tests/e2e/controls-overlap.spec.ts tests/e2e/mouvement-reduit.spec.ts --project=chromium`
Expected : tout vert. Si un instant montre DEUX blocs, c'est une transition d'opacite pas finie ou un bloc qui ne respecte pas sa fenetre : lire `blocsVisibles` dans le message et remonter au composant, pas elargir le seuil.

- [x] **Step 3 : commit**

```powershell
git add tests/e2e/partition-centre.spec.ts
git commit -m "test(texte): l'oracle de la partition du Centre -- a sept instants, au plus un bloc parle, aucun au climax"
```

---

### Task 8 : la capture, l'oeil de Sylvain, les docs

**Files:**
- Create: `.scratch/partition-centre.mjs`
- Modify: `docs/da/plans/centre.md`, `CLAUDE.md`, `docs/superpowers/specs/2026-10-10-partition-texte-design.md`

- [ ] **Step 1 : le script de capture**

```js
// .scratch/partition-centre.mjs : la partition du Centre (11/10). Bureau
// sombre aux sept instants de la partition, clair a 0,21, Pixel 7 a 0,05,
// 0,21 et 0,41. Meme famille que .scratch/audit-visuel.mjs (user-agent reel :
// sans lui, is-bot.ts coupe le canvas 3D).
// Usage : pnpm run build ; pnpm exec next start -p 3100 ; node .scratch/partition-centre.mjs 3100
import { chromium, devices } from "@playwright/test";

const { defaultBrowserType: _d, ...PIXEL } = devices["Pixel 7"];
const PORT = process.argv[2] ?? "3100";
const UA_REELLE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.34 Safari/537.36";
const INSTANTS = [0.05, 0.21, 0.41, 0.59, 0.72, 0.86, 0.98];

const url = (t) => `http://localhost:${PORT}/fr?t=${t}&v=2`;

async function attendreScene(page) {
  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 180_000 });
  await page.waitForTimeout(1500);
}

async function forcerTheme(ctx, theme) {
  await ctx.addInitScript((t) => window.localStorage.setItem("nahual-theme", t), theme);
}

const b = await chromium.launch({ args: ["--use-angle=d3d11", "--use-gl=angle", "--ignore-gpu-blocklist"] });

{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark", userAgent: UA_REELLE });
  await forcerTheme(ctx, "dark");
  const page = await ctx.newPage();
  for (const t of INSTANTS) {
    await page.goto(url(t), { waitUntil: "commit", timeout: 180_000 });
    await attendreScene(page);
    await page.screenshot({ path: `.scratch/partition-bureau-${t}.png` });
    console.log(`bureau sombre t=${t}`);
  }
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "light", userAgent: UA_REELLE });
  await forcerTheme(ctx, "light");
  const page = await ctx.newPage();
  await page.goto(url(0.21), { waitUntil: "commit", timeout: 180_000 });
  await attendreScene(page);
  await page.screenshot({ path: ".scratch/partition-clair-0.21.png" });
  await ctx.close();
  console.log("clair t=0.21");
}
{
  const ctx = await b.newContext({ ...PIXEL, colorScheme: "dark" });
  await forcerTheme(ctx, "dark");
  const page = await ctx.newPage();
  for (const t of [0.05, 0.21, 0.41]) {
    await page.goto(url(t), { waitUntil: "commit", timeout: 180_000 });
    await attendreScene(page);
    await page.screenshot({ path: `.scratch/partition-pixel-${t}.png` });
    console.log(`pixel t=${t}`);
  }
  await ctx.close();
}
await b.close();
console.log("partition capturee");
```

- [ ] **Step 2 : compiler, servir, capturer, nettoyer**

Verifier d'abord qu'aucun serveur ne tient 3100 (`netstat -ano | findstr :3100` vide). Puis (PowerShell) :

```powershell
pnpm run build
$p = Start-Process -FilePath "pnpm" -ArgumentList "exec","next","start","-p","3100" -WindowStyle Hidden -PassThru
# attendre que http://localhost:3100/fr reponde 200, puis :
node .scratch/partition-centre.mjs 3100
foreach ($f in Get-ChildItem .scratch/partition-*.png) { Copy-Item $f.FullName "C:\Users\sylva\Downloads\nahual-$($f.Name)" -Force }
Stop-Process -Id $p.Id -Force
netstat -ano | findstr :3100
```

Expected : onze images dans `C:\Users\sylva\Downloads\nahual-partition-*.png` ; `netstat` vide (le 10/10, `next start` a laisse deux fois un orphelin : si un PID ecoute encore, `Stop-Process -Id <pid> -Force`).

- [ ] **Step 3 : regarder soi-meme AVANT de remettre**

Ouvrir les onze images (outil Read). Verifier : un seul bloc par image, aucun a 0,72, le chant a 0,41 entier dans le cadre et a droite, le cerf jamais couvert par du texte a 0,41 et 0,59, la cloture seule a 0,98 sans ligne poetique, le hero sans paragraphe au bureau comme au Pixel. Noter ce qui cloche dans le rapport, sans corriger de dosage soi-meme.

- [ ] **Step 4 : remettre a Sylvain**

Donner les chemins complets des onze images et la liste des dosages qui sont a lui : 12 px a l'entree, 8 px a la sortie, 15 % d'entree et de sortie, 120 px du haut pour le chant, les fenetres elles-memes. **Rien d'autre ne se fait tant qu'il n'a pas repondu** : ni les docs (Step 5), ni `main` (regle de `CLAUDE.md` : une session = une chose bornee + une capture regardee).

- [x] **Step 5 : les docs, apres le feu vert**

`docs/da/plans/centre.md`, ligne 9 du second tableau, remplacer `0 a 0,82` et « defile en colonne droite par-dessus la scene, ... » par `0,32 a 0,50` et « dans sa fenetre de la partition (11/10) : entre en colonne droite quand la lumiere monte, defile pendant sa tenue, est efface avant le face-a-face ». Ajouter une ligne 10 :

```
| 10 | partition | le texte du Centre (11/10, `lib/partition-texte`) : hero 0 a 0,10 ; I 0,12 a 0,30 ; chant 0,32 a 0,50 ; II 0,52 a 0,64 ; SILENCE 0,66 a 0,78 (climax dedans) ; IV 0,80 a 0,94 ; cloture 0,96 a 1. Un seul bloc a la fois, l'image prevaut. | | | `fading-block.tsx`, `bloc-en-flux.tsx`, `page-closure.tsx` |
```

`CLAUDE.md`, paragraphe « Ce qui attend, avec du sens et de la forme » : ajouter apres la phrase sur l'accueil mobile : « Fait le 11/10 : la partition du texte du Centre (un seul bloc a la fois, silence au climax, hero sans paragraphe, trois chapitres, clotures sans ligne poetique, chant sans etiquette) ; les pages echo attendent la meme lib (spec `2026-10-10-partition-texte-design.md`, section « Les pages echo »). »

En tete de la spec, sous la ligne « Date : 10/10/2026, soir », ajouter : « Plan d'execution du Centre : `docs/superpowers/plans/2026-10-11-partition-centre.md` (11/10). »

```powershell
git add docs/da/plans/centre.md CLAUDE.md docs/superpowers/specs/2026-10-10-partition-texte-design.md
# `.scratch/partition-centre.mjs` reste local (`.scratch/` est ignore par git).
git commit -m "docs(texte): la partition du Centre dans le plan du Centre et dans CLAUDE.md ; script de capture"
git push origin dev
```

- [ ] **Step 6 : `main`**

Seulement apres le « go » de Sylvain sur les captures, machine libre (serveur 3100 coupe), `pnpm run perf` vert (le hook pre-push le lance, environ six minutes), une seule poussee par jour : le 11/10, la poussee du jour n'est pas encore consommee et le passage du colibri (Sud) attend aussi sur `dev` ; les deux partent ensemble :

```powershell
git switch main
git merge --ff-only dev
git push
git switch dev
```

---

## Auto-revue (faite le 11/10 en ecrivant le plan)

- Spec, section « La regle » : 1 et 2 -> Task 1 (`partitionValide`, `SILENCES_CENTRE`) ; 3 -> Task 1 (`etatBloc`) + Task 3 (CSS) + Task 4 (cascade rejouee) ; 4 -> Task 1 (`TENUE_MIN`) ; 5 -> `ETAT_PLEIN` sous mouvement reduit (Task 3), bots inchanges (Task 3 et 5).
- « Ce qui part » -> Task 2, avec une decision explicite (le paragraphe n'est pas recopie au Codex, qui le dit deja).
- « La partition du Centre » -> `PARTITION_CENTRE` (Task 1), `stag-scene.tsx` (Task 3, 5, 6).
- « Les pieces » : `partition-texte.ts` -> Task 1 ; `FadingBlock` -> Task 3 ; `RevealText` -> Task 4 ; le chant + `--arc-h` -> Task 5 ; la cloture -> Task 6 ; dictionnaires -> Task 2.
- « Les oracles » : unitaires -> Task 1 ; `reveal-arc.test.ts` -> Task 3 ; `i18n-parity` -> Task 2 ; `partition-centre.spec.ts` -> Task 7 ; `cantares.spec.ts` -> Task 5 ; `controls-overlap` relance en Task 7 ; la barre -> Task 8 Step 6 ; la capture -> Task 8.
- Hors spec, ajoute parce que sinon rouge : `calque-fixe.spec.ts` (Task 3 Step 7) visait des points qui tombent desormais dans le chant et le silence.
- Noms tenus d'un bout a l'autre : `Fenetre`, `EtatBloc`, `etatBloc`, `tenueDe`, `partitionValide`, `PARTITION_CENTRE`, `SILENCES_CENTRE`, `BlocCentre`, `ETAT_PLEIN`, `appliquerEtat`, `usePiloteFenetre`, `BlocEnFlux`, props `fenetre` / `nom` / `pilote`, attributs `data-bloc` / `data-phase`, variable `--avancement` / `--arc-h`.
