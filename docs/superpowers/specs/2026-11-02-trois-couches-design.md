# Les trois couches : design (02/11/2026)

## 0. Le constat et la decision (25/10/2026)

Sylvain : « un bouton pour switch de 3d a 2d... pour avoir plusieurs couches
dans le site », puis « l'avantage d'un site c'est qu'on peut mettre une
infinite de peaux a disposition ». Ossature validee le 25/10 (« oui
totalement ») : la pile, la source unique, la transition.

**Ce n'est pas un chantier d'apres.** Sylvain a tranche que ce projet EST la
candidature Awwwards : plus decembre 2026, mais **novembre 2027, jour des
morts** (date choisie, pas subie : la page d'entree s'ouvre deja sur le
cempoalxochitl, « pont entre les vivants et Mictlan »). Voir
[[project_nahual_couches]] pour la chronologie complete de la conception ;
cette fiche n'en est que la mise en forme pour l'implementation.

## 1. La pile : trois mediums, pas trois qualites d'image

Pas une declinaison de fidelite visuelle : **trois mediums par lesquels un
savoir mesoamericain parvient**, et c'est exactement la chaine de
degradation gracieuse que l'accessibilite impose (WebGL -> 2D -> texte). Le
repli technique EST le propos.

1. **La parole** — le document nu. ⭐ **Elle existe deja DEUX FOIS, et c'est
   la decouverte du 02/11** : le bloc `sr-only` de `stag-scene.tsx` (ce que
   les lecteurs d'ecran lisent tous les jours) **et le MODE RECIT**
   (`src/lib/reading-mode-context.tsx`, chantier a11y du 29/08), qui est
   deja la version VISIBLE de cette couche — il cache le canvas WebGL
   (`PersistentScene` rend `null`), force le mouvement reduit, retire les
   curseurs, trails, tilt et ripples, et centre le contenu en largeur
   lisible. Il persiste meme deja dans `localStorage`
   (`nahual-reading-mode`). **Le projet ne fabrique donc pas la parole : il
   lui ouvre la porte depuis la truelle** (voir section 7).
2. **L'*amatl*** — cinq compositions, une matrice, en SVG (le trait
   d'abord, les aplats ensuite).
3. **La scene** — le WebGL actuel, couche d'accueil (« la plus
   spectaculaire »).

Regles d'entree : la scene si la machine suit ; **l'*amatl* par defaut**
sous `prefers-reduced-motion`, sans WebGL, ou en connexion degradee (regle
du 14/10, inchangee) ; la parole toujours a un geste. On ne renvoie jamais
personne vers une couche ; le site se presente autrement.

## 2. L'architecture : une source, trois moteurs, un sens unique

**description de page -> l'*amatl* -> la scene.** La description est une
donnee structuree (pas du JSX). L'*amatl* compose et **publie ses
coordonnees mesurees** ; la scene vise ces coordonnees pour que la morph
coincide. Consequence : le 2D cesse d'etre une declinaison du 3D, c'est lui
qui donne les positions.

Deux patrons existent deja dans le depot et servent de modele :

- **`cantar.tsx`** empile trois registres (nahuatl, espagnol, traduction)
  du meme chant, chacun visible, jamais en `sr-only`. Les trois couches
  empileront trois mediums de la meme facon.
- **Les cinq `sceneDescriptions` de `src/dictionaries/fr.json`** (jade, dore,
  turquoise, cendre, obsidienne) sont deja le cahier des charges poetique
  et precis de chaque etat de la scene, ecrites pour les lecteurs d'ecran.
  **Decision de DA : la couche trace remet la meme information que la
  scene.** Donc l'equivalence est vraie par construction, pas par
  vigilance.

## 3. Composants proposes (02/11, direction validee par Sylvain, noms a confirmer au plan d'implementation)

⚠️ **Contradiction trouvee le 02/11 en relisant la fiche de conception, et
TRANCHEE le meme jour par Sylvain** : le 25/10 decrit deux fois la meme
chose avec deux vocabulaires differents — « un groupe de boutons radio »
pour l'indicateur a 3 crans, puis « le patron slider de l'ARIA » pour la
truelle — et conclut que **le controle de la barre EST la truelle au repos :
un seul objet, deux usages**. Un element ne peut pas porter les deux roles
ARIA a la fois.

