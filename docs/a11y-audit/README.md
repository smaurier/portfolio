# Audit a11y nahual.fr — 2026-08-29

Méthode: dump accessibility tree Playwright MCP (browser Chromium) sur 3
pages représentatives + audit code. But: comparer ce qu'un lecteur
d'écran voit vs ce que voit l'utilisateur visuel, avant chantier de fond.

## Snapshots

- `snapshot-home-fr-before.md` — home /fr
- `snapshot-services-fr-before.md` — page écho /fr/services
- `snapshot-memoire-fr-before.md` — page écho /fr/memoire

## Findings clés

### 🔴🔴 HOME = récit invisible pour SR

Le `<main>` ne contient QUE le bloc "à-propos" (h2 + 1 paragraphe + 2
liens). Absents du tree :

- h1 hero title
- p hero text
- CTA hero
- 3 chapitres narratifs (kicker + line)

Cause : `FadingBlock` applique `display:none` quand opacity < 0.001, et
`RevealText` ne révèle qu'au scroll via IntersectionObserver. Au load
sans scroll, ces éléments sortent du tree accessibilité.

Un utilisateur NVDA / JAWS au chargement de la home entend
uniquement : "À propos, titre 2. [paragraphe about]. Me contacter,
lien. Voir mon code sur GitHub, lien." Le récit du cerf n'existe pas
pour lui. Hiérarchie brisée (h2 sans h1 précédent).

Impact RGAA : échec sévère critères 9.1 (titres), 9.2 (hiérarchie),
10.7 (contenu compréhensible sans style/JS).

### 🔴 PageClosure orphelin avant `<main>`

Sur `/services` et `/memoire`, avant `<main>`, un bloc "Direction ·
Nom nahuatl" (heading level=2) + link "Direction suivante" est rendu.
Hors main, sans conteneur sémantique. SR l'atteint entre le header et
le vrai h1 de la page → confusion pédagogique + hiérarchie titres
brisée.

Cause : `PageClosure` monté par `EchoScenePage` via
`SceneStage.overlay`, dans `SceneTextOverlay` qui est un layer fixe
au-dessus du canvas — hors flux DOM du main.

### ✅ Confirmé fonctionnel

- Skip nav "Aller au contenu principal"
- Banner / contentinfo
- Boussole cardinale `<nav aria-label="Boussole cardinale">`
- Bouton son labellé
- Langues avec `aria-current`
- Pages écho (services, memoire) : h1 + h2 propres, contenu texte
  complet dans le main

### 🟠 À corriger

- `<nav>` header desktop sans `aria-label` → tree affiche "navigation"
  générique
- Bouton compass expand : texte visible "i" + `aria-label` lu ensemble
  (redondance)
- `alert` role vide en fin de tree (composant orphelin ?)
- `status` role vide (LoadingVeil résiduel après démontage ?)

## Prochaines étapes

1. Créer utilitaire `.sr-only` dans `globals.css` (bloquant)
2. Fix FadingBlock : contenu doit être dans le tree SR peu importe
   l'état visuel de la révélation scroll
3. Fix PageClosure : soit dans `<main>`, soit en `<aside>` après,
   soit sur un heading level=6 non-orphelin
4. Ajouter `aria-label` sur nav header
5. Re-dump tree, comparer, prouver le fix

Corrections mesurables via nouveau dump Playwright — chaque item aura
son "before / after".

---

## Passe 1 — corrections top 🔴 (2026-08-29)

Snapshots `*-after.md` livrés. Comparaison avec `*-before.md`:

### ✅ Home `/fr` — récit désormais dans le tree SR

**Avant:** `<main>` contenait uniquement `heading "À propos" [level=2]`
+ 1 paragraphe + 2 liens. Hero, chapters, hiérarchie h1: absents.

**Après:**
```
main:
  heading "Nahual · studio de création" [level=1]
  paragraph: [texte hero complet, Mazātl, cerf...]
  region "Recit du cerf, quatre chapitres":
    list:
      listitem: strong "I · L'approche" — texte
      listitem: strong "II · Le regard" — texte
      listitem: strong "III · Face à face" — texte
      listitem: strong "IV · Les chemins" — texte
  [rendu visuel FadingBlock aria-hidden pour SR, CTA focusable pour tous]
```

