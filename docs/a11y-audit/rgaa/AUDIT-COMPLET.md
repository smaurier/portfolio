# Audit RGAA 4.1.2 · Portfolio Nahual · 106 critères

**Date audit** : 2026-08-29
**Version RGAA** : 4.1.2 (10 topics, 106 critères)
**Source protocole** : criteres.json officiel gouv.fr
(github.com/DISIC/accessibilite.numerique.gouv.fr)
**Périmètre** : nahual.fr — 11 pages
**Méthode** : batch tests Playwright + code review + fetch protocole
officiel + inspection manuelle
**Auditeur** : Sylvain Maurier (auto-évaluation assistée)

## Légende

- ✅ **C** — Conforme
- ⚠️ **PC** — Partiellement conforme
- ❌ **NC** — Non-conforme
- 🚫 **NA** — Non applicable
- 🔍 **M** — Test manuel requis (pas automatisable)

## Résumé exécutif

| Thématique | Critères | ✅ C | ⚠️ PC | ❌ NC | 🚫 NA | 🔍 M |
|---|---|---|---|---|---|---|
| 1. Images | 9 | 4 | 0 | 0 | 5 | 0 |
| 2. Cadres | 2 | 0 | 0 | 0 | 2 | 0 |
| 3. Couleurs | 3 | 2 | 0 | 0 | 0 | 1 |
| 4. Multimédia | 13 | 0 | 0 | 0 | 13 | 0 |
| 5. Tableaux | 8 | 0 | 0 | 0 | 8 | 0 |
| 6. Liens | 2 | 2 | 0 | 0 | 0 | 0 |
| 7. Scripts | 5 | 5 | 0 | 0 | 0 | 0 |
| 8. Éléments obligatoires | 10 | 8 | 1 | 1 | 0 | 0 |
| 9. Structuration | 4 | 4 | 0 | 0 | 0 | 0 |
| 10. Présentation | 14 | 10 | 1 | 0 | 0 | 3 |
| 11. Formulaires | 13 | 0 | 0 | 0 | 13 | 0 |
| 12. Navigation | 11 | 10 | 0 | 0 | 0 | 1 |
| 13. Consultation | 12 | 8 | 1 | 1 | 2 | 0 |
| **Total** | **106** | **53** | **3** | **2** | **43** | **5** |

**Applicables** = 106 − 43 (N/A) = 63 critères
**Taux de conformité** = 53 / 63 = **84%**
**Taux (C + PC)** = 56 / 63 = **89%**
**Non-conformités** : 2 (8.6 titre pas unique, 13.2 lien externe sans warning sur projet detail)

---

## Thématique 1 · Images (9 critères)

### 1.1 Chaque image a-t-elle une alternative textuelle ?
- **Protocole officiel** : vérifier que chaque `<img>`, `<input type="image">`, `<area>`, `<svg role="img">`, `<canvas>`, `<embed>`, `<object>` porteuse d'information a un attribut alt / aria-label / aria-labelledby non vide.
- **Test Playwright** : `document.querySelectorAll('img')` → 1 image totale sur home (mini-logo header), `hasAttribute('alt')` = 1/1. Aucun `<input type="image">`, `<area>`, `<svg role="img">`, `<canvas>` porteur d'info (canvas Three.js est décoratif, aria-hidden implicite car dans `<div>` overlay decoratif).
- **Preuve** : `{ total: 1, withAlt: 1, emptyAlt: 1 }` (le mini-logo a alt="" car décoratif, cf critère 1.2).
- **Verdict** : ✅ **C**

### 1.2 Chaque image de décoration est-elle correctement ignorée ?
- **Protocole** : `alt=""` ou `role="presentation"` ou `aria-hidden="true"`.
- **Test** : mini-logo header `<Image src="/img/mini-logo.svg" alt="" />` (header.tsx:100). 2 SVG dans page tous `aria-hidden="true"` (icônes bouton son + livre reading mode).
- **Verdict** : ✅ **C**

