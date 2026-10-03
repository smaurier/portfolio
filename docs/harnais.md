# Le harnais

*La base sur laquelle on itere sans la remettre en question. Design :
`docs/superpowers/specs/2026-09-21-harnais-design.md`. Ce document est la
reference : chaque regle y a un **mecanisme** (ce qui la fait respecter) et
une **preuve** (la mesure du depot qui l'a justifiee). Une regle sans
mecanisme n'entre pas ici.*

Etat : **tranche A** (processus, hooks, lints, types) : design 21/09/2026, livree 22/09/2026.
**Tranche B1** (la barre de performance : socle et bureau) : plan 22/09, livree 03/10/2026.
**Tranche B2a** (le telephone emule, rapporte) : plan et livraison 04/10/2026.
Tranches suivantes : B2b le vrai telephone par adb, le temps GPU et les cartes de source, C les oracles de cause,
D les bases du temps reel, E l'infrastructure.

---

## Pilier 4 : la definition du fini

Valable pour toute demande, une ligne de CSS comme une nouvelle direction.
Reprise dans `CLAUDE.md`, relue a chaque session.

1. **L'oracle d'abord, vu rouge.** Aucun correctif ni mecanique sans un
   test qui echoue avant et passe apres. Un test jamais vu rouge ne garde
   rien.
2. **Toute mecanique nait pure.** Une lib avec graine et progres en entree,
   testee a l'unite ; le composant qui la rend est mince.
3. **Les regles de code passent** : `tsc`, `eslint`, les tests unitaires.
   Zero erreur, zero avertissement nouveau.
4. **Rien n'a recule.** `perf-bureau` au vert (cliquet) avant toute
   poussee sur `main` ; `perf-telephone` rapportee. Un rouge sur la barre
   se ferme par un oracle de cause, jamais par un seuil. *(Tranche B.)*
5. **Rien n'a disparu.** Aucun element de scene retire pour tenir une
   barre ; le mouvement reduit montre tout ; la premiere image apres le
   voile est complete.
6. **La cloture rapproche.** `close-the-books` : chaque critere
   d'acceptation coche avec sa preuve, la dette nouvelle inscrite, ce
   document mis a jour si une regle ou un mecanisme a bouge.

### Ce qui bloque quoi

| quoi | mecanisme | contournement |
| --- | --- | --- |
| les types et le lint bloquent tout commit | `scripts/hooks/pre-commit` (`eslint --cache`, le cache sous `node_modules/.cache/eslint/` : vingt secondes a froid, un hook a vingt secondes se contourne) | `git commit --no-verify`, dit dans le message, pour une faille de securite seulement |
| les tests unitaires bloquent toute poussee | `scripts/hooks/pre-push` | idem |
| la barre de performance bloque `main` | `scripts/hooks/pre-push`, `pnpm run --if-present perf` : actif depuis B1 (03/10), construction de production comprise, ~4 min pour l'auto-test, le voile et les cinq defilements | idem |

Les hooks sont installes par `pnpm install` (`prepare` pose
`core.hooksPath`, et sort en 0 sans `.git` pour qu'une archive ou un
`COPY` Docker s'installe quand meme). S'ils ne tournent pas :
`pnpm run prepare`. Ils restent en LF quel que soit `core.autocrlf` du
poste (`.gitattributes`). Mesure du 22/09 : le hook de commit prend 9 a
12 s a chaud (tsc 4,7 s, eslint en cache 5,7 s), 20 s a froid ; le cache
d'ESLint est cle par la config et la version d'ESLint, pas par le code
des regles ; apres une mise a jour d'`eslint-config-next` sans bump
d'`eslint`, supprimer `node_modules/.cache/eslint/`. Les hooks verifient
l'arbre de travail, pas l'index : avec `git add -p`, un commit peut
contenir ce que le hook n'a pas vu ; c'est le prix d'un hook sans mise en scene de l'index (pas de
`git stash`, pas de `lint-staged`) : plus simple, et le cliquet le
rattrape a la poussee.

---

## Pilier 1 : la barre de performance

*Tranche B1, livree le 03/10/2026 : le socle et les huit moments du bureau.
B2 apportera le telephone, les transitions, le budget reparti et le temps GPU.*

**Ce qui est mesure.** Les images PRESENTEES par le compositeur, lues dans
le tracage Chromium (session CDP, domaine `Tracing`) : une trame est un
`PipelineReporter` du fil `Compositor` du processus de rendu, presentee,
partielle, perdue ou sans mise a jour. `requestAnimationFrame` ne voit ni
la 2D du voile ni une image perdue ; le tracage, si. Le coeur est pur et
teste a l'unite (`tests/perf/aides/`, 39 tests) : des evenements en
entree, des trames, des intervalles, des comptes, un verdict.

**Une image en retard** : un intervalle entre deux presentations au-dela
du budget plus une demi-periode (16,7 + 8,3 = 25 ms sur le bureau : elle a
manque un balayage). Une trame perdue entre deux presentees allonge
l'intervalle ; une trame sans mise a jour coupe la serie (rien n'etait a
dessiner). Les trames se trient par instant de presentation (la sequence
repart a 1 a chaque navigation) ; les paires se forment sur toutes les
trames puis se decoupent a la fenetre (un blocage a cheval sur deux
moments n'est perdu d'aucun cote) ; un moment qui n'a pas presente au
moins 20 images ne conclut pas (un zero sur une fenetre vide est un vert
par accident).

**Ce que les deux comptes voient.** Une page avec script emet souvent deux
rapporteurs par balayage (le compositeur seul, puis le fil principal).
Quand le script bloque pendant l'attente du voile, le compositeur continue
de presenter la Piedra : l'intervalle reste court, et c'est le compte des
PERDUES (les images du fil principal tombees) qui porte le blocage. Les
deux comptes sont juges. Mesure du 03/10 : les 617 a 767 ms de blocage du
21/09 se lisent en 18 a 23 perdues et un `ip ...js:394` de 218 a 238 ms en
temps propre, pas en intervalles longs (pire 34 ms).

| mecanisme | ce qu'il fait | preuve |
| --- | --- | --- |
| `playwright.perf.config.ts`, `pnpm run perf` | une seconde suite, sur la PRODUCTION (`build` + `start -p 3100`, 21 s) ; refuse un serveur qui traine sur `:3100` ; projets `auto-test` puis `perf-bureau` (1280 x 800, `dpr` de `PERF_DPR`, 1 par defaut) | on ne melange pas mesurer et verifier ; un serveur d'un autre code serait une mesure d'un autre code. |
| `tests/perf/auto-test.perf.ts` | avant tout, une rotation CSS isolee (page `data:`, aucun script) doit presenter a 60 Hz sans image en retard ni perdue, sinon `perf-bureau` ne tourne pas | il garde le CHEMIN DE MESURE (un compositeur dans la trace, le vsync, le GPU, les drapeaux ANGLE), PAS le bruit de la machine. 03/10 : 24 boucles CPU sur 12 coeurs (le build a pris 2 min au lieu de 37 s), le rendu logiciel force et 40 ms de blocage par image l'ont laisse vert ; 24 boucles en priorite haute ont empeche la page de charger ; un second Chromium n'a pas su saturer le GPU (compteur Windows a 0,14 %). Vu ROUGE par une animation non composee sous blocage : 143 presentees, 72 au-dela, pire 40,7 ms, 102 perdues. Propre : 179 presentees, 0 au-dela, pire 18,4 ms. |
| `tests/perf/voile.perf.ts` | `voile-attente` (premier octet a `data-loaded`), `voile-ouverture` (a `data-foyer=done`), `arrivee` (trois secondes immobiles) ; contexte neuf par passe (premiere visite), un echauffement non mesure | point zero du 03/10, quinze jugements au 04/10 : attente au-dela 5 a 12 (plafond 19), perdues 17 a 28 (plafond 39), pire 34,6 ms ; ouverture au-dela 0 a 2 (plafond 4), perdues 0 ; arrivee 0 partout, pire 19,1 ms. |
| `tests/perf/defilement.perf.ts` | le balayage du jure : haut en bas a vitesse constante, six secondes, sur les cinq pages, `veille=off` | point zero du 03/10, dix jugements au 04/10 : `fr` au-dela 0 a 1 (plafond 2), perdues 0 a 7 (plafond 14) ; `contact` 0 a 1 (plafond 2), perdues 0 a 2 (plafond 4) ; `projets` 0 a 1 (plafond 2), perdues 0 ; `services`, `memoire` : 0 partout, le cliquet est verrouille sur la cible. Pire intervalle 19 a 23 ms. Le bureau tient le balayage. |
| projet `perf-telephone`, `pnpm run perf:telephone` | les memes huit moments sur un Pixel 7 emule (412 x 839, dpr 2,625) : processeur divise par quatre par CDP, Fast 3G des DevTools pendant le voile seulement, budget 33,3 ms ; chaque spec lit son profil par nom de projet (`aides/profil.ts`), le dpr vient du projet ; sous 900 px il n'y a pas de composer, `renderer.info` y est donc vrai (40 a 85 appels, 98 a 166 k triangles) | point zero du 04/10, cinq jugements, un jugement = 7,3 min : attente au-dela 0 a 2 (plafond 4), perdues 27 a 39 (plafond 51) ; ouverture 0 ; arrivee perdues 0 a 5 (plafond 10) ; `fr` 2 a 7 (plafond 12), perdues 30 a 57 (plafond 84) ; `services` 0 a 2 (plafond 4), perdues 0 a 27 (plafond 54) ; `projets` **2 a 21 (plafond 40), perdues 24 a 71 (plafond 118)**, p5 26 a 32 fps ; `contact` 2 a 10 (plafond 18), perdues 18 a 65 (plafond 112), pire 205 ms ; `memoire` 0 a 4 (plafond 8), perdues 9 a 33 (plafond 57). **Rapporte, pas bloquant** : `pnpm run perf` reste le bureau seul ; le telephone bloquera quand son enveloppe aura tenu. C'est le trou que B1 ne voyait pas : le bureau est a 0 partout sur le defilement, le telephone perd 24 a 71 images par balayage sur `projets`. |
| `scripts/perf-baseline.json`, `pnpm run perf:enveloppe`, `pnpm run perf:baseline` | le cliquet : par projet et par moment, une ENVELOPPE par compte (`meilleur` et `maximum` observes sur cinq jugements, `plafond` = maximum + (maximum - meilleur)), la cible a cote, la pire duree, la date, le `dpr` ; **rouge = pire que le plafond, sur un compte** ; `perf:enveloppe` mesure l'enveloppe (point zero, changement voulu, dit dans le commit), `perf:baseline` acquiert un progres sans toucher au plafond | 03/10 : « rouge = pire que le meilleur connu » a rougi 4 fois sur 4 sans code change (au-dela 8/10/9 contre 6) ; un plafond au max de 3 jugements a ete depasse par 4 des 9 jugements de la soiree (un max de K echantillons est depasse une fois sur K+1). Vu rouge avec un plafond a zero : RECUL, code 1, la pire image nommee. Tient sur elle-meme : tenu x3. |
| le bruit | trois passes, mediane par compte ; les comptes avant les durees ; l'enveloppe mesuree ci-dessus. L'auto-test n'en fait PAS partie. **La poussee sur `main` se lance machine libre** : rien ne se construit, aucun modele ne se charge, aucun navigateur ouvert pendant les six minutes | note du 16/09 : une duree varie de quarante points d'une passe a l'autre. 04/10, 01h : la barre a REFUSE une poussee sur `main` (projets 1 au-dela, memoire 2, contre un plafond de 0) pendant qu'un modele d'embeddings se chargeait a cote ; relancee machine libre, 7 verts. Deux faits : un moment a 0 sur cinq jugements a une enveloppe de largeur nulle, donc aucune marge, et l'auto-test ne voit pas ce bruit-la. Le prix est nomme : une derive plus petite que l'ecart mesure passe sur cette machine ; la machine de mesure fixe (design, section 6 ter, chantier 1) resserrera. |
| un rouge n'est jamais nu | chaque rapport porte, pour la pire image, le temps propre du fil principal par etiquette (`FunctionCall`, `EvaluateScript`, `Decode Image`, `Layout`...), et `renderer.info` a la fin du moment | **limites connues** : en production les fonctions s'appellent `O` ou `ip` ; les noms de source viennent avec les cartes de source (B2). `renderer.info` apres le composer ne voit que le dernier `render()` (1 appel, 1 triangle) ; les appels de la scene viennent en B2. |
| `scripts/hooks/pre-push` | lance `pnpm run perf` quand la ref poussee est `main` | en place depuis la tranche A (`--if-present`), actif depuis B1 : premiere poussee gardee le 03/10 (`a17cf72`). |

**Les bornes des moments** sont posees depuis la page par
`console.timeStamp` (`tests/perf/aides/site.ts`) : elles tombent dans la
trace a son horloge, sans conversion. `window.__nahualR3f` est pose sous
`?shaders-prod` (le drapeau des suites de test) pour lire `renderer.info`
sur la vraie production, sans `SONDE` qui allume une dizaine de sondes
dans la boucle.

**Ce qui n'y est pas encore (B2b)** : le vrai telephone par `adb` (la
meme suite `perf-telephone` sur un Pixel reel), les huit transitions par
le Centre, le budget reparti script / soumission / GPU, le temps GPU
(`EXT_disjoint_timer_query_webgl2`), les noms de source, les appels de
rendu de la scene derriere le composer, et l'attribution d'un blocage du
fil principal a un intervalle long quand le compositeur presente seul.

