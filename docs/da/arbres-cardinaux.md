# Les quatre arbres cardinaux · sources et essences

Base documentaire du chantier « un arbre par direction » (07/09/2026), ouvert
en remplacement des lianes fleuries. Contrainte de Sylvain : des essences
PRECOLOMBIENNES, presentes au Mexique au temps des Mexica, pas forcement
emblematiques du pays.

## Le codex le fait deja, et nous le citons deja

Le Codex Fejervary-Mayer, planche 1, est la carte cosmologique que ce site
suit depuis le debut (elle est dans les sources du Codex du site pour la
structure des cinq directions). Elle place QUATRE ARBRES aux quatre points,
en T, autour d'un centre occupe par Xiuhtecuhtli, le dieu du feu, et des
OISEAUX porteurs des quatre porteurs d'annee dans les interstices.

Identification des quatre arbres par la Library of Congress, qui detient le
manuscrit (collection Jay I. Kislak) :
<https://www.loc.gov/exhibits/exploring-the-early-americas/interactives/heavens-and-earth/earth/>

| Direction | Arbre du codex | Espece | Notes de la LoC |
| --- | --- | --- | --- |
| Est (haut) | shaving brush tree | *Pseudobombax ellipticum* (amapolli, clavellina) | bois de feu, artisanat, et une boisson tres enivrante |
| Sud (droite) | cocoa tree | *Theobroma cacao* (cacahuacuahuitl) | le cacao, monnaie et boisson rituelle |
| Ouest (bas) | « Hummingbird Tree » | non tranchee, cf ci-dessous | l'arbre a colibris |
| Nord (gauche) | kapok tree | *Ceiba pentandra* (pochotl) | l'ecorce : diuretique, aphrodisiaque, maux de tete |
| Centre | pas d'arbre | Xiuhtecuhtli, le feu | c'est notre jade : le foyer, pas un arbre |

Le centre sans arbre tombe juste : notre Centre EST Xiuhtecuhtli.

## Le point a trancher : l'arbre de l'Ouest

« Hummingbird Tree » est le nom donne par la LoC, pas une espece. En anglais
il designe d'ordinaire *Sesbania grandiflora*, qui est asiatique : ce n'est
donc pas celle-la. Deux candidates mexicaines dont les fleurs rouges attirent
les colibris :
- *Erythrina americana*, le colorin, en nahuatl tzompancuahuitl (« l'arbre du
  rateau de cranes ») : arbre du centre du Mexique, fleurs rouges en epis,
  present dans les jardins et les haies vives depuis l'epoque prehispanique ;
- *Gliricidia sepium*, le cacahuananche, aussi mexicain, fleurs roses.
A verifier dans le commentaire d'Anders, Jansen et Reyes Garcia (Fondo de
Cultura Economica) avant de trancher. En attendant : le colorin, dit comme
notre lecture et non comme une identification.

## Ce que ca donne a l'ecran (a valider)

Un arbre par page, en bordure du cercle, qui se couvre de feuilles ou fleurit
avec le scroll (meme mecanique que la milpa). Aucun au Centre. A l'Est, il
subit le gel comme la milpa : nu et blanchi sous la glace, il ne feuille
qu'apres le dard.

Modelisation : par script Blender comme le xiuhcoatl et la milpa
(tools/blender/), un script par essence ou un script parametre (tronc,
branchement, couronne, fleurs). Les quatre silhouettes sont tres differentes,
ce qui aide : le pochotl a un tronc renfle et des branches horizontales, le
cacao est petit avec de grandes feuilles et des cabosses sur le tronc, le
Pseudobombax a une ecorce verte marbree et des fleurs en pinceau, le colorin
est tortueux avec des epis rouges.

## Etat : RETIRE le 07/09, a REFAIRE (backlog)

Une premiere version a ete faite puis retiree le soir meme, a la demande de
Sylvain : « le truc important ce sera surement de les voir a l'ecran en
fonction de l'orientation, peut-etre un peu derriere dans le background ».

Ce qui n'allait pas : UN arbre par page, plante a un azimut fixe. C'etait un
accessoire qui traverse le cadre au fil de l'orbite, pas la carte du codex.
Or la planche 1 montre les QUATRE arbres en meme temps autour du centre.

Le bon dessin, pour la reprise :
- les quatre arbres existent TOUJOURS, tous les quatre, dans le repere du
  decor tourne (CardinalOrientation) et aux quatre points de la boussole du
  decor ; c'est l'orientation de la page qui amene l'arbre de la direction
  face au visiteur, les trois autres restant sur les cotes et derriere ;
- BEAUCOUP PLUS LOIN (rayon 12 a 18 u) et donc en taille adulte (8 a 15 m),
  lus comme du paysage et non comme des accessoires : ca leve aussi le
  compromis des « jeunes sujets » de la premiere version ;
- loin = peu de pixels : le feuillage peut etre bien plus leger (bouquets en
  panneaux plutot que feuilles individuelles), ce qui repond a la question du
  cout ; la desaturation par la profondeur les fond deja dans la brume ;
- seul l'arbre que l'on regarde a besoin de repondre au scroll (feuillage qui
  pousse) ; les autres restent des silhouettes ;
- au Centre, les quatre arbres autour du foyer : c'est exactement l'image de
  la planche 1, et ca nourrit le chantier Xiuhtecuhtli.

Ce qui est GARDE de la premiere version : `tools/blender/arbres-cardinaux.py`
(le script parametre, quatre especes, deux objets Wood et Foliage par GLB) et
les enseignements ci-dessous. Les GLB, la lib et le composant sont retires du
depot ; ils sont dans l'historique git au commit d602ad4.

## Ce que la premiere version a appris

- Un premier jet trop clairseme donne des baliveaux a bouquets : il faut 4
  niveaux de branchement, 4 puis 3 branches, et des feuilles le long des
  rameaux et pas seulement au bout.
- Le placement doit eviter les DEUX regards qui comptent : l'ouverture
  (azimut 180) et l'arrivee en bas de page (135). Un arbre a 146 se dressait
  pile derriere le cerf.
- Chaque GLB porte deux objets, `Wood` et `Foliage`, origine du feuillage au
  haut du tronc : c'est ce qui permet de faire pousser le feuillage a part.
- Signes propres a garder : cabosses sur le TRONC du cacao (cauliflorie),
  epis rouges du colorin, fleurs en pinceau de l'amapolli, tronc renfle et
  houppier large du pochotl.
- Les mesures de fps du 07/09 au soir sont inutilisables (6, 51 puis 19 sur
  la meme page, machine saturee) : refaire a froid.
