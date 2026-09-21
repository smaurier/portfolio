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
| `scripts/perf-baseline.json` | les cliquets : le meilleur resultat connu par moment et par projet, avec la cible a cote. Versionne. |

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
(CDP `Tracing`, categories de trame `disabled-by-default-devtools.timeline.frame`)
donne chaque image dessinee et chaque image perdue par le compositeur, avec
son instant. C'est ce qui voit la 2D du voile, animee en CSS sur le fil du
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
| `perf-bureau` | production, sans bridage, 1280 x 800, `dpr` 2 (le cout reel de l'oeil) | **aucune image au-dela de 16,7 ms** |
| `perf-telephone` | Pixel 7 emule, processeur /4 ; reseau lent (Fast 3G) sur le seul moment du voile | aucune image au-dela de 33 ms, p5 >= 45 ; resserree passe apres passe |

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
  connu pour etre fige (la scene sous mouvement reduit, immobile) et refuse
  de conclure si elle y trouve des images longues. Une barre qui ne sait
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
| Pas de `setState` pilote par la boucle | `no-restricted-syntax`, heuristique `set[A-Z]...(` dans `useFrame`, en avertissement | aucune |
| Aucune lecture synchrone du GPU en production : `getError`, `readPixels`, `getParameter`, `getProgramParameter`, `checkFramebufferStatus`, `getBufferSubData` sous `src/` | `no-restricted-properties` | **`COMPLETION_STATUS_KHR`**, la lecture non bloquante que la chauffe utilise et que MDN recommande |
| `lib/` n'importe jamais un composant | `no-restricted-imports` sous `src/lib/**` | aucune. Trouve des le premier jour : `arc-day.ts` importe `DirectionKey` depuis `components/stag-scene/direction-colors` ; le type descend dans `lib/` |
| Plafond de lignes par fichier, en **cliquet** | `max-lines` : 400 pour les nouveaux ; les gros existants geles a leur taille | `sound-design.tsx` (> 1100), gele |

### Ce qui se compte par un oracle

Existants : plafond d'appels de rendu, programmes tardifs, lectures de mise
en page, decor fige, chauffe qui se tait, fuite GPU (palier mesure depuis le
20/09).

Nouveaux :
- **textures** : aucune au-dela de 2048 px hors une liste de heros nommes ;
  KTX2 au-dela d'un poids ; un test sur les fichiers de `public/`, sans
  navigateur ;
- **profil telephone** : `dpr` plafonne a 2 (`DESKTOP_DPR_CAP` existe),
  au plus trois lumieres a ombre, post-traitement a demi-resolution ; tests
  unitaires sur les constantes de profil ;
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
| `DirectionKey` vit dans un composant | loi 1 | un import inverse dans `lib/` |
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
   ecrit dans chaque rapport.
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
   passante). Donc **un budget de surdessin** sur le profil telephone
   (couches transparentes plein ecran comptees), et **une mesure sur un vrai
   telephone a chaque jalon**, notee dans `soty-etat.md` : rien n'a encore
   ete vu sur un vrai appareil.

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

`pnpm test` et `eslint` bloquent tout commit. La barre bloque `main`
seulement ; `dev` reste libre. L'exception de securite de `CLAUDE.md` vaut
ici aussi : un correctif de faille n'attend pas une barre.

### Le harnais s'entretient par ses propres regles

Une regle sans mecanisme n'entre pas. Une sonde de `.scratch` qui a trouve
un defaut devient un oracle. Les cliquets ne redescendent jamais.
L'inventaire de dette a une date par ligne. Une mesure sur un vrai
telephone a chaque jalon.

---

## 7. Ce que ce design ne livre pas

- La reparation du voile (l'attente a 617 ms, l'ouverture sur telephone) :
  la premiere demande qui traversera le harnais entier.
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
   l'inventaire de dette a quatre lignes datees.
2. `CLAUDE.md` porte la section « Le harnais », six lignes, et renvoie a
   `docs/harnais.md`.
3. `pnpm run perf` lance `perf-bureau` et `perf-telephone` contre un serveur
   de production sur `:3100` ; dix-sept moments par projet ; chaque rapport
   porte compte, pire, repartition, budget reparti, temps GPU, `renderer.info`.
4. L'auto-test de mesure existe et refuse de conclure sur une machine
   bruyante.
5. `scripts/perf-baseline.json` existe, initialise sur l'etat mesure, cible
   a cote de chaque moment ; un moment pire que son meilleur connu est rouge.
6. Un moment rouge imprime les fonctions de sa pire image.
7. Les cinq lints du pilier 2 sont en place ; `arc-day.ts` n'importe plus un
   composant ; `max-lines` est en cliquet.
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