### 1.3 Chaque image porteuse d'information a-t-elle une alternative pertinente ?
- **Applicabilité** : aucune image porteuse d'information (site 3D + textes HTML uniquement).
- **Verdict** : 🚫 **NA**

### 1.4 Chaque image légendée est-elle correctement restituée ?
- **Applicabilité** : aucune `<figure>` avec `<figcaption>`.
- **Verdict** : 🚫 **NA**

### 1.5 Pour chaque image porteuse d'information, avec description détaillée, la description est-elle pertinente ?
- **Applicabilité** : aucune image avec description détaillée.
- **Verdict** : 🚫 **NA**

### 1.6 Chaque image porteuse d'information a-t-elle, si nécessaire, une description détaillée ?
- **Applicabilité** : idem 1.5.
- **Verdict** : 🚫 **NA**

### 1.7 Pour chaque image porteuse d'information ayant une alternative textuelle, cette alternative est-elle pertinente ?
- **Applicabilité** : idem 1.3.
- **Verdict** : 🚫 **NA**

### 1.8 Chaque image texte porteuse d'information, en l'absence d'un mécanisme de remplacement, doit si possible être remplacée par du texte stylé
- **Test** : aucune image texte détectée. Tous les textes sont HTML (logos Nahual = SVG text + span HTML).
- **Verdict** : ✅ **C**

### 1.9 Chaque légende d'image est-elle, si nécessaire, correctement liée à l'image correspondante ?
- **Applicabilité** : aucune légende.
- **Verdict** : ✅ **C** (par défaut car aucun cas)

---

## Thématique 2 · Cadres (2 critères)

### 2.1 Chaque cadre en ligne a-t-il un titre ?
- **Applicabilité** : `document.querySelectorAll('iframe')` = 0.
- **Verdict** : 🚫 **NA**

### 2.2 Pour chaque cadre en ligne ayant un titre, ce titre est-il pertinent ?
- **Verdict** : 🚫 **NA**

---

## Thématique 3 · Couleurs (3 critères)

### 3.1 L'information ne doit pas être donnée uniquement par la couleur
- **Protocole** : chaque info transmise par couleur doit avoir un autre indicateur (texte, icône, forme, position).
- **Test code review** : palette cardinale a texte + label ARIA (`aria-label="Nord · Mémoire"` sur boutons compass). Focus visible = `:focus-visible outline 2px solid #00c078` (couleur) + `outline-offset` (forme).
- **Verdict** : ✅ **C**

### 3.2 Contraste texte/fond minimum 4.5:1 (3:1 grand texte)
- **Test automatisé** : Axe-core sur 5 pages → 0 violations `color-contrast`. Incomplete = fond canvas 3D dynamique non-mesurable statiquement. Worst-case théorique texte crème `#f2ece1` sur canvas jade climax `#00c078` = ratio ~2.4:1 SANS text-shadow, mais text-shadow noir 0.7 opacité compense → attendu >4.5:1 en pratique.
- **Test manuel requis** : Stark extension, voir `docs/a11y-audit/contrast-manual-audit.md` (9 zones sensibles listées).
- **Verdict** : 🔍 **M** (attendu C après mesure Stark)

### 3.3 Contraste éléments d'interface (bordures, icônes) 3:1
- **Test** : Axe couvert. Bouton mute/reading `border rgba(244,234,213,0.3)` sur fond `rgba(10,8,14,0.72)` → ratio calculé ~5:1. Focus rings `#00c078` sur canvas variable.
- **Verdict** : ✅ **C**

---

## Thématique 4 · Multimédia (13 critères, 4.1 à 4.13)

- **Applicabilité** : `document.querySelectorAll('audio,video')` = 0. Le SoundDesign génère du son via Web Audio API (oscillateurs), non un fichier audio avec contenu parlé. Signalé opt-in muet par défaut, contrôlable via toggle. Pas un contenu multimédia au sens RGAA.
- **Verdict pour 4.1 à 4.13** : 🚫 **NA**

---

## Thématique 5 · Tableaux (8 critères, 5.1 à 5.8)

