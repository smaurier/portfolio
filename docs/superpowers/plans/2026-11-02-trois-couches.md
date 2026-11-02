# Les trois couches : plan d'implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le visiteur arrive sur la scene si sa machine suit, sur l'*amatl*
sinon (mouvement reduit, pas de WebGL, connexion degradee) ; il peut passer
d'une couche a l'autre par une truelle (poignee/slider, barre de gauche),
au clic ou au clavier ; le focus et l'annonce suivent le changement ; la
morph A->B est interruptible et absente sous mouvement reduit.

**Architecture:** Design complet :
`docs/superpowers/specs/2026-11-02-trois-couches-design.md`. Patron a
suivre pour la lib pure + le store reactif : `src/lib/theme.ts` +
`src/app/components/theme-store.ts` (meme forme : `useSyncExternalStore`,
attribut pose par un script inline avant le premier paint, persistance
`localStorage` best-effort).

**Tech Stack:** Vitest pour les libs pures, Playwright (suite e2e par
defaut) pour les oracles RGAA de la spec, React + `useSyncExternalStore`
pour le store, SVG pour l'*amatl*.

---

## Ce que la lecture du code a etabli (02/11)

- **`src/lib/theme.ts` + `src/app/components/theme-store.ts`** : le patron
  complet a copier. `theme.ts` est pur (`faceInitiale`, `parseStoredTheme`,
  les constantes). `theme-store.ts` fait le travail impur : lit
  `document.documentElement`, `matchMedia`, `localStorage`
  (`THEME_STORAGE_KEY = "nahual-theme"`), ecrit l'attribut `data-theme`,
  previent des listeners (`useSyncExternalStore`). Le layout
  (`src/app/[locale]/layout.tsx` ligne ~245) pose l'attribut par un script
  INLINE avant le premier paint, pour ne pas voir un eclair de la mauvaise
  face. **Le futur `couche-store.ts` suit exactement cette forme.**
- **La connexion degradee a deja un precedent** : `prelectureBienvenue()`
  dans `src/app/components/stag-scene/mount-for-direction.tsx` (ligne 246)
  lit `navigator.connection.saveData` et `.effectiveType` (`slow-2g`,
  `2g`). Meme lecture a reprendre pour `connexionDegradee`, pas une
  nouvelle regle.
- **`src/lib/reduced-motion.ts`** : ne lit pas `matchMedia` lui-meme, il
  prend `prefersReduced: boolean` en parametre — la lecture DOM se fait
  ailleurs (contexte de scene). Meme separation a tenir ici : la regle de
  choix est pure, la lecture est dans le store.
- ⚠️ **Trou trouve en lisant le code, a signaler avant de coder** : la regle
  du 14/10 citee dans la spec dit « sans WebGL » comme si c'etait deja
  verifie quelque part. **Aucune detection de disponibilite WebGL n'existe
  dans ce depot** (`grep -r "WebGLRenderingContext\|isWebGLAvailable"
  src/` ne rend rien). Le mouvement reduit et la connexion degradee ont un
  precedent qui tourne deja ; le WebGL absent n'en a aucun. A construire de
  zero (tache 1) : `canvas.getContext("webgl2") || canvas.getContext("webgl")`,
  dans un `try/catch` (certains navigateurs levent plutot que de rendre
  `null`).
- `src/app/components/route-announcer.tsx` : voir la correction de la
  spec section 6, le patron de focus+annonce s'extrait, il ne se
  reutilise pas tel quel (il ecoute `usePathname()`).
- ⚠️ **Question ouverte, non tranchee par la conception du 25/10** : si le
  visiteur choisit une couche a la main, ce choix doit-il survivre a un
  rechargement (comme le theme, `localStorage`) ou se recalculer a chaque
  visite selon `coucheParDefaut` ? La spec ne le dit pas. Proposition pour
  la tache 2 : **persister, meme motif que le theme** (coherence
  d'interface : les deux controles de la meme famille de reglages se
  comportent pareil) — a confirmer avant la tache 2, pas bloquant pour la
  tache 1.

---

## Structure des fichiers (vue d'ensemble, les taches 2+ restent a detailer)

