# Le voile : la revelation du texte se compose, elle ne repeint plus

*Spec court, 22/09/2026. Premiere demande qui traverse le harnais entier
(`docs/harnais.md`, la definition du fini). L'analyse vit dans le design du
harnais, section 0 et 6 bis ; ceci ne redit que ce qui se decide.*

## 1. Le defaut

Pendant l'attente du voile, la revelation lettre par lettre anime
`text-shadow` (l'aberration chromatique rouge / cyan qui se resout) et
`filter: blur()` sur chaque `<span class="char">`, en cascade. Deux
proprietes de peinture : chaque image repeint quatre-vingts spans et le
document avec eux. Quand le script charge et bloque le fil principal
(617 a 767 ms d'un coup), ces peintures attendent, les tuiles ne se
rafraichissent plus, et la rotation de la Piedra -- composee, innocente --
parait saccader. Sylvain, sur la production : « il saccade enormement ».

**Point zero, oracle `tests/e2e/voile-peinture.spec.ts` (22/09, serveur de
developpement)** : 301 peintures attribuees aux noeuds du voile sur 413
pendant l'attente. Trace de production du 21/09 : 504 peintures, 134 des
259 images presentees en retard.

## 2. La regle

**La 2D du voile n'anime que `transform` et `opacity`.** Rien d'autre ne
bouge pendant l'attente. L'effet est garde -- la loi « rien ne disparait »
l'exige -- mais il est fabrique avec des proprietes que le compositeur
tient seul :

- la lettre elle-meme : `opacity` 0 → 1 ;
- l'aberration chaude : un pseudo-element `::before`, `content:
  attr(data-char)`, couleur chaude, **pre-floute** (`filter: blur()`
  statique, peint une fois), qui glisse de `translateX(-3px)` a 0 et
  s'efface de 0,8 a 0,18 -- c'est aussi lui qui donne le flou qui se
  resout ;
- l'aberration froide : un `::after`, meme lettre, couleur froide, nette,
  de `translateX(3px)` a 0, de 0,8 a 0,18.

La traduction suit avec ses valeurs plus douces (±1,5 px, 0,4 → 0,
`blur(0.5px)`). Sous mouvement reduit et une fois le foyer allume, les
copies n'existent pas (`content: none`) : les captures de la regression
visuelle, prises en mouvement reduit, ne bougent pas d'un pixel.

Ce que ca demande au balisage : `SplitText` pose `data-char` sur chaque
lettre (les espaces n'ont pas de copie). Rien d'autre.

## 3. Ce qui le garde

- `tests/e2e/voile-peinture.spec.ts` : aucun noeud du voile peint plus de
  six fois pendant l'attente (une fois par calque, deux avec la police) ;
  plafond total en cliquet (504). **Vu rouge avant le correctif : 31 par
  lettre, 64 pour la traduction.** Un rouge imprime les noeuds et les
  instants de leurs peintures.
- `tests/e2e/regression-visuelle.spec.ts` (VISUEL=1) : les dix captures
  inchangees.
- `tests/e2e/loading-veil.spec.ts` et `voile-ceremonie.spec.ts` : la
  sequence finit par son animation, pas par le secours de six secondes.

## 4. Ce que ca ne fait pas

- Les blocages du fil principal pendant l'attente (le script qui charge,
  617 a 767 ms) : c'est l'ordonnanceur, chantier 4 de l'infrastructure du
  harnais. Ce spec retire ce qui *attend* ces blocages, pas les blocages.
- La barre de performance (tranche B) : cet oracle en est la premiere
  pierre, pas la barre.

## 4 bis. Ce que la mise en oeuvre a appris (22/09)

- **Les copies ne suffisaient pas : il faut des calques.** Avec les
  pseudo-elements en place mais sans `will-change`, chaque lettre etait
  encore peinte une trentaine de fois. Chrome jouait l'opacite sur le fil
  principal. `will-change: opacity` sur le span et `will-change:
  transform, opacity` sur ses copies : un calque par glyphe, et le
  compositeur tient tout.
- **Le nom des animations est une interface.** `reveal-trigger` ecoute
  `animationend` par nom (`translationCharReveal`, `logoCharReveal`) ; les
  renommer a fait tomber la sequence sur son secours de six secondes.
  Les noms sont gardes et le CSS le dit.
- **Le voile avait deux autres animations de peinture** : la signature du
  logo (`text-shadow` + `blur`, meme traitement que la phrase) et le pouls
  des points cardinaux (`box-shadow` + `brightness` en boucle de deux
  secondes, jusqu'au retrait du voile) : la lueur forte vit dans un
  pseudo-element statique dont seule l'opacite respire.
- **Zero peinture est une barre impossible** : un calque se peint quand il
  nait, et une seconde fois quand la police arrive. L'oracle garde donc
  un plafond **par noeud** : six (le span et ses deux copies, deux fois).

**Mesure de production, instants des peintures** (`.scratch/voile-instants.mjs`) :

| | avant | apres |
| --- | --- | --- |
| la traduction (`<p>`) | 64 peintures, une toutes les 16 ms de 892 a 1995 ms | — |
| la signature (`<p>`) | 37, meme cadence | — |
| chaque lettre | 31, meme cadence | **6, groupees a t = 228 ms et t = 1199 ms** |
| peintures totales pendant l'attente | 500 | 385 |

Le repeint par image a disparu ; ce qui reste est la naissance des calques
et l'arrivee de la police.

## 5. Criteres d'acceptation

1. L'oracle de peinture est vert : 0 peinture attribuee au voile, total
   sous 504.
2. Les dix captures visuelles passent sans regeneration.
3. `pnpm test`, `tsc`, `eslint` : rien de nouveau ; la suite e2e par
   defaut reste verte.
4. A l'oeil, sur la production locale : l'aberration et le flou qui se
   resout sont toujours la ; la fin de revelation est identique.
5. `docs/harnais.md` : l'oracle rejoint la liste du pilier 2 ; le design
   du harnais, section 0, note le point zero de l'oracle.