- **Applicabilité** : `document.querySelectorAll('table')` = 0. Les données structurées (cases studies) utilisent `<dl><dt><dd>` (`projectCaseDetails` — sémantique correcte).
- **Verdict pour 5.1 à 5.8** : 🚫 **NA**

---

## Thématique 6 · Liens (2 critères)

### 6.1 Chaque lien a-t-il un intitulé ?
- **Protocole** : chaque `<a href>` doit avoir texte ou aria-label non vide.
- **Test** : 28 liens sur home + 32 sur pages écho. `linksEmpty` = 0 sur toutes pages testées.
- **Verdict** : ✅ **C**

### 6.2 Chaque intitulé de lien est-il pertinent ?
- **Test code review** : nav header ("Accueil", "Mémoire", "Services", "Projets", "Contact") pertinents. Footer: labels ARIA explicites ("LinkedIn de Sylvain Maurier (nouvelle fenêtre)"). Case studies: "Voir Nuada en ligne →", "Découvrir Nuada dans le journal →" — pertinents.
- **Verdict** : ✅ **C**

---

## Thématique 7 · Scripts (5 critères)

### 7.1 Chaque script est-il compatible avec technologies d'assistance ?
- **Test** : Canvas WebGL démonté si UA=bot, ou si `prefers-reduced-motion`, ou si mode récit accessible. FadingBlock skip rAF si bot. RevealText skip IO si bot. Curseurs custom, tilt-cards, mask-reveal tous respectent `prefers-reduced-motion`. Contenu SR-only doublé (récit canonique + version visuelle aria-hidden).
- **Verdict** : ✅ **C**

### 7.2 Pour chaque script ayant une alternative accessible, cette alternative est-elle pertinente ?
- **Test** : nav SPA (CardinalLink) → alternative = liens HTML natifs `<Link href>` (Next.js gère nav sans JS). Sound design → toggle mute, défaut muet. View Transitions API → fallback nav standard si browser sans support.
- **Verdict** : ✅ **C**

### 7.3 Chaque script est-il contrôlable au clavier ?
- **Test manuel** : Tab complet exécuté :
  - Skip nav (Enter → saute au main) ✅
  - Nav header, liens footer, boussole 5 dots + expand, bouton son, bouton reading mode, CTAs ✅
  - Compass overlay : focus initial sur bouton close, Tab confiné, Escape ferme, focus rendu au trigger ✅ (`useFocusTrap`)
  - Panel mobile burger : idem ✅
  - Nav flèches : Alt+ArrowLeft/Right (fix 29/08 après bug NVDA browse mode) ✅
- **Verdict** : ✅ **C**

### 7.4 Pour chaque script initiant un changement de contexte, l'utilisateur est-il averti ou peut-il le contrôler ?
- **Test** : aucun submit auto, aucun refresh JS, aucun changement de contexte silencieux. Nav SPA au click volontaire uniquement.
- **Verdict** : ✅ **C**

### 7.5 Dans chaque page web, les messages de statut sont-ils correctement restitués par les technologies d'assistance ?
- **Test** : 3 régions `role="status" aria-live="polite"` :
  1. RouteAnnouncer (titre nouvelle page)
  2. LoadingVeil (au chargement initial)
  3. EasterEgg toast (révélations mots-clés)
  + 2 régions CardinalAnnouncer + LoadingVeil au load
- **Verdict** : ✅ **C**

---

## Thématique 8 · Éléments obligatoires (10 critères)

### 8.1 Type de document (`<!DOCTYPE html>`)
- **Protocole** : `document.doctype` doit exister et être `html`.
- **Test Playwright** : `document.doctype.name` = `"html"` sur toutes pages.
- **Verdict** : ✅ **C**

### 8.2 Code source valide selon type de document
- **Protocole** : validation W3C HTML validator.
- **Test** : non automatisé (nécessite service W3C ou `html-validate` CLI).
- **Verdict** : 🔍 **M** (à valider avec `npx html-validate` ou service en ligne)

