# Audit visuel des 5 pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** produire, sans rien modifier au site, l'ensemble des captures (images + videos) dont la session suivante a besoin pour juger les 5 pages de Nahual contre les quatre reproches de Sylvain (confusion visuelle, saccades, texte en exces, niveau SOTY) -- le jugement lui-meme et la page Artifact viennent APRES ce plan, a la main, pas dans ce plan.

**Architecture:** un seul script Playwright jetable (`.scratch/audit-visuel.mjs`), meme famille que `.scratch/passage-colibri.mjs` deja ecrit aujourd'hui : un navigateur, une boucle sur les 5 pages, pour chacune une passe sombre+bureau a tous ses instants documentes (via `?t=<0..1>&v=2`, `lib/instant-link.ts`), une image d'arrivee en clair+bureau, une image d'arrivee en sombre+mobile, une video de defilement reel sombre+bureau. Toutes les sorties dans `.scratch/`, copiees vers `C:\Users\sylva\Downloads` a la fin.

**Tech Stack:** Node.js (`.mjs`), `@playwright/test` (deja une dependance du depot, utilise par `.scratch/passage-colibri.mjs`), Next.js servi en production locale (`next start -p 3100`), PowerShell pour l'orchestration (build/serve/capture/nettoyage).

Spec : `docs/superpowers/specs/2026-10-10-audit-visuel-design.md`.

---

## Fichiers

- Create `.scratch/audit-visuel.mjs` : le script de capture complet (images + videos, 5 pages).
- Aucun fichier de production modifie. Aucun test unitaire : script jetable d'audit, meme statut que `.scratch/passage-colibri.mjs`.

Reference technique verifiee dans le code (a ne pas re-decouvrir) :
- `src/app/[locale]/page.tsx` + `src/lib/routes.ts` : l'Accueil est `/fr` (racine, aucun slug) ; Services = `/fr/services`, Projets = `/fr/projets`, Contact = `/fr/contact`, Memoire = `/fr/memoire`.
- `src/lib/instant-link.ts` : `?t=<0..1>&v=2`.
- `src/app/components/stag-scene/foyer-arrival.tsx` : `data-foyer="done"` doit etre attendu sur CHAQUE chargement, meme avec `t` deja dans l'URL.
- `src/lib/theme.ts` : `THEME_STORAGE_KEY = "nahual-theme"`, valeurs exactement `"dark"` ou `"light"` (`export type Theme = "dark" | "light"`). A poser par `addInitScript`, AVANT le chargement.
- `.scratch/contemplation_check.mjs` : precedent de scroll reel avec `page.mouse.wheel(0, N)`.
- `.scratch/passage-colibri.mjs` : precedent de structure (plusieurs cas dans une boucle, lancement Chromium avec `--use-angle=d3d11 --use-gl=angle --ignore-gpu-blocklist`, attente de `data-foyer="done"`, copie finale vers `Downloads`).

Conventions du depot a respecter dans le script : commentaires en francais sans accents, pas de tiret cadratin, `pnpm` partout dans les commandes d'orchestration.

---

### Task 1 : le script de capture

**Files:**
- Create: `.scratch/audit-visuel.mjs`

- [ ] **Step 1 : ecrire le script**

```js
// .scratch/audit-visuel.mjs : audit visuel des 5 pages (10/10 soir).
// Spec : docs/superpowers/specs/2026-10-10-audit-visuel-design.md.
// Usage : pnpm run build ; pnpm exec next start -p 3100 ; node .scratch/audit-visuel.mjs 3100
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";

const { defaultBrowserType: _d, ...PIXEL } = devices["Pixel 7"];
const PORT = process.argv[2] ?? "3100";

// Les instants viennent des tableaux de docs/da/plans/<direction>.md,
// un par page, lus a la main (pas de formule : le nombre et la position
// suivent le contenu de chaque page, decide dans la spec).
const PAGES = [
  { slug: "", nom: "accueil", ts: [0.02, 0.15, 0.4, 0.6, 0.75, 0.95] },
  { slug: "services", nom: "services", ts: [0.02, 0.25, 0.5, 0.58, 0.75, 0.95] },
  { slug: "projets", nom: "projets", ts: [0.02, 0.3, 0.45, 0.65, 0.75, 0.95] },
  { slug: "contact", nom: "contact", ts: [0.02, 0.15, 0.6, 0.72, 0.75, 0.88, 0.97] },
  { slug: "memoire", nom: "memoire", ts: [0.02, 0.12, 0.35, 0.55, 0.75, 0.95] },
];

function urlDe(slug, t) {
  const base = `http://localhost:${PORT}/fr${slug ? "/" + slug : ""}`;
  return t === undefined ? base : `${base}?t=${t}&v=2`;
}

// data-foyer="done" n'est jamais saute par `t` (verifie dans foyer-arrival.tsx) :
// chaque chargement paie cette attente une fois. Puis une pause courte pour le
// fondu de l'instant (meme motif que passage-colibri.mjs).
async function attendreScene(page) {
  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 180_000 });
  await page.waitForTimeout(1200);
}