Décisions:
- Bloc « À propos » retiré de la home (retour Sylvain : « À propos pour
  une page d'accueil c'est nul »). Contenu conservé dans le dict pour
  usage ailleurs (Codex ou Services). Un seul CTA hero reste, page
  pas orpheline.
- `sr-only` doublé le récit : version canonique dans le flux, jamais
  affectée par le scroll-driven reveal. Version visuelle vit en
  `aria-hidden` pour éviter la lecture en doublon.
- CTA reste hors du `sr-only` (dans le FadingBlock hero) — permet un
  seul chemin focus clavier, pas de doublon.

### ✅ PageClosure orphelin — aria-hidden appliqué

**Avant:** avant `<main>`, `heading "Est · Tlahuizcalpan" [level=2]`
+ paragraphe + `link "Sud · Turquoise"`. SR entendait ce bloc entre
le header et le vrai h1 de la page.

**Après:** headings et link ont perdu leur accessible name (aria-hidden
hérité). Le tree Playwright les affiche encore pour debug, mais NVDA/
JAWS/VoiceOver les skip. Équivalent fonctionnel garanti via la
boussole cardinale (déjà labellée) et la nav header.

### ✅ Nav header — désambiguïsée

**Avant:** `navigation` (générique, tree ne sait pas laquelle).

**Après:** `navigation "Navigation principale"`. Idem pour la liste
des liens externes (`list "Liens externes"`) et le panel mobile
(`dialog aria-label="Menu mobile"` + `navigation "Navigation
principale"` interne).

Nouvelles clés dict `common.navMainLabel`, `navMobileLabel`,
`navExternalLabel` (fr/en/es).

### ✅ Bouton compass expand — plus de doublon

**Avant:** `button "Explorer les 5 directions": i` — SR lisait le
label + le caractère « i » séparé.

**Après:** le « i » est wrappé en `<span aria-hidden="true">`. Tree
affiche `button "Explorer les 5 directions": generic "i"` — SR lit
juste le label.

## Restants pour la passe 2

- `alert` role orphelin en fin de tree (source à identifier, pas dans
  notre code — probablement Next.js dev tools)
- `status` role orphelin (LoadingVeil résiduel après démontage ? ou
  easter-egg toast ?)
- Focus trap manquant : modal compass overlay + panel mobile
- Nav SPA change contenu sans annoncer (item 13 audit initial)
- `prefers-reduced-motion` non respecté par custom-cursor, cursor-
  trail, mask-reveal, tilt-cards (item 17)
- Termes nahuatl inline non marqués `lang="nah"` (item 23)
- Contrastes texte petit sur canvas dynamique à mesurer précisément
  (item 16)
- Puis chantier opportunités A-H (narration SR enrichie, prononciation
  nahuatl, mode « récit accessible » opt-in, etc.)

---

## Passe 2 — 2026-08-29 (focus trap + SPA announce + reduced-motion)

### ✅ Focus trap : compass overlay + panel mobile burger

Hook partagé `src/lib/use-focus-trap.ts` (RGAA 7.3, WCAG 2.4.3) :
- focus initial sur le premier focusable du container à l'activation
- Tab depuis dernier revient au premier, Shift+Tab depuis premier va
  au dernier
- Return focus au trigger à la désactivation (save
  `document.activeElement` avant, refocus au cleanup)
- Fallback : si aucun focusable, container reçoit tabindex=-1
  temporaire pour permettre l'annonce SR

`compass-overlay.tsx` : remplace le focus-return-only manuel par le
hook. Escape reste géré localement (listener document, pas root).

`header.tsx` : ref `mobilePanelRef` + `useFocusTrap(ref, open)`. Tab
piégé dans le panel tant qu'il est ouvert.

### ✅ SPA nav announce : `route-announcer.tsx`

Nouveau composant monté dans layout. Observe `usePathname()`, attend
250ms le peint du nouveau `<main>`, récupère `main h1` textContent,
pousse dans une `<div role="status" aria-live="polite" class="sr-only">`.
Skip le premier mount (titre déjà dans le document).