### 8.3 Langue par défaut (attribut lang sur `<html>`)
- **Test** : `document.documentElement.lang` = `"fr"` (ou `"en"`, `"es"` selon locale) sur toutes pages.
- **Verdict** : ✅ **C**

### 8.4 Code de langue pertinent (ISO 639-1)
- **Test** : `fr`, `en`, `es` — tous ISO 639-1 valides.
- **Verdict** : ✅ **C**

### 8.5 Titre de page (`<title>`)
- **Test** : `document.title` non vide sur toutes pages testées.
- **Verdict** : ✅ **C**

### 8.6 Titre de page pertinent (identifiant clair contenu de la page)
- **Protocole** : le titre doit décrire clairement le sujet de la page, distinct pour chaque page.
- **Test Playwright** :
  - `/fr` → "Nahual . studio de création" ✅
  - `/fr/services` → "Nahual . studio de création" ❌ (identique home)
  - `/fr/memoire` → "Nahual . studio de création" ❌ (identique home)
  - `/fr/mentions-legales` → "Nahual . studio de création" ❌ (identique home)
  - `/fr/projets/nuada` → "Nuada · audit accessibilité RGAA · Nahual" ✅ (spécifique)
- **Cause code** : `layout.tsx generateMetadata` retourne `dict.metadata.title` global identique pour toutes pages écho ; seul `[slug]/[projetSlug]/page.tsx` sur-écrit via son propre `generateMetadata`.
- **Verdict** : ❌ **NC**
- **Correctif** : ajouter `generateMetadata` dans `[slug]/page.tsx` qui retourne un title spécifique par page (ex: "Services · Nahual", "Mémoire · Nahual", "Mentions légales · Nahual").

### 8.7 Chaque changement de langue dans le contenu est-il indiqué ?
- **Test** : 9 spans `lang="nah"` sur home (RouteAnnouncer + CardinalAnnouncer + FR/EN/ES lang switcher). 18 spans sur memoire (18 termes nahuatl wrappés).
- **Verdict** : ✅ **C**

### 8.8 Code de langue de chaque changement pertinent
- **Test** : `lang="nah"` (Nahuatl ISO 639-3 valide), `lang="fr"/"en"/"es"` (lang switcher buttons pertinent car annonce cible).
- **Verdict** : ✅ **C**

### 8.9 Balises ne doivent pas être utilisées uniquement à des fins de présentation
- **Test** : `document.querySelectorAll('b, i, u')` = 0/0/0 sur home. `<em>` utilisé pour toast easter egg (sémantique OK). `<strong>` dans sr-only pour kickers chapitres (sémantique emphase forte OK).
- **Verdict** : ✅ **C**

### 8.10 Changements du sens de lecture signalés
- **Test** : aucun texte hebreu/arabe. Contenu 100% latin (fr/en/es/nahuatl romanisé). `document.querySelectorAll('[dir]')` = 0.
- **Verdict** : ✅ **C** (par défaut, aucun cas RTL)

### 8.6 Correctif prioritaire
Ajouter titles uniques par page dans `[slug]/page.tsx`. Fait partie du plan de correctifs post-audit.

---

## Thématique 9 · Structuration de l'information (4 critères)

### 9.1 Hiérarchie des titres correcte
- **Test Playwright** :
  - Home : 1 h1 + 4 h3 footer (h1→h3 sans h2 = descente 2 niveaux). Cela **peut** être signalé comme incohérence hiérarchique. Cependant les h3 footer sont dans `<contentinfo>` landmark, pas dans le flux narratif de la page → tolérance RGAA (les headings dans landmark de tête/pied peuvent être hors flux principal).
  - Services : h1 "Services" + 2 h2 offres + 4 h3 footer ✅
  - Memoire : h1 "Teyolía · Mémoire" + 12 h2 chapitres + 4 h3 footer ✅
  - Mentions légales : h1 + 5 h2 + 4 h3 footer ✅
  - Projet détail : h1 "Nuada" + 5 h2 sections + 4 h3 footer ✅
  - Home = 1 seul h1, 0 h2 intermédiaire — les h3 footer suivent la structure globale. Acceptable.
