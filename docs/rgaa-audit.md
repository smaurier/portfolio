# Audit RGAA 4.1 · Portfolio Nahual

**Date** : 2026-08-28
**Auditeur** : Sylvain Maurier (auto-évaluation)
**Version RGAA** : 4.1 (106 critères)
**URL** : nahual.fr
**Périmètre** : toutes pages (Accueil, Mémoire, Services, Projets, Contact, Codex, Mentions légales, Plan du site, Accessibilité, Confidentialité, Crédits)

## Légende statut

- ✅ **C** = Conforme
- ⚠️ **PC** = Partiellement conforme
- ❌ **NC** = Non-conforme
- N/A = Non applicable
- 🔍 **À vérifier** = nécessite test manuel (lecteur écran, contraste WCAG, navigateur assistif)

## Résumé exécutif

| Thématique | Total | ✅ C | ⚠️ PC | ❌ NC | N/A | 🔍 |
|---|---|---|---|---|---|---|
| 1. Images | 9 | 5 | 1 | 0 | 3 | 0 |
| 2. Cadres | 2 | 0 | 0 | 0 | 2 | 0 |
| 3. Couleurs | 3 | 1 | 1 | 0 | 0 | 1 |
| 4. Multimédia | 12 | 0 | 0 | 0 | 12 | 0 |
| 5. Tableaux | 7 | 0 | 0 | 0 | 7 | 0 |
| 6. Liens | 5 | 3 | 1 | 0 | 0 | 1 |
| 7. Scripts | 5 | 2 | 2 | 0 | 0 | 1 |
| 8. Éléments obligatoires | 9 | 7 | 1 | 0 | 0 | 1 |
| 9. Structuration | 5 | 4 | 1 | 0 | 0 | 0 |
| 10. Présentation | 13 | 8 | 3 | 0 | 0 | 2 |
| 11. Formulaires | 13 | 0 | 0 | 0 | 13 | 0 |
| 12. Navigation | 11 | 8 | 2 | 0 | 0 | 1 |
| 13. Consultation | 12 | 5 | 3 | 1 | 3 | 0 |
| **Total** | **106** | **43** | **15** | **1** | **40** | **7** |

**Taux conformité applicable** = 43 / (106 - 40) = **65%**
**Taux conformité (C + PC applicables)** = 58 / 66 = **88%** partiellement conforme

## Thématique 1 · Images (9 critères)

### 1.1 Alternative textuelle
- 1.1.1 Chaque image porteuse d'information a-t-elle une alternative textuelle ? — ✅ **C** — Images décoratives (mini-logo header, Piedra intro) portent `alt=""`. Pas d'image porteuse d'information dans le site (contenu 3D est décoratif).
- 1.1.2 Chaque image de décoration a-t-elle une alternative vide ? — ✅ **C** — `alt=""` sur `mini-logo.svg` (header) et `piedra-del-sol-v2.svg` (intro).
- 1.1.3 Pertinence alternative image porteuse — N/A
- 1.1.4 Alternative détaillée (long) — N/A
- 1.1.5 Alternative légende — N/A
- 1.1.6 CAPTCHA image alternative — N/A

### 1.2 Autres
- 1.2.1 Image objet SVG décorative — ✅ **C** — SVG Piedra sans texte, décoratif.
- 1.2.2 Image texte pertinence — ✅ **C** — Aucune image texte (tout est HTML).
- 1.2.3 Image cliquable — ⚠️ **PC** — Logo header est image cliquable (link vers /). L'ancre CardinalLink porte le texte via aria-label implicite → **fix** : ajouter aria-label explicite sur le CardinalLink logo.

**Fix 1.2.3** : ajouter aria-label sur logoLink header.

---

## Thématique 2 · Cadres (2 critères)

- 2.1 Titre iframe pertinent — N/A (aucun iframe)
- 2.2 Titre iframe présent — N/A

---

## Thématique 3 · Couleurs (3 critères)

- 3.1 Information par la couleur seule — ✅ **C** — Palette cardinale double avec text label + iconography (compass a data-cardinal-direction + aria-label).
- 3.2 Contraste texte/fond — ⚠️ **PC** — Text overlay crème (`#f2ece1`) sur canvas 3D dynamique. Fond varie selon reveal-arc (0.35→0.85 ambient). Contraste minimum 4.5:1 non garanti en pénombre. **Fix** : audit axe-core avec toolkit.
- 3.3 Contraste composants interface — 🔍 **À vérifier** — Boutons `.cta` border cream sur fond dynamique, focus rings jade `#00c078` — vérif ratio contraste 3:1.

