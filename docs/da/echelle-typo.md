# L'échelle typographique : 1,25 ou 1,333, ce que chaque choix implique

**10/09/2026.** Demande de Sylvain : « tu me fais un comparatif de ce
qu'implique le choix ? » Ce document ne tranche pas, il montre. La
recommandation est à la fin, séparée des faits.

## Ce qu'on a aujourd'hui, mesuré sur le texte rendu

Relevé par `.scratch/typo.mjs` sur les onze routes, bureau 1440 px, sur le
DOM rendu et non sur le CSS : ce sont les tailles que l'oeil reçoit.

| taille | éléments | ce que c'est |
| --- | --- | --- |
| 38,4 px | 15 | les titres de page (h1) |
| 32 px | 1 | un titre isolé |
| 28,8 px | 65 | les titres de section (h2) |
| 18,4 px | 9 | un chapeau |
| 17,6 px | 11 | un autre chapeau |
| 16 px | 46 | du corps |
| 15,7 px | 141 | du corps |
| 15,2 px | 155 | du corps |
| 14,4 px | 154 | du corps |
| 13,6 px | 120 | du corps, et des étiquettes |
| 12,8 px | 45 | des mentions |
| 11,5 px | 110 | les étiquettes en capitales (Contexte, Rôle...) |
| 11,2 px | 59 | la navigation secondaire |

**Treize tailles, dont dix entre 11,2 et 18,4 px.** Les rapports entre
tailles voisines sont de 1,02 à 1,11 : l'oeil ne les distingue pas comme
des niveaux, il les reçoit comme du flottement. Cinq tailles de corps
(13,6 à 16 px) portent à elles seules 616 éléments : c'est le vrai défaut,
plus que le nombre de tailles.

À côté : 3 graisses (bien), 2 familles (Geist, bien), **6 interlignes dont
« normal » sur 480 éléments** (pas bien : « normal » dépend de la police et
du navigateur, et il est court pour du texte long), et 11 interlettrages
distincts (trop : les capitales espacées se déclinent en six valeurs).

## Les deux échelles, sur une base de 16 px

Une échelle est une suite géométrique : chaque taille est la précédente
multipliée par le rapport. On garde 16 px pour le corps, parce que c'est la
taille de tout le contenu long et que la certification RGAA de Sylvain en
fait un sujet sérieux.

| niveau | 1,25 (tierce majeure) | 1,333 (quarte) |
| --- | --- | --- |
| petit | 12,8 | 12 |
| corps | 16 | 16 |
| chapeau | 20 | 21,3 |
| sous-titre | 25 | 28,4 |
| titre de section | 31,3 | 37,9 |
| titre de page | 39,1 | 50,5 |

Deux lectures possibles de la même table : avec 1,25 on a **six** paliers
pour aller de 12,8 à 39 ; avec 1,333 on n'en a que **cinq** pour aller de
12 à 50, et le dernier est très grand.

## Où va chaque texte d'aujourd'hui

C'est la partie qui compte : ce que le visiteur verra changer.

| aujourd'hui | éléments | avec 1,25 | avec 1,333 |
| --- | --- | --- | --- |
| 11,2 et 11,5 (étiquettes, nav) | 169 | **12,8** (+13 %) | **12** (+5 %) |
| 12,8 (mentions) | 45 | 12,8 (rien) | 12 (−6 %) |
| 13,6 à 16 (corps) | 616 | **16** (de 0 à +18 %) | **16** (de 0 à +18 %) |
| 17,6 et 18,4 (chapeaux) | 20 | 20 (+9 à +14 %) | 21,3 (+16 à +21 %) |
| 28,8 (h2) | 65 | 31,3 (+9 %) **ou** 25 (−13 %) | **28,4** (−1 %, invisible) |
| 32 (titre isolé) | 1 | 31,3 | 28,4 |
| 38,4 (h1) | 15 | **39,1** (+2 %, invisible) | **37,9** (−1 %, invisible) |