---

## Pilier 2 : les regles qui se lintent

Toutes dans `eslint/harnais.mjs`, regles du coeur d'ESLint, prouvees sur
des extraits dans `tests/harnais/lints.test.ts`. Portee : sous `src/`,
tests unitaires de `lib/` compris.

| regle | mecanisme | preuve |
| --- | --- | --- |
| `lib/` n'importe jamais un composant ni une page (`@/app/**` et `**/app/**`, par alias ou chemin relatif) | `no-restricted-imports` sous `src/lib/**` | 21/09 : vingt et un fichiers de `lib/` importaient `DirectionKey` depuis un composant. Le type vit dans `lib/direction.ts`. **Limite connue** : la regle ne voit pas un `import()` dynamique ; dans une lib pure il n'y en a pas, et la relecture le garde. |
| aucune lecture synchrone du GPU sous `src/` (`getError`, `readPixels`, `getParameter`, `getProgramParameter`, `checkFramebufferStatus`, `getBufferSubData`), sur n'importe quel objet | `no-restricted-properties` | MDN, WebGL best practices : ces appels vident le pipeline. `src/` n'en avait aucun ; les sondes de `tests/` (hors `src/`) et de `.scratch/` (ignore par ESLint) en ont besoin. Sans restriction d'objet a dessein : les contextes du depot s'appellent `g`, `ctx` ou `gl.getContext()`. **Limite connue** : la liste du design fixe six noms ; `finish`, `getShaderParameter`, `getProgramInfoLog`, `getShaderInfoLog`, `clientWaitSync`, `getSyncParameter`, `getUniform` sont aussi synchrones et passent aujourd'hui ; Amende dans le design le 22/09 : liste ouverte, `finish` premier candidat, toute extension passe par le test des extraits (un nom ajoute = un extrait rouge puis vert), tranche C. |
| rien d'alloue dans `useFrame` (objets three : `Vector2/3/4`, `Quaternion`, `Matrix3/4`, `Color`, `Euler`, `Box3`, `Sphere`, `Plane`, `Ray`, `Raycaster`, `Object3D`) | `no-restricted-syntax`, selecteur sur le rappel, a toute profondeur | R3F, performance pitfalls : une allocation par image nourrit le ramasse-miettes. Le motif du depot est `scratch`, cree une fois dehors. **Angles morts connus** : `useFrame(tick)` avec `tick` declare ailleurs, `.clone()` (alloue autant que `new`), `new Float32Array` par image. La relecture les garde. |
| pas de `setState` pilote par la boucle | `no-restricted-syntax`, identifiant nu `set[A-Z]...` **a un seul argument** dans `useFrame` | R3F : React ne re-rend pas a 60 images par seconde ; la boucle ecrit dans des refs. C'est la **loi de la frontiere** : React possede la structure de la scene (monter, demonter, rare), la boucle possede les valeurs (refs) ; enoncee en tranche D (bases du temps reel), le lint en garde deja la moitie. Un setter React prend un argument ; les aides `setXxx(uniforms, valeur)` du depot en prennent deux ou trois (22/09 : 16 des 28 hits du premier jour etaient de celles-la). **Angles morts** : une aide a un argument nommee `setFoo`, un setter renomme, `dispatch` de `useReducer`. |
| plafond de 400 lignes par fichier | `max-lines`, lignes brutes | un fichier qu'on ne tient pas en tete d'un coup se modifie mal. |

