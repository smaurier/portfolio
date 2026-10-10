# La partition du texte : un seul bloc a la fois, et l'image qui prevaut

Date : 10/10/2026, soir. Point 1 de l'audit visuel du jour
(`docs/superpowers/specs/2026-10-10-audit-visuel-design.md`, artifact
« Audit des cinq chemins »). Decisions de Sylvain, dans l'ordre :

- « un seul panneau a la fois, mais surtout on doit aussi enlever du texte
  [...] que la page ne devienne pas un recital. C'est l'image qui prevaut. »
- « on peut bien mieux travailler l'apparition [...] voir etat de l'art »
  (constante 3 des laureats, `docs/da/etat-de-l-art.md` : chaque section
  est un moment mis en scene, entree, tenue, sortie).
- generaliser aux cinq scenes ; approche A (une partition par page)
  validee ; « retirer tout ce que l'on peut [...] ne garder que le vrai,
  KISS applique ».

## Le constat, mesure dans le code

Le Centre empile CINQ systemes de texte dans le meme coin bas-gauche, chacun
avec sa propre horloge : le hero (`getIntroOpacity`, 0 -> 0,25), cinq
chapitres (`CHAPTER_WINDOWS`, fenetres par phase, dont la V qui ne s'efface
pas), le chant (`.cantarFlow`, colonne de flux de 300vh, en vue de 0 a
0,82), la cloture (`getNavEmphasis` > 0,05, 0,75 -> 1). Les chevauchements
de l'audit (accueil t=0,15 : trois panneaux ; t=0,4 : chant + carte, le cerf
cache) sont structurels, pas accidentels.

Les quatre pages echo n'ont pas de chapitres. Leurs panneaux : la ligne de
seuil (`seuilTeteOpacity`, pleine jusqu'a 0,18, effacee a 0,3), les cartes
de contenu (en flux, revelees une fois a l'entree dans le cadre,
`RevealOnScroll`), le chant (en flux, APRES les cartes), la cloture (en
flux, apres le chant). Le chant n'y a pas de place choisie : il tombe ou la
colonne finit. Services est courte, donc il tombe a 0,5, sous le bouton
d'appel ; Memoire est longue, il tombe tard.

L'arc n'est pas tout le defilement (`lib/reveal-arc.ts`, 20/09) :
`arcH = max(2 vh, maxScroll - 0,55 vh)` ; le dernier 0,55 vh est l'acte de
sortie, compte a part (`exitProgress`). Sur l'Accueil a 800 px de haut,
2178 px de defilement donnent un arc de 1738 px : **1 % d'arc = 17 px**.

## La regle

1. **Une partition par page.** Chaque bloc de texte recoit une fenetre
   `[debut, fin]` dans l'arc. Deux fenetres ne se chevauchent jamais et
   sont separees d'au moins **0,02**. Des **silences** sont reserves :
   aucune fenetre ne les touche.
2. **L'image prevaut.** Le climax de chaque page (0,75) est dans un
   silence. L'image finale ne porte que la cloture.
3. **Une grammaire d'apparition, pour tous** : entree sur les premiers
   15 % de la fenetre (opacite 0 -> 1, monte de 12 px, mots en cascade),
   tenue 70 %, sortie sur les derniers 15 % (opacite 1 -> 0, derive de 8 px
   vers le haut). La sortie finit DANS la fenetre : l'ecart entre deux
   blocs est un vrai vide. La cascade rejoue a chaque entree.
4. **Lisible** : toute tenue dure au moins **8 % de l'arc** (140 px sur
   l'Accueil, deux crans de molette). C'est la regle du 13/09 (« l'encadre
   apparait un court moment, c'est un bug » : 83 px a l'epoque), gardee ;
   elle passait de 12 a 8 % parce qu'on garde un silence de 12 % et un
   chant dans l'arc, et parce que les blocs sont desormais des
   one-liners.
5. **Mouvement reduit** : inchange, tout visible, empile, sans
   transformation. **Robots** : inchange.

## Ce qui part (KISS)

- **Le paragraphe du hero** (Mazatl, 60 mots) : au Codex, section `totem`
  (le cerf, qui en parle deja). Le hero garde titre + ligne de seuil +
  appel. C'est deja le cas sur telephone depuis le 04/10 ; le bureau
  rejoint, et `hero-texte-mobile.tsx` + `lib/hero-mobile.ts` (4 tests) +
  leur CSS disparaissent : ils n'ont plus de sujet. (Livres ce matin,
  valides par Sylvain ; du travail du jour qui part, dit et assume.)
