# Ouest, cendre : le soleil qui descend

Une idee : le soir, le soleil entre dans la terre, et les Cihuateteo
descendent au carrefour (`ouest-sources.md`, `lib/ouest-arc`,
`lib/cihuateteo`). Jamais dramatisees une fois descendues.

| # | position | plan | tenue | son | fichier |
| --- | --- | --- | --- | --- | --- |
| 1 | voile | le jour de l'Ouest, lumiere haute (`lightTop` 0,8) | | le vent (bruit filtre) | `sound-design.tsx` |
| 2 | 0 a 0,29 | le jour tient (`daySet` 0,29 : le jour commence a baisser ensuite) ; les feuilles portees par le vent (240 au bureau, 160 sur telephone) | | | `west-leaves.tsx` |
| 3 | 0,5 a 0,85 | le crepuscule (`duskStart` -> `duskEnd`) : la brume vire de l'abricot au mauve (`westFogTint`) ; les porteuses descendent sur cette fenetre (`descendStart` 0,25 -> `descendEnd` 0,85 du crepuscule), en eventail du cote du soleil | | | `cihuateteo.tsx` |
| 4 | 0,72 | le soleil entre dans la terre (`setAt`) ; la lumiere touche le plancher (`lightFloor` 0,28) ; Venus du soir peut partir (Xolotl, apres le delai d'apparition) | | | `xolotl-companion.tsx` |
| 5 | 0,75 | climax de la camera, carillon de l'Ouest | | accord cendre | |
| 6 | apres le coucher | les porteuses se posent en arc au carrefour, face au cerf, toutes dans le champ de fin de page ; quatre souffles dans l'herbe a l'atterrissage (`cihuateteoStore.landing`) ; cheveux, jupes, papiers dans le vent, moins relaches au loin | | | `grass.tsx`, `lib/paper-strip` |
| 7 | sortie | cloture « Ouest · Cendre », lien vers le Nord | | | |

**Ce qui manque** : la ligne de seuil (N1). Le motif d'arrivee : une rafale
de cendre (1,1 s, bande a 320 Hz). Contact reste la page la plus chargee au
processeur (bandelettes, feuilles, grille de vent) : voir `backlog-soty.md`.