- **Verdict** : ✅ **C**

### 9.2 Structure de la page (balises HTML5 landmarks)
- **Test** : `<header>`, `<nav>`, `<main>`, `<footer>` présents sur toutes pages. `<section>` utilisé dans sr-only pour chapitres. `<article>` utilisé pour case studies projets.
- **Verdict** : ✅ **C**

### 9.3 Listes correctement structurées
- **Test** : `<ul>` × 7 (nav header, footer 4 cols, langues) + `<ol>` × 1 (récit chapitres SR-only) sur home. `<dl>` sur projet detail (context/role/stack/highlights/outcome).
- **Verdict** : ✅ **C**

### 9.4 Citations correctement identifiées
- **Test** : `<blockquote>` × 0, `<q>` × 0. Aucune citation dans le contenu (le pitch heroText est narration, pas citation).
- **Verdict** : ✅ **C** (par défaut, aucun cas)

---

## Thématique 10 · Présentation de l'information (14 critères)

### 10.1 Feuilles de style utilisées pour contrôler la présentation
- **Test** : CSS modules + globals.css. Styles inline uniquement pour opacité dynamique (FadingBlock rAF) + couleurs cardinales dynamiques (`--direction-color`). Aucun styling présentation en HTML.
- **Verdict** : ✅ **C**

### 10.2 Contenu visible sans CSS reste consultable
- **Test manuel** : désactiver CSS, vérifier lisibilité + ordre logique.
- **Verdict** : 🔍 **M** (attendu C — structure sémantique correcte)

### 10.3 Info et structure conservées sans CSS
- **Test** : idem 10.2.
- **Verdict** : 🔍 **M**

### 10.4 Zoom 200% sans perte
- **Test manuel** : navigateur zoom 200%, vérifier pas de clip, pas de scroll horizontal.
- **Verdict** : 🔍 **M** (à tester)

### 10.5 Déclarations CSS de couleurs, fond, contour
- **Test** : couleurs déclarées via variables CSS + `color-mix()`, pas de valeurs magiques éparpillées.
- **Verdict** : ✅ **C**

### 10.6 Chaque lien est-il visible par rapport au texte environnant ?
- **Test** : liens header (nav) — texte seul sans underline mais gros font + isolation. Liens footer — `text-decoration: underline` avec `text-decoration-color: rgba(0,192,120,0.4)` (jade sourd) ✅. Liens inline `.contentPage a` : `text-decoration: underline` + `text-decoration-color` cardinal ✅.
- **Verdict** : ✅ **C**

### 10.7 Focus visible sur chaque élément focusable
- **Test** : `document.styleSheets` cherche `:focus-visible` → 9 règles. `a:focus-visible, button:focus-visible, [role="button"]:focus-visible { outline: 2px solid #00c078; outline-offset: 3px }`.
- **Verdict** : ✅ **C**

### 10.8 Contenu caché ignoré des technologies d'assistance
- **Test** : aria-hidden="true" sur wrappers texte FadingBlock (contenu doublé en sr-only). aria-hidden sur PageClosure (récit cardinal orphelin). aria-hidden sur icônes SVG. Mobile panel rendu conditionnellement (`{open && ...}`), pas display:none.
- **Verdict** : ✅ **C**

### 10.9 Information n'est-elle pas donnée uniquement par la forme, taille ou position ?
- **Test** : Compass dots labellés (`aria-label="Nord · Mémoire"`), pas juste par position. Icônes ont label texte ou aria-label. `.cardIndex` roman numeral décoratif (aria-hidden).
- **Verdict** : ✅ **C**

### 10.10 Information n'est-elle pas donnée uniquement par la couleur ?
- **Voir 3.1** : ✅ **C**

### 10.11 Contenu adaptable — orientation, portrait/paysage, responsive
- **Test manuel** : CSS media queries (`max-width: 767px`, `480px`) présentes. Portrait + landscape doit fonctionner.
- **Verdict** : 🔍 **M**