// Pose AVANT le chargement (addInitScript), valeurs exactes du type Theme
// de src/lib/theme.ts : "dark" ou "light", jamais "sombre"/"clair".
async function forcerTheme(ctx, theme) {
  await ctx.addInitScript((t) => {
    window.localStorage.setItem("nahual-theme", t);
  }, theme);
}

const b = await chromium.launch({ args: ["--use-angle=d3d11", "--use-gl=angle", "--ignore-gpu-blocklist"] });

for (const p of PAGES) {
  console.log(`-- ${p.nom} --`);

  // 1. Sombre + bureau : tous les instants documentes de la page.
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
    await forcerTheme(ctx, "dark");
    const page = await ctx.newPage();
    for (const t of p.ts) {
      await page.goto(urlDe(p.slug, t), { waitUntil: "commit", timeout: 180_000 });
      await attendreScene(page);
      if (p.nom === "memoire" && t === 0.75) {
        // Xolotl apparait 10 s apres le MONTAGE (temps reel, pas l'arc,
        // APPEAR_DELAY_FIRST_MS dans xolotl-companion.tsx) : une image
        // avant, une apres, au meme instant d'arc.
        await page.screenshot({ path: ".scratch/audit-memoire-0.75-avant-xolotl.png" });
        await page.waitForTimeout(11_000);
        await page.screenshot({ path: ".scratch/audit-memoire-0.75-apres-xolotl.png" });
      } else {
        await page.screenshot({ path: `.scratch/audit-${p.nom}-${t}.png` });
      }
      console.log(`  ${p.nom} t=${t} capture`);
    }
    await ctx.close();
  }

  // 2. Clair + bureau : l'arrivee seule (isole le theme).
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "light" });
    await forcerTheme(ctx, "light");
    const page = await ctx.newPage();
    await page.goto(urlDe(p.slug, p.ts[0]), { waitUntil: "commit", timeout: 180_000 });
    await attendreScene(page);
    await page.screenshot({ path: `.scratch/audit-${p.nom}-clair.png` });
    await ctx.close();
    console.log(`  ${p.nom} clair capture`);
  }

  // 3. Sombre + mobile : l'arrivee seule (isole l'appareil).
  {
    const ctx = await b.newContext({ ...PIXEL, colorScheme: "dark" });
    await forcerTheme(ctx, "dark");
    const page = await ctx.newPage();
    await page.goto(urlDe(p.slug, p.ts[0]), { waitUntil: "commit", timeout: 180_000 });
    await attendreScene(page);
    await page.screenshot({ path: `.scratch/audit-${p.nom}-mobile.png` });
    await ctx.close();
    console.log(`  ${p.nom} mobile capture`);
  }

  // 4. Video : defilement REEL sombre+bureau, sans `t` (depart en haut de
  // page), rythme constant de robot (page.mouse.wheel, meme motif que
  // .scratch/contemplation_check.mjs), jusqu'a ce que le scroll n'avance
  // plus (bas de page), avec un plafond de securite (400 pas).
  {
    fs.mkdirSync(".scratch/audit-video-tmp", { recursive: true });
    const ctx = await b.newContext({
      viewport: { width: 1280, height: 800 },
      colorScheme: "dark",
      recordVideo: { dir: ".scratch/audit-video-tmp", size: { width: 1280, height: 800 } },
    });
    await forcerTheme(ctx, "dark");
    const page = await ctx.newPage();
    await page.goto(urlDe(p.slug, undefined), { waitUntil: "commit", timeout: 180_000 });
    await attendreScene(page);
    let dernierY = -1;
    let stable = 0;
    for (let i = 0; i < 400 && stable < 5; i++) {
      await page.mouse.wheel(0, 80);
      await page.waitForTimeout(150);
      const y = await page.evaluate(() => window.scrollY);
      stable = y === dernierY ? stable + 1 : 0;
      dernierY = y;
    }
    const video = page.video();
    await page.close();
    await ctx.close();
    if (video) {
      const chemin = await video.path();
      fs.copyFileSync(chemin, `.scratch/audit-${p.nom}-scroll.webm`);
    }
    console.log(`  ${p.nom} video capturee (${dernierY} px de scroll final)`);
  }
}

await b.close();
console.log("audit termine");
```

- [ ] **Step 2 : verifier que le fichier n'a pas d'erreur de syntaxe**

Run: `node --check .scratch/audit-visuel.mjs`
Expected: aucune sortie (le script est syntaxiquement valide ; il n'est pas execute par cette commande).

- [ ] **Step 3 : commit (optionnel mais recommande, meme statut que `passage-colibri.mjs`, deja commite aujourd'hui)**

```bash
git add .scratch/audit-visuel.mjs
git commit -m "chore(audit): script de capture de l'audit visuel des 5 pages (images + videos)"
```

---

### Task 2 : executer la capture, verifier, livrer dans Downloads

**Files:**
- Aucun fichier de production. Sorties dans `.scratch/` puis `C:\Users\sylva\Downloads`.

- [ ] **Step 1 : verifier qu'aucun autre processus Node ne tourne a plein**

Run (PowerShell) : `Get-Process node -ErrorAction SilentlyContinue`
Expected : rien d'inattendu a forte charge CPU. Si un processus surprenant tourne a plein : le signaler avant de continuer, ne pas le tuer sans savoir ce que c'est (meme consigne que la capture du colibri plus tot aujourd'hui).

- [ ] **Step 2 : compiler et servir**

Run (PowerShell) :

```powershell
pnpm run build
$p = Start-Process -FilePath "pnpm" -ArgumentList "exec","next","start","-p","3100" -WindowStyle Hidden -PassThru
```

Attendre que `http://localhost:3100/fr` reponde 200 avant l'etape suivante (par exemple `Invoke-WebRequest http://localhost:3100/fr -UseBasicParsing` en boucle courte jusqu'a succes, ou une pause de quelques secondes si le serveur demarre vite sur cette machine).

