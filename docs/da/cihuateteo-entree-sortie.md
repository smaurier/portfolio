# Comment les Cihuateteo entrent et sortent du monde

*16/09/2026. Ecrit a la demande de Sylvain, apres que l'empreinte complete
de la scene a designe leur groupe comme la cause de la marche de luminance
du passage (`dispersion-etat-de-l-art.md`, section 8). Etat de l'art sur
quatre axes, puis une decision. Sources en fin de document.*

---

## 0. Le defaut, en une ligne

`cihuateteo.tsx:517` :

```ts
blendRef.current += ((west ? 1 : 0) - blendRef.current) * 0.05;
g.visible = blend > 0.01;
if (!g.visible) return;
```

Le fondu existe, doux, mais **il ne pilote que la porte**. Les trois
porteuses, leurs quarante-deux mailles et leurs papillons apparaissent a
pleine presence des que `blend` franchit un centieme. Mesure : +22,6 de
luminance moyenne en une image.

La question n'est donc pas « comment les faire apparaitre en douceur »,
c'est **« que font-elles quand elles ne sont pas la ? »**

---

## 1. Cosmogonique : ce que les sources attestent

Et c'est la que la reponse arrive, sans qu'on ait a l'inventer.

Les Cihuateteo sont les esprits des femmes mortes en couches, tenues pour
l'equivalent des guerriers tombes au combat, l'accouchement etant conçu
comme une bataille. Leur charge est precise et elle leur est exclusive :
**elles guident le soleil de midi au couchant.** Les guerriers morts
l'accompagnent de l'aube au zenith ; au zenith, **elles prennent le
relais** et le portent vers l'ouest, jusqu'a ce qu'il plonge.

> « Each day, they guided the sun into the west from noon until sunset. »

L'ouest s'appelle d'ailleurs Cihuatlampa, le cote des femmes. Et elles ne
descendent sur terre que cinq jours du calendrier (1 Cerf, 1 Pluie, 1
Singe, 1 Maison, 1 Aigle), aux carrefours.

**Ce que ca dit de notre defaut.** Leur presence n'est pas une propriete de
la PAGE. C'est une fonction de la HAUTEUR DU SOLEIL. Elles ne sont pas
« absentes ailleurs et presentes a l'Ouest » : elles prennent leur charge a
midi et la tiennent jusqu'a la nuit. Un booleen de route est un contresens,
et le defaut visuel n'est que la trace de ce contresens dans le code.

Et ca tombe bien, parce que notre arc de l'Ouest fait deja exactement ce
trajet : `remapWestArc` inverse l'arc, « le soleil tombe, la lumiere
descend du clair au crepuscule » (06/09). **Le defilement du visiteur EST
la descente du soleil.**

---

## 2. Cinematographique : reveler sans coupe et sans effet

Le cinema a un nom pour ce qu'on cherche, et ce n'est ni le fondu ni la
dissolution. C'est **reveler par la mise en scene** : le sujet etait dans
le monde, c'est le cadre ou la lumiere qui vient a lui.

Les outils attestes sont trois, et aucun n'est un effet :

- **Le point qui glisse** (rack focus) : « a great way to use shallow
  depth of field to make connections between subjects without needing to
  cut ». La profondeur de champ designe, elle ne fabrique pas.
- **La profondeur de champ etendue avec etagement** : avant-plan,
  median, arriere-plan tous nets, et le sujet apparait parce qu'il
  AVANCE dans le cadre, pas parce qu'on l'allume.
- **Le mouvement d'appareil** : sur *A Ghost Story*, la camera pousse et
  decouvre ; le surnaturel est revele par le deplacement, jamais par un
  fondu.

**Ce que ca interdit chez nous** : la dissolution au bruit, le fondu
d'opacite, le tramage. Tous les trois sont des EFFETS appliques a un
sujet, et notre regle de longue date dit que les Cihuateteo ne sont jamais
dramatisees. Un effet sur elles, c'est exactement une dramatisation.

**Ce que ca autorise** : la distance. Elles viennent de Cihuatlampa, qui
est un lieu, et un lieu est loin.

---

## 3. Technique et performance : ce que le code peut vraiment

Les six familles de `dispersion-etat-de-l-art.md` ne s'appliquent pas
toutes ici, parce que ces figures sont a peau (`SkinnedMesh`), animees,
simulees.

| Famille | Ici |
| --- | --- |
| Fondu d'opacite | quarante-deux mailles a passer en transparent, tri casse |
| Fondu trame | grain visible sur un visage, sans TAA ni MSAA a densite 2 |
| Dissolution au bruit | un effet, donc une dramatisation. Ecarte par l'axe 2 |
| Particules de bord | pire encore |
| Gommage | hors budget |
| **Deplacement** | rien a ajouter : elles ont deja une position |

Et un point de performance qui compte plus que tous les autres. La ligne
`if (!g.visible) return;` **saute la simulation de tissu** quand elles ne
sont pas la, et c'est le plus gros poste de la page : trois porteuses,
leurs chaines de Verlet, leurs meches, leurs jupes. Le profil de qualite
porte deja `clothFar` et `simEveryOtherFrame` pour les contenir.

Donc toute solution qui les rend « presentes mais transparentes » paie la
simulation pendant tout le fondu, au moment ou la machine est la plus
chargee (chauffe des shaders, commit de route, entree du contenu). C'est
le contraire de ce qu'on veut.

---

## 4. La decision