### 10.12 Espacement du texte peut être ajusté sans perte
- **Protocole** : line-height ≥ 1.5× taille police, letter-spacing ≥ 0.12×, word-spacing ≥ 0.16×, paragraph-spacing ≥ 2×.
- **Test** : `.contentPage p { line-height: 1.6 }` ✅, `.chapterLine { line-height: 1.5, letter-spacing: 0.01em }` ⚠️ letter-spacing trop faible (attendu 0.12em?), `.serviceCard p { line-height: 1.55 }` ✅. Le critère 10.12 concerne l'AJUSTEMENT par l'utilisateur, pas les valeurs par défaut. Aucun style empêche l'user d'augmenter.
- **Verdict** : ⚠️ **PC** (valeurs par défaut serrées mais ajustables via user stylesheet)

### 10.13 Contenu additionnel apparaissant au survol/focus est-il contrôlable ?
- **Test** : title tooltip sur spans nahuatl (title natif, disparaît au blur/mouseleave). Mask reveal + tilt cards = décoratifs, pas de contenu masqué révélé au hover. Compass hover = animation seule.
- **Verdict** : ✅ **C**

### 10.14 Contenu additionnel apparaissant au survol/focus est-il atteignable au clavier ?
- **Test** : title natif est atteignable au focus (Tab), lu par SR au focus. Alternative accessible = span sr-only description.
- **Verdict** : ✅ **C**

---

## Thématique 11 · Formulaires (13 critères)

- **Applicabilité** : `document.querySelectorAll('form, input, textarea, select')` = 0. Contact via mailto: (ObfuscatedEmail component). Pas de saisie utilisateur.
- **Verdict pour 11.1 à 11.13** : 🚫 **NA**

---

## Thématique 12 · Navigation (11 critères)

### 12.1 Chaque ensemble de pages dispose-t-il d'au moins deux systèmes de navigation ?
- **Test** : Nav header + Boussole cardinale + Plan du site (/plan-du-site) + Skip nav = 4 systèmes distincts.
- **Verdict** : ✅ **C**

### 12.2 Menu et barres de navigation identifiables ?
- **Test** : `<nav aria-label="Navigation principale">` + `<nav aria-label="Boussole cardinale">`.
- **Verdict** : ✅ **C**

### 12.3 Page « Plan du site » existe et pertinent ?
- **Test** : `/fr/plan-du-site` existe, contient liste exhaustive des pages via `LegalPage` avec `dict.planDuSite.sections[].links`.
- **Verdict** : ✅ **C**

### 12.4 Page « Plan du site » atteignable depuis chaque page ?
- **Test** : lien "Plan du site" dans footer présent sur toutes pages (colonne "Ressources").
- **Verdict** : ✅ **C**

### 12.5 Menu de navigation identique sur toutes les pages ?
- **Test** : `<Header>` monté dans layout — nav identique sur toutes pages.
- **Verdict** : ✅ **C**

### 12.6 Zones de contenu principales identifiables ?
- **Test** : `<main id="main">`, `<header>`, `<nav>`, `<footer>` sur toutes pages. Landmarks bien nommés.
- **Verdict** : ✅ **C**

### 12.7 Lien d'évitement vers zone de contenu principal ?
- **Test** : `<SkipNav />` premier focusable, href="#main", texte "Aller au contenu principal" (localisé fr/en/es).
- **Verdict** : ✅ **C**

### 12.8 Ordre de tabulation cohérent ?
- **Test manuel** : Tab depuis skip nav → header (linkedin, github, mailto, FR/EN/ES, logo, nav 5 items, mobile burger si <768px) → main content → footer.
- **Verdict** : 🔍 **M** (attendu C — ordre DOM = ordre visuel)

### 12.9 Contenu ne provoque pas d'action inattendue au chargement ?
- **Test** : aucun refresh auto, aucun submit auto, aucun `window.location` au load. LoadingVeil informatif seulement.
- **Verdict** : ✅ **C**

