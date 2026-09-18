# Comment un monde rentre sous la terre

*18/09/2026. Ecrit apres l'arbitrage de Sylvain (« oui pour le monde qui
s'enfonce »), et parce que ce geste sera vu a chaque navigation : la regle
du site est qu'un geste vu par tout le monde doit etre atteste, pas
invente. Sources en fin de document.*

---

## 0. Ce que la mesure a deja etabli

Le passage d'une direction a l'autre COMMUTAIT : le monde qui part passait
de visible a invisible et celui qui arrive l'inverse, dans la meme image
(`transitions-etat-de-l-art.md`, sections 12 et 13). Les causes de
luminance sont corrigees depuis le 17/09 -- le plus gros saut de l'anneau
est tombe de 25,6 a 10 -- et les mondes traversent desormais.

**Ce document ne traite donc plus un defaut.** Il traite un geste : on veut
VOIR un monde partir, pas seulement cesser de le voir. C'est la difference
que `dispersion-etat-de-l-art.md` nomme en section 0 : « une pierre qui
rapetisse jusqu'a zero ne part pas, elle est supprimee ».

---

## 1. Cosmogonique : le geste existe, et c'est celui du soleil

Tlaltecuhtli est la terre elle-meme, faite du corps demembre du monstre
primordial. Deux faits sont attestes et suffisent a fonder le geste.

**Elle avale le soleil au crepuscule et le rend a l'aube.**

> « The Mexica believe Tlaltecuhtli to swallow the sun between her massive
> jaws at dusk, and regurgitate it the next morning at dawn. »

La source citee est Sahagun, *Codex de Florence*, livre VI (1590).

**Et sa bouche est devenue les grottes.** Dans le recit du demembrement,
« sa peau devint les herbes et les petites fleurs, ses cheveux les arbres,
ses yeux les sources et les puits, son nez les collines et les vallees, ses
epaules les montagnes, et sa bouche les grottes et les rivieres ». La
source citee est Thevet, *Histoyre du mechique* (v. 1540).

**Ce que ca donne pour nous.** Notre arc EST le voyage du soleil : chaque
direction le lit a sa facon, l'Ouest le fait tomber, le Nord descend le
Mictlan. Un monde qui rentre sous la terre quand on le quitte, et qui en
ressort quand on y arrive, ne fait donc pas un geste de plus : il fait LE
geste, celui que la terre fait au soleil deux fois par jour. Rien a
inventer, rien a dramatiser.

**Une reserve de methode.** L'idee que les machoires ouvertes de
Tlaltecuhtli soient l'entree de l'inframonde est apparue dans un resume de
recherche et n'a PAS ete confirmee sur la page consultee. Elle n'est donc
pas utilisee ici. Ce qui est utilise -- l'avalement du soleil au crepuscule,
sa restitution a l'aube, la bouche devenue grottes -- est cite avec ses
sources primaires sur cette page.

---

## 2. Technique : pourquoi le vertical et pas le recul cardinal

Deux candidats avaient ete poses a l'arbitrage.

| | ce que ca coute | ce qui gene |
| --- | --- | --- |
| **Il s'enfonce** | une ecriture de matrice sur le groupe racine | des objets peuvent se voir traverser le sol au ras de l'horizon |
| Il recule vers son point cardinal | une ecriture de matrice aussi | depend du `far` du brouillard, qui varie par direction : ailleurs qu'a l'Ouest le decor resterait visible en s'eloignant |

Le vertical gagne sur un point qui n'est pas esthetique : **le sol fait le
masque**. Pas de brume a regler direction par direction, pas de
transparence, pas de tri de transparents, pas de shader. C'est la famille F
de `dispersion-etat-de-l-art.md`, la seule dont le tableau des couts dit
« rien ».

---

## 3. Ce qui a deja ete essaye, et pourquoi ca n'a rien donne

**Le 17/09, ce geste a ete ecrit puis retire.** Il etait pose sur
`MountForDirection`, et la mesure n'a pas bouge d'un dixieme : les mondes
n'attendent pas la porte du montage, ils ouvrent la leur (`frost-world`
fait `root.visible = frost > 0.01`, `copal-braziers` faisait pareil).

Ce n'est plus le cas. Depuis, le givre ne rattrape plus le temps perdu sur
l'image du commit, et le copal suit une PRESENCE qui traverse
(`lib/presence-direction`) au lieu d'un booleen de route. Le geste peut
donc etre repose : il ne masque plus un defaut, il ajoute un sens.

---

## 4. Le reglage, et ce qui reste a l'oeil

`DEPART.profondeur` est le seul vecteur du geste. Assez pour que le plus
haut du decor cardinal passe sous le sol, pas plus -- un monde qui plonge
trop loin met trop longtemps a revenir, et l'arrivee doit rester immediate.

**A verifier a l'oeil, parce qu'aucune mesure ne le dira** : au ras de
l'horizon, la ou le sol ne couvre plus, un objet qui descend peut se voir
passer au travers. Si ca arrive, deux sorties : reduire la profondeur, ou
faire descendre le monde plus lentement que la brume ne se referme.

---

## 5. Sources

Consultees le 18/09/2026.

- Wikipedia, *Tlaltecuhtli* : https://en.wikipedia.org/wiki/Tlaltecuhtli (cite Sahagun, *Codex de Florence* livre VI, et Thevet, *Histoyre du mechique*)
- Mexicolore, *See you later, Alligator* : https://www.mexicolore.co.uk/aztecs/aztefacts/see-you-later-alligator/kids
- World History Encyclopedia, *Tlaltecuhtli* : https://www.worldhistory.org/Tlaltecuhtli/
- Et, dans le depot : `dispersion-etat-de-l-art.md` (les six manieres de partir, le tableau des couts), `transitions-etat-de-l-art.md` sections 12 et 13 (la mesure de l'anneau, la fausse piste et la cause).
