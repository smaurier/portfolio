# Audit contraste manuel : canvas dynamique

## Contexte

Axe-core automated retourne 21-72 "incomplete" `color-contrast` par
page sur nahual.fr. Cause : le background des textes est un canvas
WebGL 3D dont les couleurs varient avec la scène (fog cardinal,
climax rim, ambiances Est/Ouest/Sud/Nord). Aucun outil automatique
ne peut mesurer le ratio réel sans échantillonner le canvas frame
par frame : d'où "incomplete", pas "fail".

Ce document liste les zones à mesurer manuellement avec l'extension
Stark (Chrome/Firefox), fournit le worst-case théorique et une
grille de résultats à remplir.

## Zones sensibles à mesurer

### 1. Overlay hero home (`/fr`)

- **Sélecteur** : `.scene-text-overlay-module__* .block`
- **Texte** : « Nahual · studio de création » (h1) + heroText
  Mazātl (p)
- **Couleur texte** : `#f2ece1` (crème clair) + text-shadow
  `0 0 6px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.7)`
- **Background** : canvas WebGL : variations selon phase reveal-arc
  (noir profond au load → tinte cardinale jade au climax)
- **Worst-case théorique** : `#f2ece1` sur `#00c078` (jade climax
  pur, non atteint mais borne max) = ratio ~2.4:1 ❌ échec AA
  seul. Avec text-shadow noir ~0.7 opacité, halo compense → ratio
  perçu >4.5:1 attendu
- **À vérifier** : phase climax jade, mesurer au moins 3 points de
  contact du texte avec le fond

### 2. Overlay chapitres narratifs (`/fr`, scroll ~25%-75%)

- **Sélecteur** : `.scene-text-overlay-module__* .chapterKicker` +
  `.chapterLine`
- **Texte** : « I · L'approche », « II · Le regard », etc.
- **Couleur texte kicker** : `#00c078` (jade opacity 0.8)
- **Couleur texte line** : `#f4ead5` (crème pur)
- **Background** : canvas variant selon scroll
- **Worst-case théorique** : jade `#00c078 * 0.8` sur jade climax
  `#00c078` = quasi invisible ❌ risque contraste
- **À vérifier** : chaque phase de scroll (25%, 50%, 75%, 100%)

### 3. Description scène SR-only injectée en `<main>` (pages écho)

- **Sélecteur** : `main > p.sr-only`
- **Impact** : aucun, sr-only n'est jamais visible → ratio N/A
- **Statut** : ✅ skip

### 4. Pages écho `.contentPage` (Services / Projets / Contact / Mémoire)

- **Sélecteur** : `body.nahual-lab-reveal .contentPage p`
- **Texte** : intro + descriptions cards
- **Couleur texte** : `rgba(242, 236, 225, 0.86)` avec text-shadow
  `0 1px 3px rgba(0, 0, 0, 0.7)`
- **Background** : `.serviceCard` posé sur canvas : cards ont
  fond `linear-gradient(135deg, color-mix(direction * 4%, rgba(13,12,17,0.32)),
  color-mix(direction * 1.5%, rgba(13,12,17,0.38)))` + blur 8px
- **Worst-case théorique** : sur canvas Est/dore climax pur
  `#ffb400`, texte crème 0.86 → semi-transparence card domine,
  ratio attendu ~9-12:1 ✅
- **À vérifier** : chaque direction climax (dore, turquoise,
  cendre, obsidienne, jade)

### 5. Note italique `.serviceCard .note`

- **Sélecteur** : `.serviceCard p.note`
- **Texte** : « Spécialisation en cours de certification... »
- **Couleur texte** : `rgba(242, 236, 225, 0.55)` (opacité forte)
- **Taille** : 0.85rem (petit)
- **Worst-case** : opacity 0.55 = texte peu contrasté sur fond
  gradient direction. Sur jade climax attendu ~5-7:1 (AA seuil
  4.5:1 texte normal, 3:1 texte grand)
- **À vérifier** : marge fine, mesure précise attendue

### 6. Note crédit `.creditNote` (Mémoire)

- **Sélecteur** : `.creditNote`
- **Texte** : « Les motifs cardinaux du site... »
- **Couleur** : `rgba(242, 236, 225, 0.55)` italique 0.78rem
- **Impact** : petit texte, marge fine, mesure prioritaire

### 7. Card index romain `.cardIndex`