✅ **DECISION (Sylvain, 02/11) : UN SEUL composant, role `slider`** — 3
positions figees, `aria-valuemin=0` / `aria-valuemax=2`, flèches +
Origine/Fin, clic direct sur une marque = aller a cette valeur. Le mot
« radiogroup » du 25/10 decrivait l'image visuelle (trois marques dont une
active), pas le role : comme la truelle doit rester GLISSABLE, seul
`slider` tient les deux usages. ⛔ Ne plus rouvrir.

✅ **DECISION (Sylvain, 02/11) : le choix manuel PERSISTE** — meme motif que
le theme (`localStorage` + attribut pose par un script inline avant le
premier paint). La question n'avait jamais ete tranchee le 25/10 ; les deux
controles de la meme famille se comportent donc pareil.

| composant | role |
| --- | --- |
| `truelle.tsx` | le controle unique : rendu comme 3 marques dont une active au repos, devient le thumb d'un `slider` ARIA au clic/glissement ; a trancher : un seul composant (voir ci-dessus), pas deux |
| `amatl-layer.tsx` | compose les 5 `sceneDescriptions` en SVG, trait puis aplats |
| `couche-store.ts` | pur, teste : l'etat des 3 couches, lu par les trois moteurs. **Patron a suivre : `theme-store.ts`** (meme motif que `miroir-fumant.tsx`/`theme-toggle.tsx`, deja ecrit et teste pour la persistance `localStorage`, le comportement sans JavaScript, l'annonce et le clavier — rien a reinventer, voir section 6) |
| un hook de focus+annonce partage (a extraire) | voir section 6 : NE PAS reutiliser `route-announcer.tsx` tel quel (il ecoute `usePathname()`, pas un changement de couche) |

## 4. Le geste : la truelle, un objet qu'on attrape — pas un balayage

Trois pistes explorees le 25/10, toutes mortes sauf la derniere :

- ⛔ **L'axe vertical comme geste** : mort, conflit avec le defilement qui
  pilote deja tout le site.
- ⛔ **Le degagement libre** (n'importe ou sur la page) : meme mort, pour
  la meme raison, quel que soit l'axe.
- ✅ **La truelle EST une poignee, pas une surface** : le glissement est
  lie a un objet, pas a la page. Aucune ambiguite de direction, aucun
  seuil a deviner. Et une poignee est **focusable** : l'alternative
  clavier n'est pas un bouton greffe a cote, c'est le comportement natif
  d'un curseur (tabulation, flèches, Origine/Fin).

**Ou vit la truelle au repos** (barre de gauche, « bouton a gauche...sous
trois formes differentes ») : pas un bouton a trois formes qui cycle
(ambigu, interdit le retour direct), mais **l'indicateur a 3 crans**
lui-meme — on voit qu'il y a trois couches avant d'agir, on voit ou l'on
est, on va directement au cran voulu. La truelle est rangee dans la barre :
la prendre (glisser depuis la barre) ou l'activer d'un clic sur le cran
voulu sont deux usages du meme outil.

## 5. La transition A -> B

Ni A seul (tout WebGL, rien sans WebGL), ni C seul (deux couches vivantes a
la fois, pire cas de perf).

1. `pointerdown` sur la truelle -> la scene rend **une image** et se met
   en pause.
2. Glissement -> le bitmap fige est **ecarte** (un degagement, pas un
   fondu : le geste est une fouille, Templo Mayor). Cout quasi nul.
3. Relachement -> sous le seuil on rallume, au-dela on acheve et **on
   libere le contexte WebGL** (attaque directement les 24-71 images
   perdues sur `projets`, voir [[project_nahual_da]], chantier B2b).
4. Sous `prefers-reduced-motion` : aucune morph, bascule directe.

L'organique vient de la composition (silhouette, masses, couleur qui
RIMENT entre les deux couches), jamais du shader.

## 6. RGAA : trois points a traiter comme des oracles, ecrits avant le code