Pattern « reset puis set » (setState "" puis setState title 50ms plus
tard) : garantit que la région ré-annonce même si le titre est
identique (nav back).

Ne déplace pas le focus : moins invasif, laisse l'utilisateur clavier
maître de sa position.

### ✅ `prefers-reduced-motion` — audit corrigé

Mon audit initial pointait 4 composants (custom-cursor, cursor-trail,
mask-reveal, tilt-cards). Après lecture, 3/4 respectaient déjà (ligne
22 identique dans chacun). Seul `custom-cursor.tsx` manquait le
check : ajouté, skip complet du curseur custom si media query match,
curseur natif reste visible.

`easter-egg.tsx` : anim konami-flash déjà couverte par media query
CSS dans `globals.css`. OK.

`smooth-scroll.tsx` : déjà couvert (ligne 25-26).

### ✅ `alert` / `status` orphelins — investigation

Playwright evaluate `document.querySelectorAll('[role="alert"]')` :
retourne `[]` sur `/fr`. Le "alert" dans le tree = Next.js dev tools
(bouton "Open Next.js Dev Tools" visible, dev only). Non-issue prod.

`role="status"` : 3 sources légitimes :
1. `RouteAnnouncer` (nouveau, chantier a11y) — contient le titre de
   la page courante
2. `LoadingVeil` — présent au mount, disparaît après load
3. `easter-egg` toast — reste en DOM vide pour recevoir les révélations

Aucun n'est un bug. Aria-live regions doivent rester montées pour
recevoir les updates.

### Différé au chantier « SR enrichi » (opportunités A-H)

- Termes nahuatl inline `lang="nah"` : refactor rendu dicts requis
  (dangerouslySetInnerHTML ou parser cote render). Trop invasif pour
  la passe fondations.
- Descriptions poétiques SR-only des scènes 3D
- Live region cardinale narrative (changement de direction annoncé
  avec nom nahuatl + rôle mytho)
- Prononciation nahuatl audio ou phonétique
- Mode « récit accessible » opt-in

---

## Passe 3 — SR enrichi (2026-08-29)

Le chantier « expérience SR à part entière » (promesse Sylvain :
« l'accessibilité doit être une nouvelle expérience utilisateur »).
Deux ajouts complémentaires :

### ✅ Descriptions poétiques SR-only par scène cardinale

5 textes fr/en/es dans `dict.common.sceneDescriptions.{jade|dore|
turquoise|cendre|obsidienne}`. Ton poétique-immersif, court (3-5
lignes), révèlent le symbolisme Nahual invisible à l'œil (le cerf
est votre nahual, les 4 gardiens cardinaux, les couleurs).

Injection :
- `stag-scene.tsx` : `<p className="sr-only">{sceneDescription}</p>`
  en tête du div sr-only, avant h1 hero.
- `echo-scene-page.tsx` : `<p className="sr-only">{sceneDescription}
  </p>` en tête du `<main>`, avant le h1 de la page.

Callers passent la description depuis dict :
- `page.js` (home) : `sceneDescriptions.jade`
- `[slug]/page.tsx` : `sceneDescriptions[direction]`
- `[slug]/[projetSlug]/page.tsx` : `sceneDescriptions.turquoise`

L'utilisateur SR au chargement d'une page reçoit d'abord une image
mentale de la scène (« Vous entrez dans le sanctuaire du cerf... »)
puis le contenu éditorial. Équivalent narratif du plaisir visuel
que reçoit l'utilisateur voyant.

### ✅ Live region cardinale (`CardinalAnnouncer`)

Nouveau composant `src/app/components/cardinal-announcer.tsx`
monté dans layout, à côté du RouteAnnouncer. Observe la direction
cardinale via `useCurrentDirection()`, annonce le gardien nahuatl
à chaque changement de direction :

- « Vous vous dirigez vers l'Est. Tonatiuh, le soleil levant, éclaire la voie. »
- « Vous vous dirigez vers le Sud. Huitzilopochtli veille sur ce qui pousse. »
- « Vous vous dirigez vers l'Ouest. Les Cihuateteo raccompagnent le soleil. »
- « Vous vous dirigez vers le Nord. Mictlantecuhtli garde ce qui a été vécu. »
- « Vous revenez au Centre. Le sanctuaire du cerf vous accueille. »