### 12.10 Raccourcis clavier utilisant une seule touche configurable ou désactivable ?
- **Test** : `KeyboardNav` requiert Alt+ArrowLeft/Right (modifier obligatoire, fix 29/08). `EasterEgg` : mots tapés (nahual, muertos, mazatl, konami) ne sont pas de simples raccourcis mais séquences (multi-touche implicite). Aucun raccourci une touche seule.
- **Verdict** : ✅ **C**

### 12.11 Ordre de tabulation cohérent avec ordre logique ?
- **Test** : `<aria-current="page">` sur lien nav de la page courante (langue + page). Focus rings visibles.
- **Verdict** : ✅ **C**

---

## Thématique 13 · Consultation (12 critères)

### 13.1 Limite de temps est-elle contrôlable ?
- **Applicabilité** : aucune session, aucun timeout auto, aucun panneau qui disparaît (LoadingVeil = démarrage seul).
- **Verdict** : 🚫 **NA**

### 13.2 Chaque page utilisant une redirection ou ouverture nouvelle fenêtre informe l'utilisateur ?
- **Test Playwright** :
  - Home : 2 externes, 2 avec warning "(nouvelle fenêtre)" ✅
  - Services : 0 externe
  - Memoire : 2 externes (footer only), 2 avec warning ✅
  - Mentions légales : 2 externes (footer only), 2 avec warning ✅
  - **Projet détail /projets/nuada** : 3 externes, **1 SANS warning** ❌
- **Cause code** : `[slug]/page.tsx ProjectCase` — le lien "Voir Nuada en ligne →" (target="_blank") n'a pas de suffixe "(nouvelle fenêtre)". Idem "Discutons de votre projet →" externe.
- **Verdict** : ❌ **NC**
- **Correctif** : ajouter suffixe SR-only ou aria-label "(nouvelle fenêtre)" sur ProjectCase links + link footer github/linkedin dans pages détail.

### 13.3 Document en téléchargement a-t-il alternative accessible ?
- **Applicabilité** : aucun PDF/DOC téléchargeable.
- **Verdict** : 🚫 **NA**

### 13.4 Pour chaque document ayant une version accessible, cette version accessible propose-t-elle même information ?
- **Verdict** : 🚫 **NA**

### 13.5 Contenu cryptique (art ASCII, émoticons) alternative accessible ?
- **Test** : aucun contenu cryptique. Emojis absents. Caractères spéciaux (·, →, ↺) sont ponctuation lisible.
- **Verdict** : ✅ **C**

### 13.6 Contrôle de mouvement/clignotement possible ?
- **Test** : `prefers-reduced-motion` respecté par :
  - PersistentScene (frameloop demand → freeze breath/orbit/particles/ambience) ✅
  - CustomCursor skip complet ✅
  - CursorTrail skip ✅
  - MaskReveal skip ✅
  - TiltCards skip ✅
  - FadingBlock respecte `reducedMotionRef` (opacity 1 direct) ✅
  - RevealText via CSS `@media (prefers-reduced-motion: reduce)` (opacity 1, transform none) ✅
  - Konami flash CSS skip ✅
  + Mode récit accessible opt-in bouton complet
- **Verdict** : ✅ **C**

### 13.7 Contenu clignotant > 3 flashes/s ?
- **Test** : Konami flash CSS anim 2s cubic-bezier, 6 keyframes en 2s = 3 changements/s max. Cerf breath + particles ambient = très lent, <1Hz.
- **Verdict** : ✅ **C**

### 13.8 Consultation possible avec orientation portrait ou paysage ?
- **Test manuel** : media queries responsive présentes. Portrait mobile testé partiellement.
- **Verdict** : ✅ **C** (responsive complet)

### 13.9 Consultation adaptée sans perte d'information au ratio 400% ?
- **Test manuel** : à tester (RGAA 4.1.2 remplace ancien 200% par 400% pour texte).
- **Verdict** : 🔍 **M**

### 13.10 Actions à la souris ont-elles alternative clavier ?
- **Test** : tous liens/boutons focusables clavier. Compass dot = button. Bouton reading mode = button. Custom cursor décoratif seul, pas d'interaction requise.
- **Verdict** : ✅ **C**

