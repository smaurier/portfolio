# QA Checklist — Nahual portfolio

Liste de tests manuels à repasser à chaque release / après grosse modif structurelle. Le nombre de features (nav SPA, Xolotl easter egg, ambiances par direction, PiedraVeil/Ground, contrôles clavier+manette, i18n, RGAA) rend une checklist explicite nécessaire pour éviter les régressions.

**Convention** : `☐` non testé, `✓` OK, `✗` régression trouvée.

---

## Setup préalable

- Dev server : `pnpm run dev` → http://localhost:3000
- Localhost prod-like : `pnpm run build && pnpm run start`
- Netlify preview : chaque PR/commit main déploie automatiquement

### Snippets DevTools utiles

Forcer spawn Xolotl (obsidienne = Mémoire, 40% chance auto) :
```js
sessionStorage.setItem('nahual-xolotl-spawn-obsidienne', '1');
localStorage.removeItem('nahual-xolotl-witnessed');
localStorage.removeItem('nahual-xolotl-codex-read');
location.reload();
```

Reset intro cinématique :
```js
localStorage.removeItem('nahual-intro-seen');
```

Simuler bot (Lighthouse) :
```js
Object.defineProperty(navigator, 'userAgent', { get: () => 'Chrome-Lighthouse' });
location.reload();
```

Toggle prefers-reduced-motion : DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion` → reduce.

---

## 1. Navigation SPA (aucune page ne doit hard-reload)

- ☐ Footer col Navigation : Accueil / Mémoire / Services / Projets / Contact → transition cardinale, pas de reload
- ☐ Footer col Ressources : Codex / Crédits / Plan du site → transition, pas de reload
- ☐ Footer col Légal : Mentions / Accessibilité / Confidentialité → transition, pas de reload
- ☐ Header main nav : Accueil / Mémoire / Services / Projets / Contact → burst 3D + View Transition
- ☐ Header logo Nahual : retour home
- ☐ Menu mobile burger : liens ferment le panel + naviguent SPA
- ☐ Boussole cardinale (bas droite) : 5 dots + bouton expand → nav SPA
- ☐ Case study CTA "Lire l'étude complète" (`/fr/projets`) → SPA vers detail
- ☐ Case study detail back button "← Retour aux projets" → SPA
- ☐ Codex page sitemap-like `codexDirections` links → SPA
- ☐ Xolotl witness message "Ce chien ?" (quand visible) → SPA vers Codex, empreinte disparaît après visite
- ☐ Language switcher FR/EN/ES : garde la page équivalente, pas la home
- ☐ Skip-nav "Aller au contenu principal" → focus main + scroll top
- ☐ Console : 0 erreur SPA au clic

## 2. Contrôles clavier + manette (nav cardinale relative)

Grille attendue :
```
       Nord (Mémoire)
Ouest    Centre     Est
(Contact) (Home) (Services)
       Sud (Projets)
