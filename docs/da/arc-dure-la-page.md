# L'arc dure la page

*Spec de design, 18/09/2026. Issu d'un brainstorm avec Sylvain sur le
reequilibrage des directions avant Awwwards ; premiere passe choisie : le
Nord. Tout ce qui est decide ici l'a ete par lui, dans l'ordre note en
section 1. Rien n'est ouvert : ce qui n'est pas tranche est explicitement
hors perimetre (section 9).*

---

## 1. D'ou ca vient

Le jury du 08/09 (`plan-jury.md`) notait le Nord 7 : « disque grave
lisible, grotte, nappe d'eau, cempasuchil, Xolotl », coule par « la page la
plus longue, donc arc dilue ». La mesure du 18/09 precise le diagnostic, et
il n'est pas celui-la.

L'arc du site fait **deux hauteurs de fenetre partout** (`ARC_SCROLL_VIEWPORTS
= 2`, `lib/reveal-arc.ts`), quelle que soit la page. L'acte de sortie occupe
la derniere demi-fenetre. Entre les deux, la scene attend, posee, pendant
que le visiteur lit. Sur bureau (1440 x 900) :

| page | hauteur | l'arc finit a | mots lisibles |
| --- | --- | --- | --- |
| Centre | 3,7 fenetres | 54 % | ~360 |
| Est | 4,4 | 46 % | ~180 |
| Ouest | 4,1 | 49 % | ~170 |
| **Nord / Memoire** | **7,8** | **26 %** | **~630** |
| Sud / Projets | 8,6 | 23 % | ~200 |

Memoire porte trois fois plus de texte que n'importe quelle autre page.
L'arc ne s'y dilue pas : **il finit quand le visiteur a lu un quart de la
page**, et les trois quarts restants se lisent sur une scene qui a fini son
histoire.

Les choix de Sylvain, dans l'ordre :

1. Reussir le reequilibrage, c'est d'abord rendre visible ce qui existe,
   puis un moment signature par direction ; degonfler l'Est est un critere
   applique a chaque geste, pas une etape. **« Compter pareil » est retire
   du cadrage le 19/09** : Sylvain en a doute, et l'etat de l'art tranche
   (section 11). Le reequilibrage se fait par la profondeur et par le haut,
   jamais par l'ajout.
2. Commencer par le Nord, dont le probleme est de rythme, pas de gestes.
3. Prendre le probleme a l'envers : ce n'est pas le texte qui doit se
   plier a l'arc, c'est **la scene qui suit le texte**.
4. Le suivre par la *position* dans le texte (l'arc etire, continu), et non
   par sa structure ou par ce qu'il dit.
5. Pour **tout le site**, pas pour le Nord seul : une seule regle.
6. Sans scroll ralenti : ce que le site cherche est de la place, pas de la
   lenteur, et une molette qui repond differemment d'une page a l'autre est
   exactement ce qu'un visiteur sent sans le nommer et qu'un jury nomme.
7. Le plancher a 2 fenetres, la valeur d'aujourd'hui.

---

## 2. La regle

> **L'arc dure toute la page, moins la fenetre de sortie, et jamais moins
> que deux fenetres.**

En trois lignes pures, dans `lib/reveal-arc.ts` :

```
longueurArc(vh, maxScroll) = max(ARC_MIN_VIEWPORTS * vh, maxScroll - EXIT_SCROLL_VIEWPORTS * vh)
arcProgress(scrollY, vh, maxScroll) = clamp(scrollY / longueurArc(vh, maxScroll))
exitProgress : inchange -- il demarre a max(fin d'arc, maxScroll - fenetre)
```

avec `ARC_MIN_VIEWPORTS = 2` (l'ancien `ARC_SCROLL_VIEWPORTS`, renomme pour
dire ce qu'il est devenu : un plancher) et `EXIT_SCROLL_VIEWPORTS = 0,55`
(inchange).

**L'invariant que la regle fabrique** : l'arc finit exactement la ou la
sortie commence. Il n'y a plus de zone morte entre les deux.

Verifie a la main le 20/09, et il est **plus large que ce que ce spec
s'accordait** : il ne vaut pas seulement au-dessus du plancher, il vaut sur
toute page dont le defilement depasse deux fenetres. Le debut de la sortie
est `max(arcScrollHeight, maxScroll - 0,55 vh)` ; en dessous de 2,55
fenetres c'est le plancher qui gagne des deux cotes, au-dessus c'est
`maxScroll - 0,55 vh` des deux cotes. Les deux bornes sont la meme
expression, donc elles coincident partout. Corollaire a garder en tete :
`exitProgress` ne change de valeur sur **aucune** page, longue ou courte.

`maxScroll` vaut `document.documentElement.scrollHeight - innerHeight`. Si
elle est absente ou non finie, la longueur retombe sur le plancher : aucun
`NaN` ne peut sortir de ces fonctions.

Un cas trivial, dit pour qu'il ne soit pas deduit : le mouvement reduit ne
fait pas progresser l'arc (choix du 28/08). Il ne le fera toujours pas.

---

## 3. Ou ca se code

Une seule source de progres, et **deux** lecteurs seulement -- la relecture
du 20/09 en a retire un troisieme au lieu de le migrer.

- **`src/lib/reveal-arc.ts`** : les trois fonctions ci-dessus. Le seul
  fichier qui connait la regle. `maxScroll` y est un parametre **requis**,
  pas optionnel : un parametre optionnel laisserait un appelant oublie
  retomber en silence sur l'ancienne longueur, vert par accident. Requis,
  c'est `tsc` qui tient l'oracle.
- **`src/app/components/stag-scene/scene-refs-context.tsx`**, `handleScroll` :
  ecrit `progressRef` avec la nouvelle signature. Il lit deja `scrollHeight`
  a chaque evenement de defilement pour la sortie ; l'arc lira la meme
  valeur au meme endroit. C'est un gestionnaire de defilement, pas la boucle
  de rendu : l'oracle `lectures-de-mise-en-page` reste vrai sans rien
  changer.
- **`src/app/components/scene-controls.tsx`** : `arcPixels()` passe
  `maxScroll`. Ses **quatre** consommateurs (le lien `?t=`, la sauvegarde de
  visite, la contemplation, la copie du lien) sont tous pilotes par un
  evenement ou par un clic, et `startCinematic` capture la longueur **avant**
  sa boucle d'image (elle n'y est jamais relue) : aucune lecture de mise en
  page n'entre dans une boucle par ce fichier. Verifie ligne a ligne le
  20/09.

**`sound-design.tsx` ne prend pas `maxScroll` : il cesse de calculer l'arc.**
C'est la correction de fond du 20/09, et elle repare un defaut qui existait
avant ce design. Ses trois appels a `arcProgress(scrollY, innerHeight)` ne
sont pas de meme nature : celui du bourdon de chaleur du Sud est **dans un
`requestAnimationFrame`**. Lui passer `maxScroll` aurait fait lire
`document.documentElement.scrollHeight` soixante fois par seconde --
exactement la lecture de mise en page que la passe du 16/09 a retiree de six
endroits, et sur la page (Projets) dont l'arc grandit le plus.

L'oracle `lectures-de-mise-en-page` ne l'aurait pas vu : il ne tourne que sur
`/fr` et `/fr/contact`, et cette boucle est gardee par
`!muted && soundDirection === "turquoise"` -- muette et hors direction dans
les deux cas. Vert par accident. Le defaut etait deja la, d'ailleurs : cette
boucle lit `scrollY` et `innerHeight` a chaque image depuis toujours.

Les trois appels lisent donc **`progressRef`** via `useSceneRefs()`
(`SoundDesign` est monte sous `SceneRefsProvider`, layout `[locale]` 366 →
516). Zero calcul, zero lecture de mise en page, et la source unique est
tenue plus fort qu'avec la meme fonction appelee trois fois.

**Ce que ca change, et c'est l'arbitrage de Sylvain du 20/09 : sous mouvement
reduit, le son gele avec la scene.** Aujourd'hui le bourdon du Sud chauffe
jusqu'a midi pendant que l'image, elle, est figee sur la nuit de Coatepec :
le son et l'image racontent deux choses differentes. Demain ils racontent la
meme. Ce n'est pas une perte pour le visiteur en mouvement reduit :
`remapSouthArc(0).day` vaut exactement 0, et le bourdon est concu inaudible
la nuit (« la nuit il est inaudible ; a midi il chauffe »). Il n'est pas
supprime, il est a sa valeur de nuit -- celle que l'image montre.

Une consequence mineure, notee pour ne pas etre decouverte : les effets des
enfants se jouent avant ceux du parent, donc l'ecouteur de defilement de
`sound-design` est enregistre avant celui du fournisseur et lit un
`progressRef` vieux d'un evenement. Sur un seuil franchi en dizaines
d'evenements (la cloche du climax), c'est quelques pixels.
- **Tout le reste** lit `progressRef` et ne change pas : `getRevealFloor`,
  `getMilpaGrowth`, les remaps par direction (`remapNorthArc`,
  `remapWestArc`, `sud-arc`, `est-arc`), le plancher de revelation, la
  camera, le givre. Leur *forme* est preservee ; seule la longueur sur
  laquelle ils s'etalent change.

Ce qui est retire : `ARC_SCROLL_VIEWPORTS` comme longueur fixe. Ce qui n'est
pas ajoute : aucune hauteur minimale CSS. Toutes les pages actuelles ont
plus de 2,5 fenetres de defilement, une regle CSS ne servirait qu'a une page
qui n'existe pas ; une page plus courte que le plancher aurait un arc qui ne
se finit pas, ce qui est deja le cas aujourd'hui.

---

## 4. Ce que ca fait a chaque histoire

Bureau, 1440 x 900, plancher a 2.

| direction | arc aujourd'hui | arc demain | ce qui bouge |
| --- | --- | --- | --- |
| Centre | 2,0 fenetres | 2,1 | rien de visible |
| Est | 2,0 | 2,8 | la glace eclate 40 % plus bas en pixels, toujours avant la lecture des services |
| Ouest | 2,0 | 2,6 | les porteuses arrivent un peu plus bas |
| **Nord** | 2,0 | **6,2** | la descente au Mictlan dure toute la lecture ; le huitieme niveau, les eaux noires, coincide avec la fin de la memoire |
| **Sud** | 2,0 | **7,1** | la Piedra s'allume vers 3,5 fenetres, en pleine grille ; la frappe du serpent tombe vers 5 |

**Le Sud, dit en face.** La sonde de visite type (13/09) montre que peu de
visiteurs descendent jusqu'au dernier tiers ; en etirant l'arc, la frappe
recule la ou moins de gens vont. Ce design **n'y fait pas exception** : deux
regimes sur le site est ce que le choix 5 ecarte. Le climax du Sud est le
probleme du Sud, celui de ses signes qui ne portent pas (colibris
minuscules, serpent present une fois sur trois), et il a sa propre passe,
la suivante du reequilibrage. Ce design lui livre une **mesure** (section
7), pas un bricolage de son remap.

**Le telephone.** Les pages y font deux a trois fois plus de fenetres, donc
les arcs y seront deux a trois fois plus longs en ecrans. C'est coherent avec
le choix 4 (l'histoire suit le texte, et le texte se lit au meme rythme
partout), mais c'est un vrai changement : aujourd'hui l'arc fait deux ecrans
sur tout appareil. **Pas de plafond** : un plafond « qui ne se declenche
jamais sur bureau » serait du code speculatif. On mesure sur Pixel 7
(section 7) ; si un arc y devient absurde, un plafond en fenetres est une
ligne, et ce sera une decision prise sur un chiffre.

---

## 5. Ce qui ne change pas

- Le mouvement reduit : l'arc ne progresse pas (28/08), le mode recit
  accessible reste l'alternative. Ce qui change, c'est que le **son** le
  suit maintenant au lieu de continuer sans lui (section 3, arbitrage du
  20/09).
- L'arrivee en haut de l'arc a chaque navigation (16/09) : la descente
  glisse vers zero pendant le passage, `garantirLeHaut` en filet.
- La sortie ancree au bas de la page (F2, 10/09) : meme fonction, meme
  fenetre ; elle commence desormais exactement a la fin de l'arc au lieu de
  « jamais avant ».
- La page qui change de hauteur apres coup (images, cartes) : `maxScroll`
  est relu a chaque evenement de defilement, comme pour la sortie
  aujourd'hui. Jamais perime, rien a observer.

### Ce qui change et qu'il faut avoir dit (20/09)

La fraction d'arc n'est pas qu'une valeur de calcul : `scene-controls`
l'**ecrit quelque part** a deux endroits, et sa signification change sous
les pieds de ce qui l'a ecrite.

- **`?t=`, le lien de l'instant.** Un lien deja partage vise `t x 2
  fenetres` ; apres, `t x 6,2` sur Memoire. Le lien ne montre plus le meme
  moment. **Assume**, sur un raisonnement et non sur un fait verifie : un lien
  de ce genre est une invitation a voir la page telle qu'elle est
  aujourd'hui, pas une archive. Si des liens `?t=` ont ete diffuses quelque
  part (Sylvain seul peut le dire), la question se repose : il faudrait
  alors versionner le parametre, `?t2=`, et ignorer l'ancien.
- **« Reprendre », `localStorage`.** `t = scrollY / arc` est ecrit a chaque
  visite. Un visiteur qui revient apres la mise en ligne avec un `t = 0,9`
  d'avant serait renvoye a `0,9 x 6,2 = 5,6` fenetres, tres loin sous
  l'endroit ou il s'etait arrete. Ca se repare a la visite suivante, mais la
  premiere est fausse, et silencieuse. **Corrige** : la cle passe a
  `nahual-last-visit-v2`. Une ligne, et le cas n'existe plus. L'ancienne cle
  n'est pas lue ni migree : une position d'arc d'avant n'a pas de traduction
  dans l'apres.

---

## 6. Ce qui garde le design

### Unitaire, `lib/reveal-arc.test.ts`

- l'arc vaut `page - sortie` quand la page depasse le plancher, et le
  plancher sinon ;
- la sortie commence exactement a la fin de l'arc sur une page longue, et a
  la fin du plancher sur une page courte ;
- le progres reste dans [0, 1] pour tout `scrollY`, y compris au-dela du
  bas de page ;
- `maxScroll` absent, negatif ou non fini : plancher, jamais `NaN` ;
- les valeurs d'aujourd'hui sont reproduites : sur une page de 2,55
  fenetres de defilement, l'arc fait exactement 2 fenetres.

### Les oracles existants : rebases, pas assouplis

Sept endroits supposent l'arc de deux fenetres en pixels absolus. Chacun
passe a une position **relative a l'arc reel de la page**, lue par la meme
fonction que le site (une aide de test `positionDansArc(page, fraction)`
qui retourne les pixels a partir de `innerHeight` et `scrollHeight`). Un
test qui resterait en pixels absolus serait vert par accident sur une page
et rouge sur une autre.

| fichier | ligne | aujourd'hui | demain |
| --- | --- | --- | --- |
| `xiuhcoatl-strike.spec.ts` | 90, 164 | `innerHeight * 1.6` (80 % de l'arc) | 80 % de l'arc reel de Projets. **Sans ca, rouge de lui-meme** : sur Projets, 1,6 fenetre ne fait plus que 22 % de l'arc et la frappe ne part pas |
| `climax-chime.spec.ts` | 49 | `arc = innerHeight * 2` | l'arc reel |
| `acte-de-sortie.spec.ts` | 51 | `innerHeight * 2` (fin d'arc) | la fin de l'arc reel |
| `accessibilite-axe.spec.ts` | 42 | `innerHeight * 2 * f` | `f` de l'arc reel |
| `passage-continu.spec.ts` | 304, 346 | `innerHeight * 1.2` (« a mi-arc ») | la moitie de l'arc reel : le test ne demande que « plus de 200 px », il resterait vert, mais son commentaire mentirait |

**Deux de plus, trouves le 20/09 en verifiant cette phrase au lieu de la
croire** -- elle disait « dix autres tests scrollent en fraction de page et
tiennent tels quels ». Les deux sont dans `acte-de-sortie.spec.ts`.

| fichier | ligne | le defaut | demain |
| --- | --- | --- | --- |
| `acte-de-sortie.spec.ts` | 72 | `(h * 2) / max` : la part de l'arc calculee avec deux fenetres en dur. Echappe a une recherche de `innerHeight * 2`, la hauteur passant par une variable locale | la longueur reelle. Il **resterait vert en mesurant autre chose** |
| `acte-de-sortie.spec.ts` | 86-97 | « SUR UNE PAGE LONGUE, rien ne bouge pendant qu'on lit encore » : compare la focale a 50 % et a 80 % de Memoire et la veut immobile a 0,6 pres. **Sa premisse est ce que ce design abolit** : il passera rouge, et il a raison | **reecrit, pas rebase**. Ce qu'il protege n'est pas « rien ne bouge », c'est « **l'acte de sortie** ne se joue pas pendant la lecture » (son propre commentaire le dit : « camera qui monte et cadre qui se ferme pendant la lecture »). Il lira `exitRef`, qui vaut 0 a 50 % et a 80 %, et plus de 0 en bas |

Les huit autres scrollent en fraction de page et tiennent tels quels.
Trois sont a surveiller au passage de la suite sans qu'on puisse le predire
sur pieces : `decor-fige` (un budget d'objets qui recomposent leur matrice,
echantillonne a 25/50/75/100 % -- un arc plus long veut dire du mouvement
sur une plus grande part de ces points), `materiaux-stables` et
`programmes-tardifs` (des compilations de nuanciers qui doivent s'etre
tues en fin de page, or la fin de page voit desormais des etats nouveaux).
Ce ne sont pas des rebasages prevus, ce sont des resultats a lire. **Les
trois sont passes au vert le 20/09**, avec toute la suite.

### `regression-visuelle` : l'action annoncee n'existe pas (20/09)

Ce spec annoncait ici une action : ses captures de Memoire et de Projets
« changent de plein droit » et sont a regenerer apres verification a l'oeil.
**C'etait faux.**

Cette suite tourne sous `reducedMotion: "reduce"`. Or sous mouvement reduit
l'arc NE PROGRESSE PAS (choix du 28/08) : `handleScroll` sort avant d'ecrire
`progressRef`. La scene y est figee au meme etat quelle que soit la
position, et la longueur de l'arc n'a aucun effet sur ce qui est capture. Ce
design ne touche pas une seule de ces images.

Verifie plutot que raisonne : les dix captures echouent, **et elles
echouent a l'identique sur la base sans ce design** -- 856 942 pixels de
difference sur Memoire a 80 %, le meme nombre exact des deux cotes. Les
references etaient **deja perimees avant ce travail**, pour une cause qui
lui est anterieure. 93 % des pixels : ce n'est pas un glissement, c'est une
autre image (piste la plus probable, des references enregistrees en
production quand la suite tourne en developpement).

**Elles ne sont donc pas regenerees ici.** Les regenerer sous couvert de ce
design benirait en silence une difference dont personne ne connait la cause.
Point ouvert, separe, a instruire pour lui-meme.

### Un oracle nouveau : l'arc finit ou la sortie commence

Sur chaque page, en defilant jusqu'au bas et en lisant `progressRef` et
`exitRef` a chaque image : aucune image ou l'arc est fini (`>= 1`) et la
sortie pas commencee (`= 0`), et aucune ou la sortie a commence avant que
l'arc finisse. C'est la seule promesse propre a ce design, et c'est elle
qu'un oracle doit porter.

---

## 7. Ce qui se mesure, et ne se teste pas

Deux chiffres a consigner dans `transitions-etat-de-l-art.md` une fois le
design en place, pour les passes suivantes :

1. **Ou tombe la frappe du serpent sur Projets**, en fraction de page et en
   fenetres, sur bureau. C'est la donnee d'entree de la passe du Sud.
2. **Le nombre d'ecrans d'arc par page sur Pixel 7**. C'est ce qui decide
   si un plafond en fenetres est necessaire, et ce sera decide sur ce
   chiffre.

### Les deux chiffres, mesures le 20/09 (`.scratch/arc-mesures.mjs`)

Page / arc / part de la page couverte, en fenetres :

| page | bureau 1280 x 720 | Pixel 7 |
| --- | --- | --- |
| Centre `/fr` | 2,8 / **2,2** / 80 % | 3,2 / **2,7** / 83 % |
| Est `/fr/services` | 3,9 / **3,4** / 86 % | 4,5 / **3,9** / 88 % |
| Sud `/fr/projets` | 10,0 / **9,4** / 94 % | 10,4 / **9,9** / 95 % |
| Ouest `/fr/contact` | 3,6 / **3,1** / 85 % | 4,1 / **3,5** / 86 % |
| Nord `/fr/memoire` | 8,4 / **7,8** / 93 % | 9,8 / **9,3** / 94 % |

**1. La frappe du serpent tombe a 45,5 % de la page**, soit 4,5 fenetres sur
bureau et 4,8 sur Pixel 7 -- et l'arc y vaut **0,48**, pas 0,7. La fraction
de page est la MEME sur les deux appareils. La section 4 disait « la frappe
recule vers 5 fenetres, la ou moins de gens vont » : elle recule bien, mais
elle tombe **au milieu de la page**, pas dans le dernier tiers que la sonde
de visite du 13/09 voyait deserte. Le probleme du Sud reste entier ; il est
moins grave que redoute. C'est la donnee d'entree de sa passe.

**2. Pas de plafond telephone, et c'est decide sur le chiffre.** La section 4
prevoyait « deux a trois fois plus long en ecrans » sur telephone. Mesure :
9,9 contre 9,4 fenetres sur Projets, 9,3 contre 7,8 sur Memoire. Les pages y
sont un peu plus longues, pas deux a trois fois. Un plafond serait du code
speculatif -- exactement ce que la section 4 refusait d'ecrire d'avance.

**Un effet de bord, note pour ne pas etre decouvert** : la part de page
couverte par l'arc va de 80 % (Centre) a 95 % (Sud). Elle n'est pas
constante parce que la fenetre de sortie, elle, est fixe a 0,55 fenetre :
plus la page est longue, moins cette fenetre pese. C'est ce qui garde une
sortie de meme duree partout.

---

## 8. Ordre de livraison

1. **L'oracle nouveau d'abord, et vu rouge.** Corrige le 20/09 : il etait
   en 4, avec un « si l'ordre le permet » -- et l'ordre le permet, il lit
   `progressRef` et `exitRef`, il ne depend pas de la formule. Ecrit et joue
   sur la construction actuelle, il doit echouer sur Memoire (l'arc y finit
   a 26 %, la sortie a 100 %). Un test qu'on n'a jamais vu echouer ne garde
   rien.
2. Les trois fonctions et leurs tests unitaires (rouge d'abord : les tests
   de la page longue echouent sur la formule actuelle).
3. `scene-refs-context` et `scene-controls` : la nouvelle signature, `tsc`
   propre -- c'est lui qui prouve qu'aucun appelant n'a ete oublie, puisque
   `maxScroll` est requis. `sound-design` : les trois calculs remplaces par
   `progressRef`. `LAST_VISIT_KEY` en v2.
4. L'aide de test `positionDansArc` et les sept rebasages ; la suite
   `passage-continu` (vingt-deux tests) et `xiuhcoatl-strike` au vert.
5. ~~`regression-visuelle` : captures regenerees apres verification a
   l'oeil.~~ **Sans objet, mesure le 20/09** (section 6) : cette suite tourne
   sous mouvement reduit, ou l'arc ne progresse pas, donc ce design ne
   deplace aucun pixel. Ses dix captures echouent a l'identique avec et sans
   lui : elles etaient deja perimees. Point ouvert separe.
6. Les deux mesures de la section 7, consignees.
7. La suite complete (117 tests au 18/09) au vert avant de pousser.

---

## 9. Hors perimetre, explicitement

- La passe du Sud (ses signes, la position de son climax) : la suivante.
- Un plafond d'arc pour le telephone : decide apres la mesure, pas avant.
- Une hauteur minimale de page : aucune page actuelle n'en a besoin.
- Le scroll ralenti : ecarte (section 1, choix 6).
- Chapitrer le texte de Memoire ou le couper : ecarte par le choix 4 ; le
  texte reste entier et continu.

---

## 10. Face a l'etat de l'art (18/09, sources en fin de section)

Trois angles, et le design tient sur les trois -- avec une reserve qui
merite d'etre ecrite.

**1. Lier le progres au defilement de la page, c'est la norme, pas
l'exception.** Le motif dominant des experiences narratives WebGL est un
timeline dont la tete de lecture est *scrubbee* sur une DISTANCE de
defilement, soit celle d'une section epinglee, soit celle du document
entier (GSAP ScrollTrigger, `scrub` + `pin`, `end` calcule sur la hauteur
reelle). Notre arc de deux fenetres fixes etait l'exception ; « l'arc dure
la page » est la pratique courante. Deux points de cette pratique sont deja
chez nous sous un autre nom : l'adoucissement (`scrub: 1`, l'animation
rattrape le defilement avec un peu de retard) est notre `TRAVERSEE_ALPHA`
par image ; et le rafraichissement des bornes quand la mise en page change
(polices, images, conteneurs) est notre relecture de `maxScroll` a chaque
evenement de defilement.

**2. Ne pas toucher a la vitesse de la molette : la recherche est sans
appel.** Nielsen Norman Group, tests utilisateurs : la plupart des
participants sont au moins legerement desorientes par le scrolljacking, les
visiteurs orientes tache s'irritent et decrochent ; les utilisateurs
« s'attendent a defiler a un rythme constant, lie a la facon dont ils
manipulent physiquement leur peripherique ». C'est exactement le choix 6, et
il est confirme par la source la plus citee du domaine. Une reserve
honnete : Lenis, que le site utilise, est deja une forme douce de
modification du defilement (lissage), uniforme sur toutes les pages. Ce
design ne l'aggrave pas ; il ne l'efface pas non plus.

**3. La reserve : le scrollytelling redactionnel prefere des PALIERS a un
continu -- et un palier n'est pas un geste de plus.** The Pudding / scrollama, la reference des recits pilotes par le
texte : un graphique colle, des *steps* dans le texte, et la regle « un pas,
un changement visible » -- chaque station de lecture doit produire un
changement que le lecteur voit sans le chercher. Notre choix 4 est le
continu (la position dans le texte), pas les paliers (sa structure). Les
deux ne s'excluent pas : la REGLE de ce design (l'arc dure la page) est
compatible avec un remap du Nord qui contient des paliers. Mais un palier,
ici, serait un ETAT des elements qui existent deja -- la brume qui
s'epaissit, l'eau qui monte, la lumiere qui tombe d'un cran, le chien qui
change de rive -- jamais un element de plus. Les neuf niveaux du Mictlan
comme neuf etats d'une meme descente, pas neuf objets. Ce n'est pas dans ce
design, c'est la question a poser a la forme du remap du Nord quand on le
regardera, et la doctrine de profondeur (« vue sans qu'on la cherche »)
penche du cote des paliers, a cette condition. Trois autres regles de
cette pratique sont deja tenues par le site : le mouvement reduit livre une
version statique ; le sens de chaque etape vit dans le texte du DOM pour les
lecteurs d'ecran ; et on n'intercepte jamais la molette ni le toucher pour
piloter la vitesse.

### Sources

- GSAP, *ScrollTrigger*, documentation : https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- greensock, *gsap-skills / scrolltrigger* : https://github.com/greensock/gsap-skills/blob/main/skills/gsap-scrolltrigger/SKILL.md
- Nielsen Norman Group, *Scrolljacking 101* : https://www.nngroup.com/articles/scrolljacking-101/
- Springer, *A Usability and Universal Design Investigation into Scrolljacking for Web Pages* : https://link.springer.com/chapter/10.1007/978-3-032-16454-4_6
- The Pudding, *An Introduction to Scrollama.js* : https://pudding.cool/process/introducing-scrollama/
- The Pudding, *How to implement scrollytelling with six different libraries* : https://pudding.cool/process/how-to-implement-scrollytelling/

---

## 11. Multiplier les gestes ? Non, et ce n'est pas un gout (19/09)

Sylvain, a la relecture : « je me demande si c'est quelque chose de bon de
multiplier les gestes ». Verifie contre l'etat de l'art, sur trois angles,
et les trois repondent la meme chose.

**La recherche.** Nielsen Norman Group, sur trente ans de psychologie de
l'education et d'IHM : les animations decoratives augmentent l'effort
cognitif et reduisent la memorisation ; un rythme plus lent aide la
comprehension ; et surtout, *le pouvoir d'une animation a capter
l'attention est diminue par la concurrence de toutes les autres*. C'est la
phrase qui tranche : chaque geste ajoute rend les autres moins visibles.

**Les principes.** Material Design : informatif, focalise, expressif -- et
la retenue est le principe qui manque le plus souvent. Un bon mouvement
repond a « pourquoi ca bouge ? ». Un geste qui n'a pas de reponse est un
geste de trop.

**Le jury.** La retenue est une competence 3D ; les studios qui gagnent
utilisent le WebGL pour l'atmosphere et le cadre plutot que le spectacle ;
design et usabilite pesent 70 % du score, la creativite 20 %, et la
plupart des sites qui echouent ne manquent pas de creativite, ils ont tout
mis dans le spectacle.

**Ce que ca change au cadrage.** « Compter pareil » sort du reequilibrage
(section 1, choix 1). Ce qui reste est ce que la doctrine de profondeur du
13/09 disait deja : rendre visible ce qui existe, un moment signature par
direction, et retirer a l'Est ce qui n'a pas de reponse a « pourquoi ca
bouge ». Ce design-ci n'ajoute aucun geste ; il donne a une histoire qui
existe la place de se lire.

### Sources

- Nielsen Norman Group, *Animation for Attention and Comprehension* : https://www.nngroup.com/articles/animation-usability/
- Nielsen Norman Group, *The Role of Animation and Motion in UX* : https://www.nngroup.com/articles/animation-purpose-ux/
- Material Design, *Understanding motion* : https://m2.material.io/design/motion/understanding-motion.html
- Google Design, *Making motion meaningful* : https://design.google/library/making-motion-meaningful
- Metabole, *Award-winning website: the anatomy of what the jury rewards* : https://metabole.studio/en/blog/awwwards-winning-website
- Hon Tran, *Awwwards Judging Criteria: How Scoring Works (2026)* : https://www.hontran.dev/blog/awwwards-judging-criteria
- Psychoactive Studios, *The best WebGL & interactive 3D agencies in 2026* : https://www.psychoactive.co.nz/content-hub/best-webgl-interactive-3d-agencies
