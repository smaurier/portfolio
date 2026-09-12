# Backlog SOTY, par axe

**Ecrit le 11/09/2026 au soir**, a la demande de Sylvain : un axe
d'amelioration concret pour chacun des huit points de la revue du 11/09
(`soty-etat.md`), plus le ralentissement des transitions qu'il a vu.
Chaque item dit ce qu'on fait, pourquoi (la reference), comment on saura
que c'est fait (l'oracle), l'effort, et a qui revient la decision.

Effort : S = une soiree, M = deux ou trois, L = une semaine de soirees.
Decision : « moi » = mesurable et sans arbitrage visuel ; « Sylvain » = un
choix de forme, de texte ou de compromis.

---

## 0. Les transitions entre pages : le ralentissement est mesure, et nomme

Sylvain : « il y a du ralentissement dans les transitions entre les pages ».

**Mesure du 11/09** (production locale, bureau 1440x900, agent utilisateur
Chrome reel, sonde `.scratch/transition.mjs`) : au clic sur un lien
cardinal, le fil principal se fige.

| trajet | plus longue image | taches longues |
| --- | --- | --- |
| Accueil -> Contact | 210 ms, puis 168 | 103, 199, 70 ms |
| Contact -> Memoire | **1 806 ms**, puis 175 | 1 798 ms |
| Memoire -> Accueil | **1 053 ms**, puis 118 | 1 045 ms |
| Projets -> Services | **2 643 ms**, 1 607, 1 372, 422 | 2 634, 1 601, 1 360 ms |