1. **Le glissement** — WCAG 2.5.1 et 2.5.7 (nouveau 2.2) : bouton +
   clavier, concus en meme temps, jamais greffes apres. Resolu par
   construction : la truelle est un slider ARIA natif (section 4).
2. **Le focus au changement de couche** — sans traitement il part sur
   `<body>`. ⚠️ **Correction du 02/11** : `route-announcer.tsx` ne se
   reutilise PAS directement, il ecoute `usePathname()` et un changement de
   couche ne change pas l'URL. Ce qu'il faut reprendre, c'est son patron
   interne (`focusTarget.setAttribute("tabindex", "-1")` puis
   `focus({ preventScroll: true })`, annonce `aria-live="polite"` apres un
   court delai) — a extraire dans un hook partage que `RouteAnnouncer` ET
   le changement de couche appellent tous les deux, pour ne pas dupliquer
   la logique.
3. **La morph** — interruptible, jamais jouee sous `prefers-reduced-motion`.

Plus un point du site actuel, decouvert ce jour-la et independant des
couches mais a traiter avant d'ajouter un controle dans la meme colonne :
**WCAG 2.5.8, cible minimale 24x24 px**, non mesuree sur les huit icones de
`scene-controls.tsx`.

Le reste du RGAA est **facilite** par l'architecture : source unique ->
hierarchie de titres garantie ; jetons partages -> contraste traite une
fois ; le canvas est deja `aria-hidden` + equivalent `sr-only` ; le critere
13.8 est satisfait par le projet lui-meme (l'*amatl* EST le mecanisme
d'arret du mouvement).

**Rappel qui ne bloque rien, mais a dire a l'oral comme a l'ecrit** : RGAA 5
est en cours de redaction (publication prevue fin 2026, verifie le 25/10 sur
accessibilite.numerique.gouv.fr — a revalider si cette fiche est relue dans
plusieurs mois), ce projet se construit sous RGAA 5 et non 4.1.2. Le site ne
doit dire ni le nombre de criteres de la 5 ni son alignement WCAG : a ne pas
inventer.

## 7. Ce que ca absorbe dans la barre de gauche — et la barre SERA refondue

### ⛔ CORRECTION DU 02/11 : la spec nommait le mauvais mecanisme

La version du matin disait « la couche *parole* EST ce que **`text`** promet,
en mieux ». **C'est faux, verifie dans le code** : le bouton `text` de la
barre bascule `sceneOnly`, c'est-a-dire qu'il **masque le texte** pour ne
laisser que la scene — l'inverse exact de la parole.

✅ **Ce que la parole recouvre, c'est le MODE RECIT** (bouton du header,
`reading-mode-context.tsx`), qui fait deja tout ce que la couche parole
promet (voir section 1).

### ✅ DECISION (Sylvain, 02/11) : le mode recit DEVIENT la couche parole

Option (b) des trois posees ce jour-la : on ne construit pas un troisieme
mecanisme a cote d'un mode recit qui fait deja le travail. Le mode recit
cesse d'etre un mode a part, il devient le cran « parole » de la truelle.

⏭️ **Ce que cette decision oblige a trancher** : le mode recit s'active
aujourd'hui depuis un bouton du HEADER, la truelle vit dans la barre de
GAUCHE. Deux portes vers le meme etat, c'est exactement le piege
« deux boutons qui changent la peau sans qu'on sache lequel fait quoi »
releve le 25/10 a propos du miroir. Donc : le bouton du header reste-t-il
comme raccourci, ou disparait-il au profit du cran ? **Non tranche.**

### La barre de gauche : le menage N'EST PLUS EN STAND BY (Sylvain, 02/11)