| fichier | tache | responsabilite |
| --- | --- | --- |
| `src/lib/couche.ts` | 1 | **cree.** `Couche`, `CoucheContexte`, `coucheParDefaut`. Pur. |
| `src/lib/couche.test.ts` | 1 | **cree.** |
| `src/app/components/couche-store.ts` | 2 | **cree.** Detection WebGL/connexion/mouvement reduit, persistance, `useSyncExternalStore`. |
| `src/app/components/truelle.tsx` | 2 | **cree.** Le controle unique (voir spec section 3) : `slider` ARIA, 3 positions. |
| `src/app/[locale]/layout.tsx` | 2 | **modifie.** Script inline : attribut `data-couche` avant le premier paint (meme motif que `data-theme`). |
| hook de focus+annonce partage | 3 | **cree ou extrait de `route-announcer.tsx`.** |
| `src/app/components/amatl-layer.tsx` | 4 | **cree.** Compose les 5 `sceneDescriptions` en SVG. |
| mecanique de transition A->B, liberation du contexte WebGL | 5 | **a localiser** (probablement dans `persistent-scene.tsx` ou un nouveau composant). |
| `tests/e2e/couche-slider.spec.ts`, `couche-focus.spec.ts`, `couche-morph.spec.ts`, `couche-degradation.spec.ts`, `cible-24px.spec.ts` | 2-6 | **crees**, un par tache, oracle de la spec section 10. |

---

### Task 1 : la regle pure, et son trou de detection signale

**Files:**
- Create: `src/lib/couche.ts`
- Test: `src/lib/couche.test.ts`

- [x] **Step 1 : le test, rouge**

`src/lib/couche.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { coucheParDefaut, type CoucheContexte } from "./couche";

/**
 * LA COUCHE D'OUVERTURE (02/11) : la scene si la machine suit, l'amatl
 * sinon (mouvement reduit, WebGL absent, connexion degradee). Jamais la
 * parole par defaut : elle est toujours a un geste (design, section 1).
 */
const SUIT: CoucheContexte = { prefersReducedMotion: false, webglDisponible: true, connexionDegradee: false };

describe("la couche d'ouverture", () => {
  it("la scene si la machine suit tout", () => {
    expect(coucheParDefaut(SUIT)).toBe("scene");
  });
  it("l'amatl si WebGL est absent, meme si tout le reste suit", () => {
    expect(coucheParDefaut({ ...SUIT, webglDisponible: false })).toBe("amatl");
  });
  it("l'amatl sous mouvement reduit", () => {
    expect(coucheParDefaut({ ...SUIT, prefersReducedMotion: true })).toBe("amatl");
  });
  it("l'amatl en connexion degradee", () => {
    expect(coucheParDefaut({ ...SUIT, connexionDegradee: true })).toBe("amatl");
  });
  it("jamais la parole : ce n'est pas son role, elle est toujours a un geste", () => {
    for (const c of [SUIT, { ...SUIT, webglDisponible: false }, { ...SUIT, prefersReducedMotion: true }, { ...SUIT, connexionDegradee: true }]) {
      expect(coucheParDefaut(c)).not.toBe("parole");
    }
  });
  it("le WebGL absent l'emporte sur tout, meme si le reste suit", () => {
    expect(coucheParDefaut({ prefersReducedMotion: false, webglDisponible: false, connexionDegradee: false })).toBe("amatl");
  });
});
```

Run: `pnpm exec vitest run src/lib/couche.test.ts`
Expected: FAIL, `Cannot find module './couche'`.

- [x] **Step 2 : `couche.ts`**

```ts
/**
 * LES TROIS COUCHES (02/11/2026). Design :
 * docs/superpowers/specs/2026-11-02-trois-couches-design.md.
 *
 * Trois mediums par lesquels le site se presente : la scene (WebGL),
 * l'amatl (SVG, repli 2D), la parole (le document sr-only existant).
 * Cette regle dit laquelle des deux premieres s'ouvre a l'arrivee ; la
 * parole n'est jamais un defaut, elle est toujours a un geste.
 *
 * Pure : ne touche a rien du document. La detection (WebGL, connexion,
 * mouvement reduit) vit dans couche-store.ts (tache 2) -- meme separation
 * que theme.ts (pur) / theme-store.ts (impur).
 */
export type Couche = "scene" | "amatl" | "parole";

export type CoucheContexte = {
  /** `matchMedia("(prefers-reduced-motion: reduce)").matches`. */
  prefersReducedMotion: boolean;
  /** Un contexte WebGL (1 ou 2) a pu etre cree sur cette machine. */
  webglDisponible: boolean;
  /** `navigator.connection.saveData` ou `effectiveType` slow-2g/2g -- meme
   *  lecture que `prelectureBienvenue` (stag-scene/mount-for-direction.tsx). */
  connexionDegradee: boolean;
};

/**
 * La couche d'ouverture. Le WebGL absent l'emporte sur tout : sans lui,
 * rien d'autre n'a de sens a verifier.
 */
export function coucheParDefaut(contexte: CoucheContexte): Couche {
  if (!contexte.webglDisponible) return "amatl";
  if (contexte.prefersReducedMotion) return "amatl";
  if (contexte.connexionDegradee) return "amatl";
  return "scene";
}
```