**La cause** (profil du fil principal pendant le voyage, dev, noms lisibles,
`.scratch/profil-navigation.mjs`) : `getProgramInfoLog` a 3 282 ms sur
Projets -> Services et 1 898 ms sur Contact -> Memoire. C'est three qui
compile et lie, de facon SYNCHRONE, les programmes des materiaux de la
nouvelle direction a leur premiere image (36 programmes nouveaux a
l'arrivee sur Memoire, 12 au retour au Centre). La chauffe des shaders
(`shader-warmup.tsx`) regle exactement ce probleme au voile, mais elle ne
tourne qu'au premier chargement.

**Piege de mesure, a retenir** : Playwright en bureau envoie l'agent
« HeadlessChrome », que le site traite comme un robot et sert SANS scene.
Toute sonde bureau doit poser un agent Chrome reel, sinon elle mesure une
page vide (c'est arrive le 11/09 : quatre trajets « propres » qui ne
l'etaient pas).

| # | quoi | oracle | effort | decision |
| --- | --- | --- | --- | --- |
| ~~T1~~ | ~~**L'arrivee chauffee**~~ (fait, `29468c3`) : quand la direction change, le sous-arbre de la nouvelle direction se monte invisible, `compileAsync` le compile en parallele pendant le voyage cardinal (le cadre nepantla dure deja une seconde), et il n'apparait qu'a l'evenement `nahual:shaders-warm`, avec un secours de quatre secondes, comme le voile | `transition.mjs` : 0 image > 100 ms sur les quatre trajets ; `programmes-navigation.mjs` : les programmes montent PENDANT le cadre, pas apres | M | moi |
| ~~T2~~ | ~~Le voyage attend la chauffe~~ (fait, `29468c3`) : le cadre nepantla ne se leve qu'une fois l'evenement recu, pour ne jamais montrer une image figee | e2e : le cadre est encore la a l'instant du premier rendu de la direction | S (avec T1) | moi |
| ~~T3~~ | ~~Test e2e de transition~~ (fait, `29468c3`) : quatre trajets, agent reel, 0 image > 100 ms | la suite e2e | S | moi |

**Mesure apres correction** (`29468c3`, production locale, bureau, pire image du
clic a +9 s) : Accueil -> Contact 211 ms (l'arrivee des porteuses) ; Contact
-> Memoire 176 ms ; Memoire -> Accueil 56 ms ; Projets -> Services 93 ms.

| # | quoi | oracle | effort | decision |
| --- | --- | --- | --- | --- |
| ~~T4~~ | ~~Le montage d'une direction a l'intention coute une image longue~~ (fait : un creneau de montage toutes les deux images, `direction-intent.requestMountSlot` ; dev : trois pics de 114 a 170 ms -> un de 109 ms vers Contact, 214 -> 88 ms vers Services ; le reste est le montage des porteuses, un seul composant) | `transition.mjs` sur la page de depart : 0 image > 100 ms apres le survol | S | moi |
| ~~T5~~ | ~~Un programme tardif a 15 % de l'arc~~ (fait : le lustre des pierres de l'annee et la transparence du serpent basculaient a l'allumage, deux bits de la cle ; planchers poses ; le chien de garde suit les versions par materiau a chaque image et se rejoue juste avant chaque rendu ; en dev, les programmes nes au rendu sont nommes dans `__nahualTardifs`) | `programmes-tardifs.spec.ts` a tolerance zero, cinq pages, trois passages | S | moi |
| ~~T6~~ | ~~La chauffe bavarde~~ (fait : l'evenement ne part qu'aux arrivees et aux cycles qui ont compile quelque chose) | un evenement par cycle utile | S | moi |

**Le voile d'entree, mesure le 12/09** (Sylvain : « on a perdu beaucoup de
choses sur le voile d'entree et je le trouve saccade [...] parfois tout
s'affiche, parfois non »). Sonde `.scratch/voile.mjs` : un navigateur NEUF
par passage (cache de shaders froid, comme une vraie premiere visite), agent
Chrome reel, dev, `?shaders-prod`.

| etat | ceremonie | images > 50 ms pendant le voile | pire image |
| --- | --- | --- | --- |
| avant (contexte vierge) | SAUTEE a chaque fois (`data-hearth="lit"` a 0,6 s), voile ouvert par le secours de 6 s | 13 a 16, 3,9 s en tout | 867 ms |
| decision unique du foyer | jouee (quatre points ranges dans la boussole, sequence finie a 3,5 s) | 15, 3,9 s | 700 ms |
| + porte `isReady()` sur chaque programme | jouee | 7 a 9, 2,2 s | 683 ms (chargement) et 600 ms (carte d'environnement) |
| + carte d'environnement cuite (PNG 27 Ko) | jouee | 6, 1,5 a 1,7 s, toutes avant 2,2 s (chargement des modeles) | 633 a 667 ms (chargement) |

| # | quoi | oracle | effort | decision |
| --- | --- | --- | --- | --- |
| ~~T7~~ | ~~La ceremonie sautait a chaque chargement~~ (fait, 12/09) : FoyerArrival decidait ET notait la visite dans le meme effet ; StrictMode (App Router, dev) joue chaque effet deux fois et la seconde relisait la date que la premiere venait d'ecrire ; en production, RevealTrigger lisait l'attribut a un instant non garanti. Une seule decision par chargement (`foyer-decision.ts`), partagee par les deux composants | e2e `voile-ceremonie.spec.ts` : contexte vierge, jamais `data-hearth`, sequence finie par l'animation, quatre points dans le pont ; puis foyer allume au rechargement ; unitaire `foyer-decision.test.ts` | S | fait |
| ~~T8~~ | ~~Une image longue apres chaque compilation~~ (fait, 12/09) : `compile()` ne coute que 0 a 2 ms (liaison asynchrone), c'est le rendu SUIVANT qui attendait la liaison. La chauffe garde l'objet sur la couche froide jusqu'a `isReady()` (COMPLETION_STATUS_KHR, non bloquant), un programme en vol a la fois, ses textures montees pendant l'attente | 7 a 8 images longues apres compilation -> 0 ou 1 | S | fait |
| ~~T9~~ | ~~La carte d'environnement fabriquee en bloquant 636 ms~~ (fait, 12/09) : le ciel du Mictlan (equirect) en envMap des materiaux physiques, et three fabrique la carte PMREM (trois shaders lourds) a la premiere demande ; meme liee en asynchrone, la generation bloque 600 ms au premier trace (ANGLE/D3D11 compile au trace). Le ciel est un degrade fixe : sa carte est CUITE une fois (`scripts/bake-pmrem.mjs`, `public/env/mictlan-pmrem.png`, 336x128, sRGB) et servie par `mictlan-sky` ; fabrication en trois temps en secours si le fichier manque | zero image longue liee aux shaders pendant le voile | M | fait |
| T10 | **Ce qui reste du voile : le chargement des modeles** (600 a 700 ms vers 0,8 s, deux de 300 ms entre 1,3 et 2 s : decodage meshopt et textures sur le fil principal, pendant la revelation des caracteres). Pistes : textures en KTX2 (V2, `toktx` absent), decodage dans un worker, ou un voile dont les animations ne dependent pas du fil principal (transform/opacity seulement, pas de `filter: blur` par caractere) | images > 50 ms pendant le voile a froid : 6 -> 2 | M | a decider |

---

## 1. Visuel (design, 40)

| # | quoi | pourquoi | oracle | effort | decision |
| --- | --- | --- | --- | --- | --- |
| V1 | **La lumiere cuite** : occlusion ambiante et ombres douces cuites dans une deuxieme UV du decor fixe (sol, Piedra, flore, hampes), une seule texture par modele, la lumiere temps reel gardee pour ce qui bouge | constante 7 des laureats ; le « poids » d'Oryzo ; c'est le dernier NON de la grille d'etat de l'art | avant/apres en capture, ton oeil ; appels de rendu inchanges ; 0 image en retard conservee | L | Sylvain (le rendu) |
| V2 | Textures en KTX2/Basis (verifie le 11/09 : gltf-transform a les commandes `etc1s`/`uastc`, mais il lui faut `toktx` de KTX-Software, absent du poste ; un outil de plus a installer, pour 1 Mo) | constante 7 ; faible priorite | poids des textures, temps d'ouverture | S | moi |
| V3 | Le telephone en USB : echelle typo, cadre, panneaux | rien n'a ete vu sur un vrai telephone | ton oeil | S | Sylvain |

## 2. Narratif (creativite 20, contenu 10)

| # | quoi | pourquoi | oracle | effort | decision |
| --- | --- | --- | --- | --- | --- |
| N1 | **FAIT le 11/09 au soir, tutoiement le 12/09.** Une ligne de seuil par direction, a la deuxieme personne (Sylvain a tranche le 12/09 : tout le site tutoie, en francais et en espagnol ; 41 chaines FR et 28 ES reprises, dont le Codex, les traces, les annonces de route et la page de confidentialite) : les cinq lignes de `docs/da/lignes-de-seuil.md` validees par Sylvain et entrees dans les trois dictionnaires (`common.seuils`), l'exception du test de parite retiree. Mecanique : `seuil-line.tsx` (message de statut pendant le voyage, RGAA 7.5), ligne conservee en tete de page | « une seule idee defendue » d'un bout a l'autre | cinq lignes, trois langues, parite verte | S | fait |
| N2 | **Xolotl, le personnage qu'on suit** : ecrire son role par direction (ou il est, ce qu'il fait, ce qu'il montre), et le tenir | Messenger : un personnage qui porte l'experience | un document `xolotl-role.md`, puis les gestes qui manquent | M | Sylvain |
| N3 | **FAIT le 11/09 au soir.** Le README du depot remplace (`README.md`) : sobre, un « Pourquoi » (angle metier, choisi par Sylvain, qu'il reecrira a son ton), une ligne sur les cantares, les sources dont `nord-sources.md`. Reste : la relecture mot a mot par Sylvain, puis la version anglaise | un recruteur le lit | le README | S | fait, relecture attendue |

## 3. Cinematographique (design 40)

| # | quoi | pourquoi | oracle | effort | decision |
| --- | --- | --- | --- | --- | --- |
| ~~C1~~ | ~~**La liste de plans**~~ (ecrite, `docs/da/plans/`, cinq documents et une grammaire commune ; les arbitrages qu'elle revele sont notes dans chaque fichier : l'angle du zenith au Centre, F1 au Sud, M1 au Nord) | Shopify Editions : chaque section « son propre moment » ; le jure regarde les transitions | cinq documents dans `docs/da/plans/` | M | moi (l'ecriture), Sylvain (les arbitrages qu'elle revele) |
| ~~C2~~ | ~~**Des coupes son sur le voyage cardinal**~~ (fait : le depart avait deja son accord au clic ; l'arrivee a son motif d'element par direction, joue a la chauffe de la direction, jamais au premier chargement, `lib/journey-cues` teste ; a entendre par Sylvain) | Cartier : le son comme couche narrative ; nous avons le carillon du climax, pas les coupes | a entendre ; e2e : la coupe se declenche au voyage | S | Sylvain (a entendre) |
| C3 | La transition elle-meme, T1 : une image figee pendant le voyage, c'est le contraire d'un mouvement dirige | Hon Tran : « des transitions qui portent un sens » | T1 | | |

## 4. Mythologique (contenu 10, creativite 20)

| # | quoi | pourquoi | oracle | effort | decision |
| --- | --- | --- | --- | --- | --- |
| M1 | **`nord-sources.md`** : ecrit a partir du Codex de Florence numerique (Getty), livre 3 « origine des dieux », avec livre et chapitre pour chaque affirmation ; rien d'autre n'entre (verifie le 11/09 : le site du Getty est une application, le texte ne se lit qu'en interagissant ; c'est une lecture, pas une extraction) | notre regle : rien de non source ; c'est le seul fichier de sources qui manque, et le Mictlan est la page la plus exposee | le fichier, chaque ligne citee | M | Sylvain (la lecture), moi (la mise en forme) |
| M2 | Le Codex du site cite livre et chapitre, et renvoie a l'edition numerique | honnetete ; un jure ou un lecteur mexicain verifiera | la page Codex | S | Sylvain |
| M3 | Rester symbolique : pas de reconstitution documentaire, pas de dieu a l'ecran, les Cihuateteo jamais dramatisees une fois descendues | regles posees ; le viewer 3D de Tenochtitlan est l'autre voie | relecture | | Sylvain |
| M4 | **FAIT le 11/09 au soir.** Un chant par direction, choisi par Sylvain parmi mes propositions lues dans les scans de l'edition Leon-Portilla (UNAM, 2011) : Centre chant I strophe 1 (fol. 1r), Est chant II strophe 10 (fol. 2r), Sud LXXV strophe 1320 (fol. 64r-64v), Ouest XVIII strophe 180 (fol. 12v), Nord XVIII strophe 184 (fol. 12v). Nahuatl + espagnol de l'edition + notre traduction FR/EN marquee comme telle (`src/lib/cantares.ts`, test). Visible pour tout le monde, jamais en `sr-only` : `cantar.tsx`, `<figure>` avec `lang` par couche (8.7), `<cite>` et lien vers l'edition ouverte ; sous le contenu des pages echo, en colonne droite de 0 a 82 % de l'arc sur la home (l'image finale reste libre) ; e2e `cantares.spec.ts` (visible en bas de page et en mode recit). Choix et variantes ecartees : `docs/da/cantares-choix.md`. Reste : la relecture des traductions FR et EN par Sylvain | l'accessibilite comme enrichissement pour tous | cinq chants, folios cites, parite, e2e vert | M | fait, relecture des traductions attendue |
| M5 | **Faire LIRE les cantares** (idee de Sylvain, 11/09 au soir) : une piste audio par chant, lue en nahuatl par une voix competente (locuteur natif ou nahuatlato de l'UNAM, de l'INALI ou d'une communaute de la Huasteca ou du Centre), et peut-etre l'espagnol de l'edition ; `<audio controls preload="none">` sous la figure, jamais en lecture automatique (RGAA 4.10, 4.11), le texte deja affiche tient lieu de transcription (4.1, 4.3), un fichier Opus + un repli MP3 de moins de 400 Ko par chant, hors du premier chargement. Le vrai travail est humain : trouver et payer les lecteurs, obtenir un consentement ecrit (voix, credit nomme, usage sur le site), crediter chaque voix. A engager apres le 23/10 | un chant se dit, il ne se lit pas seulement ; les jurys retiennent ce qu'ils entendent | cinq pistes, credits, e2e : aucune lecture automatique | L | Sylvain (les voix, les droits), moi (le lecteur, les tests) |

## 5. Performance (utilisabilite 30)

| # | quoi | pourquoi | oracle | effort | decision |
| --- | --- | --- | --- | --- | --- |
| ~~P1~~ | ~~T1, l'arrivee chauffee~~ (fait) | le plus gros defaut mesure du site ce soir | voir 0. | M | moi |
| ~~P2~~ | ~~**Contact, le contenu**~~ (fait, `6e61d58` : relachements par distance, feuilles par profil, et pour l'herbe la CADENCE de la grille de vent a 30 Hz plutot que moins de brins, la simulation etant par cellule ; bandelettes 73 -> 52 ms/s, herbe 61 -> 30, feuilles 63 -> sous le seuil ; a voir a l'oeil par Sylvain) | le jure teste a CPU x4 et Fast 3G et veut 60 im/s ; Contact est a 34 % d'images en retard sur Pixel 7 | profil en temps propre : bandelettes 85 -> ~45 ms/s, feuilles 75 -> ~50, herbe 85 -> ? ; ton oeil sur les figures | S chacun | Sylvain (les trois) |
| ~~P2b~~ | ~~Le profil telephone allege pour l'Ouest et le Nord~~ (fait, choix de Sylvain : 32 bandes de jupe, relachements reduits partout, simulateurs du bassin un pas sur deux ; bureau inchange ; barre du metier : Contact 372 -> 301 images en retard, Memoire 175 -> 204, dans le bruit) | la barre du metier | S | Sylvain |
| P3 | WebGPU + TSL, la branche garee | la voie 2026 (IVRESS) ; « enormement de choses cassees » le 06/09 | fps >= WebGL sur les cinq pages, parite visuelle | L | Sylvain, **pas avant le 23/10** |
| P4 | Mesure reelle sur nahual.fr au premier build d'octobre, puis panel a froid | tout est mesure en local | Lighthouse mobile, `transition.mjs` sur nahual.fr | S | moi |

## 6. Tests

| # | quoi | pourquoi | oracle | effort | decision |
| --- | --- | --- | --- | --- | --- |
| ~~Q1~~ | ~~**e2e : 0 programme compile en cours d'arc**~~ (fait, `tests/e2e/programmes-tardifs.spec.ts`, cinq pages, ligne de base huit secondes apres le voile pour laisser passer la pre-compilation de l'intention), sur les cinq pages (la sonde `programmes-tardifs` promue en test) | c'est deterministe, et c'est ce qui casse a chaque materiau ajoute | la suite e2e | S | moi |
| ~~Q2~~ | ~~e2e : plafond d'appels de rendu par page~~ (fait, `tests/e2e/appels-de-rendu.spec.ts` : bureau, passes du post-traitement comprises, mesure du 11/09 : Accueil 167, Services 131, Projets 203, Contact 212, Memoire 157 ; plafonds a +15 %) | deterministe ; le 09/09 le Sud etait a 1 349 sans que rien ne le dise | la suite e2e | S | moi |
| ~~Q3~~ | ~~T3, e2e de transition~~ (fait) | | | S | moi |
| Q4 | Regression visuelle a seuil perceptuel (essaye le 11/09 : sous mouvement reduit, deux passages identiques different encore de 2 a 13 % des pixels ; la suite existe, `regression-visuelle.spec.ts`, sur demande VISUEL=1 seulement, a 20 % de tolerance, detecteur de desastres) | un site vivant se casse en silence | il faut un etat de scene reellement fige (la pause plus un temps de simulation gele) et une machine de reference | M | moi, apres le premier build d'octobre |

## 7. Accessibilite (utilisabilite 30)

| # | quoi | pourquoi | oracle | effort | decision |
| --- | --- | --- | --- | --- | --- |
| ~~A1~~ | ~~**Une commande de pause du mouvement**~~ (fait : bouton « Figer la scene » / « Reprendre la scene », touche G, trois langues, la boucle de rendu coupee, l'image reste, le texte vit ; gagne sur la contemplation ; libelles a corriger par Sylvain ; test e2e `pause-du-mouvement.spec.ts`) | WCAG 2.2.2 : tout mouvement automatique de plus de cinq secondes doit pouvoir etre mis en pause par l'utilisateur ; la preference systeme ne suffit pas a un audit | axe ; e2e : le bouton fige la scene ; ton audit | S | Sylvain (le libelle), moi |
| A2 | **L'audit RGAA du site par toi**, lot 3 (documents 10.11 / 13.9 de l'examen) | c'est le vrai test, et un entrainement d'examen | la grille | M | Sylvain |
| ~~A3~~ | ~~Focus visible et ordre de tabulation~~ (fait : `tests/e2e/clavier.spec.ts`, en haut de page et apres l'acte de sortie, la suite atteinte par Tab est celle du document, chaque element porte un contour, le lien d'evitement arrive a l'ecran ; le lien de cloture en tabIndex -1 est un choix du 29/08, le header offre la meme destination) | tout ce qui est dans la scene doit exister hors de la scene | e2e clavier | S | moi |

## 8. Novateur (creativite 20)

| # | quoi | pourquoi | oracle | effort | decision |
| --- | --- | --- | --- | --- | --- |
| I1 | **Le son en partition** : par direction, un motif d'arrivee, une tenue, une coupe de sortie, toujours generatifs, jamais d'echantillon | Cartier : partition Web Audio comme couche narrative ; nos nappes sont la, pas la partition | a entendre ; e2e : les evenements sonores aux actes | M | Sylvain (a entendre) |
| I2 | Un geste cache par direction, qui recompense l'exploration (nous avons l'oeuf de Paques et les traces) | Cartier ; « gestes caches qui recompensent » | cinq gestes decrits puis faits | M | Sylvain |
| I3 | La manette et le clavier documentes comme des traits du site (README, page accessibilite) | rare sur un portfolio, invisible si on ne le dit pas | le README, la page | S | Sylvain |

---

## L'ordre propose

1. T1 + T2 + T3 (moi) : le defaut mesure le plus lourd, et c'est ce qu'un jure regarde en premier.
2. Q1 + Q2 (moi) : deux tests deterministes qui gardent ce qui est acquis.
3. A1 (S), N1 (S), C2 (S) : trois soirees courtes, chacune avec un choix de toi.
4. P2 : les trois arbitrages de Contact, quand tu as vu la page.
5. V1, C1, M1, I1 : les chantiers longs, apres le 23/10, dans cet ordre.