- **Sélecteur** : `.serviceCard .cardIndex`
- **Texte** : « I », « II », etc.
- **Couleur** : `color-mix(direction 65%, rgba(242,236,225,0.45))`
- **Impact** : décoratif (`aria-hidden` = déjà exclu SR), donc
  non-bloquant WCAG texte info. Vérifier quand même lisibilité.

### 8. Footer overlay `body.nahual-lab-reveal .siteFooter`

- **Sélecteur** : `.siteFooter *`
- **Texte** : liens + copyright
- **Couleur** : forcé `#fff` sur fond `rgba(8, 6, 12, 0.92)` +
  blur
- **Ratio théorique** : 20:1 sur fond quasi-opaque ✅

### 9. Header overlay `body.nahual-lab-reveal .header`

- **Sélecteur** : `.header *`
- **Couleur** : forcé `#fff` sur `rgba(10, 8, 14, 0.82)` + blur
- **Ratio théorique** : ~18:1 sur fond quasi-opaque ✅

## Méthode Stark

### Installation

1. Chrome Web Store : chercher "Stark - Contrast & Accessibility
   Checker"
2. Installer, épingler dans la toolbar

### Mesure

1. Ouvrir `http://localhost:3000/fr` (ou nahual.fr en prod)
2. Attendre que la scène 3D soit chargée (canvas visible)
3. Pour chaque zone du tableau ci-dessous :
   - Cliquer sur l'icône Stark → "Contrast Checker"
   - Cliquer sur le texte à mesurer
   - Cliquer sur le background (canvas ou card)
   - Noter ratio + verdict AA / AAA
4. Scroller pour capturer les phases climax + chapitres

### Grille de résultats à remplir

| # | Zone | Phase | Ratio mesuré | AA texte normal (4.5) | AA texte grand (3) | Notes |
|---|------|-------|-------------:|-----------------------|--------------------|-------|
| 1 | Hero h1 | Load | | | | |
| 1 | Hero h1 | Climax jade | | | | |
| 1 | Hero p | Load | | | | |
| 2 | Chapter kicker jade | scroll 25% | | | | |
| 2 | Chapter kicker jade | scroll 50% | | | | |
| 2 | Chapter kicker jade | scroll 75% | | | | |
| 2 | Chapter line | scroll 25% | | | | |
| 2 | Chapter line | scroll 50% | | | | |
| 4 | Services intro p | climax dore | | | | |
| 4 | Card p Services | climax dore | | | | |
| 4 | Card p Projets | climax turquoise | | | | |
| 4 | Card p Contact | climax cendre | | | | |
| 4 | Card p Mémoire | climax obsidienne | | | | |
| 5 | .note italique | climax dore | | | | |
| 6 | .creditNote Mémoire | climax obsidienne | | | | |
| 7 | .cardIndex Mémoire | climax obsidienne | | | | |
| 8 | Footer lien | any | | | | |
| 9 | Header lien | any | | | | |

## Correctifs à appliquer si échec

- **Ratio < 3:1 (échec AA + AAA sur tout texte)** : action bloquante.
  Options :
  - Assombrir le fond card via `color-mix(direction * 15%,
    rgba(13,12,17,0.55))` (au lieu de 32%)
  - Augmenter text-shadow noir à `rgba(0,0,0,0.85)`
  - Passer opacité texte à 1.0
- **Ratio 3:1 ≤ x < 4.5:1 (échec AA texte normal, OK grand)** :
  vérifier taille exacte. Si <18pt / <14pt bold → correctif.
- **Ratio ≥ 4.5:1** : conforme AA. Vérifier AAA (≥7:1) si audit
  cible RGAA AAA.

## Alternatives si Stark ne suffit pas

- **DevTools Chrome** : Inspect element → Styles → color swatch →
  "Contrast ratio" (mesure basique, pas de mesure sur canvas
  dynamique : mais utile pour cards fond gradient)
- **WebAIM Contrast Checker** : https://webaim.org/resources/contrastchecker/
  (saisir hex manuellement)
- **Screenshot + éditeur pipette** : GIMP/Photoshop pipette sur
  screenshot, converter hex, calculer ratio via WebAIM

## Statut

Audit à réaliser par Sylvain avant certification RGAA (23/10/2026).
Résultats à consigner dans ce doc + créer tickets pour chaque
échec identifié.