```

- ☐ Alt+↑ depuis Centre → Mémoire (Nord)
- ☐ Alt+↑ depuis Mémoire → impasse (shake obsidienne)
- ☐ Alt+→ depuis Centre → Services (Est)
- ☐ Alt+→ depuis Est → impasse (shake dore)
- ☐ Alt+↓ depuis Centre → Projets
- ☐ Alt+← depuis Est → Centre (relatif, PAS Ouest absolu)
- ☐ Alt+← depuis Ouest → impasse (shake cendre)
- ☐ W (QWERTY) ou Z (AZERTY) : même comportement que Alt+↑ (event.code layout-agnostic)
- ☐ D (Est), S (Sud), A/Q (Ouest) : idem
- ☐ C : home direct (Centre)
- ☐ Escape : home direct
- ☐ Manette D-pad haut/bas/gauche/droite : deltas relatifs
- ☐ Manette bouton A/X : home direct
- ☐ Manette bouton B/O : home direct
- ☐ Feedback shake du dot cardinal à chaque impasse (500ms cubic-bezier)
- ☐ Skip raccourcis si focus dans input/textarea (test formulaire contact)
- ☐ Skip raccourcis si Ctrl/Meta pressé (pas de conflit Ctrl+W etc.)
- ☐ Toggle "Désactiver raccourcis" sur `/fr/accessibilite` : décoche → WASD + D-pad inertes
- ☐ Toggle re-coche → WASD + D-pad ré-actifs (pas de reload nécessaire)
- ☐ Toggle sync entre onglets (test 2 onglets, décoche 1er → 2ème sync)
- ☐ Alt+arrows et Escape restent actifs même toggle décoché (pas soumis RGAA 12.10)

## 3. Xolotl easter egg (spawn → footer → Codex)

- ☐ Sur home (jade) : jamais de spawn (probabilité 0)
- ☐ Sur Mémoire (obsidienne) : ~40% de spawn au 1er load, 15% autres directions
- ☐ Spawn timing : 10s après nav (1er), 15s (après avoir déjà vu Xolotl)
- ☐ Xolotl traverse gauche→droite pendant 14s, fade in 3s + fade out 3s
- ☐ Silhouette obsidienne fresnel + pulse cardiaque 30 bpm + scanlines + aberration RGB
- ☐ Noyau émissif "myocarde" au thorax (violet, opacité 0.04-0.09)
- ☐ Halo au sol violet radial sous les pattes
- ☐ Afterimage silhouette dédoublée ~180ms de retard, opacité 35%
- ☐ Dents (Object_8) invisibles (pas de mâchoire visible)
- ☐ Message "Ce chien ?" apparaît dans le footer entre col + copyright
- ☐ Empreinte de patte SVG violette à côté du lien Codex du footer
- ☐ Clic sur "Ce chien ?" → SPA vers `/fr/codex` (PAS de reload)
- ☐ Section Xolotl du Codex en tête (ordre CSS order:-1) avec bordure + fond gradient + empreinte top-right
- ☐ Visite Codex → localStorage `nahual-xolotl-codex-read` = "1", empreinte + message disparaissent
- ☐ Prochain spawn Xolotl → codex-read reset auto, empreinte + section en tête reviennent
- ☐ Sans avoir vu Xolotl : section Xolotl à sa position naturelle (après totem, pas en tête)
- ☐ Message hide 30s après fin traverse (grace period)

## 4. Cerf (StagModel)

- ☐ Cerf visible dès mount de la home, animation Idle
- ☐ Scroll → progression arc reveal (Idle_Headlow → Idle_2 → Idle selon `getIdleClipName`)
- ☐ Cerf `breath` cycle très subtil (scale 0.997-1.003)
- ☐ Rim light couleur cardinale change par page (jade / doré / turquoise / cendre / obsidienne)
- ☐ Body tint 12% max, pas surchargé
- ☐ Head-look COUPÉ : le cerf ne suit ni curseur ni transition (rig casse cou)
- ☐ Ombre de contact sous le cerf visible

## 5. PiedraVeil (voile chargement)

- ☐ Voile s'affiche au 1er load (min 1400ms)
- ☐ 3 anneaux Piedra V2 visibles : cœur (0-25%, opacité 0.30), bague milieu (33-58%, opacité 0.40), couronne extérieure (60-95%, opacité 0.50)
- ☐ Cœur + couronne : rotation horaire 45s/tour
- ☐ Bague milieu : rotation ANTI-horaire 60s/tour (contra-rotation Ometeotl)
- ☐ Phrase nahuatl + traduction + pourcentage centrés
- ☐ Fade out ~600ms quand chargement fini
- ☐ prefers-reduced-motion : rotations gelées, transitions coupées

## 6. PiedraGround (gravure 3D au sol)

- ☐ Piedra visible sous le cerf, gravée en relief (displacement map)
- ☐ Opacité 0.10, ne domine pas la scène
- ☐ Relief subtil (displacementScale 0.03, bias -0.015 : moitié creux, moitié bosse)
- ☐ Répond à la lumière (meshStandardMaterial, RevealLighting)
- ☐ Ne clip pas avec le sol principal (Y=0.005 offset)

## 7. Ambiences par direction (task #27 SOTY)

- ☐ Home / jade : embers verticaux Xiuhtecuhtli montent du sol autour du cerf (feu axial)
- ☐ Services / doré : particules scintillantes Tonatiuh en cascade quart supérieur droit
- ☐ Projets / turquoise : 3 colibris Huitzilopochtli en Lissajous 3D + trainées
- ☐ Contact / cendre : streamers cendre Ehecatl traversent E→O
- ☐ Mémoire / obsidienne : fumée + éclats Mictlantecuhtli en volume
- ☐ Crossfade smooth 800ms au changement de direction
- ☐ prefers-reduced-motion : snap direction active à 1, autres 0, pas de lerp

## 8. Xolotl visuel

- ☐ Taille cohérente ~tiers du cerf (scale 0.85 sur mesh 1.19 unit height)
- ☐ Cadence walk (WALK_TIME_SCALE = 1.0) : pas de glissement, foulée naturelle
- ☐ Position Z=-10 (arrière-plan), ne rentre pas en collision avec le cerf

## 9. Accessibilité (RGAA)

- ☐ Focus déplacé sur h1 nouvelle page après nav SPA (RGAA 12.8, cf `route-announcer.tsx`)
- ☐ Aria-live annonce le titre de la nouvelle page (region status polite)
- ☐ Skip-nav visible au focus clavier
- ☐ Toggle raccourcis clavier/manette dans page Accessibilité (RGAA 12.10)
- ☐ Reading mode toggle (accessible via header, active `body.reading-mode` = démonte canvas 3D)
- ☐ Sound toggle
- ☐ Contraste header/footer sur canvas noir : ratios ≥ AA (21:1 nav, 13.1:1 header, 11.2:1 footer)
- ☐ Lang attrs : html[lang=fr/en/es] + span[lang=nah] sur termes nahuatl
- ☐ Focus trap dans le menu mobile
- ☐ Focus trap dans compass overlay modal
- ☐ Alt attributes sur toutes les images signifiantes (logo="", décoratives OK)
- ☐ Titles page uniques (RGAA 8.6)
- ☐ Nouvelle fenêtre annoncée (RGAA 13.2 : `<span className="sr-only">(nouvelle fenêtre)</span>`)
- ☐ ScreenReader user test : lecture h1 → sections → nav sans surprise

## 10. Perf / assets

- ☐ Bundle build prod : `pnpm run build`, vérifier sizes First Load JS raisonnables
- ☐ `xolotl.glb` : 1.9 MB Meshopt (compressé de 27 MB), lazy load
- ☐ `stag.glb` : 415 KB Meshopt (compressé de 1 MB)
- ☐ `nopal-google.glb` / `vine-flower.glb` : 55-60 KB WebP + Meshopt
- ☐ `agave.glb` / `cactus-barrel.glb` / `cactus-quaternius.glb` : compressés
- ☐ Aucun `<a href>` interne (hard-reload) — tous en `<Link>` ou `<CardinalLink>`
- ☐ Images `public/img` optimisées (SVG orphelins supprimés)
- ☐ 60 FPS solide sur home + pages écho (test scroll)
- ☐ Bloom + PostFX activés, pas de lag perceptible

## 11. SEO / OG

- ☐ `/{locale}/opengraph-image` accessible : 1200×630 avec Piedra en fond décoratif top-right
- ☐ Preview Twitter/LinkedIn/Slack : title + description + image OG corrects par locale
- ☐ JSON-LD Person + BreadcrumbList + CreativeWork sur case studies
- ☐ `sitemap.xml` et `robots.txt` accessibles
- ☐ Metadata title/description par page, canonical URL
- ☐ hreflang alternates entre fr/en/es

## 12. Multilingue (i18n)

- ☐ 3 langues actives : fr / en / es
- ☐ Language switcher garde la page (`/fr/services` → `/es/servicios`, pas `/es`)
- ☐ Traductions cohérentes des slugs URL (memoire/memory/memoria, codex/codex/codice)
- ☐ Nahuatl highlighted via `<span lang="nah">` avec `renderWithNahuatl()`

## 13. Console runtime

- ☐ 0 erreur au chargement de chaque page
- ☐ 0 warning React (pas de key manquante, hydration mismatch, etc.)
- ☐ Warnings extensions navigateur (MetaMask, etc.) ignorés (pas de notre code)
- ☐ THREE.Clock deprecated warning connu (AnimationMixer, harmless)

## 14. Compatibilité

- ☐ Chrome/Edge (Chromium) desktop
- ☐ Firefox desktop
- ☐ Safari desktop (WebGL ok, some CSS diffs)
- ☐ Chrome mobile Android
- ☐ Safari mobile iOS
- ☐ Manette gamepad USB détectée (Xbox / PlayStation / générique)
- ☐ AZERTY + QWERTY layouts : WASD/ZQSD position physique équivalente

---

## Historique release checkée

_Format : ` — YYYY-MM-DD — commit — testeur — notes_

- (à remplir aux prochaines releases)