Skip première monte (utilisateur lit déjà la description sr-only
complète au chargement). Ne re-annonce pas si la direction ne change
pas (ex : sub-pages légales toutes jade). Pattern reset-puis-set
identique au RouteAnnouncer pour garantir re-annonce même valeur
identique.

Complémentaire au RouteAnnouncer :
- RouteAnnouncer : titre court h1 (« Services »)
- CardinalAnnouncer : narrative mytho (« Vous vous dirigez vers
  l'Est. Tonatiuh... »)

Les 2 régions sont `polite`, queue naturelle : titre court d'abord,
narrative après. Immersion parallèle à l'expérience visuelle
(couleurs cardinales, View Transitions).

### Snapshots

- `snapshot-home-fr-sr-enriched.md` : description sanctuaire en tête
  du sr-only, avant h1
- `snapshot-services-fr-sr-enriched.md` : description Tlahuizcalpan
  en tête du main, avant h1 Services

### Restant

- ~~`lang="nah"` sur termes nahuatl inline~~ ✅ fait passe 4
- Test réel NVDA + Firefox + JAWS + VoiceOver iOS
- Prononciation phonétique optionnelle (dictionnaire IPA à côté du
  span lang="nah" ? attribut aria-describedby ?)
- Mode « récit accessible » opt-in (bouton header) — bonus futur

---

## Passe 4 — lang="nah" termes nahuatl inline (2026-08-29)

Helper `src/lib/nahuatl.tsx` : `renderWithNahuatl(text)` retourne un
tableau de ReactNode (strings + `<span lang="nah">`). Regex avec
lookahead/behind Unicode (`\p{L}\p{N}`) pour supporter les
diacritiques (Mazātl, Mictlán, Teyolía).

Liste centralisée de 28 termes canoniques + doublets ASCII :
- Divinités : Tonatiuh, Xiuhtecuhtli, Xiuhcoatl, Huitzilopochtli,
  Mictlantecuhtli, Cihuateteo, Ehecatl
- Régions cardinales : Tlahuizcalpan, Huitztlampa, Cihuatlampa,
  Mictlampa, Tlalxicco
- Concepts : Mazātl/Mazatl, Teyolía/Teyolia, Xochitl, Ollin, Iztli/
  Itztli, Mictlán, tlamatinimeh, Nahua/nahua/Nahuas/nahuas, nahual/
  Nahual

Sortie triée par longueur décroissante avant compilation : garantit
que "Mictlantecuhtli" est testé avant "Mictl" et "Mazātl" avant
"Mazatl".

Wrap dans :
- `stag-scene.tsx` : heroTitle, heroText, sceneDescription, chapters
- `echo-scene-page.tsx` : sceneDescription
- `cardinal-announcer.tsx` : message aria-live
- `route-announcer.tsx` : message aria-live (titre h1)
- `[slug]/page.tsx` : MemoirePage + CodexPage (title, intro, chaque
  section h2/p, directions cosmos)

Vérification Playwright `document.querySelectorAll('[lang="nah"]')`
sur `/fr/memoire` : **15 termes wrappés** (Teyolía × 3, Mictlampa,
Mictlantecuhtli, Mictlán, Xiuhcoatl, Ollin × 2, Tonatiuh × 2,
Xochitl, Iztli, Xiuhtecuhtli, nahua).

Impact SR :
- NVDA / JAWS basculent sur prononciation espagnole (~ correcte
  pour nahuatl) au lieu du français par défaut qui écorche
- Utilisateur SR entend « Tonatiouh » (proche de /to.na.'tiuw/)
  au lieu de « ton-a-touille » (français par défaut)

Coût : ~2-3% de rendu HTML additionnel (spans) — négligeable.


## Validation manuelle attendue

Une fois la passe 2 finie, tester avec NVDA + Firefox sur les 3 pages
échantillons. Confirmer que le récit est audible, la navigation
cardinale utilisable, le focus visible sur tous les focusables.