### Les cliquets

Deux listes versionnees, lues par la config et gardees par
`tests/harnais/cliquets.test.ts` :

- `scripts/lint-baseline.json` : les fichiers qui violaient les regles de
  la boucle le jour de leur arrivee, geles a leur **meilleur compte connu**
  (en avertissement, les autres en erreur). Point zero du 22/09 : 12
  violations dans 7 fichiers (background-flora 3, milpa 3,
  frost-world 2, xiuhcoatl-companion 1, xolotl-companion 1, grass 1,
  huitzilin-birds 1).
- `scripts/lines-baseline.json` : les fichiers au-dessus de 400 lignes,
  geles a leur taille, comptee comme `max-lines` la compte
  (`scripts/compter-lignes.mjs` ; egal a `wc -l` sur un fichier termine
  par un retour a la ligne, ce que sont tous les fichiers du depot). Dix-huit fichiers le 22/09 (dont deux tests unitaires de `lib/`), le
  plus gros a 1322 (`xolotl-companion.tsx`).

**C'est un cliquet, pas un plafond.** Un fichier gele ne peut ni faire
pire (rien ne recule) ni faire mieux sans que la ligne de base l'inscrive :
`pnpm run harnais:baseline` **acquiert** le progres, sinon 9 puis 3 puis 9
passerait sans bruit. A zero, ou sous 400, le fichier sort. Les chemins a
crochets (`src/app/[locale]/...`) sont echappes avant d'etre donnes a
ESLint, sinon minimatch y lit une classe de caracteres et la derogation
ne s'applique pas ; le test le prouve.

