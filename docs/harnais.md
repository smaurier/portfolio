# Le harnais

*La base sur laquelle on itere sans la remettre en question. Design :
`docs/superpowers/specs/2026-09-21-harnais-design.md`. Ce document est la
reference : chaque regle y a un **mecanisme** (ce qui la fait respecter) et
une **preuve** (la mesure du depot qui l'a justifiee). Une regle sans
mecanisme n'entre pas ici.*

Etat : **tranche A** (processus, hooks, lints, types) : design 21/09/2026, livree 22/09/2026.
Tranches suivantes : B la barre de performance, C les oracles de cause,
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
| la barre de performance bloque `main` | `scripts/hooks/pre-push`, `pnpm run --if-present perf` : ne bloque rien tant que le script n'existe pas *(tranche B)* | idem |

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

*Tranche B.*

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
