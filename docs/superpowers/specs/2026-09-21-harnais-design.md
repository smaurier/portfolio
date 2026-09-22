# Le harnais : la base sur laquelle on itere sans la remettre en question

*Design valide section par section avec Sylvain le 21/09/2026. Quatre
piliers, un seul objet : une definition du fini appliquee par des
mecanismes, pas par de la bonne volonte. Ce design livre la base et rien
d'autre : la reparation du voile, la pose au repos et la passe du Sud sont
trois demandes a part, qui viendront chacune par le pilier 4.*

---

## 0. D'ou ca vient

Sylvain, 21/09 : « tout doit etre lisse, a commencer par la 2D du voile ;
aucun element ne doit disparaitre ; quel harnais pour mieux cadrer le dev ».
Puis, precise : « des tests, une exigence de code, rester au niveau de
performance eleve tout le temps, cette architecture presente a chaque chose
que je te demande, les bonnes pratiques WebGL, clean code et clean archi ».
Et le pourquoi : « toute la structure de base qui permet ensuite d'iterer
rapidement sans se demander sur quelle base ca repose ».

**Lisse**, dans ses mots : « aucun ralentissement, 60 Hz minimum, pas
d'image qui bloque, totalement agreable voire satisfaisant pour l'oeil ».
C'est mesurable, et c'est la chance de ce design.

**Aucun element ne doit disparaitre**, dans ses mots, les quatre sens a la
fois : pas de 60 Hz obtenu par retrait ; rien qui apparaisse ou s'evanouisse
pendant le voile ; rien qui manque a la premiere image apres le voile ; le
mouvement reduit montre tout.

**La barre** : deux, sur deux machines. Le PC en production, bloquante. Le
telephone (Pixel 7, processeur divise par quatre), une barre a part, plus
basse, suivie et resserree.

### L'etat mesure le jour du design (le point zero des cliquets)

Le voile, premiere visite, sonde `.scratch/voile.mjs` (compte a partir de
50 ms, donc indulgente), **production** :

| | processeur normal | bride x4 |
| --- | --- | --- |
| l'attente (voile pose) | 9 a 10 images > 50 ms, pire **617-767 ms** | 22 a 32 images, pire 850-967 ms |
| l'ouverture (la fumee se retire) | 0 a 2, pire 67 ms | 11 a 17, pire 117-133 ms |
| apres | 0 | 0 |

Le developpement donne les memes chiffres a l'attente : ce n'est pas un
artefact du serveur de dev. En production, zero image longue apres une
compilation de nuancier : les blocages de l'attente viennent d'ailleurs
(execution de script, decodage), et aucune sonde ne les attribue encore
image par image. C'est le premier oracle de cause a ecrire.

Le defilement, protocole du jure (Pixel 7, processeur /4), 16/09 :

| page | 60 Hz | 30 Hz | 20 Hz |
| --- | --- | --- | --- |
| Services | 97,0 % | 2,8 % | 0,3 % |
| Memoire | 92,1 % | 6,8 % | 0,6 % |
| Accueil | 91,6 % | 5,8 % | 0,9 % |
| Projets | 89,2 % | 8,9 % | 0,9 % |
| Contact | **56,4 %** | **36,0 %** | 6,4 % |

Et sous mouvement reduit, mesure du 20/09 sur les references de la
regression visuelle : l'Est a 61 % et le Sud a 57 % de pixels quasi noirs
dans la bande de scene, contre 0 % a l'Ouest (`docs/da/pose-au-repos.md`).

### La 2D du voile est repeinte, pas composee (trace du 21/09)

Sylvain, sur la production : « il saccade enormement ». Trace CDP de
l'attente (production locale, bureau, `dpr` 1, du premier octet a
`data-loaded`, `.scratch/voile-peinture.mjs`) :

| pendant l'attente (~4 s) | |
| --- | --- |
| peintures (`Paint`) | **504** |
| rasterisations (`RasterTask`) | **2 608** |
| mises en page (`Layout` / `UpdateLayoutTree`) | 125 / 282 |
| images presentees | 259 |
| dont en retard (> 16,7 ms) | **134, soit 52 %** |
| images perdues | 37 |
| pire intervalle | 500 ms |

Le voile devrait ne rien couter au fil principal : ses rotations sont en
`transform`. Or il est **repeint a chaque image**. Les noeuds repeints,
nommes par `DOM.describeNode` dans la meme session (deux passes
identiques) :

