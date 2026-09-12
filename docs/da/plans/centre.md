# Centre, jade : le foyer

Une idee : le nombril du monde, le foyer qui ne s'eteint pas, d'ou partent
les chemins. Le tonalli, la chaleur recue a la naissance (`centre-sources.md`).

| # | position | plan | tenue | son | fichier |
| --- | --- | --- | --- | --- | --- |
| 1 | voile | la Piedra en trace, le nom, le choix du son | jusqu'a la chauffe | silence, puis le lit de feu si « avec le son » | `piedra-skeleton.tsx` |
| 2 | 0 a 0,25 | penombre : le cerf sur la Piedra, les braseros de copal a l'intensite de l'offrande | | crepitements a la cadence de `copalIntensity` | `copal-braziers.tsx`, `lib/copal` |
| 3 | 0,25 a 0,5 | la lumiere monte, l'orbite commence, le mais pousse (`getMilpaGrowth`) | | | `milpa.tsx` |
| 4 | 0,5 a 0,75 | face a face avec le cerf, la tete se tourne vers le visiteur (`getHeadTurnAmount`) | | | `stag-model.tsx` |
| 5 | 0,68 | (colonne de fumee DEMONTEE le 12/09, invisible a l'image de repos) ; il ne reste que le tempo : `columnRise` eteint le flou de profondeur | | | `lib/zenith-arc`, `post-fx.tsx` |
| 6 | 0,75 | climax de la camera, carillon du Centre | | accord jade | `climax-chime` |
| 7 | 0,68 a 1 | la montee du regard est COUPEE (`ZENITH_LIFT` 0, 11/09) : la camera reste sur le cerf, le flou de profondeur s'eteint a mesure que la colonne se leve, l'image finale est le monde entier, net ; la Voie lactee (12 000 points, un grand cercle vertical) n'est visible que si le regard monte | | | `milky-way.tsx`, `post-fx.tsx` |
| 8 | sortie | la camera monte, le champ se resserre, la vignette se ferme ; la cloture « Centre · Tlalxicco » et le lien vers l'Est | | | `page-closure.tsx` |

**Tranche le 11/09 au soir** (Sylvain : « une belle image et pas floue ») :
quatre captures comparees, a 78, 62, 35 degres et a 15 % de montee ; aucune
ne montre la terre ET la colonne ET le cerf ; seule la position de repos
donne une image complete et nette.

**La colonne, mesuree le 11/09 plus tard dans la soiree** (Sylvain avait
choisi d'abaisser la base ; A/B en captures, `.scratch/colonne-ab.mjs`,
chant masque) : a 85 % de l'arc la colonne est a pleine intensite
(uIntensity 1,0, mesh visible, y 14,6) et INVISIBLE a l'image, base a 2,6,
1,4 ou 0,6, et meme a densite quadruplee (base 1,4). Un voile additif de
0,5 ne se lit pas sur l'herbe claire ; il ne se lisait que contre le ciel
noir, quand le regard montait (coupe par ZENITH_LIFT 0). Abaisser la base ne
change donc rien. Le cimetiere du Codex (fr.json, « une colonne de feu de
trois metres qui traversait le cerf ») rappelle qu'une colonne dense a deja
aveugle le sujet. **Tranche par Sylvain le 12/09 : DEMONTEE.** `foyer-column.tsx` n'est plus
monte dans `scene-content.tsx` (un programme et un appel de rendu de moins,
aucun changement d'image) ; le fichier reste pour le jour ou le regard
remontera. La profondeur de champ continue de s'eteindre sur `columnRise`.

| # | position | plan | tenue | son | fichier |
| --- | --- | --- | --- | --- | --- |
| 9 | 0 a 0,82 | le chant du Centre (Cantares, chant I, strophe 1, fol. 1r : « Je parle avec mon coeur, ou prendrai-je les belles fleurs parfumees ? ») defile en colonne droite par-dessus la scene, puis sort par le haut avant l'image finale ; visible aussi en mode recit | | | `cantar.tsx`, `lib/cantares.ts` |

**Ce qui est fait le 11/09 au soir** : la ligne de seuil du Centre (N1,
« Vous revenez au foyer. La chaleur que vous portez est celle du premier
jour. ») ; le chant (M4). Le motif d'arrivee du Centre (trois crepitements)
ne se joue qu'en revenant d'une autre direction, jamais au premier
chargement, c'est voulu.