- **Deux chapitres sur cinq.** Huit blocs + sept ecarts + un silence ne
  tiennent pas dans un arc en gardant 8 % de tenue a chacun. On retire ce
  que la scene dit deja : **III · Face a face** (« Un silence. » : le
  silence lui-meme le dit, mieux qu'une carte) et **V · L'Ollin** (la
  cloture est deja le depart ; la mecanique Ollin du press-deform ne depend
  pas du texte). Renverse le 29/08 (« V ne s'efface pas ») et le chapitrage
  du 28/08 : cinq chapitres deviennent trois.
- **La ligne poetique de la cloture**, sur les cinq pages : titre cardinal
  + lien vers la suite. `closure.*.poetic` sort des trois dictionnaires.
- **L'etiquette visible du chant** (« Un chant de cette direction ») et sa
  **citation longue** : nahuatl, traduction du visiteur, source courte
  « Cantares mexicanos, I · 1 » + lien vers l'edition. `common.cantar.label`
  reste dans les dictionnaires pour l'`aria-label` de la section (un
  repere pour les lecteurs d'ecran, pas un panneau) ; `common.cantar.source`
  raccourcit.

## La partition du Centre

| bloc | fenetre | tenue | la scene a ce moment (`docs/da/plans/centre.md`) |
| --- | --- | --- | --- |
| Hero (titre, seuil, appel) | 0,00 -> 0,10 | au repos, avant de defiler | l'arrivee |
| I · L'approche | 0,12 -> 0,30 | 12,6 % | la penombre, le cerf broute |
| Chant | 0,32 -> 0,50 | 12,6 % | la lumiere monte, l'orbite, le mais pousse |
| II · Le regard | 0,52 -> 0,64 | 8,4 % | le cerf remarque, la tete se tourne |
| *silence* | 0,66 -> 0,78 | | le face-a-face tenu, le climax 0,75 |
| IV · Les chemins | 0,80 -> 0,94 | 9,8 % | les chemins reveles |
| Cloture | 0,96 -> 1,00 (et l'acte de sortie) | | l'image finale, seule |

Le hero n'a pas de tenue a mesurer : il est la quand on arrive, avant tout
defilement. La cloture reste visible pendant l'acte de sortie (le dernier
0,55 vh, hors arc) : rien ne la retire, c'est voulu, c'est le lien vers la
direction suivante. Les deux plus belles images de l'audit (accueil t=0,6
avec un seul encadre, t=0,75 sans rien) tombent dans II et dans le silence.

## Les pieces

- **`src/lib/partition-texte.ts`** (pur, teste a l'unite) :
  - `type Fenetre = { debut: number; fin: number }` ;
  - `PARTITION_CENTRE: Record<BlocCentre, Fenetre>` avec
    `BlocCentre = "hero" | "chapitre-0" | "chapitre-1" | "chapitre-2" | "chant" | "cloture"`
    (les trois chapitres gardes, dans l'ordre), et
    `SILENCES_CENTRE: readonly Fenetre[]` (`[0,66, 0,78]`) ;
  - `ECART_MIN = 0.02`, `PART_ENTREE = 0.15`, `PART_SORTIE = 0.15`,
    `TENUE_MIN = 0.08` ;
  - `etatBloc(p, fenetre) -> { opacite: 0..1, phase: "avant" | "entree" | "tenue" | "sortie" | "apres", avancement: 0..1 }`
    (`avancement` = la position dans la phase, pour le CSS) ;
  - `partitionValide(partition, silences, { ignorerTenue: ["hero", "cloture"] }) -> string[]` :
    la liste des violations (chevauchement, ecart < 0,02, fenetre qui
    touche un silence, tenue < 8 %, cloture qui n'est pas la derniere),
    vide si tout va.
- **`FadingBlock`** prend `fenetre` a la place de `getOpacity`, lit
  `etatBloc` a chaque image (rAF, comme aujourd'hui), pose
  `style.opacity` et `data-phase` ; le mouvement (12 px / -8 px) est en
  CSS sur `[data-phase]`, pas en JavaScript. `getIntroOpacity`,
  `getChapterOpacity`, `CHAPTER_WINDOWS`, `CHAPTER_COUNT` sortent de
  `reveal-arc.ts` avec leurs tests (ils n'ont plus de consommateur) ;
  `getNavEmphasis` reste (la nav l'utilise).
- **`RevealText`** accepte `pilote="fenetre"` : la cascade des mots se
  declenche quand l'ancetre `[data-phase]` passe en `entree` (un
  MutationObserver sur l'attribut, pas d'IntersectionObserver), et se
  rearme en `apres`/`avant`. Le comportement actuel (IntersectionObserver)
  reste pour les pages de contenu.
- **Le chant du Centre** : UN seul noeud, l'original, dans le flux, dans
  `.cantarFlow` (qui garde ses 300vh : `?t=` et les enveloppes de la barre
  de perf restent valides). Pas de `sticky` : il **defile pendant sa
  tenue**, comme une carte des pages echo (0,18 d'arc = 310 px sur
  l'Accueil, de quoi le lire en passant). Son opacite et son `data-phase`
  viennent de la fenetre, par le meme mecanisme que `FadingBlock`
  (composant mince `BlocEnFlux` qui enveloppe la figure). Sa place dans le
  document est posee pour qu'il soit a environ 120 px du haut du cadre
  quand l'arc vaut 0,32 : `padding-top: calc(0.32 * var(--arc-h) + 120px)`
  sur `.cantarFlow`, ou `--arc-h` est pose par `scene-refs-context` au
  montage et au redimensionnement (il lit deja `maxScroll` a cet endroit :
  une lecture, pas une de plus par image). En mode recit, rien ne change :
  il est dans le flux, il se lit.
- **La cloture du Centre** (calque fixe `closureSlot`) : `.revealed` vient
  de la fenetre `[0,96, 1]` (et reste pose pendant l'acte de sortie) au
  lieu de `getNavEmphasis > 0,05` ; sans ligne poetique.
- **Dictionnaires** (fr, en, es) : `home.heroText` part dans
  `codex.totem.text` (ajoute a la fin du paragraphe existant, dans chaque
  langue) ; `home.chapters` passe de cinq a trois entrees (I, II, IV, en
  gardant leurs numeros romains : le Codex et le recit sr-only les
  nomment) ; `closure.*.poetic` supprime ; `common.cantar.source`
  raccourci.

## Les oracles

- **Unitaires** (`partition-texte.test.ts`) : `partitionValide` refuse un
  chevauchement, un ecart de 0,01, une fenetre dans le silence, une tenue
  de 7 %, une cloture suivie d'un autre bloc ; accepte la partition du
  Centre. `etatBloc` : opacite 0 avant et apres, 1 au milieu, phases aux
  bonnes bornes, sortie a 0 exactement a `fin`.
- **`reveal-arc.test.ts`** : les blocs `getIntroOpacity` et « les
  chapitres du Centre : assez longtemps pour etre lus » (5 oracles du
  13/09) sortent avec les fonctions ; leur intention (tenue minimale,
  jamais deux ensemble) vit desormais dans `partitionValide`, et
  « presque toujours un chapitre a l'ecran : au plus 5 % de vide » est
  **abandonne a dessein** : c'est l'inverse de la regle du jour.
- **`i18n-parity.test.ts`** : `poetic` sort de la liste des champs de la
  cloture et du controle « pas recopie du francais ».
- **e2e `partition-centre.spec.ts`** : sur `/fr?t=<p>&v=2` pour
  p ∈ {0,05 ; 0,21 ; 0,41 ; 0,59 ; 0,72 ; 0,86 ; 0,98}, le nombre de blocs
  de texte (calque + chant) a opacite > 0,05 vaut au plus 1, vaut 0 a
  0,72, et le bloc visible est celui de la partition.
- **`cantares.spec.ts` amende** pour le Centre : la figure est visible a
  `?t=0,41` ; a `?t=0,72` son opacite est 0 ; en mode recit elle est dans
  le flux et visible (inchange) ; le `<cite>` contient toujours « Cantares
  mexicanos ». Les quatre pages echo gardent l'oracle actuel jusqu'a leur
  passe.
- **`controls-overlap.spec.ts`** : inchange, doit rester vert.
- **La barre** : `pnpm run perf` avant `main`, comme toujours.
- **La capture** (`.scratch/audit-visuel.mjs`, page `accueil` seule,
  user-agent reel) : bureau sombre aux sept instants ci-dessus + clair +
  mobile, copiees dans `Downloads/nahual-partition-*`. L'oeil de Sylvain
  decide des dosages (12 px, 8 px, 15 %, 120 px).

## Les pages echo (passe suivante, meme lib)

- La ligne de seuil s'efface **avant que la colonne de contenu entre dans
  le cadre** : sa fenetre se derive au montage,
  `fin = arc(haut de .contentPage) - ECART_MIN`, depuis `--arc-h` et la
  position de la colonne (une lecture au montage, pas par image).
- Le chant reste en flux apres les cartes, derriere une hauteur d'ecran
  vide apres le bouton d'appel (il ne tombe plus sous le CTA), et prend la
  grammaire par `BlocEnFlux` comme au Centre.
- La cloture (en flux) prend la grammaire ; sa ligne poetique est deja
  partie avec les dictionnaires.
- Hors de cette passe : les fiches projet (point 6 de l'audit), le nopal
  (point 4), le theme clair (point 3).

## Hors de cette spec

- Le son du chant (`docs/da/arc-dure-la-page.md` § 3) : sa fenetre
  pourrait un jour le rendre audible a ce moment ; pas maintenant.
- Les transitions ENTRE pages : deja traitees (`backlog-soty.md`, T1-T9).