**Les Cihuateteo ne s'affichent pas. Elles prennent le soleil au zenith et
le portent vers l'ouest. Leur presence cesse d'etre une propriete de la
route pour devenir une fonction de la hauteur du soleil, et comme elles
viennent de Cihuatlampa, elles arrivent de loin : c'est la brume qui les
porte, et rien d'autre.**

En trois consequences.

**1. `blend` n'est plus `west ? 1 : 0`, c'est la descente du soleil.** Au
sommet de l'arc de l'Ouest, le soleil est au zenith : elles prennent tout
juste leur charge, elles ne sont pas encore la. Plus le visiteur descend,
plus le soleil tombe, plus elles sont presentes. La route ne sert plus qu'a
MONTER le sous-arbre (`MountForDirection`), jamais a decider de leur
presence.

**2. Elles approchent depuis l'horizon.** A presence faible, elles se
tiennent au-dela du `far` du brouillard de l'Ouest (26 unites) et
rejoignent leur place a mesure que le soleil tombe. La brume les dissout
pour rien : pas de shader, pas de transparence, pas de tri. C'est la seule
place du site ou le rideau de brume fonctionne, parce que c'est le seul
endroit ou etre loin a un sens.

**3. Le defaut disparait par construction, il n'est pas masque.** On
arrive desormais toujours en haut de l'arc (decision du 16/09), donc on
arrive a l'Ouest au zenith, donc a l'instant precis ou leur presence vaut
zero. Il n'y a plus de marche a lisser : il n'y a plus rien a lever.

### Pourquoi c'est la bonne decision sur les quatre axes

- **Cosmogonique** : atteste, pas invente. Elles prennent le soleil a midi
  et le portent a l'ouest ; leur presence EST cette descente. Et rien
  n'est dramatise : elles ne surgissent pas, elles ne se dissolvent pas,
  elles font leur travail.
- **Cinematographique** : une revelation par etagement et par profondeur,
  la grammaire de l'axe 2. Aucune coupe, aucun effet. Mieux, c'est un
  raccord dans le mouvement : le defilement du visiteur est la descente du
  soleil, et elles apparaissent PARCE QU'ELLES LE PORTENT.
- **Visuel** : pas de pop, pas de grain, pas de tri de transparents, pas
  de lisere. Le fondu est fait par le brouillard, qui est deja la et qui
  est deja de la couleur de la direction.
- **Performance** : strictement meilleur qu'aujourd'hui. Le plus gros
  poste de simulation du site ne tourne pas a l'arrivee, exactement quand
  la machine est la plus chargee, et `clothFar` peut ensuite le grader
  avec la distance au lieu d'un booleen.

---

## 5. Ce que ca change dans le code

Peu, et c'est le signe que la decision est juste.

- `cihuateteo.tsx` : `blend` se calcule depuis `dayAtArc("cendre", progress)`
  (ou `remapWestArc(progress).dusk`) au lieu de `west ? 1 : 0`. La porte
  `g.visible = blend > 0.01` reste : a presence nulle il n'y a rien a
  dessiner, et c'est exact.
- Leur position gagne un terme de distance pilote par la meme presence :
  loin au zenith, en place au crepuscule.
- Le mouvement reduit garde la convention du site : pas d'approche, la
  presence est celle de l'arc, tout de suite.
- L'oracle existe : `passage-continu`, Sud vers Ouest. Le plus grand pas
  par image doit tomber de 0,49 vers la cible de 0,35.

---

## 6. Ce qui reste a toi

Trois choses que la mesure ne tranchera pas.

1. **La courbe de leur venue.** A quel moment de la descente
   apparaissent-elles ? Tard, et elles sont une recompense de fin d'arc que
   beaucoup ne verront pas. Tot, et la charge du zenith ne se lit plus.
2. **A quelle distance est « loin ».** Au-dela de 26 unites la brume les
   mange entierement ; a 20 elles sont des silhouettes. Ce n'est pas le
   meme recit.
3. **Est-ce qu'elles marchent.** Approcher peut etre un deplacement reel,
   ou simplement le fait d'etre plus pres a chaque fois qu'on regarde. Le
   second est plus etrange, et sans doute plus juste.

---

## 7. Sources

Consultees le 16/09/2026.

- Wikipedia, *Cihuateteo* : https://en.wikipedia.org/wiki/Cihuateteo (cite Matos Moctezuma & Solis Olguin, *Aztecs*, Royal Academy of Arts, 2002, et la base du Metropolitan Museum of Art)
- Mexicolore, *Aztec Women* : https://www.mexicolore.co.uk/aztecs/home/aztec-women
- The Order of the Good Death, *Motherhood on the Battlefield of Death* : https://www.orderofthegooddeath.com/article/motherhood-on-the-battlefield-of-death/
- American Society of Cinematographers, *A Ghost Story: Haunted House* : https://theasc.com/articles/a-ghost-story-haunted-house
- Backstage, *How to Get Depth in Film Shots* : https://www.backstage.com/magazine/article/depth-in-film-examples-75564/
- Wikipedia, *Focus puller* : https://en.wikipedia.org/wiki/Focus_puller

**Une reserve de methode.** Le detail du manteau de plumes de quetzal sur
lequel elles porteraient le soleil est apparu dans un resume de recherche
et n'a pas ete confirme sur les pages consultees. Il n'est donc pas
utilise ici. Le reste (la releve au zenith, la course vers l'ouest,
Cihuatlampa, les cinq jours de descente aux carrefours) est concordant sur
plusieurs sources.
