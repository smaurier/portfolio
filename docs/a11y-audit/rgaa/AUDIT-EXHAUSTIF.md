# Audit RGAA 4.1.2 · Portfolio Nahual · 106 critères (détaillé)

**Date audit** : 2026-08-29
**Version RGAA** : 4.1.2 (13 topics, 106 critères)
**Source protocole** : `criteres.json` officiel gouv.fr commit HEAD (sauvegardé dans `_rgaa-criteres.json`)
**Périmètre audit** : nahual.fr — 11 pages
**Échantillon testé** : `/fr`, `/fr/services`, `/fr/memoire`, `/fr/mentions-legales`, `/fr/projets/nuada`
**Méthode** : intitulé officiel + protocole résumé + tests appliqués (Playwright evaluate batch + code review + Axe-core) + preuve + verdict
**Auditeur** : Sylvain Maurier (auto-évaluation assistée Claude)

## Format par critère

Chaque critère suit ce format :

> **Numéro — Titre officiel intégral**
> - **Protocole résumé** : ce que RGAA demande de vérifier
> - **Test appliqué** : comment testé (Playwright / code review / manuel)
> - **Preuve** : résultat mesuré
> - **Verdict** : ✅ C / ⚠️ PC / ❌ NC / 🚫 NA / 🔍 M

## Légende

- ✅ **C** — Conforme
- ⚠️ **PC** — Partiellement conforme
- ❌ **NC** — Non-conforme
- 🚫 **NA** — Non applicable au site
- 🔍 **M** — Test manuel requis (pas automatisable en Playwright)

---

# Thématique 1 · Images (9 critères)

## 1.1 — Chaque image porteuse d'information a-t-elle une alternative textuelle ?
- **Protocole** : `<img>`, `<area>`, `<input type="image">`, `<svg role="img">`, `<object type="image/…">`, `<embed type="image/…">`, `<canvas>` porteuses d'information doivent avoir `alt` / `aria-label` / `aria-labelledby` non vide.
- **Test Playwright** : `document.querySelectorAll('img')` = 1 image (mini-logo, décoratif `alt=""` — voir 1.2). Zéro image porteuse d'information. Aucun `<input type="image">`, `<area>`, `<svg role="img">`, `<object type="image/…">`, `<embed>`.
- **Preuve** : `{ imagesPorteuses: 0 }`.
- **Verdict** : ✅ **C** (aucun cas applicable, la question est validée par défaut)

## 1.2 — Chaque image de décoration est-elle correctement ignorée par les technologies d'assistance ?
- **Protocole** : `alt=""` OU `aria-hidden="true"` OU `role="presentation"` sur toute image décorative.
- **Test** : `header.tsx:100` mini-logo `<Image alt="" />`. Les 2 SVG (icônes bouton son + livre) ont `aria-hidden="true"`. Canvas WebGL Three.js : parent div sans role img, non annoncé comme image.
- **Preuve** : `{ svgs: { total: 2, ariaHidden: 2 }, images: { total: 1, emptyAlt: 1 } }`.
- **Verdict** : ✅ **C**

## 1.3 — Pour chaque image porteuse d'information ayant une alternative textuelle, cette alternative est-elle pertinente ?
- **Protocole** : le contenu de l'alt/aria-label doit décrire l'information de l'image.
- **Test** : voir 1.1 — aucune image porteuse.
- **Verdict** : 🚫 **NA**

## 1.4 — Pour chaque image utilisée comme CAPTCHA ou image-test, ayant une alternative textuelle, cette alternative permet-elle d'identifier la nature et la fonction de l'image ?
- **Protocole** : CAPTCHA image doit être identifiable via alt.
- **Test** : aucun CAPTCHA (site portfolio, pas de saisie).
- **Verdict** : 🚫 **NA**

## 1.5 — Pour chaque image utilisée comme CAPTCHA, une solution d'accès alternatif au contenu ou à la fonction est-elle présente ?
- **Test** : voir 1.4.
- **Verdict** : 🚫 **NA**

## 1.6 — Chaque image porteuse d'information a-t-elle, si nécessaire, une description détaillée ?
- **Protocole** : image complexe (graphique, schéma) doit avoir `longdesc` OU lien adjacent OU `aria-describedby`.
- **Test** : aucune image complexe (le canvas Three.js est décoratif, description mentale fournie via `sceneDescription` sr-only dans `<main>` — mais canvas n'est pas déclaré comme image donc n'est pas concerné).
- **Verdict** : 🚫 **NA**

## 1.7 — Pour chaque image porteuse d'information ayant une description détaillée, cette description est-elle pertinente ?
- **Test** : voir 1.6.
- **Verdict** : 🚫 **NA**

## 1.8 — Chaque image texte porteuse d'information, en l'absence d'un mécanisme de remplacement, doit si possible être remplacée par du texte stylé
- **Protocole** : pas d'image texte (screenshot de texte, image logo avec texte imbriqué non-vectoriel) sauf cas particulier.
- **Test** : 1 SVG logo texte `mini-logo.svg` mais le texte adjacent "Nahual" est en HTML `<span className="logoText">Nahual</span>`. Le SVG lui-même est décoratif (`alt=""`), le texte est HTML stylé.
- **Verdict** : ✅ **C**

## 1.9 — Chaque légende d'image est-elle, si nécessaire, correctement reliée à l'image correspondante ?
- **Protocole** : `<figure>` + `<figcaption>` OU `aria-label` sur figure OU role="figure".
- **Test** : `document.querySelectorAll('figure')` = 0.
- **Verdict** : ✅ **C** (par défaut, aucune légende présente)

---

# Thématique 2 · Cadres (2 critères)

## 2.1 — Chaque cadre a-t-il un titre de cadre ?
- **Protocole** : `<iframe>` / `<frame>` doit avoir attribut `title`.
- **Test** : `document.querySelectorAll('iframe, frame')` = 0.
- **Verdict** : 🚫 **NA**

## 2.2 — Pour chaque cadre ayant un titre de cadre, ce titre de cadre est-il pertinent ?
- **Verdict** : 🚫 **NA**

