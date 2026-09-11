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
| 7 | 0,8 a 1 | le regard monte vers le zenith (jusqu'a 78 degres, `ZENITH_MAX_DEG`), la Voie lactee (12 000 points, un grand cercle vertical), le flou de profondeur s'eteint | | | `milky-way.tsx`, `post-fx.tsx` |
| 8 | sortie | la camera monte, le champ se resserre, la vignette se ferme ; la cloture « Centre · Tlalxicco » et le lien vers l'Est | | | `page-closure.tsx` |

**A arbitrer (Sylvain, 11/09)** : au plan 7, un ciel seul (78 degres) ou une
bande d'horizon conservee (60 a 65 degres). Capture du bas de page a
l'appui.

**Ce qui manque** : une ligne de seuil a l'arrivee (N1, brouillon dans
`lignes-de-seuil.md`) ; le motif d'arrivee du Centre (trois crepitements)
ne se joue qu'en revenant d'une autre direction, jamais au premier
chargement, c'est voulu.