`pnpm run lint` sort en 0 avec des avertissements : les derogations sont
invisibles a la ligne de commande, c'est `tests/harnais/cliquets.test.ts`
qui les garde. Consequence : une violation nouvelle dans un fichier gele
passe le commit (avertissement) et tombe a la poussee.

### Les oracles de cause

Ils comptent, ils ne chronometrent pas. Les six qui existaient avant le
harnais (plafond d'appels de rendu, programmes tardifs, lectures de mise
en page, decor fige, chauffe qui se tait, fuite GPU) seront rattaches ici
en tranche C. Les premiers nes du harnais :

| oracle | ce qu'il garde | preuve |
| --- | --- | --- |
| `tests/e2e/voile-peinture.spec.ts` | pendant l'attente du voile, aucun noeud du voile n'est peint plus de six fois (une fois par calque, deux avec la police) ; plafond total en cliquet | 22/09 : la revelation du texte animait `text-shadow` et `filter: blur()` par lettre, deux proprietes de peinture ; 31 peintures par lettre, 64 pour la traduction, une toutes les 16 ms. Composee (copies en pseudo-elements, `will-change`), six par lettre, groupees en deux instants. Un rouge imprime les noeuds et leurs instants. |
| `tests/e2e/fuite-gpu.spec.ts` (oracle de cause ajoute au compte) | sur tout le parcours, aucune geometrie ne re-entre plus d'une fois dans le compte du moteur : re-entrer, c'est avoir ete disposee pendant qu'elle etait rendue, et renvoyee au pilote a l'image suivante. Une fois est toleree : le StrictMode de developpement joue chaque effet deux fois au montage. Le compteur se lit apres une image rendue. | 22/09 : le compte de geometries etait stable en moyenne et faux a tout instant. L'ocotillo passait a `useLibereToutAuDemontage` un tableau reconstruit a chaque rendu ; l'effet se nettoyait a chaque rendu et disposait les sept tubes d'un bouquet a l'ecran : 65 a 89 re-entrees par tube en six tours, 14 tubes. C'etait le rouge a vide du 20/09 (+18) et du 22/09 (+7 : un bouquet). Tableau memorise, zero re-entree. Un rouge imprime les geometries, leur materiau, et combien de fois. |