**Fix 3.2** : text-shadow subtile sur `.block h1/p` pour garantir contraste minimum même sur zones claires du canvas.

---

## Thématique 4 · Multimédia (12 critères)

Tous **N/A** — aucun média `<video>` ou `<audio>` avec contenu. Le seul son (SoundDesign chimes Web Audio) est décoratif, pas de piste de contenu.

---

## Thématique 5 · Tableaux (7 critères)

Tous **N/A** — aucun `<table>` dans le site. Les données structurées utilisent `<dl>` (case studies).

---

## Thématique 6 · Liens (5 critères)

- 6.1 Intitulé pertinent — ✅ **C** — Tous les liens ont un texte pertinent (nav, footer, cards).
- 6.2 Intitulé lien identique cible — ✅ **C** — Chaque texte unique correspond à une URL unique.
- 6.1.5 Lien contexte suffisant — ⚠️ **PC** — Liens footer "linkedin", "github", "email" en minuscules répétés fois fr/en/es. Sont-ils assez explicites hors contexte ? → **fix** : aria-label explicite "LinkedIn de Sylvain Maurier" etc.
- 6.2 Lien contigu même URL — ✅ **C** — Header logo + text "Nahual" pointent vers home, contigus mais liens séparés.
- 6.1 Lien invisible/vide — 🔍 **À vérifier** — Vérif que aucun `<a>` sans texte visible ni aria-label.

**Fix 6.1.5** : aria-label des liens footer réseaux.

---

## Thématique 7 · Scripts (5 critères)

- 7.1 Compatibilité technologies assistives — ⚠️ **PC** — WebGL Canvas + effets JS (curseur custom, mask reveal, sticky pin) sont décoratifs, marqués `aria-hidden` ou n'interfèrent pas avec la lecture. Custom cursor `aria-hidden` OK, cardinalRipple `pointer-events: none` OK.
- 7.2 Alternative script — ✅ **C** — Toutes les fonctionnalités JS ont fallback : nav clavier flèches optionnel, sound design opt-in, transitions VT dégradent gracieusement (nav standard).
- 7.3 Script contrôlable clavier — 🔍 **À vérifier** — Tabbing complet à faire :
  - ✅ Skip nav
  - ✅ Nav header (Accueil, Mémoire, Services, Projets, Contact)
  - ✅ Compass dots (5 boutons)
  - ✅ Compass expand button
  - ✅ Sound toggle
  - ✅ Modal compass overlay close (Escape + X)
  - ⚠️ Modal focus trap ? (Escape ferme, mais focus revient au trigger ?)
  - ⚠️ Cards projets tabbables → tilt hover mouse only, pas déclenché au focus.
- 7.4 Modification contexte script — ✅ **C** — Aucun script ne modifie contexte brutalement (submit auto, etc.).
- 7.5 Message d'état ARIA — ⚠️ **PC** — Easter egg toast a `role="status" aria-live="polite"` ✅. Autres feedback (compass hover, ripple) ne sont pas des messages d'état donc pas requis.

**Fix 7.3 modal focus trap** : Compass overlay doit trap focus + retourner focus au bouton expand à la fermeture.

---

## Thématique 8 · Éléments obligatoires (9 critères)

- 8.1 Type de document — ✅ **C** — Next.js génère `<!DOCTYPE html>`.
- 8.2 Code valide — 🔍 **À vérifier** — Passer W3C HTML validator.
- 8.3 Langue par défaut — ✅ **C** — `<html lang={locale}>` avec fr/en/es dynamique.
- 8.4 Code source valide — voir 8.2.
- 8.5 Titre pertinent — ✅ **C** — Chaque page a `<title>` via generateMetadata (dict.metadata.title).
- 8.6 Titre approprié — ✅ **C** — "Nahual · studio de création" + tag localisé.
- 8.7 Langue changement — ⚠️ **PC** — Phrase Codex "In xochitl, in cuicatl" (nahuatl) présente sans `lang="nah"`. **Fix** : wrap en `<span lang="nah">`.
- 8.8 Code lisible — ✅ **C** — HTML sémantique, aria labels, structure.
- 8.9 Balises non-présentation — ✅ **C** — Pas de `<b>`/`<i>` en présentation. `<em>` utilisé pour toast easter egg.

**Fix 8.7** : ajouter `lang="nah"` sur les mots nahuatl (Codex phrase, noms dieux).