Ce qui est commun aux deux : les cinq tailles de corps deviennent une seule,
à 16 px, et les étiquettes en capitales grandissent. C'est 785 éléments sur
920 qui bougent dans le même sens quel que soit le rapport. **Le choix du
rapport ne porte donc que sur 100 éléments : les chapeaux et les titres.**

## Ce que chaque choix implique, concrètement

**1,25.**
- Les titres de section grandissent de 9 % (28,8 vers 31,3), ou rétrécissent
  de 13 % si on les pose au palier du dessous. Il n'y a pas de palier
  « comme avant ».
- Six paliers : de la marge pour les études de cas, qui ont beaucoup de
  niveaux (titre, chapeau, étiquette, valeur, mention).
- Hiérarchie douce. Le risque est celui qu'on a déjà : des niveaux voisins
  que l'oeil ne sépare pas.

**1,333.**
- Les titres de section et de page restent où ils sont (28,4 et 37,9 pour
  28,8 et 38,4 aujourd'hui). **Les compositions de scène réglées sur les
  titres ne bougent pas**, et c'est un argument fort : trois semaines de
  cadrages tiennent aux titres.
- Le chapeau monte à 21,3 : un vrai chapeau, qui se lit comme tel. C'est le
  seul changement qu'on verra.
- Cinq paliers, dont un à 50 px qui ne servira qu'à un endroit ou à aucun.
- Hiérarchie nette. C'est ce que l'axe design du jury (40 %) reconnaît en
  premier sur une capture : des niveaux qu'on compte.

## Ce qui vient AVEC l'échelle, quel que soit le rapport

Le rapport ne règle pas tout, et ces trois points pèsent autant :

1. **L'interlignage.** 480 éléments à « normal ». Une échelle se pose avec
   ses interlignes : 1,6 pour le corps, 1,45 pour les chapeaux, 1,15 pour
   les titres. Sans ça, changer les tailles ne fera que déplacer le
   flottement.
2. **Les capitales espacées.** Six interlettrages pour le même geste. Un
   seul (0,08 em) et une seule taille (le palier « petit »).
3. **Le mobile.** L'échelle est posée au bureau ; sous 768 px, le corps
   reste à 16 (jamais moins, RGAA), et seuls les deux paliers du haut
   descendent d'un cran. Pas d'échelle fluide en `clamp()` : elle rend les
   tailles imprévisibles à la mesure, et on vient de passer trois jours à
   mesurer.

## Ce qu'il faudra toucher

Une passe, dans `globals.css` : les tailles deviennent cinq ou six variables
(`--t-petit`, `--t-corps`, `--t-chapeau`, `--t-section`, `--t-page`), et
chaque règle qui pose un `font-size` en dur y renvoie. Le relevé de
`typo.mjs` est l'oracle : après la passe, il doit rendre cinq ou six
tailles, trois interlignes, un interlettrage.

Ce que ça ne touche pas : le voile (PiedraSkeleton a ses propres tailles,
réglées à l'oeil pour la Piedra) et les tailles de la scène 3D (aucune n'est
du DOM). Le Codex, lui, a été mis sur l'échelle comme le reste : il n'avait
pas de grille à lui, seulement ses propres valeurs.

**Posé le 11/09**, sur ton choix de 1,333. Relevé après la passe :
cinq tailles (12 / 16 / 21,3 / 28,4 / 37,9), trois interlignes, un seul
interlettrage. Deux retouches que la mesure a imposées sur téléphone de
320 px : les titres descendent d'un cran de plus sous 380 px, et le bloc du
hero se resserre, sinon son titre remontait sous le bouton du menu.

## Recommandation

**1,333**, pour une raison qui n'est pas de goût : les titres restent où ils
sont, donc aucun cadrage de scène ne bouge, et c'est sur les titres que
trois semaines de compositions ont été réglées. Le seul changement visible
sera le chapeau, plus grand, et c'est un changement qu'on veut.

Si à l'usage le chapeau à 21,3 paraît trop grand, on le pose à 18,7 (la
moitié d'un palier) sans toucher au reste : ce serait le seul écart à
l'échelle, et il serait documenté.