**La regle qu'il porte** : la 2D du voile n'anime que `transform` et
`opacity`. Le nom d'une animation est une interface (`reveal-trigger`
ecoute `animationend` par nom) ; on ne le renomme pas.

### Ce qui se relit

Pas de mecanisme automatique ; a verifier a la relecture, avec la preuve
qui dit pourquoi.

- Instanciation et faisceaux pour ce qui se repete. *Preuve : 23 appels
  de rendu de moins a l'Ouest en groupant douze papiers et quatorze plumes.*
- Materiaux et geometries partages, jamais clones par objet.
- `transparent` seulement si l'opacite bouge. *Preuve : 11/09, basculer
  `transparent` change la cle du programme, 300 ms de gel en plein voyage.*
- `will-change` pose au moment du besoin et retire apres.
- `delta`, jamais un pas fixe.
- Mipmaps des qu'une texture se voit de loin.
- Toute variante nouvelle de materiau nait sous le voile, jamais en cours
  d'arc. *Mecanisme : les oracles `programmes-tardifs` et
  `materiaux-stables` (tranche C les rattache ici).*

---

## Pilier 3 : les trois lois

1. **Loi 1.** `lib/` est pure et testee a l'unite ; les composants ne font que rendre.
   *Mecanisme : l'import interdit ci-dessus, `tsc` strict, `pnpm test`.*