| repeints | noeud |
| --- | --- |
| 114 | `#document` — la page entiere |
| 64 | `<p class="translation">` — la traduction de la phrase |
| 37 | `<p class="logoSignature">` |
| 31, 31, 31, ... | chaque `<span class="char">` — les lettres |

**Ce ne sont pas les zones qui tournent.** C'est la revelation lettre par
lettre : `phraseCharReveal` et `translationCharReveal` animent
**`text-shadow`** (l'aberration chromatique rouge / cyan qui se resout, la
« signature glitch dimensionnel » du 31/08) et **`filter: blur()`** sur
chaque caractere, en cascade (`--char-index` x 45 ms puis x 11 ms). Ce sont
deux proprietes de *peinture*, pas de composition : quatre-vingts spans
repeints pendant deux secondes, et le document avec eux. Quand le script
charge et bloque le fil principal (617 a 767 ms d'un coup), ces peintures
attendent, les tuiles de la page ne se rafraichissent plus, et la rotation
— qui, elle, est bien composee — **parait** saccader. L'oeil avait raison
sur l'effet et le spec avait tort sur la cause : l'hypothese des calques
masques est retiree.

**La direction de reparation qui garde l'effet** (le plan la detaillera,
la loi « rien ne disparait » l'exige) : le meme regard — deux copies du
texte, chaude et froide, decalees par `transform: translateX(±3px)` et
fondues par `opacity`, toutes deux composees — au lieu d'une ombre
portee ; et le flou qui se resout par le fondu d'une copie pre-floutee
plutot que par `filter` anime. Meme image a l'arrivee, zero peinture en
route. C'est le **premier rouge nomme** du harnais, avant meme qu'il
existe, et l'oracle de peinture du pilier 2 est celui qui le gardera
ferme.

**Ferme le 22/09** (`docs/superpowers/specs/2026-09-22-voile-2d-composee-design.md`) :
l'oracle `tests/e2e/voile-peinture.spec.ts` a ete ecrit et vu rouge
(31 peintures par lettre, une toutes les 16 ms), la revelation a ete
composee (copies en pseudo-elements, `will-change`, la signature et le
pouls des points cardinaux avec), et l'oracle est vert : six peintures
par lettre, groupees a la naissance des calques et a l'arrivee de la
police. La premiere demande a traverser le harnais entier.

---

## 1. Ou ca vit

| fichier | role |
| --- | --- |
| `docs/harnais.md` | la reference : les regles des quatre piliers, chacune avec son **mecanisme** (oracle, lint, projet Playwright, rituel) et sa **preuve** (la mesure du depot qui l'a justifiee). Une regle sans mecanisme n'y entre pas. Contient l'inventaire de dette, date par ligne. |
| `CLAUDE.md`, section « Le harnais » | six lignes, la definition du fini, relues a chaque session ; renvoie vers `docs/harnais.md`. C'est ce qui rend le tout present a chaque demande. |
| `playwright.perf.config.ts` | la barre : projets `perf-bureau` et `perf-telephone`, serveur de **production** sur `:3100`, hors de la suite par defaut. |
| `tests/perf/` | les tests de la barre (un par moment) et leurs aides, montees depuis `.scratch`. |
| `tests/e2e/` | les oracles de cause, a cote des six existants, meme style : ils comptent, ils ne chronometrent pas. |
| `eslint.config.*` | les regles de code qui se lintent (section 3). |
| `scripts/perf-baseline.json` | les cliquets : le meilleur resultat connu par moment et par projet, avec la cible a cote, et le `dpr` auquel il a ete mesure. Versionne. |
| `scripts/lines-baseline.json` | le cliquet des tailles de fichier : chaque fichier au-dessus du plafond, gele a sa taille du jour ; la config ESLint en genere ses derogations. Versionne. |
| `scripts/hooks/` | `pre-commit` (`tsc`, `eslint --cache`) et `pre-push` (`pnpm test`, puis `pnpm run --if-present perf` quand la ref poussee est `main`), installes par le script `prepare` via `git config core.hooksPath`. **Il n'existait aucun hook git dans le depot** : sans eux, « bloque tout commit » serait une regle sans mecanisme. |

**Comment ca tourne.** La suite de 24 minutes reste ce qu'elle est (serveur
de developpement, comportement). La barre est une **seconde suite**, courte,
sur la production : on ne melange pas mesurer et verifier. `pnpm run perf`
la lance a la demande ; elle est obligatoire avant toute poussee sur `main`.

**Ce qui n'y entre pas.** Aucun tableau de bord, aucun chiffre qu'on
regarde sans qu'il bloque quelque chose.

---

## 2. Pilier 1 : la barre de performance

### Ce qui est mesure

Les **images presentees**, pas la cadence du script. Le tracage Chromium
(session CDP ouverte par `context.newCDPSession(page)`, `Tracing.start`
avec les categories de trame `disabled-by-default-devtools.timeline.frame` ;
Playwright 1.62 n'expose pas de raccourci `startTracing`, verifie) donne
chaque image dessinee et chaque image perdue par le compositeur, avec son
instant. C'est ce qui voit la 2D du voile, animee en CSS sur le fil du
compositeur, que `requestAnimationFrame` ne voit pas.

Par moment, le rapport porte :
- le nombre d'images au-dela du budget, et la pire ;
- la repartition 60 / 30 / 20 Hz (le tableau tenu depuis le 16/09) ;
- les images perdues ;
- **le budget reparti** (section 5) : script, soumission du rendu, GPU ;
- `renderer.info` a la fin du moment : appels, triangles, programmes,
  geometries, textures.

### Les moments, chacun un test

1. L'attente du voile : premiere visite, du premier octet a `data-loaded`.
2. L'ouverture : `data-loaded` a `data-foyer=done`.
3. L'arrivee : trois secondes immobiles apres l'ouverture.
4. Le defilement de chaque page (cinq) : balayage a vitesse constante du
   haut au bas, la methode du jure.
5. Les huit transitions qui passent par le Centre (quatre departs, quatre
   retours). Les diagonales restent sous `passage-continu`, qui garde la
   continuite, pas la cadence.

Dix-sept mesures par projet.

### Deux projets, deux barres

| projet | conditions | cible |
| --- | --- | --- |
| `perf-bureau` | production, sans bridage, 1280 x 800, au `dpr` **de la machine de mesure** (variable `PERF_DPR`, ecrit dans la ligne de base : comparer deux `dpr` n'a pas de sens ; le site plafonne a 2 sur bureau) | **aucune image au-dela de 16,7 ms** |
| `perf-telephone` | Pixel 7 emule, processeur /4 ; reseau lent (Fast 3G, par `Network.emulateNetworkConditions`) sur le seul moment du voile ; **pas de temps GPU rapporte** : c'est le GPU du PC qui rend, le chiffre ne dirait rien du telephone | aucune image au-dela de 33 ms, p5 >= 45 ; resserree passe apres passe |

### Le cliquet

Une barre a zero qui bloque `main` des le premier jour empecherait aussi le
correctif de securite que la regle Netlify exempte. Donc :

- chaque moment tient son **meilleur resultat connu** (`scripts/perf-baseline.json`) ;
- **rouge = pire que le meilleur connu**, c'est-a-dire une regression ;
- quand un moment atteint sa cible, le cliquet s'y verrouille et n'en
  redescend plus ;
- la cible est ecrite a cote du meilleur connu, toujours.

Le premier jour, les cliquets s'initialisent sur l'etat mesure de ce jour
(section 0). Ce n'est pas un vert de complaisance : c'est le point zero.

### Le bruit, traite comme un defaut

Note du 16/09 : une duree sur cette machine varie de quarante points d'une
passe a l'autre. Donc :

- un chargement d'echauffement avant toute mesure (caches navigateur et serveur) ;
- trois passes, la **mediane** par metrique ;
- des metriques de **compte** (images au-dela du budget) avant les durees ;
- **un auto-test de mesure** : la suite commence par mesurer un moment
  connu pour presenter des images en continu sans aucun travail de script
  — **la rotation CSS de la Piedra du voile**, pure animation de
  compositeur — et refuse de conclure si elle y trouve des images longues.
  (Premiere version de cette ligne : « la scene sous mouvement reduit,
  immobile ». Faux : en frameloop `demand`, une scene immobile ne presente
  AUCUNE image, l'auto-test aurait ete vert a vide.) Une barre qui ne sait
  pas quand elle ne peut pas mesurer ment.

### Un rouge n'est jamais nu

La trace porte aussi le fil principal. Pour la pire image d'un moment
rouge, le test imprime les fonctions qui l'ont occupee (temps propre). Puis
la regle : **le correctif part avec un oracle de cause**, sinon le rouge
revient sous une autre forme.

### Ce qui existe monte en grade

`voile.mjs` (les phases du voile), `fps-bureau.mjs` (le balayage et la
repartition), `profil-voile.mjs` (l'attribution), `transition.mjs` (les
taches longues) deviennent les aides de `tests/perf/`. Rien n'est reecrit
qui a deja trouve un defaut.

---

## 3. Pilier 2 : les regles WebGL et 2D

Trois familles de mecanismes, du plus automatique au moins. Chaque regle
entre dans `docs/harnais.md` avec sa preuve.

### Ce qui se linte (regles du coeur d'ESLint, aucun plugin)

| regle | mecanisme | exception |
| --- | --- | --- |
| Rien d'alloue dans `useFrame` : `new Vector3 / Quaternion / Matrix4 / Color / Euler` dans un rappel `useFrame` | `no-restricted-syntax`, selecteur sur le rappel | aucune |
| Pas de `setState` pilote par la boucle | `no-restricted-syntax`, identifiant nu `set[A-Z]...` **a un argument** dans `useFrame` (22/09 : un setter React prend un argument, les aides `setXxx(uniforms, valeur)` du depot en prennent deux ou trois — 16 des 28 hits du premier jour etaient de celles-la) ; en erreur, les fichiers du premier jour geles en avertissement par le cliquet | aucune |
| Aucune lecture synchrone du GPU en production : `getError`, `readPixels`, `getParameter`, `getProgramParameter`, `checkFramebufferStatus`, `getBufferSubData` sous `src/`, sur n'importe quel objet | `no-restricted-properties` | aucune, verifie : **`src/` ne contient aujourd'hui aucun de ces appels**. La chauffe lit `COMPLETION_STATUS_KHR` a travers `program.isReady()` de three, pas en direct ; la regle ne la touche pas. (Premiere version : une exception nommee. Inutile.) **Amendement du 22/09 (relecture de la tache 3)** : la liste est **ouverte** — `finish`, `getShaderParameter`, `getProgramInfoLog`, `getShaderInfoLog`, `clientWaitSync`, `getSyncParameter`, `getUniform` sont aussi synchrones et passent aujourd'hui ; `finish` en premier candidat ; toute extension passe par le test des extraits (un nom ajoute = un extrait rouge puis vert), tranche C. |
| `lib/` n'importe jamais un composant | `no-restricted-imports` sous `src/lib/**` | aucune. Trouve des le premier jour, et pas ou je croyais : **vingt et un fichiers** de `lib/` importent un type depuis un composant (`DirectionKey` depuis `direction-colors`, `CardinalDirection` depuis `cardinal-transition-context`). Les deux types descendent dans `lib/direction.ts` ; les composants les re-exportent. Rouge le premier jour, vert dans le meme plan |
| Plafond de lignes par fichier, en **cliquet** | `max-lines` a 400, lignes comptees comme ESLint et `wc -l` les comptent (`scripts/compter-lignes.mjs`, mesure du 22/09) ; pour chaque fichier au-dessus, une derogation generee depuis `scripts/lines-baseline.json` a sa taille du jour, par un motif echappe (les chemins `src/app/[locale]/` seraient lus comme des classes de caracteres) — il ne peut plus grossir, et **chaque amaigrissement s'acquiert** par `pnpm run harnais:baseline` (un plafond laisserait 1322 puis 900 puis 1322 passer) | dix-huit fichiers, le plus gros `xolotl-companion.tsx` a 1322, geles |

### Ce qui se compte par un oracle

Existants : plafond d'appels de rendu, programmes tardifs, lectures de mise
en page, decor fige, chauffe qui se tait, fuite GPU (palier mesure depuis le
20/09).

Nouveaux :
- **textures** : aucune au-dela de 2048 px hors une liste de heros nommes ;
  KTX2 au-dela d'un poids ; un test sur les fichiers, sans navigateur —
  **y compris les images embarquees dans les `.glb`** (le JSON glTF liste
  ses `images`, l'en-tete de chacune donne sa taille). Verifie le 21/09 :
  `public/` ne contient que **sept** images libres, aucune au-dessus des
  plafonds ; presque toute la matiere du site vit dans les modeles. Un
  oracle qui ne lirait que `public/*.png` garderait un vide ;
- **profil telephone** : sur les constantes qui existent (`mobile-perf.ts` :
  `dprCap` 1,5 telephone / 2 bureau, `postFx` coupe sur telephone,
  `shadows`), un test unitaire ; et **au plus trois lumieres a ombre par
  direction**, comptees dans la scene montee (`castShadow` sur
  `__nahualR3f.scene`), un oracle e2e. (Premiere version : « post-traitement
  a demi-resolution ». Aucune constante ne le porte aujourd'hui : c'etait une
  regle sans mecanisme, elle passe en relecture) ;
- **la 2D du voile** : aucun evenement de mise en page ni de peinture
  pendant l'attente, lu dans la trace de la barre. Si le squelette n'anime
  que `transform` et `opacity`, la trace est vide de « Rendering » ; sinon
  elle nomme l'element ;
- **zero erreur** : aucune erreur WebGL ni erreur console, sur aucune page,
  a aucun moment (section 5).

### Ce qui se relit

Instanciation et faisceaux pour ce qui se repete (preuve : 23 appels de
moins a l'Ouest en groupant papiers et plumes) ; materiaux et geometries
partages ; `transparent` seulement si l'opacite bouge (preuve : 300 ms de
gel le 11/09) ; `will-change` pose au besoin et retire ; `delta`, jamais un
pas fixe ; mipmaps des qu'une texture se voit de loin.

---

## 4. Pilier 3 : clean code, clean archi

### Trois lois, qui existent et qu'on nomme

1. `lib/` est pure et testee a l'unite ; les composants ne font que rendre.
2. Une regle a une seule source de verite (la lecon « trois lecteurs, trois
   verites » du 16/09).
3. Un oracle garde un comportement, jamais un mecanisme (la lecon du 12/09
   sur les tests du voile).

Les mecanismes du pilier 2 (import interdit, plafond de lignes, `tsc`
strict) sont ceux qui les imposent.

### L'inventaire de dette

Une section de `docs/harnais.md`, chaque ligne avec ce que ca viole, ce que
ca coute, et une date. Au premier jour :

| dette | viole | cout |
| --- | --- | --- |
| Quarante composants court-circuitent `reducedMotionRef` chacun a sa facon | loi 2 | c'est ce qui a fait echouer la pose au repos (`docs/da/pose-au-repos.md`) ; une regle a la place de quarante la rouvrira proprement |
| `DirectionKey` et `CardinalDirection` vivent dans des composants | loi 1 | **vingt et un** fichiers de `lib/` importent a l'envers ; corrige par le plan (les types descendent dans `lib/direction.ts`) |
| Deux fichiers de plus de mille lignes | lisibilite | geles par le cliquet |
| « Mode recit » et « mouvement reduit » sont deux mecanismes pour une idee | loi 2 | a unifier |

**Rien de tout ca n'est corrige dans ce design.** Les cliquets empechent
que ca grossisse ; l'inventaire empeche qu'on l'oublie.

### Le rituel de cloture

Toute demande se ferme par `close-the-books` (servo, installe) :
rapprochement contre les criteres d'acceptation, avec preuve.

---

## 5. Pilier 3 bis : les bases du temps reel

Les listes de bonnes pratiques sont des trucs ; les bases viennent de ce
qui rend le temps reel different d'une application. Sept differences, et
ce que chacune impose.

1. **Le temps est le produit.** Une scene est juste si sa reponse est juste
   toutes les 16,7 ms. Donc un **budget d'image reparti** : script <= 6 ms,
   soumission du rendu <= 4 ms, GPU <= 12 ms (ils se recouvrent), de la
   marge. Un moment rouge dit quelle part a deborde.
2. **Deux processeurs, deux horloges.** Une boucle a 60 fps peut cacher une
   scene limitee par le GPU. Donc **le temps GPU est mesure**
   (`EXT_disjoint_timer_query_webgl2` quand il est present ; sinon
   l'epreuve de la demi-resolution : si le fps double, c'est le GPU) et
   ecrit dans chaque rapport **du projet bureau** — sur le projet telephone
   c'est le GPU du PC qui rend, le chiffre serait un mensonge.
3. **Ce qui coute, c'est l'etat, pas les triangles.** Donc plafond d'appels,
   plus **un plafond de programmes distincts par page** et un budget de
   liaisons de textures, lus dans `renderer.info`.
4. **Rien n'existe avant d'etre dessine une fois.** Donc la loi : toute
   variante nouvelle de materiau nait sous le voile, jamais en cours d'arc
   (les oracles existent ; la loi est ecrite).
5. **La memoire est manuelle et se vide dans le noir.** Donc **un budget
   d'octets** : par page, textures chargees estimees (largeur x hauteur x 4
   x 1,33) sous un plafond ; poids des actifs de `public/` sous un plafond.
6. **Tout mute a 60 fps, hors de React.** Donc la loi : React possede la
   structure de la scene (monter, demonter, rare) ; la boucle possede les
   valeurs (refs). Jamais d'etat React pilote par la boucle, jamais de
   structure changee a chaque image.
7. **Le materiel varie de un a quatre, et le telephone est une autre
   machine** (GPU a tuiles : surdessin, post-traitement plein cadre, bande
   passante). Donc **un budget de surdessin** sur le profil telephone,
   defini pour etre compte : le nombre d'appels de rendu par image dont le
   materiau est `transparent` (un compteur pose par `onBeforeRender`, lu
   par la sonde), sous un plafond par page inscrit dans la ligne de base ;
   et **une mesure sur un vrai telephone a chaque jalon**, notee dans
   `soty-etat.md` : rien n'a encore ete vu sur un vrai appareil.

Et deux bases transversales :

- **Le determinisme comme levier de test.** `centzon-stars` est deja « pur
  et deterministe, l'etat de chaque etoile est une fonction du progres et
  du temps ». Donc la loi : **toute mecanique nouvelle nait comme une lib
  pure, graine et progres en entree, testee en huit secondes** ; le
  composant qui la rend est mince. C'est, concretement, iterer vite sans
  douter de la base.
- **Zero erreur, pas « peu ».** MDN : une application WebGL ne devrait
  produire que `OUT_OF_MEMORY` et `CONTEXT_LOST`. Le `GL_INVALID_OPERATION`
  du 14/09 rendait invisible tout ce qui recevait une ombre. Donc l'oracle :
  aucune erreur WebGL ni console, nulle part, jamais.

---

## 6. Pilier 4 : toujours present

### La definition du fini (le texte de `CLAUDE.md`)

Valable pour toute demande, une ligne de CSS comme une nouvelle direction :

1. **L'oracle d'abord, vu rouge.** Aucun correctif ni mecanique sans un test
   qui echoue avant et passe apres.
2. **Toute mecanique nait pure.** Une lib avec graine et progres en entree,
   testee a l'unite ; le composant qui la rend est mince.
3. **Les regles de code passent** : `tsc`, `eslint`, les tests unitaires.
   Zero erreur, zero avertissement nouveau.
4. **Rien n'a recule.** `perf-bureau` au vert (cliquet) avant toute poussee
   sur `main` ; `perf-telephone` rapportee. Un rouge sur la barre se ferme
   par un oracle de cause, jamais par un seuil.
5. **Rien n'a disparu.** Aucun element de scene retire pour tenir une barre ;
   le mouvement reduit montre tout ; la premiere image apres le voile est
   complete.
6. **La cloture rapproche.** `close-the-books` : chaque critere
   d'acceptation coche avec sa preuve, la dette nouvelle inscrite,
   `docs/harnais.md` mis a jour si une regle ou un mecanisme a bouge.

### Ce qui bloque quoi

`tsc` et `eslint` bloquent tout commit — par le hook `pre-commit` de
`scripts/hooks/`, pas par une consigne ; `pnpm test` bloque toute poussee
(tranche A, 22/09 : vingt a cinquante commits par jour, le filet est le
meme pour `main`). La barre bloque `main` seulement — par le hook
`pre-push`, qui lance `pnpm run perf` quand la ref poussee est `main` ;
`dev` reste libre. Les hooks sont installes par `pnpm install` (`prepare`,
qui sort en 0 sans `.git`) et restent en LF (`.gitattributes`).
L'exception de securite de `CLAUDE.md` vaut ici aussi : un correctif de
faille n'attend pas une barre (`--no-verify`, dit dans le message de
commit).

### Le harnais s'entretient par ses propres regles

Une regle sans mecanisme n'entre pas. Une sonde de `.scratch` qui a trouve
un defaut devient un oracle. Les cliquets ne redescendent jamais.
L'inventaire de dette a une date par ligne. Une mesure sur un vrai
telephone a chaque jalon.

---

## 6 bis. Le voile, objet a part entiere du harnais

Sylvain, 21/09, sur la version en production : **« il saccade
enormement »**. C'est l'observation d'un oeil sur la vraie machine, et elle
pese plus que les emulations de la section 0. Le voile est en 2D, il
assure la transition vers le 3D, et il est la premiere chose qu'un jure
voit : il entre dans le harnais comme un objet nomme, pas comme un moment
parmi dix-sept.

**Ce qu'on sait, mesure le jour meme** (section 0) : la rotation des
trois zones est bien composee. Ce qui repeint la page a chaque image,
c'est la revelation du texte — `text-shadow` et `filter: blur()` animes
sur chaque lettre. Le spec a d'abord soupconne les calques masques ; la
trace, avec les noeuds nommes, a tranche autrement. C'est la demonstration
en grandeur reelle de la regle du pilier 1 : un rouge n'est jamais nu, il
nomme.

**L'oracle qui gardera ca ferme** : pendant l'attente, la trace ne doit
contenir aucun evenement de peinture ni de rasterisation attribuable au
voile (pilier 2, « la 2D du voile »). Il est rouge le jour du design, avec
ses noeuds nommes ; la sonde `.scratch/voile-peinture.mjs` est son
prototype et devient son aide.

**Ce que le harnais garde pour le voile, nommement** : l'attente et
l'ouverture comme deux moments de la barre (section 2) ; l'oracle de
peinture (pilier 2) ; « rien ne pop » et « rien ne manque a l'arrivee »
(la definition du fini, ligne 5) ; et la regle que le raccord 2D vers 3D
(les points qui rejoignent la boussole, le point central dans les braises)
se verifie sur le comportement, comme les tests du voile reecrits le 12/09.

**Sa reparation reste la premiere demande** qui traversera le harnais
entier — mais elle part avec une hypothese nommee et un oracle qui la
tranche, au lieu d'une chasse.

---

## 6 ter. L'infrastructure : cinq chantiers, a traiter

Ajoutes a la demande de Sylvain le 21/09. Ce ne sont pas des regles, ce
sont des moyens ; chacun a une premiere marche concrete, et deux
demandent du materiel.

| chantier | ce que c'est | premiere marche | materiel |
| --- | --- | --- | --- |
| 1. Une machine de mesure fixe | la barre tourne sur le PC de dev, qui fait autre chose ; le bruit est traite, pas supprime | la barre refuse de conclure si l'auto-test est bruyant (section 2) ; puis un profil `perf` qui tue tout serveur et process `next` avant de mesurer ; puis une machine dediee (un vieux portable suffit) | oui, a terme |
| 2. Un vrai telephone | l'emulation /4 est un proxy ; rien n'a ete vu sur un vrai appareil | Chrome sur Android par `adb` et le port de debogage distant : la meme suite `perf-telephone` se lance sur un vrai Pixel ; rituel a chaque jalon, chiffres dans `soty-etat.md` | un telephone Android, meme prete |
| 3. Une chaine d'actifs | Draco / meshopt et KTX2 comme etapes de build, pas comme regles a la main | `scripts/optimise-models.mjs` existe ; y ajouter KTX2 pour les textures embarquees et une verification des plafonds (l'oracle des textures) dans la meme passe | non |
| 4. Le decoupage du travail lourd | la chauffe etale les nuanciers sur plusieurs images ; rien ne le fait pour le decodage, l'envoi des textures, la construction des geometries | un ordonnanceur unique `lib/ordonnanceur.ts` (pur, teste) : une file de taches a budget par image, que la chauffe utilise en premier ; c'est le mecanisme qui reparera l'attente du voile | non |
| 5. Les captures GPU | quand la barre dit « GPU » sans dire quoi | rituel dans `docs/harnais.md` : une capture Spector.js sur le moment rouge, lue avant toute correction ; rien a installer dans le site | non |

---

## 7. Ce que ce design ne livre pas

- La reparation du voile (section 6 bis) : la premiere demande qui
  traversera le harnais entier.
- Les chantiers 1 et 2 de l'infrastructure au-dela de leur premiere marche
  logicielle : ils demandent du materiel.
- La pose au repos (`docs/da/pose-au-repos.md`) : rouverte quand les
  quarante court-circuits seront devenus une regle.
- La passe du Sud : le brainstorm du 21/09 a etabli la priorite (les
  colibris, sans les grossir) et les quatre leviers (proximite, geste
  lisible, isolement, son) ; a reprendre sous le pilier 4.
- Toute correction de la dette inventoriee.

---

## 8. Criteres d'acceptation du design lui-meme

Pour `close-the-books`, quand le plan sera execute :

1. `docs/harnais.md` existe ; chaque regle y a un mecanisme et une preuve ;
   l'inventaire de dette a quatre lignes datees. — **Fait, tranche A
   (`862af79`)** pour les regles et lois des piliers 2, 3 et 4 ; les
   sections barre et oracles arrivent avec B et C.
2. `CLAUDE.md` porte la section « Le harnais », six lignes, et renvoie a
   `docs/harnais.md`. — **Fait, tranche A (`862af79`).**
3. `pnpm run perf` lance `perf-bureau` et `perf-telephone` contre un serveur
   de production sur `:3100` ; dix-sept moments par projet ; chaque rapport
   porte compte, pire, repartition, budget reparti, temps GPU, `renderer.info`.
4. L'auto-test de mesure existe et refuse de conclure sur une machine
   bruyante.
5. `scripts/perf-baseline.json` existe, initialise sur l'etat mesure, cible
   a cote de chaque moment ; un moment pire que son meilleur connu est rouge.
6. Un moment rouge imprime les fonctions de sa pire image.
7. Les cinq lints du pilier 2 sont en place ; **aucun** fichier de `lib/`
   n'importe plus un composant (vingt et un le premier jour) ; `max-lines`
   est en cliquet, derogations generees depuis `scripts/lines-baseline.json`.
   — **Fait, tranche A** (`64dd51e` → `2dda2a7`) : chaque regle vue rouge
   sur un extrait avant d'exister (`tests/harnais/lints.test.ts`, 18
   extraits), les deux cliquets gardes par `tests/harnais/cliquets.test.ts`
   ; point zero de la boucle : 12 violations dans 7 fichiers.
12. Les hooks `pre-commit` et `pre-push` sont installes par `pnpm install`
    (script `prepare`) et refusent, respectivement, un commit qui casse
    `tsc`/`eslint` et une poussee qui casse `pnpm test` ou, sur `main`,
    qui recule sur la barre. — **Fait, tranche A (`69fb9c3`, `a2f6552`)**,
    avec la precision : les tests bloquent la poussee et non le commit.
    Vus refuser a vide (commit fautif → code 1, aucun commit cree).
13. L'oracle de peinture du voile a tourne sur la production et son
    resultat est consigne : soit il est vert et l'hypothese des calques
    masques tombe, soit il est rouge et il nomme le calque.
14. Les cinq chantiers d'infrastructure ont chacun leur premiere marche
    livree : l'auto-test bruyant refuse de conclure (1) ; `perf-telephone`
    sait viser un appareil `adb` (2) ; l'optimisation des modeles verifie
    les plafonds de textures (3) ; `lib/ordonnanceur.ts` existe, est teste,
    et la chauffe passe par lui (4) ; le rituel Spector.js est ecrit (5).
8. Les quatre oracles nouveaux du pilier 2 (textures, profil telephone, 2D
   du voile, zero erreur) sont verts ou rouges pour une raison nommee,
   jamais sautes.
9. Les quatre sondes nommees sont devenues des aides de `tests/perf/`.
10. La suite par defaut (24 minutes) est inchangee et reste verte.
11. Chaque oracle nouveau a ete vu rouge avant d'etre vu vert (preuve dans
    le message de commit).

---

## 9. Sources

- MDN, *WebGL best practices* : https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- React Three Fiber, *Performance pitfalls* : https://r3f.docs.pmnd.rs/advanced/pitfalls
- Utsubo, *100 Three.js tips (2026)* : https://www.utsubo.com/blog/threejs-best-practices-100-tips
- web.dev, *Animations guide* : https://web.dev/articles/animations-guide
- Three.js Roadmap, *Draw calls: the silent killer* : https://threejsroadmap.com/blog/draw-calls-the-silent-killer
- Webeyez, *Three.js performance profile guide* : https://webeyez.com/insights/guides/three-js-performance-profile-guide
- Awwwards, criteres et methode d'un jure : cf. `docs/da/soty-etat.md`, revue du 11/09.
