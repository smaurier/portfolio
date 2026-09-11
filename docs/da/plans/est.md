# Est, dore : le monde de verre qui se rompt

Une idee : le monde est pris dans la glace avant l'aube ; le soleil se leve
a 18 degres d'azimut, monte a 48 degres, et tout eclate (`est-sources.md`,
`lib/est-arc`, `lib/frost`).

| # | position | plan | tenue | son | fichier |
| --- | --- | --- | --- | --- | --- |
| 1 | voile | le monde gele : chaque surface est du verre bleu (givre pose sur tous les materiaux des le chargement) | | | `frost-patch.tsx`, `frost-store.ts` |
| 2 | 0 a 0,42 | penombre bleue, la brume gelee (`EAST_FOG`), Venus du matin a 4 degres d'azimut et 5 d'elevation (`morningStarDirection`) | | souffle de givre (grave 95 -> 58 Hz par bouffees) | `frost-world.tsx`, `sound-design.tsx` |
| 3 | 0,42 | le lever commence (`riseStart`) : la brume vire du bleu au rouge de l'aube puis a l'or (`eastFogTint`) | | | `reveal-lighting.tsx` |
| 4 | avant 0,55 | le prelude : les dards de l'aube, volee de Venus puis reponse du soleil, 1,4 s | 1,4 s | | `frost-world.tsx` (`preludeSeconds`) |
| 5 | 0,55 | l'eclatement (`shatterAt`) : la lance du soleil, les eclats, la poudre, l'onde qui couche la prairie, 2,6 s | 2,6 s | evenement `nahual:frost-shatter` : le coup | `grass.tsx` (impulsion), `sound-design.tsx` |
| 6 | apres 0,55 | le rayon de soleil tombe sur le cerf (`SunBeam`, elevation 62 degres, hauteur 18), la flaque de lumiere au sol, les poussieres ; l'or emplit les gravures de la Piedra (`uPiedraGold`) | jusqu'au bas | | `sun-beam.tsx`, `piedra-ground.tsx` |
| 7 | 0,75 | climax de la camera, carillon de l'Est | | accord dore | |
| 8 | en remontant sous 0,4 | le regel (`refreezeAt`), 2,4 s : l'ecran givre, se tient, se degage | 2,4 s | | `frost-world.tsx` |
| 9 | sortie | cloture « Est · Dore », lien vers le Sud | | | |

**Ce qui manque** : la ligne de seuil (N1). Le motif d'arrivee (un souffle
qui s'ouvre, 0,9 s, 300 -> 2 400 Hz) se joue en venant d'une autre direction.