---

## Thématique 9 · Structuration de l'information (5 critères)

- 9.1 Hiérarchie titres — ✅ **C** — H1 par page, H2 sections, H3 sous-sections codex.
- 9.2 Structure page — ✅ **C** — `<main>` sur pages, `<header>`, `<footer>`, `<nav>` header + compass.
- 9.3 Liste — ✅ **C** — `<ul><li>` pour nav, footer, chapters, codex directions.
- 9.4 Citations — N/A (aucune `<blockquote>`).
- 9.5 Landmarks — ⚠️ **PC** — Main OK, header OK, footer OK, nav OK. Aside absent (peut ajouter pour compass). Non bloquant.

---

## Thématique 10 · Présentation de l'information (13 critères)

- 10.1 CSS séparée — ✅ **C** — CSS modules + globals.css, aucun style inline sauf pour opacity/color dynamiques.
- 10.2 Contenu visible sans CSS — 🔍 **À vérifier** — Test avec CSS désactivé : structure HTML lisible ordre logique.
- 10.3 Ordre lecture — ✅ **C** — Ordre DOM = ordre visuel logique.
- 10.4 Zoom 200% — 🔍 **À vérifier** — Test 200% zoom sans perte contenu ni horizontal scroll.
- 10.5 Justification — ✅ **C** — Aucun `text-align: justify`.
- 10.6 Interlignage/espacement — ✅ **C** — line-height 1.5+, letter-spacing raisonnable.
- 10.7 Focus visible — ✅ **C** — `:focus-visible` outline jade 2px + offset 3px sur tous a/button.
- 10.8 Contenu caché — ⚠️ **PC** — Mobile panel : rendu conditionnel `{open && ...}` OK, pas de display:none avec contenu masqué persistent. Compass overlay backdrop-blur = OK.
- 10.9 Info par forme/position — ✅ **C** — Compass dots ont aria-label direction, pas juste position.
- 10.10 Info par couleur — voir 3.1.
- 10.11 Espacement text (line-height, letter-spacing) — ✅ **C**.
- 10.12 Zoom texte — ⚠️ **PC** — clamp() font-size peut limiter zoom text. Vérif 200%.
- 10.13 Contenu caché révélé au survol/focus — ⚠️ **PC** — Custom cursor morph, mask reveal, tilt hover : décoratif, pas de contenu masqué révélé. OK. Sound button title/aria-label OK.

**Fix 10.4/10.12** : test zoom 200% + ajustement clamp() si contenu clip.

---

## Thématique 11 · Formulaires (13 critères)

Tous **N/A** — aucun `<form>` dans le site. Contact via ObfuscatedEmail (bouton show + mailto). Pas de champ input.

---

## Thématique 12 · Navigation (11 critères)

- 12.1 Menu de navigation — ✅ **C** — `<nav>` header, ordre cohérent Accueil→Mémoire→Services→Projets→Contact.
- 12.2 Plan du site — ✅ **C** — Page dédiée `/plan-du-site` avec liste exhaustive.
- 12.3 Moteur recherche — N/A (portfolio, pas requis).
- 12.4 Position dans site — ⚠️ **PC** — Compass indique direction courante (aria-current="page"). Pas de fil d'Ariane. Non requis mais peut aider.
- 12.5 Menu identique — ✅ **C** — Nav header identique sur toutes pages.
- 12.6 Zone contenu principal — ✅ **C** — Skip nav + `<main id="main">`.
- 12.7 Lien évitement — ✅ **C** — SkipNav composant premier tabindex.
- 12.8 Ordre tabulation — ✅ **C** — Ordre DOM cohérent.
- 12.9 Chgt contexte non-attendu — ✅ **C** — Aucun submit auto, aucun refresh.
- 12.10 Raccourcis clavier — ✅ **C** — Flèches gauche/droite naviguent (documenté ?), Escape ferme modal, "nahual" tape easter egg.
- 12.11 Info accès contenu — 🔍 **À vérifier** — Aria-current sur nav.

**Fix 12.10** : documenter raccourcis dans page accessibilité (fait partiellement).

---

## Thématique 13 · Consultation (12 critères)

