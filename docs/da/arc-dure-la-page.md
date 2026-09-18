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

1. Reussir le reequilibrage, c'est « tous » les criteres, mis en ordre par
   la doctrine de profondeur : rendre visible ce qui existe, puis un moment
   signature par direction, puis compter -- et degonfler l'Est est un
   critere applique a chaque geste, pas une etape.
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

**L'invariant que la regle fabrique** : sur toute page plus longue que le
plancher, l'arc finit exactement la ou la sortie commence. Il n'y a plus de
zone morte entre les deux.

`maxScroll` vaut `document.documentElement.scrollHeight - innerHeight`. Si
elle est absente ou non finie, la longueur retombe sur le plancher : aucun
`NaN` ne peut sortir de ces fonctions.

Un cas trivial, dit pour qu'il ne soit pas deduit : le mouvement reduit ne
fait pas progresser l'arc (choix du 28/08). Il ne le fera toujours pas.

---

## 3. Ou ca se code

Une seule source de progres, cinq lecteurs.

- **`lib/reveal-arc.ts`** : les trois fonctions ci-dessus. Le seul fichier
  qui connait la regle.
- **`scene-refs-context.tsx`**, `handleScroll` : ecrit `progressRef` avec la
  nouvelle signature. Il lit deja `scrollHeight` a chaque evenement de
  defilement pour la sortie ; l'arc lira la meme valeur au meme endroit.
  C'est un gestionnaire de defilement, pas la boucle de rendu : l'oracle
  `lectures-de-mise-en-page` (aucune lecture de mise en page dans la boucle)
  reste vrai sans rien changer.
- **`sound-design.tsx`** (trois appels a `arcProgress(scrollY, innerHeight)`)
  et **`scene-controls.tsx`** (un appel a `arcScrollHeight`) : passent par la
  meme fonction avec `maxScroll`. Sinon le son et l'arc ne compteraient plus
  la meme chose, ce qui est exactement le defaut « trois lecteurs, trois
  verites » corrige le 16/09 pour l'arc du jour.
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
  accessible reste l'alternative.
- L'arrivee en haut de l'arc a chaque navigation (16/09) : la descente
  glisse vers zero pendant le passage, `garantirLeHaut` en filet.
- La sortie ancree au bas de la page (F2, 10/09) : meme fonction, meme
  fenetre ; elle commence desormais exactement a la fin de l'arc au lieu de
  « jamais avant ».
- La page qui change de hauteur apres coup (images, cartes) : `maxScroll`
  est relu a chaque evenement de defilement, comme pour la sortie
  aujourd'hui. Jamais perime, rien a observer.

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

Dix autres tests scrollent en fraction de page (`scrollHeight - innerHeight`)
et tiennent tels quels. Un seul demande une action : `regression-visuelle`,
dont les captures de reference de Memoire et de Projets changent de plein
droit (a une fraction de page donnee, la scene n'est plus dans le meme etat)
et sont a regenerer **apres verification a l'oeil**, pas en aveugle.

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

---

## 8. Ordre de livraison

1. Les trois fonctions et leurs tests unitaires (rouge d'abord : les tests
   de la page longue echouent sur la formule actuelle).
2. `scene-refs-context`, `sound-design`, `scene-controls` : la nouvelle
   signature, tsc propre.
3. L'aide de test `positionDansArc` et les sept rebasages ; la suite
   `passage-continu` (vingt-deux tests) et `xiuhcoatl-strike` au vert.
4. L'oracle nouveau, rouge sur la formule actuelle pour une page longue
   (verifie avant d'ecrire la formule si l'ordre le permet), vert apres.
5. `regression-visuelle` : captures regenerees apres verification a l'oeil
   sur Memoire et Projets.
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
