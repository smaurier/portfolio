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

## 0 bis. L'audit du 13/09 : ce qu'il ajoute au backlog

Rapport complet : `audit-13-09.md` (grille, mesures, etat de l'art, ordre
propose). Les entrees ci-dessous en sont la liste de travail.

| # | quoi | oracle | effort | decision |
| --- | --- | --- | --- | --- |
| ~~X1~~ | ~~Le calque de texte n'est pas fixe~~ (fait, 13/09) : `position: fixed`, statique en mode recit ; e2e `calque-fixe.spec.ts` (chapitres et clotures dans la fenetre quand leur opacite vaut 1, cloture effacee sous le pied de page) | vert | S | fait |
| ~~X2~~ | ~~La ligne de seuil sous le bouton du mode recit~~ (fait, 13/09) : `seuil-tete.tsx` dans le calque fixe, en haut a gauche, effacee apres le premier quart de l'arc (`lib/seuil-tete`, teste) ; le contenu des pages echo commence a 100vh | `cloture-seuil.mjs` sans chevauchement | S | fait |
| ~~X3~~ | ~~Le chant et les cartes sous la colonne de boutons sur telephone~~ (fait, 13/09) : couloir de 72 px pour tout le contenu des pages echo et pour le chant ; et la colonne (boutons, son, mode recit, boussole) se retire quand on descend, revient quand on remonte ou au clavier (`dock-sentinel.tsx`) ; les controles n'apparaissent qu'une fois l'arrivee jouee ; test `controls-overlap` etendu a mi-parcours de Memoire | `controls-overlap` vert sur les quatre cadrages | S | fait |
| ~~X4~~ | ~~La cloture et le pied de page~~ (fait, 13/09) : `footer-sentinel.tsx` pose `data-footer-in-view` sur <html> ; calque de texte, cloture, ligne de seuil et colonne de boutons s'effacent quand le pied entre dans le cadre ; le calque laisse 84 px a la derniere rangee de boutons sur ordinateur | `calque-fixe` vert | S | fait |
| X5 | **La barre du metier sur Ouest, Nord, Sud** (partiel, 13/09) : profil telephone 9 000 -> 5 000 brins, 160 -> 120 feuilles, 40 -> 32 meches ; les etapes annexes de la chauffe (simulateurs du Nord) une par image au lieu de toutes dans la meme (la tache de 1,5 s). Les etoiles et colibris du Sud ne sont pas encore reduits sur telephone (leur nombre est une constante partagee, `CENTZON_COUNT`) | `vitals.mjs` Pixel 7 x4, mesure seule du 13/09 au soir : Accueil 60/60, Services 60/60, Projets 60/30, Contact 60/30 (etait 30/30), Memoire 60/60 (pire tache 1 471 -> 1 178 ms) ; blocage au chargement 1,3 a 2,8 s | M | en cours : le 5e centile de Projets et Contact |
| ~~X6~~ | ~~L'image fixe du Centre~~ (fait, 13/09, a regarder) : la lumiere ponctuelle persistante (celle que Xolotl porte au Nord, libre au Centre) eclaire le foyer et le cerf par le bas, intensite suivant l'offrande (`copal-braziers`, `HEARTH_LIGHT` 40). Reste la ligne de premiere arrivee (« Tu reviens » a la premiere visite) : texte a ecrire par Sylvain | capture a 0 % | S | fait, texte a toi |
| ~~X7~~ | ~~Le son, la chaine~~ (fait, 13/09, A ECOUTER par Sylvain) : limiteur en fin de chaine (seuil -18 dB, ratio 8) ; les couches suivent la direction VISEE des le clic (pont pendant le cadre nepantla) ; une convolution generee par direction (Nord 1,1 s, Est 0,35 s) en fondu croise ; les pas du chien panoramiques sur sa position ; la nappe respire sur 40 s ; plus de cloche au clic | l'oreille de Sylvain | M | fait, ecoute attendue |
| ~~X8~~ | ~~Les danseuses~~ (fait, 13/09, a regarder) : posees au sol au carrefour (`landHeight`, bob divise par trois, test), braises x2,2, papiers x2. Pas de lumiere par bol (quatre lumieres de plus recompileraient tous les materiaux a l'arrivee) ni de descente de camera (un choix de mise en scene, a toi) | capture `verif-danseuses-90-zoom.png` | M | fait sauf la camera |
| ~~X9~~ | ~~Le chien~~ (fait, 13/09) : la traverse ralentit sur la margelle (`makeRimWarp`, meme duree totale, temps redistribue ; foulee ralentie avec le corps), deux eclaboussures (une par patte avant) ; la cinematique inverse des pattes existait deja | `lib/xolotl-rim` teste | M | fait |
| X10 | **Profondeur de champ au repos** : deja a `bokehScale` 1,4 au repos depuis le 11/09 ; ce que l'audit voyait net est la profondeur de champ actuelle. Monter plus est un choix a l'oeil | ton oeil | S | a toi |
| X11 | **Le ciel du Sud** (lot 4 du 08/09) : le melange existe deja (`dayWeight`) ; c'est un dosage a l'oeil, pas un bug | ton oeil | S | a toi |
| X12 | **Les sources du Nord** (a toi) et les deux affirmations REFORMULEES le 13/09 dans les trois langues (papillons : les guerriers au livre III, les Cihuateteo par extension, « notre lecture » ; Xolotl : accompagne le soleil, le passeur est un chien sacrifie, « notre lecture ») : A RELIRE par Sylvain | `nord-sources.md` avec livre et folio | S | textes a relire, sources a toi |
| X13 | **Chargement** : decodage meshopt en worker impossible sans toucher a drei (il cree son decodeur a chaque chargement) ; KTX2 attend `toktx` ; SVG du voile (160 Ko) pas encore simplifie | images longues a froid : 6 -> 2 | M | a decider |
| ~~X14~~ | ~~404 et en-tetes~~ (fait, 13/09) : `[locale]/not-found.tsx` dans le monde, trois langues, retour au Centre ; `netlify.toml` : X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP (pas de CSP : chantier a part, nonce) | 404 stylée ; en-tetes en production Netlify | S | fait |
| ~~X15~~ | ~~Le chemin de cempasuchil se vide au repos~~ (fait, 13/09) : retour des fleurs en 4 a 14 s au lieu de 10 a 40 | 60 s au repos : les fleurs sont la | S | fait |

## 0 quater. La profondeur avant la variete (13/09, doctrine)

Sylvain : « on va devoir plutot s'interroger sur la profondeur de chaque
mecanisme utilise et leur interet sur le site ». Dossier complet, avec la
mesure d'une visite type de 78 secondes : `docs/da/profondeur-des-mecaniques.md`.

La regle : une mecanique doit etre **vue** sans qu'on la cherche, avoir une
**seconde lecture**, et **servir le site**. On n'ajoute plus tant que les
mecaniques qui echouent a la premiere question n'ont pas ete reprises.

| # | quoi | etat |
| --- | --- | --- |
| ~~D1~~ | ~~Le miroir n'etait jamais declenche~~ : l'eclat court sur le bord du disque, une fois par session, seulement pour qui n'a jamais choisi sa face (e2e `miroir.spec.ts`) | fait 13/09 |
| D2 | La veille n'est jamais declenchee par un jure qui fait defiler : lui donner une recompense qu'une visite active ne donne pas (decision de recit, avec Sylvain) | a decider |
| ~~D3~~ | ~~La boussole cachee pendant la descente~~ : verifie, faux sur ordinateur (`dock-sentinel` ne joue que sous 767 px) ; c'est le pied de page qui efface les controles quand il est a l'ecran, et c'est voulu (X4). Rien a corriger | verifie 13/09 |
| D4 | Xolotl est un tirage : un jure a peu de chances de le voir | a decider |
| D5 | Mises en attente par la regle : le jour du visiteur (tonalpohualli), la lumiere du lieu, l'image de partage par page | apres D2-D4 |

## 0 sexies. La barre du metier sur telephone : ce que la mesure du 14/09 dit

Mesure sur Pixel 7, processeur ralenti quatre fois, compilation de
production, defilement regulier a travers l'arc :

| page | face | mediane | 5e centile |
| --- | --- | --- | --- |
| Projets | nuit | 59,9 | 20 |
| Projets | papier | 59,9 | 20 |
| Contact | nuit | 30,0 | 15 |
| Contact | papier | 30,0 | 12 |

Deux choses en sortent.

1. **Les calques de matiere ne sont pas le probleme** (grain d'amate, poli
   d'obsidienne) : leur cout est au bord du bruit de mesure. Ils avaient
   tout de meme ete coupes sous 900 px le 14/09 au matin ; **ils sont
   revenus le soir meme**, voir plus bas. C'etait une coupe injustifiee.
2. **Contact est limite par le PROCESSEUR, pas par la geometrie** : il a
   moins d'objets et moins de triangles que Projets (207 contre 233, 158
   contre 172 milliers de triangles) et tourne deux fois moins vite. Le
   profil d'echantillonnage montre la recomposition des matrices et les
   parcours de scene en tete.

**Le levier, chiffre le 14/09** : sur les 855 objets de la scene, 610
recomposent leur matrice a chaque image, et **225 d'entre eux n'ont pas
bouge d'un cheveu en deux secondes**. A l'etalonnage du 10/09 (488 objets
figes valaient 4,1 ms par image), cela represente environ 1,9 ms sur un
budget de 16,7 : de quoi repasser sous la barre, puisque la mediane de 30
est exactement la moitie de 60, donc un depassement de peu.

| # | quoi | effort |
| --- | --- | --- |
| ~~F1a~~ | ~~La cuisson du papier des bandelettes~~ (fait, 14/09) : le profil de Contact, telephone, processeur ralenti, montrait **27,7 % du temps processeur dans le generateur d'amate** (hash, noise, amatePattern). Pas une boucle par image : une cuisson de 256 x 32 par bandelette, plus d'un million de tirages de hachage, REFAITE a chaque montage du composant donc a chaque passage de page. Texture gardee au niveau du module et cuite en demi-resolution sur petit ecran : **27,7 % -> 5,5 %** au profil | fait |
| ~~F1b~~ | ~~Le sol fige~~ (fait, 14/09) : deux maillages poses une fois pour toutes qui recomposaient leur matrice a chaque image | fait |
| ~~F1c~~ | ~~Le reste du decor fige~~ (fait en partie, 14/09) : voir ci-dessous. **73 objets figeables a Contact, 44 apres.** Le reste est laisse libre a dessein, et la raison est ecrite | fait en partie |
| ~~F1e~~ | ~~La chauffe qui ne se taisait jamais~~ (fait, 14/09) : voir ci-dessous, c'est la plus grosse prise de la journee | fait |
| ~~F1f~~ | ~~Le parcours de scene de la capture~~ (fait, 14/09) : 856 objets traverses DEUX fois par image, indefiniment, pour ne rien trouver | fait |
| F1d | **Refaire la mesure d'images par seconde sur une machine au repos.** Celle du 14/09 au soir est inexploitable : mes propres serveurs et compilations saturaient la machine, Contact tombait a 12 images par seconde la ou il en faisait 30 le matin, et un A/B avant/apres n'a montre aucune difference mesurable | S |

### F1e, la prise du 14/09 : la chauffe des shaders recompilait en boucle

En cherchant ou passait le temps de Contact apres la correction du papier,
le profil a montre `WebGLRenderer.compile` **dans la boucle d'images**.

La chauffe des shaders surveille les materiaux pour recompiler ceux qui ont
change avant que le rendu ne le fasse a sa place, en synchrone. Son temoin
etait `material.version`. Mauvais temoin, et pour une raison qui ne se
devine pas : three rend un materiau transparent en double face **en deux
passes**, face arriere puis face avant, et pose `needsUpdate = true` avant
chacune (`renderObject`, et le meme geste dans `prepareMaterial` ; verifie a
la source de r185). La version de ces materiaux grimpe donc de deux a chaque
image, pour toujours, sans que leur programme change d'un cheveu.

La chauffe y lisait un changement, remettait l'objet dans sa file, le
recompilait, ce qui rebougeait la version. Une boucle qui ne s'arretait
jamais, et chaque `compile` parcourt la scene entiere pour ramasser les
lumieres.

**Mesure, production, Pixel 7, processeur ralenti quatre fois**, trois
passes de defilement d'affilee :

| page | appels a `compile` avant | apres |
| --- | --- | --- |
| Accueil | 702 en 702 images (un par image, sans fin) | **0** |
| Contact | 2568 en 669 images (quatre par image) | 43 a la premiere passe, **0** ensuite |
| Memoire | 2614 en 722 images | 11 a la premiere passe, **0** ensuite |

Et Contact finit avec **62 programmes au lieu de 73** : l'ancien code en
fabriquait une douzaine en trop, en pure perte.

La correction tient en une idee : ne plus surveiller la version, mais **ce
qui change vraiment le programme**. Chez nous c'est le nombre de
modificateurs de shader, puisque c'est lui qui entre dans la cle de cache
(`signatureMateriau`, dans `shader-patch.ts`). Pour les materiaux qui ne
sont pas rendus en deux passes, la version reste le bon temoin et continue
d'etre lue : elle attrape ce qui ne passe pas par ce module, comme la carte
d'environnement posee apres coup.

L'oracle qui manquait est `tests/e2e/materiaux-stables.spec.ts` : sur trois
pages, la troisieme passe de defilement ne doit declencher **aucun** appel a
`compile`. Verifie rouge sur l'ancien code (95, puis 560, puis 944 appels,
croissants), vert sur le nouveau.

