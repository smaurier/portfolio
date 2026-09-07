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

## Fait le 07/09

- `tools/blender/arbres-cardinaux.py` : un seul script, quatre especes
  parametrees (hauteur, tronc, renflement, niveaux de branchement, feuille
  simple ou palmee, fleurs, cabosses). Il exporte
  `public/models/tree-<espece>.glb` et des rendus de controle.
- Chaque GLB porte DEUX objets : `Wood` (tronc, branches, cabosses) et
  `Foliage` (feuilles et fleurs), origine du feuillage au haut du tronc.
  C'est ce qui permet au site de faire POUSSER le feuillage a part.
- Tailles : jeunes sujets de 4,4 a 6 m (choix assume, un pochotl adulte fait
  40 m). Poids apres deux passes d'allegement : cacao 6,8 k triangles,
  colorin 25 k, pochotl 30 k, amapolli 33 k.
- Signes retenus : cabosses sur le TRONC pour le cacao (cauliflorie, c'est
  sa marque), epis rouges pour le colorin, fleurs en pinceau pour
  l'amapolli, tronc renfle et houppier large pour le pochotl.
- `src/lib/cardinal-trees.ts` (8 tests) : l'essence et la place de chaque
  direction, aucune au Centre, et la pousse du feuillage (`foliageGrowth`).
  Les azimuts evitent les DEUX regards qui comptent, l'ouverture (180) et
  l'arrivee en bas de page (135) : sinon l'arbre se dresse derriere le cerf
  (constate au Sud avant correction). Rayon 7 a 8 u.
- `src/app/components/stag-scene/cardinal-tree.tsx` : charge le GLB de la
  direction, met le feuillage a l'echelle avec le scroll, et a l'Est attend
  le degel (l'arbre reste nu sous la glace, le dard le fait feuiller).

Reste : mesurer les perfs sur une machine froide (les mesures du 07/09 au
soir sont inutilisables : 6, 51 puis 19 images par seconde sur la meme page).

