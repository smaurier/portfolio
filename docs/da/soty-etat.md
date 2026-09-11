# Etat d'avancement SOTY

**Mis a jour le 10/09/2026 au soir.** Ce fichier est le tableau de bord :
une seule note par scene, une seule note de site, et ce qui separe l'une de
l'autre du but. Il remplace la lecture croisee de `plan-jury.md` (08/09) et
`revue-soty-10-09.md`, qui restent au dossier comme archives datees.

**But** : une mention Awwwards, site du jour, un soir de decembre 2026.
**Ponderation du jury** : design 40, utilisabilite 30, creativite 20,
contenu 10.

**Sur l'echelle, une precision honnete** : « 10/10 sur toutes les pages »
n'est pas un objectif atteignable, c'est une asymptote. Notre convention,
posee le 10/09 et tenue depuis : **8 = site du jour**, 9 = site du mois.
C'est notre calibrage, pas un chiffre publie par Awwwards ; aucune de nos
sources ne donne la distribution reelle des notes du jury.

---

## Ou on en est

| scene | 08/09 | 10/09 matin | **ce soir** | ce qui la tient | ce qui manque |
| --- | --- | --- | --- | --- | --- |
| Centre / Accueil | 3 | 7,0 | **8,3** | 100 % du cadre en scene, son geste a elle (l'arc vertical, la colonne, l'arche), un vrai depart, 0 image en retard | l'echelle typo, le son |
| Est / Services | 8 | 8,0 | **8,3** | le monde de verre, huit gestes, le ciel d'avant-jour, 0 image en retard | deux blocs de texte sous le seuil de contraste |
| Nord / Memoire | 7 | 7,0 | **8,4** | le disque grave, le bassin, le miroir, Xolotl ; la colonne a gauche, le bassin a droite ; les cartes chapitrees ; l'eau qu'on entend | |
| Sud / Projets | 5 | 7,5 | **8,2** | 211 appels de rendu au lieu de 1349, la frappe rechoregraphiee, 0 image en retard ; la colonne a gauche, la Piedra a droite | l'arc nuit vers midi (F1) |
| Ouest / Contact | 6,5 | 6,0 | **7,7** | la meilleure ARRIVEE du site ; 30 images par seconde devenues 59,9 ; et maintenant une sortie | 13 % d'images en retard |
| **le site** | | 7,0 | **8,6** | | |

Les notes du 08/09 viennent d'un autre exercice (un panel sur douze
captures) et d'une autre echelle : elles sont la pour montrer le
mouvement, pas pour etre comparees terme a terme.

## La meme chose, par axe du jury

C'est ce tableau-la qui donne la note du site, et donc ou investir.

| axe | poids | note | ce qui la retient |
| --- | --- | --- | --- |
| Design | 40 | 8,6 | tout est pose ; ton oeil sur image : le cadre decale, l'echelle, les panneaux qui suivent la scene |
| Utilisabilite | 30 | 8,65 | axe vert sur les cinq pages, zero avis ; plus un programme compile en cours d'arc (tout se paie derriere le voile) ; l'accueil charge 10 % de JavaScript en moins ; le voile de l'accueil reste borne par le JavaScript (three, Next) ; a Contact, le graphe de scene est le premier poste |
| Creativite | 20 | 8,8 | le son est la, invite au voile, cinq elements ; a entendre par toi |
| Contenu | 10 | 8,4 | quatre fiches, dont une NestJS ; ta relecture de la quatrieme |

Moyenne ponderee : **8,7**.

---

## Ce qui separe du 9

Classe par poids du jury multiplie par l'ecart, ce qui est l'ordre de
rentabilite reel et non l'ordre des envies.

