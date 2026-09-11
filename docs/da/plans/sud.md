# Sud, turquoise : le midi et le serpent de feu

Une idee : la bataille de Coatepec et le midi qui brule ; le serpent de feu
frappe, la Piedra s'allume, les pierres de l'annee s'embrasent
(`sud-sources.md`, `lib/sud-arc`, `lib/strike-sequence`).

| # | position | plan | tenue | son | fichier |
| --- | --- | --- | --- | --- | --- |
| 1 | voile | la nuit du Sud (lumiere a 0,18, `lightNight`), le ciel photographie du Sud (`sud-sky.jpg`) | | | `sud-sky.tsx` |
| 2 | 0,05 a 0,45 | la bande de l'aube (`dawnBand`) : la lumiere monte vers midi (`lightNoon` 1) ; les colibris (Huitzilin) au Sud seulement | | le lit de chaleur (triangles 55, 55,7, 110,3 Hz, passe-bas 220) qui suit le jour | `huitzilin-birds.tsx`, `sound-design.tsx` |
| 3 | 0,28 a 0,52 | la bataille (`battleStart` -> `battleEnd`) : les quatre cents (les etoiles Centzon) se dispersent | | | `centzon-stars.tsx` |
| 4 | arc | le serpent erre (`xiuhcoatl-wander`), son projecteur au sol, son ombre la nuit | | | `xiuhcoatl-companion.tsx` |
| 5 | frappe | la sequence de frappe (`strike-sequence`) : raidissement, eclair, secousse du sol (la Piedra tremble, `cardinal-orientation`), soulevement, feu, teinte ; le trajet (`strike-path`) ; l'anneau de la Piedra s'allume, les pierres de l'annee s'embrasent (lustre 0,35) | selon la sequence | le tonnerre a `strikeHit` : craquement, boom, sub | `xiuhcoatl-strike-director.tsx`, `piedra-ring-fire.tsx`, `year-stones.tsx` |
| 6 | 0,75 | climax de la camera, carillon du Sud ; l'herbe couchee par l'onde de la frappe | | accord turquoise | `grass.tsx` |
| 7 | sortie | cloture « Sud · Turquoise », lien vers l'Ouest | | | |

**A arbitrer** : F1 du plan d'execution, l'arc « nuit vers midi » (la note du
tableau de bord le cite comme ce qui manque au Sud).

**Ce qui manque** : la ligne de seuil (N1). Le motif d'arrivee : une braise
qui claque et un coup sourd (95 -> 58 Hz).