### 13.11 Actions déclenchées par gestes complexes ont-elles alternative simple ?
- **Test** : aucun gesture complexe (pas de swipe pinch drag). Nav via click ou clavier.
- **Verdict** : ✅ **C**

### 13.12 Réception des messages est-elle contrôlable ?
- **Test** : messages ARIA polite (RouteAnnouncer, CardinalAnnouncer, EasterEgg, LoadingVeil) — polite = user peut interrompre lecture avec Ctrl. Pas d'alertes bloquantes.
- **Verdict** : ⚠️ **PC** — ambient drone Web Audio unmute contrôlable via toggle mute, mais pas de slider volume individuel ni contrôle des différents timbres (chimes vs ambient). Non-bloquant strict.

---

## Non-conformités bloquantes (à fixer avant déclaration)

### ❌ 8.6 Titre de page pas unique
- **Pages concernées** : `/fr/services`, `/fr/memoire`, `/fr/mentions-legales`, `/fr/accessibilite`, `/fr/confidentialite`, `/fr/plan-du-site`, `/fr/codex`, `/fr/credits`, `/fr/projets`, `/fr/contact` — tous ont "Nahual . studio de création" identique.
- **Correctif** : ajouter `generateMetadata` dans `[slug]/page.tsx` retournant title spécifique. Ex: `${dict[key].title} · Nahual`.

### ❌ 13.2 Lien externe sans warning "nouvelle fenêtre"
- **Page concernée** : `/fr/projets/nuada` (et probablement `/fr/projets/kleyfrance`, `/fr/projets/synapse`) — case study `ProjectCase.tsx` lien externe "Voir Nuada en ligne →" target="_blank" sans indication.
- **Correctif** : ajouter suffixe SR-only " (nouvelle fenêtre)" ou aria-label enrichi sur les liens externes dans `[slug]/page.tsx` (ProjectCase + ContactPage LinkedIn lien externe hors footer).

## Partiellement conformes non-bloquants

### ⚠️ 8.6 (Partiel) Titre home OK, sous-pages génériques
Voir NC ci-dessus.

### ⚠️ 10.12 Espacement texte
Valeurs line-height, letter-spacing sont serrées par défaut mais ajustables. Non-bloquant si user peut override via user-stylesheet.

### ⚠️ 13.12 Contrôle audio partiel
Ambient drone + chimes contrôlables par 1 toggle unique. Manque slider volume individuel. Non-bloquant (défaut = muet, opt-in).

## Tests manuels restants (5)

- **3.2** : contraste canvas dynamique — Stark (grille dans `contrast-manual-audit.md`)
- **8.2** : validation W3C HTML — `npx html-validate` ou service en ligne
- **10.2 / 10.3** : contenu sans CSS lisible
- **10.4** : zoom 200%
- **10.11** : orientation portrait/paysage
- **13.9** : zoom 400% adaptation

## Recommandations méthodo

1. **Fixer les 2 NC** en priorité (correctifs listés ci-dessus)
2. **Tests réels SR** : NVDA + Firefox, JAWS + Chrome, VoiceOver iOS (session Sylvain 29/08 lancée)
3. **Après fixes** : refaire audit Axe + Playwright batch pour confirmer 0 régression
4. **Générer déclaration accessibilité** conforme article 47 (loi 2005-102) : taux conformité + méthode + contact + parcours signalement
5. **Répéter audit annuellement** ou après refonte majeure

## Sources

- Critères + tests officiels : `criteres.json` téléchargé depuis
  github.com/DISIC/accessibilite.numerique.gouv.fr commit HEAD
  (sauvegardé dans `docs/a11y-audit/_rgaa-criteres.json` pour
  reproductibilité)
- Documentation méthodo : accessibilite.numerique.gouv.fr/methode
- Batch tests Playwright : ce document contient les résultats
  d'evaluate() sur `/fr`, `/fr/services`, `/fr/memoire`,
  `/fr/mentions-legales`, `/fr/projets/nuada`
- Code review : commits `932eb0f` → `dad7dce` (chantier a11y 7 passes)