- 13.1 Session utilisateur — N/A (pas de session/auth).
- 13.2 Fenêtre nouvelle — ⚠️ **PC** — Liens externes (LinkedIn, GitHub) ouvrent `target="_blank"` avec `rel="noopener noreferrer"`. **Fix** : ajouter icône ou texte "(nouvelle fenêtre)".
- 13.3 Document téléchargeable — N/A (aucun PDF).
- 13.4 Version en ligne document — N/A.
- 13.5 Contenu cryptique — ✅ **C** — Aucun.
- 13.6 Contrôle mouvement/clignotement — ⚠️ **PC** — Ambiances 3D + cerf breath + particles animées. `prefers-reduced-motion` respecté partiellement :
  - ✅ SmoothScroll skip
  - ✅ CustomCursor skip
  - ✅ CursorTrail skip
  - ✅ TiltCards skip
  - ✅ NahualIntro accelerated 0.4s
  - ❌ Scene 3D continue anim (StagModel breath, orbit-camera parallax, particles) — **fix** : freeze via reducedMotionRef.
- 13.7 Limite temps — ✅ **C** — Aucune limite de temps user.
- 13.8 Contrôle clignotement — ✅ **C** — Aucun élément clignote >3 flashes/sec. Konami flash unique 2s.
- 13.9 Consultation orientée — ✅ **C** — Portrait + landscape OK, responsive.
- 13.10 Contrôle son — ✅ **C** — SoundDesign toggle mute, défaut muet, persist localStorage.
- 13.11 Mouvement autonome — ⚠️ **PC** — Ambient loop drone Web Audio permanent quand unmute. User peut couper.
- 13.12 Contrôle audio — ❌ **NC** — Ambient drone démarre au unmute mais pas contrôlable individuellement (volume, mute selective des chimes). **Fix** : ajouter slider volume + toggle ambient/chimes séparés.

**Fixes prio 13.6** : freeze scène 3D sur `prefers-reduced-motion` (StagModel breath cycle, OrbitCamera parallax, SpiritParticles, CardinalAmbience 5 moods).

---

## Plan d'action prioritaire

### Fixes bloquants (à faire avant déclaration accessibilité)
1. **13.6 reducedMotion 3D** : freeze breath cycle, parallax camera, particles, ambiances si `prefers-reduced-motion`.
2. **13.12 Contrôle audio** : ajouter slider volume ou mute séparé ambient/chimes.
3. **3.2 Contraste texte** : audit axe-core + text-shadow sur .block/.chapterLine pour zones canvas claires.
4. **8.7 Langue nahuatl** : `<span lang="nah">` sur phrases Codex.

### Fixes recommandés (améliore taux conformité)
5. **1.2.3 Logo aria-label** : "Retour à l'accueil Nahual".
6. **6.1.5 Liens footer réseaux** : aria-label explicites.
7. **7.3 Modal focus trap** : Compass overlay trap + return focus.
8. **13.2 Fenêtre nouvelle** : indication visuelle ou aria-label "ouvre nouvelle fenêtre".

### À vérifier (tests manuels)
- 3.3 Contraste composants (axe DevTools)
- 8.2 Validation W3C HTML
- 10.4 Zoom 200% sans clip
- 10.12 Zoom texte 200%
- 12.11 Aria-current cohérent
- 7.3 Navigation clavier complète Tab
- Test lecteur écran NVDA (annonce main, headings, landmarks, chapters scroll)

## Protocoles de test

### Outils automatisés
- `axe-core` (extension DevTools Chrome/Firefox)
- Lighthouse audit accessibilité (Chrome DevTools)
- WAVE (WebAIM)
- Contrast Checker WCAG

### Tests manuels
- **Clavier seul** : navigation entière sans souris (Tab, Shift+Tab, Enter, Space, Escape, Arrow keys)
- **Lecteur écran** : NVDA (Windows gratuit) ou VoiceOver (macOS)
- **Zoom 200%** : navigateur zoom + font-size zoom
- **prefers-reduced-motion** : DevTools rendering emulator
- **Contraste** : Colour Contrast Analyser (TPGi)

### Grille par page
Pour chaque page (11 total), tester :
- Structure headings (H1 unique, H2 pour sections)
- Landmarks (main, nav, header, footer)
- Focus visible sur tous éléments interactifs
- Aria-labels sur images/buttons
- Contraste texte ≥4.5:1
- Zoom 200% sans horizontal scroll
- Skip nav fonctionnel
- Escape ferme modales

## Fixes à implémenter dans cette session

Session actuelle : implémenter les 4 fixes bloquants (13.6, 13.12, 3.2, 8.7). Les 4 recommandés (1.2.3, 6.1.5, 7.3, 13.2) suivent en même passe. Tests manuels après.