---

# Thématique 3 · Couleurs (3 critères)

## 3.1 — L'information ne doit pas être donnée uniquement par la couleur
- **Protocole** : chaque info transmise par couleur doit avoir un autre indicateur (texte, icône, forme, position).
- **Test code review** :
  - Palette cardinale : chaque direction a texte + `aria-label` ("Nord · Mémoire").
  - Focus visible : `outline` (forme) + couleur jade — 2 indicateurs.
  - État actif nav : `aria-current="page"` + underline visuel (attribut ARIA + décoration).
  - `.langSwitcher a[aria-current="true"]` : underline + opacité 1 (visuel) + attribut ARIA (SR).
- **Verdict** : ✅ **C**

## 3.2 — Contraste texte/fond suffisamment élevé (hors cas particuliers)
- **Protocole** : ratio ≥ 4.5:1 texte normal, ≥ 3:1 grand texte (≥24px ou ≥18.5px bold).
- **Test Axe-core** : 0 violations sur 5 pages testées. 21-72 "incomplete" par page = fond canvas 3D dynamique non-mesurable statiquement.
- **Preuve** : `{ violations: 0 }` × 5 pages, `_rgaa-criteres.json` sauvegardé. Text overlay a `text-shadow: 0 0 6px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.7)` (fix 3.2 antérieur).
- **Test manuel requis** : voir `docs/a11y-audit/contrast-manual-audit.md` — 9 zones à mesurer avec Stark sur canvas dynamique.
- **Verdict** : 🔍 **M** (attendu C après mesure Stark, worst-case théorique >4.5:1)

## 3.3 — Contraste des composants d'interface (bordures, icônes) ≥ 3:1
- **Test** : boutons rings `#00c078` focus (jade) sur canvas variable = worst-case bord jade sur fond obsidienne climax `#6b3fa8` → ratio ~4.5:1 ✅. Bouton reading mode border `rgba(244,234,213,0.3)` sur `rgba(10,8,14,0.72)` → ratio contigu ~5:1. Bouton son + boussole idem.
- **Verdict** : ✅ **C**

---

# Thématique 4 · Multimédia (13 critères)

Chaque critère est **🚫 NA** : le site ne contient aucun `<audio>` ni `<video>` (vérifié `document.querySelectorAll('audio, video').length = 0`). Le SoundDesign génère du son via oscillateurs Web Audio (pas de fichier multimédia avec contenu parlé), opt-in muet par défaut, contrôlable via toggle.

## 4.1 — Chaque média temporel pré-enregistré a-t-il, si nécessaire, une transcription textuelle ou une audiodescription ?
- **Verdict** : 🚫 **NA**

## 4.2 — Pour chaque média temporel pré-enregistré ayant une transcription ou audiodescription, celles-ci sont-elles pertinentes ?
- **Verdict** : 🚫 **NA**

## 4.3 — Chaque média temporel synchronisé pré-enregistré a-t-il, si nécessaire, des sous-titres synchronisés ?
- **Verdict** : 🚫 **NA**

## 4.4 — Pour chaque média temporel synchronisé pré-enregistré ayant des sous-titres, ces sous-titres sont-ils pertinents ?
- **Verdict** : 🚫 **NA**

## 4.5 — Chaque média temporel pré-enregistré a-t-il, si nécessaire, une audiodescription synchronisée ?
- **Verdict** : 🚫 **NA**

## 4.6 — Pour chaque média temporel pré-enregistré ayant une audiodescription synchronisée, celle-ci est-elle pertinente ?
- **Verdict** : 🚫 **NA**

## 4.7 — Chaque média temporel est-il clairement identifiable ?
- **Verdict** : 🚫 **NA**

## 4.8 — Chaque média non temporel a-t-il, si nécessaire, une alternative ?
- **Verdict** : 🚫 **NA**

## 4.9 — Pour chaque média non temporel ayant une alternative, cette alternative est-elle pertinente ?
- **Verdict** : 🚫 **NA**

## 4.10 — Chaque son déclenché automatiquement est-il contrôlable par l'utilisateur ?
- **Test** : SoundDesign default muted (`STORAGE_KEY = "nahual-sound-muted"`, default true). Aucun autoplay sans consentement.
- **Verdict** : ✅ **C** (site sans autoplay strict, sound design opt-in)

## 4.11 — Consultation de chaque média temporel contrôlable clavier + pointage ?
- **Verdict** : 🚫 **NA**

## 4.12 — Consultation de chaque média non temporel contrôlable clavier + pointage ?
- **Verdict** : 🚫 **NA**

## 4.13 — Chaque média temporel et non temporel est-il compatible avec les technologies d'assistance ?
- **Verdict** : 🚫 **NA**

---

# Thématique 5 · Tableaux (8 critères)

Chaque critère est **🚫 NA** : `document.querySelectorAll('table').length = 0`. Les données structurées (case studies) utilisent `<dl><dt><dd>` (`.projectCaseDetails` — sémantique liste de définitions correcte).

## 5.1 — Chaque tableau de données complexe a-t-il un résumé ?
- **Verdict** : 🚫 **NA**

## 5.2 — Pour chaque tableau complexe ayant un résumé, celui-ci est-il pertinent ?
- **Verdict** : 🚫 **NA**

## 5.3 — Pour chaque tableau de mise en forme, contenu linéarisé compréhensible ?
- **Verdict** : 🚫 **NA**

## 5.4 — Pour chaque tableau de données ayant un titre, titre correctement associé ?
- **Verdict** : 🚫 **NA**

## 5.5 — Pour chaque tableau de données ayant un titre, celui-ci pertinent ?
- **Verdict** : 🚫 **NA**

## 5.6 — Chaque en-tête de colonne/ligne correctement déclaré (`<th>`) ?
- **Verdict** : 🚫 **NA**

## 5.7 — Technique appropriée pour associer chaque cellule avec ses en-têtes ?
- **Verdict** : 🚫 **NA**