- [x] **Step 3 : vert, `tsc`, `eslint`, commit**

Run: `pnpm exec vitest run src/lib/couche.test.ts && pnpm exec tsc --noEmit && pnpm exec eslint src/lib --cache --cache-location node_modules/.cache/eslint/`
Expected: 6 passed, 0 erreur, 0 avertissement nouveau. **Fait, 02/11 : 6/6
verts, tsc et eslint propres.**

```bash
git add src/lib/couche.ts src/lib/couche.test.ts
git commit -m "feat(couches): la regle pure de la couche d'ouverture (scene/amatl), jamais la parole par defaut"
```

---

### Task 2 : le store, la detection, la truelle — a detailer en commencant la tache

**Ne pas commencer sans avoir tranche au prealable** (section « ce que la
lecture a etabli ») :
1. Le controle est-il un seul composant (`truelle.tsx`, role `slider`
   unique) ou deux ? La spec recommande un seul ; a confirmer en ARIA avant
   d'ecrire le markup.
2. Le choix manuel du visiteur persiste-t-il (`localStorage`, comme le
   theme) ou se recalcule-t-il a chaque visite ?

**Buts, sans code fige encore :**
- `couche-store.ts` : detection WebGL (`canvas.getContext`, `try/catch`),
  connexion (reprendre la lecture de `prelectureBienvenue`), mouvement
  reduit (`matchMedia`), combinees par `coucheParDefaut` ; `useSyncExternalStore` ;
  persistance si tranchee au point 2.
- Script inline dans le layout : `data-couche` pose avant le premier
  paint, meme motif que `data-theme`.
- `truelle.tsx` : le controle unique, `slider` ARIA, 3 positions figees,
  rendu comme 3 marques au repos (design section 3-4).
- `tests/e2e/couche-slider.spec.ts` (oracle RGAA de la spec, section 10,
  #1) : vu rouge avant que `truelle.tsx` existe.

**A lire avant d'ecrire le detail** : `src/app/components/scene-controls.tsx`
(ou vit la barre de gauche, le motif des 8 boutons) et
`src/app/components/scene-refs-context.tsx` (comment la scene lit l'etat
partage) — pas encore lus pour ce plan, necessaires pour placer la
truelle sans casser l'existant.

---

### Task 3 : le focus et l'annonce au changement de couche — a detailer

**But** : extraire de `route-announcer.tsx` le patron (focus sur
`tabindex="-1"`, `preventScroll: true`, annonce `aria-live` differee) dans
un hook partage, appele par `RouteAnnouncer` (sur `usePathname`) ET par le
changement de couche (sur le store de la tache 2). Oracle :
`tests/e2e/couche-focus.spec.ts` (spec section 10, #2).

---

### Task 4 : l'*amatl*, composee depuis les `sceneDescriptions` — a detailer

**But** : `amatl-layer.tsx` compose les 5 `sceneDescriptions` de
`src/dictionaries/fr.json` (+ en/es) en SVG, trait puis aplats. **A lire
avant de detailer** : la forme exacte des `sceneDescriptions` dans les
trois dictionnaires, et comment `stag-scene.tsx` les consomme aujourd'hui
(pour que l'equivalence reste vraie par construction, design section 2).

---

### Task 5 : la transition A -> B, liberation du contexte WebGL — a detailer

**But** : `pointerdown` sur la truelle fige une image, le glissement
l'ecarte, le relachement rallume ou libere le contexte WebGL. **A lire
avant de detailer** : `persistent-scene.tsx` (le `Canvas`, son cycle de
montage/demontage) et la fuite memoire deja connue (chantier GPU du 15/09,
`useLibereAuDemontage`) pour reutiliser le meme mecanisme de liberation
plutot que d'en ecrire un nouveau. Oracle : `tests/e2e/couche-morph.spec.ts`
et `couche-degradation.spec.ts` (spec section 10, #3 et #4).

---

### Task 6 : la cible 24x24 px, et la cloture — a detailer

**But** : `tests/e2e/cible-24px.spec.ts` (spec section 10, #5) sur les
icones existantes de `scene-controls.tsx` + la truelle. Documentation et
memoire mises a jour, criteres d'acceptation de la spec coches avec leurs
preuves. ⛔ **Ne pas toucher au menage de la barre** (eco/pause/text) :
stand by, decision de Sylvain (spec section 7).