**Sylvain** : « cette barre de gauche, je vais la refondre, y a trop de
trucs gadgets (genre l'appareil photo) ». Le stand by du 25/10 est donc
leve : la refonte est voulue, et **`photo` est nomme par Sylvain comme
gadget**.

### ✅ LA BARRE REFONDUE, tranchee par Sylvain le 02/11

| icone | sort | raison |
| --- | --- | --- |
| `photo` | ⛔ **retiree** | « trop de trucs gadgets (genre l'appareil photo) » |
| `link` | ⛔ **retiree** | « link non » (le lien horodate `?t=` reste dans le code, c'est le BOUTON qui part) |
| `eco` | ♻️ **absorbee** par le cran *amatl* | l'amatl EST le mode sans WebGL ni mouvement |
| `pause` | 🔄 **devient CONTEXTUELLE** : un play/pause qui ne pilote que `cinematic` | « il faut un bouton play pause pour controler l'animation mais seulement sur cinematic » (Sylvain, 02/11) — voir ci-dessous |
| bouton du mode recit (bas gauche, `reading-mode-toggle.tsx`) | ⛔ **retire AVEC la truelle** | remplace par le cran *parole* ; ⛔ pas avant la tache 2b, sinon la page Accessibilite reste la seule porte |
| `text` | ✅ **gardee** | « text, on garde je pense » — aucun cran ne la couvre : elle masque le texte pour voir la scene |
| `fullscreen` | ✅ **gardee** | « pourquoi pas » (accord tiede, pas un engagement ferme) |
| `cinematic` | ✅ **gardee** | « pourquoi pas » (idem) |
| `traces` | ✅ **gardee** | « trace on garde ! » — mecanique de decouverte deliberee ; la question du 25/10 « dans la barre ou pres du Codex ? » se resout par defaut en « dans la barre » |

**Resultat : de huit icones + le bouton du mode recit, on passe a QUATRE
icones + la truelle.** ⭐ Et les 24x24 px de WCAG 2.5.8 (la « consequence
urgente » du 25/10) cessent d'etre un probleme de place.

### ✅ `pause` devient un play/pause de la CONTEMPLATION (Sylvain, 02/11)

**Sylvain** : « il faut un bouton play pause pour controler l'animation mais
seulement sur cinematic. » Le bouton cesse donc d'etre un interrupteur
permanent et devient le transport de la contemplation : il n'apparait que
quand `cinematic` est actif, et il pilote ce deroulement-la.

⭐ **Pourquoi c'est meilleur** : un bouton « pause » permanent souffre de
l'ambiguite classique — pause de QUOI, la scene, le defilement, le son ? La
contemplation, elle, est litteralement une lecture qui se deroule (la page
defile seule, en boucle nuit/midi) : un play/pause y a un referent evident.

✅ **Et ca reste conforme a WCAG 2.2.2**, parce que le critere admet trois
sorties — pause, stop OU **hide** — et que le cran *amatl* de la truelle
retire entierement le mouvement, en permanence et au clavier. C'est lui qui
porte la conformite dans l'etat par defaut ; le play/pause porte le confort
de la contemplation.

⛔ **DEUX RESERVES, a tenir :**
1. **Sequencement** : tant que la truelle n'existe pas, `pause` est le SEUL
   mecanisme 2.2.2 du site. Le transformer en controle contextuel de
   `cinematic` ne se fait donc **qu'avec la tache 2b**, jamais avant — meme
   contrainte que le retrait du bouton du mode recit.
2. **Ce qu'on perd, et c'est a accepter sciemment** : aujourd'hui `pause`
   **fige la scene en la laissant visible** (« le canvas ne rend plus,
   l'image reste »). Apres le changement, ce geste n'existe plus que par la
   preference systeme `prefers-reduced-motion` — or la raison d'etre du mode
   recit dit justement que ce reglage global est « trop large » pour
   beaucoup de gens. Un visiteur aux troubles vestibulaires qui veut
   REGARDER l'image 3D figee, sans toucher aux reglages de son OS, n'aura
   plus de bouton pour ca : l'amatl quitte la scene au lieu de la figer.
   ⏭️ Cout identifie, non chiffre, **a assumer ou a corriger par Sylvain**.

⭐ **Consequence pour ce projet** : la couche *amatl* rend `eco` redondant et
recouvre une bonne part de `pause` ; la couche *parole* absorbe le mode
recit. **La truelle ne s'AJOUTE donc pas a une barre de huit icones : elle
arrive dans une barre refondue, plus courte.** Et la question de DA « ou vit
la truelle au repos » (section 9) se fond en partie dans celle de la
refonte : ce n'est plus « ou la glisser parmi huit », c'est « a quoi
ressemble la barre quand elle est propre ».

## 8. Nommage

- ***amatl*** retenu pour la couche du milieu (une couche 2D est une
  surface, pas une technique), contre *tlacuilolli*. A ajouter au
  dictionnaire de `src/lib/nahuatl.tsx`.
- ⚠️ ***cempoalxochitl***, deja sur la page d'entree, n'est pas encore dans
  ce dictionnaire : il s'affiche sans `lang="nah"` (critere 3.1.2). A
  corriger, independamment des couches, decouvert le meme jour.
- Regle : le francais dit le chemin (« Passer au trace »), le nahuatl dit
  le lieu (*amatl*). La page `/codex` garde son nom.

## 9. Ce qui reste ouvert, decision de Sylvain seul

- **Ou vit la truelle au repos exactement** (un bord, un coin, posee pres
  du disque grave, revelee au survol) : se regarde, ne se decide pas par
  ecrit — **et se regarde dans la barre REFONDUE** (quatre icones), pas dans
  celle a huit.
- ~~**`pause` reste-t-elle ?**~~ — **tranche le 02/11** : elle devient un
  play/pause contextuel de `cinematic` (section 7). ⏭️ Reste a assumer ou a
  corriger : on perd le geste « figer la scene en la gardant visible » pour
  qui n'a pas regle son OS.
- ~~**La refonte de la barre de gauche**~~ — **tranchee le 02/11**, voir le
  tableau de la section 7 : `photo` et `link` partent, `eco` est absorbee,
  `text`/`fullscreen`/`cinematic`/`traces` restent.
- ~~**Le bouton du mode recit**~~ — **tranche le 02/11** : il est **retire**,
  remplace par le cran *parole*. ⛔ Mais **avec** la truelle (tache 2b), pas
  avant. (Et il n'etait pas « dans le header » comme le disait la premiere
  version de cette spec : il est en bas a gauche, symetrique du bouton son.)
- **La piste 3** (la matiere battue, pression repetee au lieu d'un
  glissement) n'est pas tranchee par l'objection du 25/10 : elle reste
  ouverte, mais perd l'avantage clavier natif de la poignee.
- ~~**Un seul composant ou deux**~~ — **tranche le 02/11** : un seul, role
  `slider`, voir section 3. Et le choix manuel persiste.
- ~~**Le mode recit face a la couche parole**~~ — **tranche le 02/11** :
  option (b), le mode recit DEVIENT la couche parole (section 7).

## 10. Oracles a ecrire avant tout code (ordre propose)

1. `couche-slider.spec.ts` — WCAG 2.5.1 + 2.5.7 : clic ET clavier
   (tabulation, flèches, Origine/Fin) font la meme chose ; jamais un
   bouton de consolation a cote.
2. `couche-focus.spec.ts` — le focus suit le changement de couche, ne part
   jamais sur `<body>`.
3. `couche-morph.spec.ts` — interruptible en vol ; absente sous
   `prefers-reduced-motion` (bascule directe verifiee).
4. `couche-degradation.spec.ts` — sans JS (la parole seule, rien ne
   casse), sans WebGL, connexion degradee -> la bonne couche par defaut.
5. `cible-24px.spec.ts` — les icones de la barre de gauche (existantes +
   le nouvel indicateur) a 24x24 px minimum.

Chaque oracle doit etre vu rouge avant d'ecrire le composant qui le fait
passer (loi n°1 du harnais).

## 11. Ce que cette spec ne couvre pas

Le plan d'implementation detaille (ordre des taches, decoupage en PR,
noms de fichiers graves) vient APRES validation de cette architecture. Les
noms de composants de la section 3 sont une proposition, pas un contrat.

## Criteres d'acceptation de cette etape (la spec, pas le code)

1. Sylvain valide l'architecture section 1-7 (pile, source unique,
   composants, transition, absorption de la barre).
2. Les points de la section 9 restent ouverts et n'empechent pas d'ecrire
   le plan — ils se trancheront a l'oeil ou en implementant.
3. Le plan d'implementation s'ecrit ensuite dans
   `docs/superpowers/plans/`, en commencant par les oracles de la
   section 10.