2. **Loi 2.** Une regle a une seule source de verite. *Preuve : le 16/09, trois
   lecteurs de l'arc calculaient trois verites ; le 20/09, quarante
   composants court-circuitaient le mouvement reduit chacun a sa facon.*
3. **Loi 3.** Un oracle garde un comportement, jamais un mecanisme. *Preuve : le
   12/09, deux tests du voile visaient une classe CSS et sont morts avec
   elle.*

### L'inventaire de dette

| dette | viole | cout | depuis |
| --- | --- | --- | --- |
| Quarante composants court-circuitent `reducedMotionRef` chacun a sa facon | loi 2 | a fait echouer la pose au repos (`docs/da/pose-au-repos.md`) ; une regle a la place de quarante la rouvrira | 21/09 |
| Dix-huit fichiers au-dessus de 400 lignes, le plus gros a 1322 (`xolotl-companion.tsx`) | lisibilite | geles par le cliquet | 21/09 |
| « Mode recit » et « mouvement reduit » sont deux mecanismes pour une idee | loi 2 | a unifier | 21/09 |
| ~~`DirectionKey` et `CardinalDirection` vivaient dans des composants, et une troisieme copie (`NepantlaDirection`) dans `lib/nepantla.ts`~~ | lois 1 et 2 | corrige le 21/09, tranche A : une seule source, `lib/direction.ts` (`NepantlaDirection` reste un alias) | 21/09 |

---

## Sources

- MDN, *WebGL best practices* : https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- React Three Fiber, *Performance pitfalls* : https://r3f.docs.pmnd.rs/advanced/pitfalls
- web.dev, *Animations guide* : https://web.dev/articles/animations-guide