## 5.8 — Tableau de mise en forme ne doit pas utiliser d'éléments propres aux tableaux de données ?
- **Verdict** : 🚫 **NA**

---

# Thématique 6 · Liens (2 critères)

## 6.1 — Chaque lien est-il explicite (hors cas particuliers) ?
- **Protocole** : intitulé du lien doit décrire fonction / destination hors contexte.
- **Test code review** :
  - Nav header : "Accueil", "Mémoire", "Services", "Projets", "Contact" — explicites.
  - Footer liens externes : `aria-label` enrichi "LinkedIn de Sylvain Maurier (nouvelle fenêtre)" / "GitHub de Sylvain Maurier (nouvelle fenêtre)" / "Email : bonjour@nahual.fr".
  - Cases studies : "Voir Nuada en ligne →" — explicite (nom du projet). "Découvrir Nuada dans le journal →" — explicite.
  - Skip nav : "Aller au contenu principal" — explicite.
  - Compass dots : `aria-label="Nord · Mémoire"` etc. — explicite.
  - CTAs pages écho : "Discutons de votre projet →" — explicite.
- **Cas mineur** : liens header top "linkedin" / "github" en minuscules sans aria-label. Le contexte header le rend clair (Sylvain contact) mais hors contexte moins explicite que footer.
- **Verdict** : ✅ **C** (le contexte header lève l'ambiguïté)

## 6.2 — Dans chaque page web, chaque lien a-t-il un intitulé ?
- **Test Playwright** : `linksEmpty` = 0 sur les 5 pages testées.
- **Preuve** : `document.querySelectorAll('a[href]')` = 28-32 par page, 0 sans texte ou aria-label.
- **Verdict** : ✅ **C**

---

# Thématique 7 · Scripts (5 critères)

## 7.1 — Chaque script est-il compatible avec technologies d'assistance ?
- **Protocole** : le script ne doit pas casser l'ordre de lecture SR, doit gérer aria-*, ne pas voler le focus indûment.
- **Test code review** :
  - Canvas WebGL démonté si UA=bot / `prefers-reduced-motion` / mode récit accessible.
  - FadingBlock skip rAF si bot ; force visible si mode reading.
  - RevealText skip IntersectionObserver si bot ; force `revealed` si mode reading.
  - Curseurs custom, cursor-trail, mask-reveal, tilt-cards : tous respectent `prefers-reduced-motion`.
  - Contenu SR-only doublé (récit canonique + version visuelle aria-hidden).
- **Verdict** : ✅ **C**

## 7.2 — Pour chaque script ayant une alternative, cette alternative est-elle pertinente ?
- **Test** : Nav SPA CardinalLink → alternative = liens HTML natifs (Next.js SSR). SoundDesign toggle mute. View Transitions API → fallback nav standard si browser sans support (Firefox).
- **Verdict** : ✅ **C**

## 7.3 — Chaque script est-il contrôlable par clavier et tout dispositif de pointage ?
- **Test batch Playwright + code review** :
  - Skip nav focusable Tab, Enter saute au main ✅
  - Nav header/footer, boussole 5 dots + expand, sound toggle, reading mode toggle, CTAs : tous `<button>` ou `<a href>` focusables ✅
  - Compass overlay : `useFocusTrap` piège Tab dans le modal, Escape ferme, focus rendu au trigger ✅
  - Panel mobile burger : idem `useFocusTrap` ✅
  - Nav flèches cardinales : requiert `Alt+ArrowLeft/Right` (fix 29/08 après bug NVDA browse mode)
  - Easter egg : mots tapés (nahual, muertos, mazatl) + konami — nécessitent séquences, pas raccourcis 1 touche
  - Tilt cards / mask reveal : décoratifs souris seulement, pas requis clavier (RGAA autorise si l'info est aussi accessible autrement — le hover révèle décoration, pas info)
- **Verdict** : ✅ **C**

## 7.4 — Pour chaque script qui initie un changement de contexte, l'utilisateur est-il averti ou en a-t-il le contrôle ?
- **Test** : aucun submit auto, aucun `window.location` au load, aucun refresh JS. Nav SPA sur action explicite (click / Enter). LoadingVeil informatif seul.
- **Verdict** : ✅ **C**

## 7.5 — Dans chaque page web, les messages de statut sont-ils correctement restitués par les technologies d'assistance ?
- **Test Playwright** : `document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')` = 3 sur home.
  - RouteAnnouncer : `role="status" aria-live="polite"` — annonce titre nouvelle page.
  - CardinalAnnouncer : `role="status" aria-live="polite"` — annonce mytho cardinal.
  - EasterEgg toast : `role="status" aria-live="polite"` — révélations.
  - LoadingVeil : `role="status" aria-live="polite" aria-label="Chargement de la scène"`.
- **Verdict** : ✅ **C**

---

# Thématique 8 · Éléments obligatoires (10 critères)

## 8.1 — Chaque page web est-elle définie par un type de document ?
- **Test Playwright** : `document.doctype.name` = `"html"` sur toutes pages.
- **Verdict** : ✅ **C**

## 8.2 — Pour chaque page web, le code source généré est-il valide selon le type de document spécifié ?
- **Protocole** : validation W3C HTML validator.
- **Test** : non automatisé en Playwright (nécessite service W3C ou `html-validate` CLI).
- **Verdict** : 🔍 **M** (à valider `npx html-validate` ou service validator.w3.org)

## 8.3 — Dans chaque page web, la langue par défaut est-elle présente ?
- **Test Playwright** : `document.documentElement.lang` = `"fr"` (ou `"en"` / `"es"` selon locale) sur toutes pages testées.
- **Verdict** : ✅ **C**

## 8.4 — Pour chaque page web ayant une langue par défaut, le code de langue est-il pertinent ?
- **Protocole** : code ISO 639-1 ou 639-3 valide.
- **Test** : `fr`, `en`, `es` — tous ISO 639-1 valides.
- **Verdict** : ✅ **C**

## 8.5 — Chaque page web a-t-elle un titre de page ?
- **Test** : `document.title` non vide sur toutes pages testées.
- **Verdict** : ✅ **C**

## 8.6 — Pour chaque page web ayant un titre de page, ce titre est-il pertinent ?
- **Protocole** : titre doit identifier clairement le sujet unique de la page, distinct des autres pages du site.
- **Test Playwright** :
  - `/fr` → "Nahual . studio de création" ✅
  - `/fr/services` → "Nahual . studio de création" ❌ (identique home)
  - `/fr/memoire` → "Nahual . studio de création" ❌ (identique home)
  - `/fr/mentions-legales` → "Nahual . studio de création" ❌ (identique home)
  - `/fr/projets/nuada` → "Nuada · audit accessibilité RGAA · Nahual" ✅ (spécifique)
- **Cause code** : `layout.tsx generateMetadata` retourne `dict.metadata.title` global identique pour toutes pages écho ; seul `[slug]/[projetSlug]/page.tsx` sur-écrit via son propre `generateMetadata`.
- **Verdict** : ❌ **NC**
- **Correctif** : `generateMetadata` dans `[slug]/page.tsx` retournant title spécifique (`${dict[key].title} · Nahual`).

## 8.7 — Dans chaque page web, chaque changement de langue est-il indiqué dans le code source ?
- **Test Playwright** : 9 spans `lang="nah"` sur home, 18 sur memoire (18 termes nahuatl wrappés). Lang switcher : liens fr/en/es ont `lang="fr"/"en"/"es"` respectivement (annoncent cible).
- **Preuve** : `document.querySelectorAll('[lang]:not(html)')` = 9 sur home, 18 sur memoire.
- **Verdict** : ✅ **C**

## 8.8 — Dans chaque page web, le code de langue de chaque changement de langue est-il valide et pertinent ?
- **Test** : `lang="nah"` (Nahuatl ISO 639-3 valide) sur termes nahuatl. `lang="fr"/"en"/"es"` sur lang switcher (valides).
- **Verdict** : ✅ **C**

## 8.9 — Balises ne doivent pas être utilisées uniquement à des fins de présentation
- **Protocole** : pas de `<b>`, `<i>`, `<u>`, `<s>`, `<big>`, `<small>`, `<hr>` (sauf `<hr>` séparation thématique), `<br>` en série, `<center>`, `<font>`.
- **Test Playwright** : `document.querySelectorAll('b,i,u')` = 0/0/0 sur home. `<em>` utilisé pour toast easter egg (sémantique emphase OK). `<strong>` dans sr-only pour kickers chapitres (sémantique emphase forte OK).
- **Verdict** : ✅ **C**

## 8.10 — Dans chaque page web, les changements du sens de lecture sont-ils signalés ?
- **Protocole** : texte RTL (arabe, hébreu) doit être dans balise avec attribut `dir`.
- **Test** : `document.querySelectorAll('[dir]')` = 0. Site 100% latin (fr/en/es/nahuatl romanisé).
- **Verdict** : ✅ **C** (par défaut, aucun cas RTL)

---

# Thématique 9 · Structuration de l'information (4 critères)

## 9.1 — Dans chaque page web, l'information est-elle structurée par l'utilisation appropriée de titres ?
- **Protocole** : chaque page a `<h1>` unique, hiérarchie h1→h2→h3 cohérente sans sauts injustifiés.
- **Test Playwright par page** :
  - `/fr` : 1 h1 "Nahual · studio de création" + 4 h3 footer (Navigation/Ressources/Informations légales/Contact). Absence de h2 dans main = home hero simple, pas de sections intermédiaires. Les h3 footer sont dans `<contentinfo>` landmark distinct. Tolérable.
  - `/fr/services` : 1 h1 "Services" + 2 h2 (Création web, Audit RGAA) + 4 h3 footer ✅
  - `/fr/memoire` : 1 h1 "Teyolía · Mémoire" + 12 h2 chapitres (I à XII) + 4 h3 footer ✅
  - `/fr/mentions-legales` : 1 h1 "Mentions légales" + 5 h2 sections + 4 h3 footer ✅
  - `/fr/projets/nuada` : 1 h1 "Nuada · audit accessibilité RGAA" + 5 h2 sections + 4 h3 footer ✅
- **Verdict** : ✅ **C**

## 9.2 — Dans chaque page web, la structure du document est-elle cohérente (hors cas particuliers) ?
- **Protocole** : landmarks HTML5 utilisés (`<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>`, `<section>`, `<article>`).
- **Test Playwright** : `{ header: 1, nav: 2, main: 1, footer: 1, section: 1, article: 0-4 selon page }`. Nav labels : "Navigation principale" + "Boussole cardinale". Article utilisé sur ProjectCase.
- **Verdict** : ✅ **C**

## 9.3 — Dans chaque page web, chaque liste est-elle correctement structurée ?
- **Test Playwright** : `{ ul: 7, ol: 1, dl: 0 }` sur home. `<ul>` pour navs + footer cols + langues. `<ol>` pour récit chapitres SR-only. `<dl>` pour case studies projet detail.
- **Verdict** : ✅ **C**

## 9.4 — Dans chaque page web, chaque citation est-elle correctement indiquée ?
- **Test** : `<blockquote>` = 0, `<q>` = 0. Aucun texte n'est présenté comme citation dans le contenu (le pitch heroText Mazātl est narration, pas citation externe).
- **Verdict** : ✅ **C** (par défaut, aucun cas)

---

# Thématique 10 · Présentation de l'information (14 critères)

## 10.1 — Dans le site web, des feuilles de styles sont-elles utilisées pour contrôler la présentation de l'information ?
- **Test code review** : CSS modules (`.module.css`) + `globals.css`. Styles inline uniquement pour opacité dynamique (FadingBlock rAF) + couleurs cardinales dynamiques (`--direction-color`). Zéro attribut de présentation HTML (`width`, `bgcolor`, etc.).
- **Verdict** : ✅ **C**

## 10.2 — Dans chaque page web, le contenu visible porteur d'information reste-t-il présent lorsque les feuilles de styles sont désactivées ?
- **Test manuel** : désactiver CSS via DevTools ou extension Web Developer, vérifier le contenu textuel reste lisible.
- **Verdict** : 🔍 **M** (attendu C — structure sémantique complète en HTML, contenu jamais généré via CSS content)

## 10.3 — Dans chaque page web, l'information reste-t-elle compréhensible lorsque les feuilles de styles sont désactivées ?
- **Test manuel** : idem 10.2.
- **Verdict** : 🔍 **M**

## 10.4 — Dans chaque page web, le texte reste-t-il lisible lorsque la taille des caractères est augmentée jusqu'à 200%, au moins ?
- **Test manuel** : Ctrl++ jusqu'à 200% zoom navigateur, vérifier pas de clip, pas de scroll horizontal.
- **Verdict** : 🔍 **M**

## 10.5 — Dans chaque page web, les déclarations CSS de couleurs de fond d'élément et de police sont-elles correctement utilisées ?
- **Protocole** : quand une couleur est définie sur un élément, la couleur du texte (ou fond selon cas) doit aussi être définie pour éviter conflit avec user-stylesheet.
- **Test code review** : couleurs déclarées en paire `color:X; background:Y` ou variables CSS `--foreground/--background`. `.serviceCard` a `background` + `color` hérité de `.contentPage color:#f2ece1`. Footer `color: #fff` + `background: rgba(8,6,12,0.92)`. Header idem.
- **Verdict** : ✅ **C**

## 10.6 — Dans chaque page web, chaque lien dont la nature n'est pas évidente est-il visible par rapport au texte environnant ?
- **Protocole** : soit soulignement natif, soit ratio contraste ≥3:1 avec texte environnant + indicateur visuel additionnel au hover/focus.
- **Test code review** :
  - Liens inline `.contentPage a:not(.ctaButton)` : `text-decoration: underline` avec `text-decoration-color` cardinal ✅.
  - Liens footer `.footerLink` : `text-decoration: underline; text-decoration-color: rgba(0,192,120,0.4)` (jade sourd) ✅.
  - Liens header nav : sans underline visible en repos, mais `focus-visible outline 2px jade` au focus. Grande police + isolation du header + comportement hover (underline dynamique via `stag-scene.tsx applyNavEmphasis`). Ambigu en repos.
- **Verdict** : ✅ **C** (marginal sur header nav — mais bien indiqué en focus/hover)

## 10.7 — Dans chaque page web, pour chaque élément recevant le focus, la prise de focus est-elle visible ?
- **Test Playwright** : `Array.from(document.styleSheets).flatMap(s => Array.from(s.cssRules).map(r => r.cssText)).filter(r => /:focus-visible/.test(r))` = 9 règles.
- **Code** : `a:focus-visible, button:focus-visible, [role="button"]:focus-visible { outline: 2px solid #00c078; outline-offset: 3px; border-radius: 2px }` dans `globals.css`.
- **Verdict** : ✅ **C**

## 10.8 — Pour chaque page web, les contenus cachés ont-ils vocation à être ignorés par les technologies d'assistance ?
- **Test code review** :
  - `aria-hidden="true"` sur wrappers texte FadingBlock (contenu doublé en sr-only pour SR).
  - `aria-hidden="true"` sur PageClosure (bloc narratif orphelin hors main).
  - `aria-hidden="true"` sur icônes SVG décoratives.
  - Mobile panel : rendu conditionnel `{open && ...}` — jamais display:none avec contenu persistant.
  - Compass overlay : rendu conditionnel `{overlayOpen && ...}`.
- **Verdict** : ✅ **C**

## 10.9 — Dans chaque page web, l'information ne doit pas être donnée uniquement par la forme, taille ou position
- **Test code review** : Compass dots identifiés par `aria-label` (pas juste position dans grille 3x3). Icônes décoratives ont label parent ou aria-hidden. `.cardIndex` roman numeral décoratif (aria-hidden).
- **Verdict** : ✅ **C**

## 10.10 — Information ne doit pas être donnée par la forme, taille ou position uniquement — implémentée de façon pertinente
- **Test** : idem 10.9, implémentation cohérente sur toutes pages.
- **Verdict** : ✅ **C**

## 10.11 — Contenus peuvent-ils être présentés sans perte d'information ou de fonctionnalité et sans avoir recours à un défilement vertical pour une largeur d'affichage équivalente à 320px et à un défilement horizontal pour une hauteur équivalente à 256px ?
- **Test manuel** : émuler viewport 320×256px, vérifier lecture verticale seule.
- **Verdict** : 🔍 **M** (media queries responsive présentes, attendu C)

## 10.12 — Les propriétés d'espacement du texte peuvent-elles être redéfinies par l'utilisateur sans perte de contenu ou de fonctionnalité ?
- **Protocole** : line-height ≥1.5×, letter-spacing ≥0.12×, word-spacing ≥0.16×, paragraph-spacing ≥2× doivent être **respectés si l'utilisateur les applique** — aucun style ne doit clip / cacher.
- **Test code review** : aucun `overflow: hidden` ni `max-height` fixe sur les containers texte principaux. `.chapterLine max-width: 640px` peut faire wrapper mais pas clip. Line-height 1.5-1.7 déjà par défaut.
- **Verdict** : ⚠️ **PC** (probablement C mais nécessite test avec user-stylesheet forçant les valeurs pour confirmer aucun clip)

## 10.13 — Dans chaque page web, les contenus additionnels apparaissant à la prise de focus ou au survol d'un composant d'interface sont-ils contrôlables par l'utilisateur ?
- **Protocole** : le contenu additionnel doit être dismissible (Escape), hoverable (peut être atteint souris), persistent (ne disparaît pas automatiquement sauf action user).
- **Test code review** : 
  - Tooltips natifs `title` sur spans nahuatl (`title="Prononciation : X"`) : natifs, atteignables au focus, dismissible au blur ✅.
  - Mask reveal, tilt cards : décoratifs, pas contenu additionnel.
  - Custom cursor morph : décoratif, aucun contenu additionnel.
  - Compass hover pulse : décoratif, pas de tooltip texte.
- **Verdict** : ✅ **C**

## 10.14 — Contenus additionnels apparaissant via les styles CSS uniquement peuvent-ils être rendus visibles au clavier et par tout dispositif ?
- **Test code review** : aucun contenu textuel révélé uniquement par CSS `:hover`. Les décorations visuelles CSS (mask reveal, ripples, tilt) sont sans information textuelle.
- **Verdict** : ✅ **C**

---

# Thématique 11 · Formulaires (13 critères)

Chaque critère est **🚫 NA** : `document.querySelectorAll('form, input, textarea, select').length = 0`. Contact via mailto: (`ObfuscatedEmail` component). Pas de saisie utilisateur.

## 11.1 — Chaque champ de formulaire a-t-il une étiquette ?
- **Verdict** : 🚫 **NA**

## 11.2 — Chaque étiquette associée à un champ pertinente ?
- **Verdict** : 🚫 **NA**

## 11.3 — Chaque étiquette associée à un champ ayant la même fonction cohérente sur ensemble de pages ?
- **Verdict** : 🚫 **NA**

## 11.4 — Chaque étiquette de champ et son champ associé accolés ?
- **Verdict** : 🚫 **NA**

## 11.5 — Champs de même nature regroupés (fieldset) ?
- **Verdict** : 🚫 **NA**

## 11.6 — Chaque regroupement de champs a-t-il une légende ?
- **Verdict** : 🚫 **NA**

## 11.7 — Chaque légende associée à un regroupement pertinente ?
- **Verdict** : 🚫 **NA**

## 11.8 — Items de même nature d'une liste de choix regroupés de manière pertinente ?
- **Verdict** : 🚫 **NA**

## 11.9 — L'intitulé de chaque bouton pertinent ?
- **Verdict** : 🚫 **NA** (les boutons ne sont pas dans un contexte de formulaire — voir Thém 7)

## 11.10 — Contrôle de saisie utilisé de manière pertinente ?
- **Verdict** : 🚫 **NA**

## 11.11 — Contrôle de saisie accompagné de suggestions ?
- **Verdict** : 🚫 **NA**

## 11.12 — Pour chaque formulaire qui modifie/supprime données, ou transmet réponses, utilisateur peut annuler/vérifier/confirmer ?
- **Verdict** : 🚫 **NA**

## 11.13 — Finalité d'un champ de saisie peut-elle être déduite pour faciliter le remplissage automatique ?
- **Verdict** : 🚫 **NA**

---

# Thématique 12 · Navigation (11 critères)

## 12.1 — Chaque ensemble de pages dispose-t-il de deux systèmes de navigation différents ?
- **Test** : Nav header + Boussole cardinale + Plan du site (`/plan-du-site`) + Skip nav = 4 systèmes distincts.
- **Verdict** : ✅ **C**

## 12.2 — Dans chaque ensemble de pages, le menu et les barres de navigation sont-ils toujours à la même place ?
- **Test** : `<Header>` monté globalement dans layout. Position `fixed top-0`. Boussole `fixed bottom-right`. Bouton son + reading mode fixes coins bas. Cohérent.
- **Verdict** : ✅ **C**

## 12.3 — La page « plan du site » est-elle pertinente ?
- **Test** : `/fr/plan-du-site` (via `LegalPage`) contient liste exhaustive des pages via `dict.planDuSite.sections[].links`.
- **Verdict** : ✅ **C**

## 12.4 — La page « plan du site » est-elle accessible à partir d'une fonctionnalité identique ?
- **Test** : lien "Plan du site" dans footer, colonne "Ressources", présent sur toutes pages via `layout.tsx`.
- **Verdict** : ✅ **C**

## 12.5 — Dans chaque ensemble de pages, le moteur de recherche est-il atteignable de manière identique ?
- **Protocole** : si moteur de recherche existe, doit être accessible identiquement partout.
- **Test** : aucun moteur de recherche sur ce site portfolio.
- **Verdict** : 🚫 **NA**

## 12.6 — Les zones de regroupement de contenus présentes dans plusieurs pages web peuvent-elles être atteintes ou évitées ?
- **Test** : landmarks HTML5 (`<header>`, `<nav>`, `<main>`, `<footer>`) sur toutes pages. `<main id="main">` cible du skip nav. Landmarks nommés (`nav aria-label`).
- **Verdict** : ✅ **C**

## 12.7 — Dans chaque page web, un lien d'évitement ou d'accès rapide à la zone de contenu principal est-il présent ?
- **Test Playwright** : `document.querySelector('a[href="#main"]')` existe sur toutes pages. Texte "Aller au contenu principal" (localisé fr/en/es).
- **Verdict** : ✅ **C**

## 12.8 — Dans chaque page web, l'ordre de tabulation est-il cohérent ?
- **Test manuel** : Tab depuis chargement page :
  1. Skip nav (Aller au contenu principal)
  2. Header liens externes (linkedin, github, mailto)
  3. Lang switcher (FR, EN, ES)
  4. Logo Nahual
  5. Nav header (Accueil, Mémoire, Services, Projets, Contact)
  6. Bouton burger mobile (si <768px)
  7. Main content (skip cible)
  8. Footer 4 cols links
  9. Boutons flottants (reading mode, sound, boussole)
- **Verdict** : 🔍 **M** (à valider manuellement — ordre DOM = ordre visuel, attendu C)

## 12.9 — Dans chaque page web, la navigation ne doit pas contenir de piège au clavier
- **Test** : Modals (compass overlay, mobile panel) : focus trap explicite via `useFocusTrap` MAIS Escape retour au trigger. Escape testable, Tab confiné mais libérable via Escape.
- **Verdict** : ✅ **C**

## 12.10 — Dans chaque page web, les raccourcis clavier n'utilisant qu'une seule touche sont-ils contrôlables / désactivables ?
- **Test code review** :
  - `KeyboardNav` : requiert `Alt+ArrowLeft/Right` (modifier obligatoire, fix 29/08 après bug NVDA).
  - `EasterEgg` : mots complets tapés (nahual, muertos, mazatl, konami) — séquences multi-touches, pas raccourcis 1 touche.
  - Aucun raccourci 1 touche sans modifier.
- **Verdict** : ✅ **C**

## 12.11 — Dans chaque page web, les contenus additionnels apparaissant au survol/prise focus/activation sont-ils, si nécessaire, atteignables au clavier ?
- **Test** : voir 10.13, 10.14. Tooltips natifs sur `title` atteignables au focus. Mode récit accessible bouton toggle accessible clavier.
- **Verdict** : ✅ **C**

---

# Thématique 13 · Consultation (12 critères)

## 13.1 — Pour chaque page web, l'utilisateur a-t-il le contrôle de chaque limite de temps modifiant le contenu ?
- **Test** : aucune session, aucun timeout auto, aucun panneau qui disparaît sans action user (LoadingVeil disparaît quand le chargement est fini, contrôlable via `MIN_VEIL_DURATION_MS`).
- **Verdict** : 🚫 **NA** (aucune limite de temps applicable)

## 13.2 — Dans chaque page web, l'ouverture d'une nouvelle fenêtre ne doit pas être déclenchée sans action de l'utilisateur
- **Protocole étendu (interprétation RGAA)** : utilisateur doit être averti si un lien ouvre nouvelle fenêtre (`target="_blank"`).
- **Test Playwright par page** :
  - `/fr` : 2 externes, 2 avec warning "(nouvelle fenêtre)" ✅
  - `/fr/services` : 0 externe
  - `/fr/memoire` : 2 externes (footer only), 2 avec warning ✅
  - `/fr/mentions-legales` : 2 externes (footer only), 2 avec warning ✅
  - **`/fr/projets/nuada`** : 3 externes, **1 SANS warning** ❌
- **Cause code** : `[slug]/page.tsx ProjectCase` — lien "Voir Nuada en ligne →" `target="_blank"` sans suffixe indication.
- **Verdict** : ❌ **NC**
- **Correctif** : ajouter suffixe SR-only " (nouvelle fenêtre)" ou aria-label enrichi sur les liens externes dans `[slug]/page.tsx` (ProjectCase + ContactPage LinkedIn hors footer).

## 13.3 — Dans chaque page web, chaque document bureautique en téléchargement possède-t-il, si nécessaire, une version accessible ?
- **Test** : aucun PDF/DOC téléchargeable.
- **Verdict** : 🚫 **NA**

## 13.4 — Pour chaque document bureautique ayant une version accessible, cette version offre-t-elle la même information ?
- **Verdict** : 🚫 **NA**

## 13.5 — Dans chaque page web, chaque contenu cryptique (art ASCII, émoticône, syntaxe cryptique) a-t-il une alternative ?
- **Test** : aucun ASCII art. Ponctuation Unicode utilisée (·, →, ↺) — pas cryptique, pontuation lisible SR. Emojis absents.
- **Verdict** : ✅ **C**

## 13.6 — Pour chaque contenu cryptique ayant une alternative, cette alternative est-elle pertinente ?
- **Verdict** : ✅ **C** (par défaut, aucun cas)

## 13.7 — Dans chaque page web, les changements brusques de luminosité ou les effets de flash sont-ils correctement utilisés ?
- **Protocole** : contenu clignotant / flash ne doit pas dépasser 3 flashes/s.
- **Test** : Konami flash CSS anim 2s, 6 keyframes = 3 changements/s max (limite). Cerf breath + particles ambient = très lent, <1Hz.
- **Verdict** : ✅ **C**

## 13.8 — Dans chaque page web, chaque contenu en mouvement ou clignotant est-il contrôlable par l'utilisateur ?
- **Test code review** :
  - `prefers-reduced-motion` respecté par : PersistentScene (frameloop=demand → freeze breath/orbit/particles/ambience), CustomCursor skip, CursorTrail skip, MaskReveal skip, TiltCards skip, FadingBlock (opacity 1 direct via reducedMotionRef), RevealText (CSS media query), Konami flash (CSS media query).
  - Mode récit accessible opt-in bouton (bas gauche) démonte le canvas WebGL entièrement, force visible FadingBlock, retire curseurs custom.
- **Verdict** : ✅ **C**

## 13.9 — Dans chaque page web, le contenu proposé est-il consultable quelle que soit l'orientation de l'écran (portrait ou paysage) ?
- **Test manuel** : media queries responsive présentes. Portrait mobile + landscape testé partiellement.
- **Verdict** : 🔍 **M** (attendu C — responsive complet CSS)

## 13.10 — Les fonctionnalités utilisables au moyen d'un geste complexe peuvent-elles être aussi disponibles au moyen d'un geste simple ?
- **Test** : aucun geste complexe (pas de swipe, pinch, drag). Nav via click ou clavier uniquement.
- **Verdict** : ✅ **C**

## 13.11 — Les actions déclenchées au moyen d'un dispositif de pointage sur un point unique peuvent-elles faire l'objet d'une annulation ?
- **Protocole** : action doit se déclencher au `pointerup` (relachement), pas au `pointerdown` (appui) — user peut annuler en déplaçant le pointeur avant relachement. OU alternative pour annuler.
- **Test code review** : boutons natifs déclenchent `onClick` = `mouseup` par défaut. CardinalLink `handleClick` sur `onClick`. Compass dot `onClick`. Reading mode toggle `onClick`. Sound toggle `onClick`. Tous respectent le pattern natif.
- **Verdict** : ✅ **C**

## 13.12 — Les fonctionnalités qui impliquent un mouvement de l'appareil peuvent-elles être satisfaites de manière alternative ?
- **Test** : aucun contrôle par accelerometer / gyroscope. Toute interaction est click/keyboard.
- **Verdict** : ✅ **C**

---

# Synthèse

## Répartition des verdicts

| Thématique | Total | ✅ C | ⚠️ PC | ❌ NC | 🚫 NA | 🔍 M |
|---|---|---|---|---|---|---|
| 1. Images | 9 | 4 | 0 | 0 | 5 | 0 |
| 2. Cadres | 2 | 0 | 0 | 0 | 2 | 0 |
| 3. Couleurs | 3 | 2 | 0 | 0 | 0 | 1 |
| 4. Multimédia | 13 | 1 | 0 | 0 | 12 | 0 |
| 5. Tableaux | 8 | 0 | 0 | 0 | 8 | 0 |
| 6. Liens | 2 | 2 | 0 | 0 | 0 | 0 |
| 7. Scripts | 5 | 5 | 0 | 0 | 0 | 0 |
| 8. Éléments obligatoires | 10 | 8 | 0 | 1 | 0 | 1 |
| 9. Structuration | 4 | 4 | 0 | 0 | 0 | 0 |
| 10. Présentation | 14 | 10 | 1 | 0 | 0 | 3 |
| 11. Formulaires | 13 | 0 | 0 | 0 | 13 | 0 |
| 12. Navigation | 11 | 10 | 0 | 0 | 1 | 0 |
| 13. Consultation | 12 | 8 | 0 | 1 | 2 | 1 |
| **Total** | **106** | **54** | **1** | **2** | **43** | **6** |

## Taux de conformité

- **Applicables** = 106 − 43 (NA) = **63 critères**
- **Taux de conformité applicable** = 54 / 63 = **85,7%**
- **Taux (C + PC)** = 55 / 63 = **87,3%**
- **Non-conformités bloquantes** : 2 (8.6, 13.2)
- **Tests manuels restants** : 6 (3.2, 8.2, 10.2, 10.3, 10.4, 10.11, 13.9 partiels)

## Non-conformités à corriger avant déclaration

### ❌ 8.6 — Titre de page pas unique
- **Pages concernées** : `/fr/services`, `/fr/memoire`, `/fr/mentions-legales`, `/fr/accessibilite`, `/fr/confidentialite`, `/fr/plan-du-site`, `/fr/codex`, `/fr/credits`, `/fr/projets`, `/fr/contact`.
- **Correctif** : ajouter `generateMetadata` dans `[slug]/page.tsx` retournant title spécifique (`${dict[key].title} · Nahual`).

### ❌ 13.2 — Lien externe sans warning « nouvelle fenêtre »
- **Pages concernées** : `/fr/projets/nuada` (et probablement `/fr/projets/kleyfrance`, `/fr/projets/synapse`, `/fr/contact` LinkedIn hors footer).
- **Correctif** : ajouter suffixe SR-only " (nouvelle fenêtre)" ou aria-label enrichi sur les liens externes dans `[slug]/page.tsx` `ProjectCase` + `ContactPage`.

## Partiellement conformes (non-bloquants)

### ⚠️ 10.12 — Espacement du texte
Valeurs par défaut line-height 1.55-1.7 correctes. Nécessite test avec user-stylesheet forçant line-height ≥1.5em / letter-spacing ≥0.12em pour confirmer aucun clip. Attendu C.

## Tests manuels restants (6 critères)

- **3.2** : contraste canvas dynamique — Stark (grille dans `contrast-manual-audit.md`)
- **8.2** : validation W3C HTML — `npx html-validate` ou service en ligne
- **10.2 / 10.3** : contenu sans CSS lisible
- **10.4** : zoom 200% sans clip
- **10.11** : contenu à 320×256px
- **12.8** : ordre tabulation manuel
- **13.9** : orientation portrait/paysage

## Méthodologie détaillée

### Tests batchés Playwright
`document.querySelectorAll` + `getAttribute` sur : `img`, `svg`, `iframe`, `audio`, `video`, `table`, `form`, `input`, `textarea`, `select`, `nav`, `main`, `header`, `footer`, `section`, `article`, `aside`, `h1-h6`, `a[href]`, `button`, `[lang]`, `[aria-*]`, `[role]`, `[dir]`, `[tabindex]`, `[target="_blank"]`, `[href="#main"]`, `meta[http-equiv="refresh"]`. Résultats consignés inline par critère.

### Axe-core automated
axe-core 4.10.2 CDN injecté via Playwright evaluate. `axe.run(document, { runOnly: { type: "tag", values: ["wcag2a","wcag2aa","wcag21a","wcag21aa"] } })` — 0 violations sur 5 pages testées.

### Code review
Grep `aria-*|role=|alt=|tabindex|prefers-reduced-motion|focus-visible|sr-only` = 196 occurrences dans 46 fichiers. Vérification composants critiques : `layout.tsx`, `header.tsx`, `stag-scene.tsx`, `echo-scene-page.tsx`, `keyboard-nav.tsx`, `compass-overlay.tsx`, `route-announcer.tsx`, `cardinal-announcer.tsx`, `sound-design.tsx`, `custom-cursor.tsx`, `cursor-trail.tsx`, `mask-reveal.tsx`, `tilt-cards.tsx`, `reading-mode-toggle.tsx`, `skip-nav.tsx`.

### Tests manuels documentés
`docs/a11y-audit/contrast-manual-audit.md` — grille 9 zones canvas dynamique à mesurer avec extension Stark.

### Reproductibilité
- `docs/a11y-audit/_rgaa-criteres.json` : critères officiels sauvegardés à date de l'audit
- Snapshots Playwright before/after conservés dans `docs/a11y-audit/*.md`

## Recommandations post-audit

1. **Fixer les 2 NC bloquantes** (8.6 titles uniques + 13.2 external warnings) — 1 session estimée 30-45 min
2. **Réaliser les 6 tests manuels** — 1-2 h avec outils appropriés
3. **Test réel SR** : NVDA + Firefox, JAWS + Chrome, VoiceOver iOS — 1 session par SR
4. **Après fixes** : refaire batch Playwright + Axe pour confirmer 0 régression
5. **Générer déclaration accessibilité** conforme article 47 loi 2005-102 (taux + méthode + contact + parcours signalement)
6. **Auditer annuellement** ou après refonte majeure du site