- [ ] **Step 3 : lancer la capture**

Run (PowerShell) :

```powershell
node .scratch/audit-visuel.mjs 3100
```

Expected : la sortie console montre les 5 pages (`-- accueil --`, `-- services --`, `-- projets --`, `-- contact --`, `-- memoire --`), chacune avec ses instants puis `clair`, `mobile`, et une ligne video ; se termine par `audit termine`. Duree attendue : plusieurs minutes (5 pages x ~8 captures + 5 videos de defilement reel) -- ce n'est pas un hang, c'est le volume.

- [ ] **Step 4 : verifier le compte et la validite mecanique des fichiers**

Run (PowerShell) :

```powershell
Get-ChildItem .scratch/audit-*.png | Measure-Object
Get-ChildItem .scratch/audit-*.webm | Measure-Object
```

Expected : **42 PNG** au total et **5 WEBM**, aucun a 0 octet. Detail par page
(instants sombre+bureau + 1 clair + 1 mobile) :

| page | instants sombre+bureau | + clair | + mobile | total |
| --- | --- | --- | --- | --- |
| accueil | 6 | 1 | 1 | 8 |
| services | 6 | 1 | 1 | 8 |
| projets | 6 | 1 | 1 | 8 |
| contact | 7 | 1 | 1 | 9 |
| memoire | 7 (5 instants + 2 variantes avant/apres Xolotl a 0,75, au lieu d'1) | 1 | 1 | 9 |

8+8+8+9+9 = 42. L'important : AUCUN fichier ne manque par rapport a ce
tableau -- si le compte differe, comparer nommement aux fichiers attendus
plutot que de continuer en supposant que « c'est a peu pres bon ».

```powershell
Get-ChildItem .scratch/audit-*.png, .scratch/audit-*.webm | Where-Object { $_.Length -eq 0 }
```

Expected : aucune ligne (aucun fichier vide). Si une ligne apparait : cette capture a echoue silencieusement, a relancer pour cette seule page avant de continuer.

- [ ] **Step 5 : sanity check visuel basique (PAS le jugement DA -- juste "ce n'est pas casse")**

Ouvrir au moins une image par page (les 5 captures `audit-<nom>-<premier t>.png`) et confirmer qu'elles montrent une scene rendue (pas un ecran noir, pas une page d'erreur Next.js, pas un rendu blanc vide). Ne pas juger la qualite, la composition ou le texte ici -- c'est le travail du coordinateur apres ce plan, a la main, sur l'ensemble des fichiers.

- [ ] **Step 6 : copier vers Downloads et nettoyer**

Run (PowerShell) :

```powershell
foreach ($f in Get-ChildItem .scratch/audit-*.png, .scratch/audit-*.webm) {
  Copy-Item $f.FullName "C:\Users\sylva\Downloads\nahual-audit-$($f.Name)" -Force
}
Remove-Item .scratch/audit-video-tmp -Recurse -Force -ErrorAction SilentlyContinue
```

- [ ] **Step 7 : arreter le serveur proprement (le `Stop-Process` seul ne suffit pas toujours sur cette machine)**

Run (PowerShell) :

```powershell
Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
$ecoute = Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue
if ($ecoute) {
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($ecoute.OwningProcess)"
  Write-Host "Processus orphelin trouve sur le port 3100 : $($proc.Name) (PID $($proc.ProcessId)) -- arret."
  Stop-Process -Id $ecoute.OwningProcess -Force
}
Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue
```

Expected : la derniere commande ne renvoie rien (plus personne n'ecoute sur 3100). C'est exactement le probleme rencontre par la capture du colibri plus tot aujourd'hui (le `pnpm exec next start` orphelin survit au `Stop-Process` du wrapper `pnpm`) ; cette etape le ferme explicitement.

- [ ] **Step 8 : rapporter au coordinateur**

Lister les chemins complets des fichiers dans `C:\Users\sylva\Downloads\nahual-audit-*` (ou juste le compte total et le prefixe, le coordinateur peut les lister lui-meme). **Ce plan s'arrete ici.** Ni le jugement DA (confusion, texte, niveau SOTY, saccades), ni la construction de la page Artifact, ne font partie de ce plan : c'est le coordinateur qui regarde personnellement chaque fichier ensuite et ecrit les constats.

---