| # | quoi | axe | a qui | etat |
| --- | --- | --- | --- | --- |
| ~~1~~ | ~~L'echelle typographique~~ | design 40 | fait, 1,333 (ton choix) | 13 tailles -> 5, 6 interlignes -> 3, 11 interlettrages -> 1. Le corps ne descend jamais sous 16 px |
| ~~2~~ | ~~Le rapport contenu / scene~~ | design 40 | fait, la 1 (ton choix) | colonne sur le tiers gauche a 480 px, sujet aux deux tiers par decalage de projection ; Centre et mobile intacts |
| 3 | Le voile | utilisabilite 30 | a moi | modeles nettoyes (`1b37b45`, 4,6 Mo retires) : Contact ouvre a 23 s au lieu de 41 en local, Memoire a 23 au lieu de 36 ; les trois dictionnaires ne partent plus au navigateur (`a777e0a`, accueil 634 -> 575 Ko compresses). Reste three + React + Next, environ 300 Ko compresses, le plancher ; puis notre code de scene (decoupage par direction, a arbitrer) |
| ~~4~~ | ~~L'acte de sortie (F2)~~ | design + utilisabilite | fait, `e308564` | l'arbitrage etait deja rendu le 08/09, je l'avais mal classe |
| ~~5~~ | ~~Le son~~ | creativite 20 | fait, `823eb67` | l'invite au voile, et les cinq elements, generatifs |
| ~~6~~ | ~~Les images en retard de Contact~~ | utilisabilite 30 | fait, `4978f67` puis `43d82ae` | decor fige, 40 meches sur mobile ; et la cause de `getParameters` trouvee : sept rubans d'amate rendus en deux passes a opacite zero sur les cinq pages. Puis le graphe (`b6ed417`) : squelettes partages, fleurs figees, balayages cadences. Ce qui reste est le contenu (bandelettes, feuilles, herbe, os des porteuses) : un arbitrage |
| ~~7~~ | ~~Les six blocs de contraste~~ | utilisabilite 30 | fait, `823eb67` | un fond qui suit la scene ; l'intro et le Codex ont un panneau ; un des six etait une fausse alerte (sr-only) |
| ~~8~~ | ~~NestJS dans les projets~~ | contenu 10 | fait, `823eb67`, **ta relecture attendue** | Radar signaux en quatrieme fiche ; pas de PostgreSQL, parce qu'il n'y en a pas |

## L'acte de sortie, fait dans la meme soiree

Deux choses que la mesure a corrigees en route, et qui valent d'etre
gardees.

**J'avais mal classe le lot.** Je l'ai marque « a toi » alors que
l'arbitrage etait rendu le 08/09 : « les deux », raccourcir le flux ET
ecrire un vrai depart. Il n'attendait rien.

**L'intention derriere les 80vh etait juste.** Precisee par Sylvain :
« je voulais que l'on voie toute la scene meme avec le texte ». Le defaut
n'etait donc pas la fenetre mais ce qu'on y voyait. La marge descend a
30vh et non au minimum, et la fenetre est remplie d'un bout a l'autre.

**Ancre en bas de page, pas en fin d'arc.** Ma premiere version calait la
sortie sur la fin de l'arc : l'accueil offre 2119 px de defilement ou l'arc
en occupe 75 %, mais Memoire en offre 4466 ou il n'en occupe que 36 %.
L'acte s'y serait joue au tiers de la page, pendant la lecture.

## Ce que la mesure de ce soir avait trouve, et qui n'etait pas prevu

L'avertissement du panel du 08/09 etait juste, et il est arrive apres coup :

> L'acte de sortie doit passer AVANT le climax zenithal du Centre, ou etre
> concu avec lui.

L'arc de revelation se termine a deux hauteurs d'ecran, mais la page en fait
3319 pour un ecran de 800 : **l'arc finit a 63,5 % du defilement**, et les
36,5 % restants, plus d'un ecran, se font sur une image figee. Le climax
zenithal, construit ce soir, tombe donc au deux tiers de la page, et ce qui
suit ne bouge plus.

