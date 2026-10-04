# La nuit mobile : plan d'implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sur le profil mobile (pas de post-traitement), la premiere image de nuit du Centre montre le cerf et le foyer, par des lumieres et des emissifs plus forts, sans une passe de rendu de plus ; le bureau ne change pas ; un oracle sur pixels compare 767 px a 769 px dans la meme passe.

**Architecture:** Une lib pure `src/lib/nuit-mobile.ts` rend trois facteurs (`ambiant`, `emissif`, `exposition`) depuis le profil et le progres de l'arc ; un composant mince `NuitMobile` dans le `Canvas` les calcule une fois par image, les depose dans `nuitMobileStore` et pose l'exposition ; trois consommateurs lisent le store en une ligne (ambiante, foyer, braises). Design : `docs/superpowers/specs/2026-10-04-nuit-mobile-design.md`.

**Tech Stack:** three / react-three-fiber (refs + `useFrame`, jamais d'etat React a 60 fps), Vitest pour la lib, Playwright (suite e2e par defaut, serveur de dev `:3000`) pour l'oracle, `gl.readPixels` dans le test (interdit sous `src/`, permis dans `tests/`).

**Ce que la lecture du code a etabli (04/10) :**

- `src/lib/reveal-arc.ts` : `PHASE_START` et `easeWithinRange` existent mais ne sont PAS exportes ; `getAmbientIntensity(0) = 0,35`, `getDirectionalIntensity(0) = 0,5`. La note du fichier : sous ~0,3 d'ambiante le cerf tombe a (0,0,0).
- `src/app/components/stag-scene/reveal-lighting.tsx` ligne 221 : `ambientRef.current.intensity = getAmbientIntensity(p) * rig.ambientScale * reflet.ambientScale;` -- c'est la ligne a multiplier.
- `src/app/components/stag-scene/copal-braziers.tsx` : `HEARTH_LIGHT = 40` (ligne 48) ; ligne 129 `hearth.intensity = HEARTH_LIGHT * intensity * pulse;` avec `intensity = presence * copalIntensity(p, frost)` et `COPAL.base = 0,45` (le foyer vaut 18 a l'arc zero) ; ligne 147 `b.ember.material.opacity = 0.55 * lit * flicker;` (sprites additifs orange, `fog: false`).
- `src/app/components/stag-scene/piedra-ground.tsx` : le disque n'a pas d'emissif (`PIEDRA_NEUTRAL`, opacite 0,1) ; rien a y faire.
- `src/app/components/stag-scene/reflet-store.ts` : le motif de store (`export const refletStore: { k: number } = { k: 0 };`), mute une fois par image, lu par les autres.
- `src/app/components/stag-scene/persistent-scene.tsx` lignes 236-275 : le `Canvas` (`gl={{ preserveDrawingBuffer: true }}`, `dpr={[1, refs.perfProfile.dprCap]}`), `{refs.perfProfile.postFx && <PostFX />}` en dernier enfant ; `refs` vient de `useSceneRefs()`-like (`scene-refs-context.tsx` expose `perfProfile`, `progressRef`, `reducedMotionRef`).
- `scene-refs-context.tsx` : `perfProfile` dans le contexte, `getPerfProfile(viewportWidth, eco)` ; seuil mobile 768 (`lib/mobile-perf.ts`).
- `tests/e2e/regression-visuelle.spec.ts` : `test.use({ contextOptions: { reducedMotion: "reduce", colorScheme: "dark" } })` est le motif pour la face sombre figee ; pour deux largeurs dans un meme test on ouvre deux contextes par `browser.newContext(...)`.
- `?scene=1` masque le texte quelle que soit la version du lien ; `?shaders-prod` pose `window.__nahualR3f`.
- Le vrai telephone : `.scratch/adb-barre.mjs` (ponts `adb reverse tcp:3100 tcp:3100` et `adb forward tcp:9222 localabstract:chrome_devtools_remote`, serveur de production sur `:3100`, `adb shell svc power stayon usb`).

---

## Structure des fichiers

| fichier | responsabilite |
| --- | --- |
| `src/lib/reveal-arc.ts` | **modifie.** Exporte `PHASE_START` et `easeWithinRange` (une source pour la courbe de l'arc). |
| `src/lib/nuit-mobile.ts` | **cree.** `compensationNuit(profil, progress)` : les trois facteurs. Pur. |
| `src/lib/nuit-mobile.test.ts` | **cree.** Les tests de la lib. |
| `src/app/components/stag-scene/nuit-mobile-store.ts` | **cree.** Le store mute une fois par image. |
| `src/app/components/stag-scene/nuit-mobile.tsx` | **cree.** `NuitMobile` : calcule, depose, pose l'exposition. Mince. |
| `src/app/components/stag-scene/persistent-scene.tsx` | **modifie.** Monte `<NuitMobile />`. |
| `src/app/components/stag-scene/reveal-lighting.tsx` | **modifie.** Ambiante x `nuitMobileStore.ambiant`. |
| `src/app/components/stag-scene/copal-braziers.tsx` | **modifie.** Foyer x `ambiant`, braises x `emissif`. |
| `tests/e2e/nuit-mobile.spec.ts` | **cree.** L'oracle sur pixels, 767 contre 769. |
| `docs/harnais.md`, `docs/da/pose-au-repos.md`, memoire | **modifies.** Les chiffres, le renvoi. |

---

### Task 1 : la lib pure et sa courbe

**Files:**
- Modify: `src/lib/reveal-arc.ts` (lignes 12 et 44 : `export`)
- Create: `src/lib/nuit-mobile.ts`
- Test: `src/lib/nuit-mobile.test.ts`

- [ ] **Step 1 : exporter la courbe de l'arc**

Dans `src/lib/reveal-arc.ts`, `const PHASE_START = {` devient `export const PHASE_START = {` et `function easeWithinRange(` devient `export function easeWithinRange(`. Rien d'autre ne bouge.

- [ ] **Step 2 : ecrire le test, rouge**

`src/lib/nuit-mobile.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { PHASE_START } from "./reveal-arc";
import { COMPENSATION_NUIT, compensationNuit } from "./nuit-mobile";

/**
 * LA NUIT MOBILE (04/10) : le profil mobile coupe le post-traitement, et
 * avec lui le Bloom qui faisait rayonner le foyer et les braises ; la
 * premiere image de nuit etait noire sur telephone (A/B 767 / 769 px).
 * Cette lib rend ce que le Bloom ajoutait, en lumiere : trois facteurs qui
 * valent 1 des que le profil porte le post-traitement, et 1 des que le
 * jour s'est leve.
 */
const BUREAU = { postFx: true };
const MOBILE = { postFx: false };

describe("la compensation de la nuit mobile", () => {
  it("vaut 1 partout quand le profil porte le post-traitement, a tout progres", () => {
    for (const p of [0, 0.2, 0.5, 1]) expect(compensationNuit(BUREAU, p)).toEqual({ ambiant: 1, emissif: 1, exposition: 1 });
  });
  it("a l'arc zero sur mobile, rend les valeurs de nuit", () => {
    expect(compensationNuit(MOBILE, 0)).toEqual({ ambiant: COMPENSATION_NUIT.ambiant, emissif: COMPENSATION_NUIT.emissif, exposition: COMPENSATION_NUIT.exposition });
  });
  it("vaut 1 une fois les chemins reveles, et au-dela", () => {
    expect(compensationNuit(MOBILE, PHASE_START["chemins-reveles"])).toEqual({ ambiant: 1, emissif: 1, exposition: 1 });
    expect(compensationNuit(MOBILE, 1)).toEqual({ ambiant: 1, emissif: 1, exposition: 1 });
  });
  it("decroit de facon monotone entre la penombre et les chemins reveles", () => {
    let precedent = compensationNuit(MOBILE, 0).ambiant;
    for (let p = 0.05; p <= 1; p += 0.05) {
      const c = compensationNuit(MOBILE, p);
      expect(c.ambiant).toBeLessThanOrEqual(precedent + 1e-9);
      expect(c.emissif).toBeGreaterThanOrEqual(1);
      expect(c.exposition).toBeGreaterThanOrEqual(1);
      precedent = c.ambiant;
    }
  });
  it("les valeurs de nuit sont celles du design : au moins 1, l'exposition au plus 1,15", () => {
    expect(COMPENSATION_NUIT.ambiant).toBeGreaterThanOrEqual(1);
    expect(COMPENSATION_NUIT.emissif).toBeGreaterThanOrEqual(1);
    expect(COMPENSATION_NUIT.exposition).toBeGreaterThanOrEqual(1);
    expect(COMPENSATION_NUIT.exposition).toBeLessThanOrEqual(1.15);
  });
  it("borne le progres : un progres negatif vaut zero, un progres au-dela de 1 vaut 1", () => {
    expect(compensationNuit(MOBILE, -1)).toEqual(compensationNuit(MOBILE, 0));
    expect(compensationNuit(MOBILE, 2)).toEqual(compensationNuit(MOBILE, 1));
  });
});
```

- [ ] **Step 3 : le voir rouge**

Run: `pnpm exec vitest run src/lib/nuit-mobile.test.ts`
Expected: FAIL, `Cannot find module './nuit-mobile'`.

- [ ] **Step 4 : `nuit-mobile.ts`**

```ts
/**
 * LA NUIT MOBILE (04/10/2026). Design :
 * docs/superpowers/specs/2026-10-04-nuit-mobile-design.md.
 *
 * Sous 768 px, le profil de performance coupe le post-traitement, et avec
 * lui le Bloom qui faisait rayonner le foyer, les braises et les
 * speculaires du cerf : la premiere image de nuit du Centre etait noire sur
 * un vrai telephone (Redmi Note 9 Pro, 04/10), et sur le Chromium du PC a
 * 767 px, pas a 769 px. Rallumer le Bloom n'est pas une option sur un
 * appareil a dix images par seconde. On rend donc en LUMIERE ce que le
 * Bloom ajoutait : trois facteurs, a 1 des que le profil porte le
 * post-traitement, et a 1 des que le jour s'est leve (meme courbe que la
 * lumiere de l'arc : la compensation n'existe que la ou le Bloom manquait).
 *
 * L'ordre des leviers (design, section 2) : d'abord ce qui eclaire
 * localement (le foyer, les braises), puis l'ambiante, et l'exposition en
 * dernier recours, parce qu'elle est globale et grise la penombre. Ces
 * nombres sont un dosage valide a l'oeil contre la capture a 769 px, puis
 * garde par tests/e2e/nuit-mobile.spec.ts. Ce module est pur.
 */
import { PHASE_START, easeWithinRange } from "./reveal-arc";

export type CompensationNuit = { ambiant: number; emissif: number; exposition: number };

/** Les valeurs a l'arc zero, sur mobile. Point de depart du 04/10, a doser (tache 4). */
export const COMPENSATION_NUIT: CompensationNuit = { ambiant: 1.6, emissif: 2.5, exposition: 1 };

const UN: CompensationNuit = { ambiant: 1, emissif: 1, exposition: 1 };

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function compensationNuit(profil: { postFx: boolean }, progress: number): CompensationNuit {
  if (profil.postFx) return { ...UN };
  const p = clamp01(progress);
  return {
    ambiant: easeWithinRange(p, PHASE_START.penombre, PHASE_START["chemins-reveles"], COMPENSATION_NUIT.ambiant, 1),
    emissif: easeWithinRange(p, PHASE_START.penombre, PHASE_START["chemins-reveles"], COMPENSATION_NUIT.emissif, 1),
    exposition: easeWithinRange(p, PHASE_START.penombre, PHASE_START["chemins-reveles"], COMPENSATION_NUIT.exposition, 1),
  };
}
```

- [ ] **Step 5 : le voir vert, `tsc`, `eslint`, commit**

Run: `pnpm exec vitest run src/lib/nuit-mobile.test.ts src/lib/reveal-arc.test.ts && pnpm exec tsc --noEmit && pnpm exec eslint src/lib --cache --cache-location node_modules/.cache/eslint/`
Expected: 6 passed pour la lib, les tests de reveal-arc inchanges, rien d'autre. Si `easeWithinRange` rend une valeur hors de `[to, from]` a `p = 1` (verifier : la fonction borne-t-elle ?), le test « vaut 1 au-dela » le dira ; ne pas toucher a reveal-arc, border dans nuit-mobile par `clamp01`.

```bash
git add src/lib/reveal-arc.ts src/lib/nuit-mobile.ts src/lib/nuit-mobile.test.ts
git commit -m "feat(nuit-mobile): la compensation de la nuit sans Bloom, pure, sur la courbe de l'arc"
```

---

### Task 2 : le store, le composant, les trois consommateurs

**Files:**
- Create: `src/app/components/stag-scene/nuit-mobile-store.ts`
- Create: `src/app/components/stag-scene/nuit-mobile.tsx`
- Modify: `src/app/components/stag-scene/persistent-scene.tsx` (ligne 274)
- Modify: `src/app/components/stag-scene/reveal-lighting.tsx` (ligne 221)
- Modify: `src/app/components/stag-scene/copal-braziers.tsx` (lignes 129 et 147)

- [ ] **Step 1 : le store**

`src/app/components/stag-scene/nuit-mobile-store.ts` :

```ts
import type { CompensationNuit } from "@/lib/nuit-mobile";

/**
 * La compensation de la nuit mobile (04/10), calculee une fois par image
 * par NuitMobile et lue par la lumiere, le foyer et les braises. Meme motif
 * que refletStore : un objet mute, pas d'etat React a 60 fps. A 1 partout
 * tant que NuitMobile n'a pas tourne : un consommateur qui lit avant la
 * premiere image ne change rien.
 */
export const nuitMobileStore: CompensationNuit = { ambiant: 1, emissif: 1, exposition: 1 };
```

- [ ] **Step 2 : le composant**

`src/app/components/stag-scene/nuit-mobile.tsx` :

```tsx
"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { compensationNuit } from "@/lib/nuit-mobile";
import { useSceneRefs } from "./scene-refs-context";
import { nuitMobileStore } from "./nuit-mobile-store";

/**
 * NuitMobile (04/10) : calcule la compensation de la nuit une fois par
 * image (profil + progres de l'arc), la depose dans nuitMobileStore pour la
 * lumiere, le foyer et les braises, et pose l'exposition du rendu. Sur un
 * profil avec post-traitement tout vaut 1 : le bureau ne voit rien. Mince :
 * la mecanique vit dans lib/nuit-mobile.
 */
export default function NuitMobile() {
  const sceneRefs = useSceneRefs();
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    if (!sceneRefs) return;
    const c = compensationNuit(sceneRefs.perfProfile, sceneRefs.progressRef.current);
    nuitMobileStore.ambiant = c.ambiant;
    nuitMobileStore.emissif = c.emissif;
    nuitMobileStore.exposition = c.exposition;
    if (gl.toneMappingExposure !== c.exposition) gl.toneMappingExposure = c.exposition;
  }, -1);
  return null;
}
```

La priorite `-1` : avant les consommateurs (priorite 0 par defaut), pour qu'ils lisent la valeur de l'image courante.

- [ ] **Step 3 : le monter**

Dans `persistent-scene.tsx`, avant `{refs.perfProfile.postFx && <PostFX />}` (ligne 274), ajouter :

```tsx
        {/* La nuit mobile (04/10) : ce que le Bloom ajoutait, rendu en lumiere
            quand le profil n'a pas de post-traitement. A 1 partout sinon. */}
        <NuitMobile />
```

et l'import en tete, a cote des autres composants de scene : `import NuitMobile from "./nuit-mobile";`.

- [ ] **Step 4 : les consommateurs**

`reveal-lighting.tsx`, ligne 221, devient :

```ts
      ambientRef.current.intensity = getAmbientIntensity(p) * rig.ambientScale * reflet.ambientScale * nuitMobileStore.ambiant;
```

avec `import { nuitMobileStore } from "./nuit-mobile-store";` en tete.

`copal-braziers.tsx`, ligne 129 : `hearth.intensity = HEARTH_LIGHT * intensity * pulse * nuitMobileStore.ambiant;` et ligne 147 : `b.ember.material.opacity = Math.min(1, 0.55 * lit * flicker * nuitMobileStore.emissif);`, avec l'import. Un commentaire d'une ligne au-dessus de chacune : `// La nuit mobile (04/10) : voir lib/nuit-mobile.`

- [ ] **Step 5 : `tsc`, `eslint`, les tests unitaires, la barre du bureau inchangee**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src --cache --cache-location node_modules/.cache/eslint/ && pnpm test`
Expected: 0 erreur, 0 avertissement nouveau (13 avant), tous les tests verts. Les lints de la boucle (`useFrame` sans allocation, pas de setter) passent : `compensationNuit` retourne un objet neuf par image -- c'est une allocation dans `useFrame` ? Non : la regle vise `new Vector3()` et consorts (objets three), pas un litteral ; mais pour ne rien allouer quand meme, faire muter le store dans la lib n'est pas possible (pure). Garder l'objet litteral : trois nombres, le ramasse-miettes n'y voit rien, et le dire dans le commentaire du composant.

Run: `pnpm run perf`
Expected: `7 passed`, tous `tenu` ou `progres a acquerir` : aucun chemin de code ne change en bureau (`postFx: true` → facteurs a 1).

- [ ] **Step 6 : commit**

```bash
git add src/app/components/stag-scene/nuit-mobile-store.ts src/app/components/stag-scene/nuit-mobile.tsx src/app/components/stag-scene/persistent-scene.tsx src/app/components/stag-scene/reveal-lighting.tsx src/app/components/stag-scene/copal-braziers.tsx
git commit -m "feat(nuit-mobile): le store, le composant mince, l'ambiante, le foyer et les braises lisent la compensation"
```

---

### Task 3 : l'oracle sur pixels, vu rouge AVANT la compensation

Cette tache se fait **avant** que la compensation existe a l'ecran : pour voir le rouge, lancer l'oracle avec `COMPENSATION_NUIT` temporairement a `{ ambiant: 1, emissif: 1, exposition: 1 }` (ou sur le commit d'avant la tache 2) et noter les chiffres ; puis le relancer avec les valeurs du design.

**Files:**
- Create: `tests/e2e/nuit-mobile.spec.ts`

- [ ] **Step 1 : le spec**

```ts
import { expect, test, type Browser } from "@playwright/test";

/**
 * LA NUIT MOBILE SE LIT (04/10, design 2026-10-04-nuit-mobile-design.md).
 *
 * Sous 768 px le profil coupe le post-traitement ; sans compensation, la
 * premiere image de nuit du Centre est noire sur telephone (vu sur un
 * Redmi Note 9 Pro, et sur ce Chromium a 767 px contre 769). L'oracle
 * compare les deux largeurs DANS LA MEME PASSE, jamais a un nombre choisi :
 * la part de pixels quasi noirs et la luminance mediane de la moitie basse
 * du canvas (sol, foyer, cerf ; la moitie haute est un ciel etoile, noir
 * par construction). Face sombre, mouvement reduit (l'arc figé a zero :
 * exactement la pose qu'on veut lisible), texte masque, lu dans le tampon
 * de dessin (preserveDrawingBuffer) -- des PIXELS, pas progressRef (lecon
 * de docs/da/pose-au-repos.md).
 */
const HAUTEUR = 839;
const MOBILE = 767;
const BUREAU = 769;
/** Un pixel est quasi noir si son canal le plus fort est sous 12/255. */
const NOIR = 12;
/** Le mobile ne depasse pas le bureau de plus de 10 points de noir, et garde au moins 70 % de sa luminance mediane. */
const ECART_NOIR_MAX = 0.10;
const LUMINANCE_MIN = 0.70;

type Mesure = { noir: number; luminance: number; largeur: number; hauteur: number };

async function mesurer(browser: Browser, width: number): Promise<Mesure> {
  const ctx = await browser.newContext({ viewport: { width, height: HAUTEUR }, colorScheme: "dark", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/fr?scene=1&shaders-prod&veille=off", { waitUntil: "commit" });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 120_000 });
  await page.waitForTimeout(2000);
  const m = await page.evaluate((noir) => {
    const w = window as unknown as { __nahualR3f?: { gl: { getContext: () => WebGL2RenderingContext } } };
    const g = w.__nahualR3f?.gl.getContext();
    if (!g) throw new Error("__nahualR3f absent : la scene n'est pas montee");
    const largeur = g.drawingBufferWidth;
    const hauteur = g.drawingBufferHeight;
    const moitie = Math.floor(hauteur / 2);
    // readPixels lit depuis le bas : les lignes [0, moitie) sont la moitie BASSE de l'image.
    const buf = new Uint8Array(largeur * moitie * 4);
    g.readPixels(0, 0, largeur, moitie, g.RGBA, g.UNSIGNED_BYTE, buf);
    let noirs = 0;
    const lums: number[] = [];
    const pas = 4; // un pixel sur quatre, en x et en y : assez pour une mediane, et le test reste court
    for (let y = 0; y < moitie; y += pas) {
      for (let x = 0; x < largeur; x += pas) {
        const i = (y * largeur + x) * 4;
        const r = buf[i], gg = buf[i + 1], b = buf[i + 2];
        if (Math.max(r, gg, b) < noir) noirs++;
        lums.push(0.2126 * r + 0.7152 * gg + 0.0722 * b);
      }
    }
    lums.sort((a, b) => a - b);
    return { noir: noirs / lums.length, luminance: lums[Math.floor(lums.length / 2)], largeur, hauteur };
  }, NOIR);
  await ctx.close();
  return m;
}

test("a 767 px (profil mobile), la nuit du Centre n'est pas plus noire qu'a 769 px (profil bureau), a 10 points pres, et garde 70 % de sa luminance", async ({ browser }) => {
  const bureau = await mesurer(browser, BUREAU);
  const mobile = await mesurer(browser, MOBILE);
  const rapport =
    `bureau ${BUREAU} px (${bureau.largeur}x${bureau.hauteur}) : noir ${(bureau.noir * 100).toFixed(1)} %, luminance mediane ${bureau.luminance.toFixed(1)}\n` +
    `mobile ${MOBILE} px (${mobile.largeur}x${mobile.hauteur}) : noir ${(mobile.noir * 100).toFixed(1)} %, luminance mediane ${mobile.luminance.toFixed(1)}`;
  console.log(rapport);
  expect(bureau.luminance, `le bureau lui-meme est noir, l'oracle n'a rien a comparer\n${rapport}`).toBeGreaterThan(NOIR);
  expect(mobile.noir, `la nuit mobile est plus noire que le bureau de plus de ${ECART_NOIR_MAX * 100} points\n${rapport}`).toBeLessThanOrEqual(bureau.noir + ECART_NOIR_MAX);
  expect(mobile.luminance, `la nuit mobile n'atteint pas ${LUMINANCE_MIN * 100} % de la luminance du bureau\n${rapport}`).toBeGreaterThanOrEqual(bureau.luminance * LUMINANCE_MIN);
});
```

- [ ] **Step 2 : le voir ROUGE sans compensation**

Avec `COMPENSATION_NUIT = { ambiant: 1, emissif: 1, exposition: 1 }` (edition temporaire de `src/lib/nuit-mobile.ts`, ou `git stash` de la tache 2) :

Run: `pnpm exec playwright test tests/e2e/nuit-mobile.spec.ts`
Expected: `1 failed`, le rapport imprime les deux lignes ; attendu d'apres les captures du 04/10 : noir mobile tres au-dessus du noir bureau, luminance mobile bien sous 70 %. **Noter les quatre chiffres : c'est le point zero, il va dans le commit et dans `docs/harnais.md`.** Si le bureau est lui-meme noir (premiere assertion), la pose de reference n'est pas celle attendue (verifier `colorScheme`, `reducedMotion`, `?scene=1`) : ne pas continuer sur un bureau noir.

Si `readPixels` rend des zeros partout (tampon vide) : `preserveDrawingBuffer` est pose dans le Canvas, mais sous `frameloop="demand"` il faut une image rendue apres l'attente ; forcer une invalidation en lisant juste apres un `page.mouse.move(10, 10)` suivi de 300 ms. Le dire dans le spec si c'est le cas.

Restaurer `COMPENSATION_NUIT` aux valeurs du design.

- [ ] **Step 3 : commit du spec rouge**

```bash
git add tests/e2e/nuit-mobile.spec.ts
git commit -m "test(nuit-mobile): l'oracle sur pixels, 767 contre 769 px, vu rouge sans compensation (noir N % / N %, luminance N / N)"
```

---

### Task 4 : le dosage, a l'oeil et a l'oracle

**Files:**
- Modify: `src/lib/nuit-mobile.ts` (`COMPENSATION_NUIT`)

- [ ] **Step 1 : l'oracle avec les valeurs du design**

Run: `pnpm exec playwright test tests/e2e/nuit-mobile.spec.ts`
Expected : lire les quatre chiffres. Vert ou rouge, ce sont eux qui guident le dosage.

- [ ] **Step 2 : les captures pour Sylvain**

Serveur de production : `pnpm run build && pnpm exec next start -p 3100` (en fond), puis :

```bash
node .scratch/pc-capture-largeur.mjs fr dark 767
node .scratch/pc-capture-largeur.mjs fr dark 769
```

Montrer a Sylvain `.scratch/pc-767px-fr-dark.png` (apres) contre `.scratch/pc-769px-fr-dark.png` (reference) et contre la capture d'avant (`git stash` ou la capture du 04/10 01h, deja dans `.scratch`). La question est unique : « le cerf et le foyer sont-ils la, et la penombre est-elle restee une penombre ? »

- [ ] **Step 3 : doser, dans l'ordre des leviers**

Si le foyer ne se voit pas : `emissif` d'abord (2,5 → 3,5), et `ambiant` sur le foyer est deja porte par le point de lumiere. Si le cerf ne se lit pas : `ambiant` (1,6 → 2,0 ; au-dela, le decor s'aplatit). En dernier recours seulement, `exposition` 1 → 1,1, jamais au-dessus de 1,15 (design). Chaque essai : les deux captures + l'oracle. S'arreter au premier « oui » de Sylvain avec l'oracle vert.

Si l'oracle reste rouge alors que Sylvain dit oui : les seuils (10 points, 70 %) sont trop serres pour une penombre voulue ; les relacher UNE fois, en ecrivant la nouvelle mesure a cote, jamais a l'aveugle. Si l'oracle est vert mais que Sylvain dit non : l'oracle ne mesure pas ce qu'il voit ; dire lequel des deux sujets manque (cerf ou foyer) et ajouter la mesure correspondante avant de doser.

- [ ] **Step 4 : la barre, les deux**

Run: `pnpm run perf`
Expected: `7 passed`, tous `tenu` ou `progres a acquerir` (le bureau n'a pas bouge).

Run: `pnpm run perf:telephone`
Expected: `7 passed`, tous `tenu` ou `progres a acquerir`. Un RECUL ici signifie que le remede coute des images sur le profil emule : revenir au step 3 et dire lequel des leviers a coute.

- [ ] **Step 5 : commit, avec les chiffres**

```bash
git add src/lib/nuit-mobile.ts
git commit -F - <<'EOF'
feat(nuit-mobile): le dosage valide a l'oeil (ambiant N, emissif N, exposition N)

Oracle 767 / 769 px : noir N % / N %, luminance mediane N / N (point zero
sans compensation : N % / N %, N / N). Sylvain : « le cerf et le foyer sont
la ». perf-bureau tenue, perf-telephone tenue.
EOF
```

---

### Task 5 : le vrai telephone, trois courses avant, trois apres

**Files:**
- aucun (mesure) ; `docs/harnais.md` a la tache 6

- [ ] **Step 1 : l'etat d'AVANT**

Sur le commit d'avant la tache 2 (`git stash` des changements, ou `git switch --detach <sha du commit de la tache 1>`), construire et servir la production (`pnpm run build && pnpm exec next start -p 3100`), poser les ponts :

```bash
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
"$ADB" reverse tcp:3100 tcp:3100 && "$ADB" forward tcp:9222 localabstract:chrome_devtools_remote && "$ADB" shell svc power stayon usb && "$ADB" shell input keyevent KEYCODE_WAKEUP
"$ADB" shell am start -n com.android.chrome/com.google.android.apps.chrome.Main -d about:blank
for i in 1 2 3; do node .scratch/adb-barre.mjs fr 6000 2>&1 | grep presentees; done
```

Expected: trois lignes `N presentees, N au-dela, pire N ms, N perdues, ..., p5 N fps`. Noter la mediane des perdues et l'ecart (max - min) des trois.

- [ ] **Step 2 : l'etat d'APRES**

Revenir sur `dev` (tache 4 commitee), reconstruire, relancer le serveur, les trois memes courses. Mediane des perdues.

Acceptation : `mediane(apres) <= mediane(avant) + ecart(avant)`. Sinon, le remede coute des images : revenir a la tache 4 et nommer le levier (l'exposition et les facteurs sont des multiplications, ils ne devraient rien couter ; si ca coute, c'est qu'un chemin de code a bouge ailleurs, le dire).

- [ ] **Step 3 : ranger**

```bash
"$ADB" reverse --remove-all; "$ADB" forward --remove-all; "$ADB" shell svc power stayon false
```

et arreter le serveur `:3100` (un serveur qui traine fait echouer `pnpm run perf`).

---

### Task 6 : la documentation et la cloture

**Files:**
- Modify: `docs/harnais.md` (paragraphe « Le vrai telephone, premiere mesure »)
- Modify: `docs/da/pose-au-repos.md` (section 4, renvoi)
- Modify: `docs/superpowers/specs/2026-10-04-nuit-mobile-design.md` (section 6, criteres coches avec leurs preuves)
- Modify: ce plan (cocher)

- [ ] **Step 1 : `docs/harnais.md`**

Apres le paragraphe « Le vrai telephone, premiere mesure (04/10, ...) », ajouter :

```markdown
**La nuit mobile (04/10, `lib/nuit-mobile.ts`)** : ce que le Bloom ajoutait
est rendu en lumiere sur le profil sans post-traitement (ambiant x N,
emissif x N sur les braises, foyer x N, exposition N), sur la courbe de
l'arc, a 1 en bureau. Oracle `tests/e2e/nuit-mobile.spec.ts` : 767 contre
769 px dans la meme passe, part de noir N % / N % (avant : N % / N %),
luminance mediane N / N. Vrai telephone, trois courses : N perdues
(mediane) avant, N apres.
```

- [ ] **Step 2 : `docs/da/pose-au-repos.md`**

Dans la section 4, apres le paragraphe « DECIDE le 03/10/2026 », ajouter : `La nuit MOBILE a ete traitee a part le 04/10 (design 2026-10-04-nuit-mobile-design.md) : ce n'etait pas la pose, c'etait le profil de performance qui coupait le Bloom.`

- [ ] **Step 3 : cocher, `pnpm test`, commit, push**

Cocher ce plan et les criteres de la section 6 du design (avec le commit qui les prouve).

Run: `pnpm test`
Expected: tout vert (1102 + 6).

```bash
git add docs/harnais.md docs/da/pose-au-repos.md docs/superpowers/specs/2026-10-04-nuit-mobile-design.md docs/superpowers/plans/2026-10-04-nuit-mobile.md
git commit -m "docs(da): la nuit mobile livree, chiffres de l'oracle et du vrai telephone"
git push origin dev
```

`main` : il y a quelque chose a MONTRER (la nuit lisible sur telephone) : avance rapide `dev` → `main` et push, machine libre (le hook y lance la barre, ~6 min), au plus une fois dans la journee.
