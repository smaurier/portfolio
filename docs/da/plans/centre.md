# Centre, jade : le foyer

Une idee : le nombril du monde, le foyer qui ne s'eteint pas, d'ou partent
les chemins. Le tonalli, la chaleur recue a la naissance (`centre-sources.md`).

| # | position | plan | tenue | son | fichier |
| --- | --- | --- | --- | --- | --- |
| 1 | voile | la Piedra en trace, le nom, le choix du son | jusqu'a la chauffe | silence, puis le lit de feu si « avec le son » | `piedra-skeleton.tsx` |
| 2 | 0 a 0,25 | penombre : le cerf sur la Piedra, les braseros de copal a l'intensite de l'offrande | | crepitements a la cadence de `copalIntensity` | `copal-braziers.tsx`, `lib/copal` |
| 3 | 0,25 a 0,5 | la lumiere monte, l'orbite commence, le mais pousse (`getMilpaGrowth`) | | | `milpa.tsx` |
| 4 | 0,5 a 0,75 | face a face avec le cerf, la tete se tourne vers le visiteur (`getHeadTurnAmount`) | | | `stag-model.tsx` |
| 5 | 0,68 | la colonne de fumee du foyer se leve (`COLUMN_START`) | monte jusqu'au bas | | `foyer-column.tsx`, `lib/zenith-arc` |
| 6 | 0,75 | climax de la camera, carillon du Centre | | accord jade | `climax-chime` |
| 7 | 0,68 a 1 | la montee du regard est COUPEE (`ZENITH_LIFT` 0, 11/09) : la camera reste sur le cerf, le flou de profondeur s'eteint a mesure que la colonne se leve, l'image finale est le monde entier, net ; la Voie lactee (12 000 points, un grand cercle vertical) n'est visible que si le regard monte | | | `milky-way.tsx`, `post-fx.tsx` |
| 8 | sortie | la camera monte, le champ se resserre, la vignette se ferme ; la cloture « Centre · Tlalxicco » et le lien vers l'Est | | | `page-closure.tsx` |

**Tranche le 11/09 au soir** (Sylvain : « une belle image et pas floue ») :
quatre captures comparees, a 78, 62, 35 degres et a 15 % de montee ; aucune
ne montre la terre ET la colonne ET le cerf ; seule la position de repos
donne une image complete et nette. Reste a revoir : la colonne de fumee
(base a 2,6 unites) n'entre pas dans le cadre au repos ; si on veut qu'elle
se lise, il faut l'abaisser vers le foyer ou la faire partir des braseros.

**Ce qui manque** : une ligne de seuil a l'arrivee (N1, brouillon dans
`lignes-de-seuil.md`) ; le motif d'arrivee du Centre (trois crepitements)
ne se joue qu'en revenant d'une autre direction, jamais au premier
chargement, c'est voulu.