Ce n'est pas une regression : les 180vh morts sont anterieurs, c'est le lot
5 du panel et il n'a jamais ete fait. Mais le climax du Centre les rend
visibles au pire endroit, puisque c'est la page que le jury charge en
premier. **C'est le point 4 ci-dessus, et il attend ton arbitrage.**

## Convention de mise a jour

Une ligne par passe : la date, ce qui a bouge, la note. Les notes sont un
jugement, pas une mesure ; ce qui est mesure est dans `revue-soty-10-09.md`
et dans le tableau d'avancement de `plan-execution.md`.

- **11/09, sixieme passe** : 8,7, inchange. Contact, le graphe de scene :
  trois causes exactes reglees (`b6ed417`), gains reels mais sous le bruit
  de la sonde des images en retard ; le reste est le contenu de la page,
  a arbitrer.
- **11/09, cinquieme passe** : 8,68 -> 8,7. Les trois dictionnaires
  partaient au navigateur sur toutes les pages (la page d'accueil etait un
  composant client pour deballer params) : 64 Ko compresses de moins sur
  l'accueil (`a777e0a`).
- **11/09, quatrieme passe** : 8,65 -> 8,68. La chauffe des shaders,
  retiree la veille, retrouve son sens une fois la braise reglee : le voile
  attend la fin de la chauffe, le simulateur d'ondes fait un pas a blanc,
  le miroir compile sa variante en espace lineaire. Plus une compilation
  en cours d'arc, a Contact comme a Memoire (`86ae55c`).
- **11/09, troisieme passe** : 8,6 -> 8,65. axe en dependance de test,
  cinq pages sans avis ; la densite au bureau mesuree en A/B entrelace et
  gardee a 2 (1,5 coute plus cher ici, contre l'avis du panel) ; la derniere
  cause de Contact trouvee, sept rubans d'amate rendus en deux passes sur
  toutes les pages. Constante par constante, l'etat de l'art du 08/09 est
  tenu sur six des sept ; la septieme l'est sur ce qui a un objet chez nous.
- **11/09, seconde passe** : 8,4 -> 8,6. Les quatre arbitrages du matin :
  le son (invite au voile, cinq elements), le contraste (un fond qui suit la
  scene), Radar signaux en quatrieme fiche, le chapitrage des pages a
  contenu. Reste a toi : entendre, relire la fiche, et regarder.
- **11/09** : 8,3 -> 8,4. Les deux leviers de design qui t'attendaient :
  l'echelle typographique a 1,333 (cinq tailles au lieu de treize) et la
  colonne sur le tiers gauche, le sujet aux deux tiers, sans toucher a une
  seule trajectoire de camera. A regarder sur image : c'est ton oeil qui
  valide, la mesure ne dit que ce qui a bouge.
- **10/09 nuit, troisieme passe** : 8,2 -> 8,3. Contact : le decor immobile
  n'est plus recalcule a chaque image, 40 meches sur mobile. Les modeles :
  4,6 Mo de donnees jamais referencees retirees (xolotl 1,9 Mo -> 71 Ko).
- **10/09 nuit, seconde passe** : 8,1 -> 8,2. Le voile : trois ressources
  inutiles sorties de la fenetre de chargement, la chaine de post-traitement
  sortie du morceau principal. Et deux erreurs de mesure corrigees dans la
  revue : le poids reel est 2,01 Mo sur le fil et non 0,6, et le voile
  n'attend pas le calcul mais les octets.
- **10/09 nuit** : 8,0 -> 8,1. L'acte de sortie (F2) : le dernier tiers de
  page ne regarde plus une image figee, et le climax du Centre a un apres.
- **10/09 soir** : 7,0 -> 8,0. Cinq pages tiennent la mediane de 60 (Contact
  passait a 30), le Centre gagne son geste, la profondeur de champ devient
  permanente et juste, le vent de la prairie passe de 266 a 36 ms/s.