### F1f : le parcours de scene de la capture

La meme chauffe cherchait les objets nouveaux en parcourant la scene
entiere, a chaque image, et deux fois : une dans sa boucle d'image, une dans
`scene.onBeforeRender`. Soit 1712 visites par image sur Contact, pour ne
rien trouver la quasi totalite du temps.

Or three previent : `Object3D.add` et `attach` emettent `childadded` sur le
parent. Il suffit d'ecouter les objets deja vus (`src/lib/ajouts-scene.ts`,
10 tests) : tant que personne n'a rien ajoute, il n'y a rien a chercher. Le
parcours complet n'a plus lieu que quand un objet a pu apparaitre. Le
contrat est strict et ecrit dans le module : le balayage doit surveiller
TOUT ce qu'il traverse, sinon un sous-arbre entier entre sans reveiller
personne.

Au profil, `traverse` pesait 3,3 % des echantillons a lui seul : il a disparu
du releve.

### F1c : ce qu'on a fige, et ce qu'on a refuse de figer

Figes le 14/09, apres avoir LU que rien n'ecrit jamais dans leur
transformation : les **quatorze hampes d'ocotillo** (posees depuis le 18/08,
alors que leurs fleurs, elles, etaient figees depuis le 11/09 : le gel etait
tombe sur les enfants et pas sur le tronc), le **disque de la piedra** et ses
16641 sommets (seule sa matiere bouge : l'or du gel, la glace, le reflet), et
les trois nuages de points qui ne vivent que par leurs sommets (esprits,
anneau de feu, vapeur des fleches).

**73 objets figeables a Contact, 44 apres** (sonde `figeables2.mjs`, Pixel 7,
processeur divise par quatre).

Ce qu'on a REFUSE de figer, et c'est le plus interessant : une sonde montre
un objet immobile, elle ne montre pas qu'il l'est toujours.

- La **voie lactee** et les **Centzon Huitznahua** recopient la position de
  la camera a chaque image. Ils paraissaient immobiles parce qu'ils etaient
  simplement caches pendant la mesure. Les figer aurait colle le ciel au
  fond de la scene.
- Le **rai du Sud** oriente sa lance et pose son bassin a chaque image.
- Les maillages des **Cihuateteo** et de **Xolotl** sont a l'origine de leur
  groupe : c'est le groupe qui porte la descente et la marche. Immobiles
  tant que la scene ne les a pas appelees.

Le cliquet est `tests/e2e/decor-fige.spec.ts` : au plus trente objets non
grees immobiles recomposent leur matrice, sur trois pages. Il ne voit pas le
decor gree, et sa portee exacte est ecrite dans son entete.

### La regression visuelle est aveugle depuis quelque temps

En verifiant que F1c ne cassait rien, la suite `regression-visuelle` a
echoue sur Services et Projets. **Ce n'est pas F1c** : avec mes
modifications mises de cote, Services echoue plus fort encore (0,46 et 0,24
de pixels differents contre 0,24 et 0,21). Les references datent d'avant les
changements visuels du 13 et du 14 septembre : grain d'amate, poli de
l'obsidienne, pigment, trace du codex, contrastes, fenetres de chapitre.

Elles ne gardent donc plus rien. Les refaire demande de REGARDER les
differences d'abord, ce qui est une decision de Sylvain, pas une commande a
lancer :

    VISUEL=1 pnpm exec playwright test tests/e2e/regression-visuelle.spec.ts --update-snapshots

### La matiere revient au telephone (14/09 au soir)

Sylvain : « je veux absolument ce travail sur l'amate et l'obsidienne ». Il
avait raison de le reclamer : les deux nappes plein ecran, le grain du
papier sur la face claire et le poli de la pierre sur la nuit, avaient ete
coupees sous 900 px le matin meme, au nom d'un cout lu a « 20 puis 15 images
par seconde au cinquieme centile ».

**Cette mesure ne valait rien.** Une mediane d'ecarts d'images ne tombe que
dans quelques paliers (1000/50, 1000/66, 1000/80) : elle ne distingue pas 15
de 20. Remesure sur des fenetres de duree FIXE dont on compte les images, en
ALTERNANT avec et sans pour que la derive de la machine ne decide pas, Pixel
7, processeur divise par quatre, en production :

| face | avec les nappes | sans | ecart |
| --- | --- | --- | --- |
| claire | 216 images | 226 | 4,4 % |
| nuit | 234 images | 225 | **4,0 % a l'envers** |

Les plages se recouvrent (208 a 220 contre 212 a 232). Le cout n'est pas
mesurable, et ce n'est en rien la perte d'un quart des images qui avait
justifie la coupe.

**Ce qui coutait vraiment, c'etait la cuisson**, et elle avait ete coupee
avec les nappes. Rendue au telephone, elle prenait **385 ms d'un seul tenant
sur le fil principal**. Un temps mort du navigateur n'est pas un autre fil :
une tache de 385 ms reste une tache de 385 ms.

La matiere n'a pas ete touchee d'un pixel. Ce qui a change, c'est la facon
de la cuire :

- **par bandes de lignes** (`bakeAmateGrainRows`, `bakeObsidianPolishRows`).
  Chaque pixel ne depend que de ses coordonnees ; deux tests verifient que
  le decoupage rend exactement la meme matiere, octet par octet, tranches
  inegales comprises ;
- **douze temps morts au lieu d'un**, avec une patience bornee a un quart de
  seconde : avec le delai de garde d'origine de deux secondes, une page qui
  charge une scene 3D n'est jamais au repos et la matiere mettait huit
  secondes a se poser ;
- **la face ouverte d'abord** : un visiteur de la nuit voyait sinon sa
  pierre arriver quatre secondes apres la page.

Resultat, meme telephone : **la plus longue tache passe de 385 ms a moins de
100**, et la matiere de la face regardee est posee des la sixieme etape,
environ une seconde. Garde : `tests/e2e/matieres.spec.ts`, qui verifie sur
telephone que la nappe est affichee, qu'elle porte bien son image cuite et
qu'elle se voit.

### Ce que ces corrections ne prouvent PAS

**Aucun gain d'images par seconde n'est etabli.** Les appels evites sont
certains, parce que ce sont des comptes. Le debit, lui, ne l'est pas : la
meme compilation, mesuree deux fois, a rendu 162 puis 254 images sur la
meme fenetre a Memoire. Cette machine ne peut pas trancher. F1d reste
ouvert, et c'est sur un vrai telephone que ca se verra (V3).

## 0 quinquies. L'os a ronger : ce que chaque mecanique peut encore donner (13/09)

Registre complet : `docs/da/mecaniques-du-site.md` (douze familles, six
axes : mythologie, cinematographie, implementation, accessibilite, preuve
de competence, diffusion). Ce qui en sort, par ordre de valeur :

| # | quoi | axes servis | effort |
| --- | --- | --- | --- |
| ~~O1~~ | ~~Enoncer ce que le site sait deja~~ (fait, 14/09) : section « Ce que le monde sait, maintenant » au Codex, calculee chez le visiteur (Venus, annee mexica, cote du midi, jour du tonalpohualli, foyer deja allume) ; lib pure et testee, textes en trois langues. Piege evite : compter les jours depuis la cle du foyer aurait toujours dit « 0 », la cle etant reecrite a chaque visite | fait |
| ~~O2~~ | ~~La page Accessibilite devient une demonstration~~ (fait, 14/09) : bloc « Essaie toi-meme » avec la lecture EN DIRECT du nom accessible de l'element focalise (muette pour les technologies d'assistance, qui l'annoncent deja), l'etat reel du mouvement reduit et ce que le site en fait, et le mode recit a portee de main | fait |
| O3 | **Le retour d'un visiteur connu** : une ligne a la place de « Tu reviens au foyer », qui dise depuis quand | memoire, contenu | S |
| O4 | **La phrase du voile devient la phrase du jour** (la meme toute la journee, reprise au Codex avec sa source) | mythologie, contenu | S |
| O5 | **Une video avec le son** sur Projets ou dans le making-of : le son n'existe pas hors du site | son, diffusion | M |
| O6 | **Le geste du don** de la veille, encore trop discret : decision de recit | cinematographie | M |
| O7 | **La contemplation** (camera a l'heure de Tenochtitlan) est introuvable : la lier a la veille ou au Codex | cinematographie | S |
| O8 | **Le Codex devient une ressource citable** (sources verifiees, fiches par direction) | contenu, diffusion | M |

## 0 ter. Le miroir fumant : les deux faces du monde (13/09, dernier chantier)

Sylvain : « fais-moi un bouton pour switcher au light theme [...] fidele au
theme mythologique [...] de grosses allusions au miroir fumant [...] une
vraie transition cinematographiee aux deux passages ». Dossier de sources
et lots : `docs/da/miroir-fumant.md`.

| # | quoi | oracle | effort | decision |
| --- | --- | --- | --- | --- |
| ~~T1~~ | ~~Le disque, les jetons, la fumee~~ (fait, 13/09) : `lib/theme` (pur, teste), `theme-store`, `miroir-fumant.tsx` (canvas, la fumee monte du disque, couvre, le monde change au milieu de la tenue, se retire), `theme-toggle.tsx` (bandeau + menu mobile), face claire en jetons, `prefers-color-scheme` retire au profit de l'attribut (la nuit par defaut), souffle sonore | e2e `miroir.spec.ts` : ceremonie, persistance avant le premier paint, contraste 4,5:1 sur cinq pages, mouvement reduit, clavier | M | fait, a regarder |
| ~~T2~~ | ~~La scene refletee~~ (fait, 13/09) : `lib/reflet` (pur, teste, identite a k = 0) + `refletStore` lisse par `reveal-lighting` (brume papier, far x 0,85, ambiante x 2,2 papier, directionnelle x 1,15), grade compose dans `post-fx`, Voie lactee effacee, couleur de clear du renderer qui suit la face (la chaine d'effets sort un noir opaque dans le ciel vide : decouverte du 13/09) | e2e `reflet.spec.ts` (luminance du canvas : claire > 0,45, nuit < 0,25, claire apres la ceremonie) : 2/2 ; `miroir.spec.ts` 7/7 | M | fait |
| ~~T3~~ | ~~Direction par direction~~ (fait, 13/09, sur mes choix) : brume moins papier a l'Ouest/Est, dome de ciel en lavis (`uReflet`), astres en disques d'encre (fusion normale a mi-reflet), etoiles du Sud effacees, eau du Nord qui reste d'obsidienne | captures des trois arcs ; unitaires `reflet.test.ts` 10/10 ; e2e reflet 2/2 | M | fait, l'oeil de Sylvain sur l'Ouest |
| ~~T4~~ | ~~Voile, OG, 404 sur la face claire~~ (fait, 13/09) : Piedra a l'encre sur le voile ; la 404 sortait du voile (coquille d'erreur de Next, scripts en ligne jamais executes) : `NotFoundReveal` ; OG reste la nuit | e2e `miroir.spec.ts` (404 : statut, face, voile cache, papier) 8/8 | S | fait |

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
