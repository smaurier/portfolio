# Centre · Tlalxicco · sources et brief du chantier

Base documentaire du chantier « identite du Centre » (page d'accueil, jade),
constituee le 07-08/09/2026, meme rigueur que les quatre points cardinaux :
chaque element visuel doit pouvoir citer sa source, les licences sont nommees.
C'est la derniere direction sans identite propre (Sylvain, 07/09 : « au centre,
on doit faire quelque chose avec ce dieu du feu, c'est vraiment le dernier
point cardinal que l'on n'a pas vraiment travaille »).

## Les noms, et ce qu'ils disent deja

- Le Centre a deja son nom nahuatl dans le glossaire du site : **Tlalxicco**,
  le nombril de la terre. C'est la que demeure **Xiuhtecuhtli**, le Seigneur
  turquoise, dieu du feu, de l'annee et du temps, qui se confond avec
  **Huehueteotl**, le vieux dieu.
- Les Mexica appelaient ce nombril de la terre le **nombril du FEU**
  (*in tlexicco*), parce que c'est la que le dieu reside ; et Xiuhtecuhtli
  porte aussi le nom de **Tlalxictentica**, « celui qui est le nombril de la
  terre ». Sahagun (Codex de Florence) : « Ueueteotl, qui est place dans le
  nombril de la terre ».
  <https://www.mexicolore.co.uk/aztecs/gods/the-old-god-of-fire>
  <https://nahuatl.wired-humanities.org/content/xiuhtecuhtli>
- **La phrase qui tient tout le chantier** : de la, Xiuhtecuhtli envoie
  l'energie sacree vers les quatre quartiers du Cinquieme Soleil. Le centre
  n'est pas une case de plus, c'est la source des quatre autres. Le site
  raconte donc au Centre ce que les quatre directions depensent.

## Le foyer : trois pierres, et un nombre

- Le foyer domestique se compte en **trois pierres**, les **tenamaztin** :
  le meme mot que « triplets ». Le nombre trois est attache au dieu du feu
  precisement pour cette raison.
- Les trois pierres ont des NOMS : **Mixcoatl, Tozpan et Ihhuitl**.
- Interdit attache au foyer : qui offensait le feu en marchant sur les
  pierres devait mourir bientot. (Piste d'interaction : le seul endroit du
  site ou l'on ne doit pas poser le curseur.)
  <https://www.mexicolore.co.uk/aztecs/ask-experts/why-always-three-hearth-stones>
  <https://nahuatl.wired-humanities.org/content/tenamaztli>

## Le feu ne s'allume pas, il se FORE

- Le feu neuf est tire par rotation d'un baton sur une planchette, le
  **mamalhuaztli**. C'est un geste, pas une etincelle.
- Et *mamalhuaztli* est aussi le nom d'une CONSTELLATION, « le foret a feu »
  (correspondant en partie au Taureau).
  <https://www.mexicolore.co.uk/aztecs/artefacts/fire-drill>

## La nuit du Feu Nouveau (pour le final, pas pour l'etat courant)

- Tous les 52 ans, le **xiuhmolpilli**, la ligature des annees : tous les
  feux eteints, puis le feu neuf fore sur la poitrine d'un sacrifie au
  sommet du **Huixachtecatl** (Iztapalapa), et porte de foyer en foyer.
  Derniere ceremonie : 1507, sous Motecuhzoma II.
- On guettait **Tianquiztli**, « le marche » (les Pleiades) : quand elles
  atteignaient le zenith a minuit, le monde continuait. Puis venait
  **Mamalhuaztli**. Les heures citees pour 1507 : Tianquiztli au meridien
  a 22 h 02, Mamalhuaztli a 22 h 44.
  <https://www.mexicolore.co.uk/aztecs/stories/new-fire-ceremony>
  <https://www.worldhistory.org/article/866/the-aztec-new-fire-ceremony/>

## CORRECTION importante : ce que portent les quartiers de la Piedra

La pierre du Soleil ne porte pas les quatre DIRECTIONS mais les quatre
SOLEILS precedents, dans les quatre panneaux du glyphe *ollin* disposes en X
autour du visage central :

| Position | Soleil | Fin du monde |
| --- | --- | --- |
| haut droite | Nahui Ocelotl, 4 Jaguar | devore par les jaguars |
| haut gauche | Nahui Ehecatl, 4 Vent | emporte par les ouragans |
| bas gauche | Nahui Quiahuitl, 4 Pluie | une pluie de feu |
| bas droite | Nahui Atl, 4 Eau | le deluge |

Le centre est **Nahui Ollin**, notre soleil, promis au tremblement de terre.
<https://smarthistory.org/the-sun-stone-the-calendar-stone-aztec/>

Consequence pour la scene : ecrire les quatre directions dans les quartiers
serait FAUX. Les quartiers portent les quatre mondes MORTS ; les quatre
directions vivantes s'ecrivent autour, comme dans la planche 1 du
Fejervary-Mayer (cf docs/da/arbres-cardinaux.md). Le Centre a donc deux
couches de quatre, distinctes et toutes deux attestees, et le site raconte
DEJA les quatre soleils dans une section du Codex.

## Le brief : une seule idee, le feu

Les quatre directions sont des voyages, avec une heure, un ciel, un
evenement. Le Centre est un foyer : on y est chez soi et ce qu'on garde,
c'est le feu. Il n'est pas devant le cerf, il est DESSOUS : la Piedra est le
couvercle du nombril de feu, et ses gravures rougeoient par en dessous.
Signature formelle : sur les quatre points la lumiere vient du ciel et c'est
le soleil qui bouge avec le scroll ; ici la lumiere vient du sol et c'est le
feu qui monte. Seule page du site eclairee par le bas.

Tout le reste doit etre une CONSEQUENCE du feu, jamais un element juxtapose
(c'est la discipline des sites primes, cf docs/da/etat-de-l-art.md) :

1. **Le feu sous la pierre** : les gravures s'allument de l'interieur, la
   lumiere rasante prend le ventre et les pattes du cerf. Le mecanisme
   existe (`uPiedraGold` dans piedra-ground.tsx, construit pour l'or de
   l'Est) : couleur de braise et pulsation.
2. **Ton premier geste fore le feu** : a l'arrivee le foyer est froid et la
   pierre eteinte ; le premier scroll le fore (mamalhuaztli). Geste
   d'origine du site, et il se joue dans les cinq premieres secondes.
3. **Les quatre soleils morts s'allument** un a un dans les quartiers, a
   mesure que le feu monte : le foyer eclaire la memoire des mondes finis.
4. **Les trois pierres** du foyer, nommees (Mixcoatl, Tozpan, Ihhuitl), et
   l'interdit : le curseur ne doit pas s'y poser.
5. **Les quatre directions vivantes autour** : une lueur par direction dans
   sa couleur, qui s'eveille avec le feu — « de la, il envoie l'energie aux
   quatre quartiers ». Rendues surtout au survol/focus d'un lien cardinal :
   vues au bon moment plutot qu'en permanence.
6. **La page se souvient de toi** : chaque trace accomplie ailleurs devient
   une marque allumee ; quand toutes brulent, le Feu Nouveau devient
   possible (cf la mue d'or au backlog).
7. **L'axe vertical** : la fumee monte, le regard suit, et la camera bascule
   vers le zenith en fin de page — la seule page ou le ciel compte au-dessus
   et non a l'horizon. Les Pleiades y culminent quand on touche le bas.
8. **L'ombre portee par le feu d'en bas** : celle du cerf s'etire vers
   l'exterieur, immense, au lieu de tomber.
9. **Le son** : la seule page ou le feu crepite. C'est par la que doit
   commencer la vraie couche sonore du site.

## Ce qu'on ne fait pas

- Aucun dieu a l'ecran : ni Xiuhtecuhtli, ni Huehueteotl courbe sous son
  brasier. La regle du site tient, et le foyer dit tout.
- Pas de Feu Nouveau ici et maintenant : c'est le final, quand toutes les
  traces sont ecrites, et il ne vaut que joue une fois.
- Pas les quatre directions dans les quartiers de la pierre (cf correction
  ci-dessus).
- Les cinq braseros de copal (lib copal + copal-braziers.tsx, ecrits,
  testes, demontes le 07/09) ne reviennent qu'ici, et **peu nombreux et
  proches** : le foyer, pas une bordure.

## Ou ca se branche dans le code

Le Centre n'est pas vide, il est inegal : `ambience/center-xiuhtecuhtli.tsx`
existe depuis le 28/08 et fait deja monter soixante braises jade autour du
cerf (« un feu axial silencieux, comme une flamme qui respire »). Il manque
trois entrees, une ligne chacune :

- `src/lib/direction-light.ts` : `jade` vaut `NEUTRAL_RIG`, donc aucune
  identite lumineuse. C'est la qu'entre la lumiere venue du sol.
- `SKY_LOOK` dans `sud-sky.tsx` : ne connait que turquoise, cendre, dore.
- `dayAtArc` dans `src/lib/arc-day.ts` : renvoie l'arc generique pour jade ;
  c'est la qu'entre « le feu monte » au lieu de « le soleil monte ».

Le reste existe : l'emissif sur les traits de la Piedra, le systeme de
traces avec son abonnement (`subscribeTraces`), l'impulsion radiale de
l'herbe pour repondre au clic, la chaine du cou du cerf avec ses butees.

## Symboles verifies le 08/09 (deuxieme passe)

### Les attributs de Xiuhtecuhtli sont DEJA dans le site

Le Seigneur turquoise se reconnait a quatre attributs, tous PORTES, aucun
n'etant son corps :

- le **xiuhuitzolli**, le diademe de mosaique de turquoise du pouvoir, dont
  les plumes s'ouvrent sur les cotes **comme du feu** ;
- un **pectoral de papillon** de turquoise ;
- le **xiuhtototl**, l'oiseau turquoise (Cotinga amabilis), qui plonge depuis
  son front ;
- le **xiuhcoatl**, le serpent de feu, porte dans son dos.

<https://www.worldhistory.org/Xiuhtecuhtli/>
<https://aztecart2017.ace.fordham.edu/exhibits/show/xiuhtecuhtli/iconography_-xiuhtecuhtli->
<https://www.mexicolore.co.uk/aztecs/artefacts/xiuhuitzolli-royal-diadem>

**Consequence pour nous, et elle est forte** : le serpent de feu vit deja dans
le site, au Sud (xiuhcoatl-companion.tsx). Le papillon, l'oiseau et le diademe
sont trois objets PORTABLES, donc trois signes possibles au Centre sans jamais
modeliser le dieu. La regle du site tient sans effort : on montre ce qu'il
porte, jamais lui. Et le Centre devient l'endroit ou converge ce qui est
disperse dans les quatre directions.

### Le rite qui donne au Centre son histoire

Le nouveau-ne est place **pres du feu, et doit y rester quatre jours**. Le
**tonalli**, l'une des trois entites animiques, siege au sommet du crane et
regle la chaleur du corps : il faut donc le rechauffer des la naissance.
Pendant ces quatre jours, **personne ne peut prendre de feu au foyer**, pour
que le feu interieur de l'enfant ne soit pas emporte avec. Et le cordon
ombilical d'une fille est **enterre pres du foyer** (celui d'un garcon, sur un
champ de bataille).

<https://www.mexicolore.co.uk/aztecs/aztec-life/notes-on-the-three-spirits-souls-animistic-forces>
<https://www.mexicolore.co.uk/aztecs/home/aztec-concepts-of-the-human-body-1>

**C'est l'histoire du Centre.** Les quatre directions sont des voyages ; le
foyer est l'endroit ou l'on recoit son tonalli. Pour un portfolio, la lecture
tombe juste sans qu'on ait a l'expliquer : le centre est l'endroit d'ou vient
ce qu'on est, et les quatre directions sont ce qu'on en fait.

### Ixtli : au centre de la pierre il y a un visage, et ce mot veut dire identite

Presque tous les glyphes olin portent un **oeil central** ; sur la Piedra, cet
oeil devient un **visage**. David Stuart : sa position au centre du glyphe en
fait « une elaboration graphique du motif de l'oeil central qui apparait dans
presque tous les autres exemples, plus simples, du signe Olin ». Et **ixtli**
signifie « visage, oeil, surface », et peut signifier **l'identite** : le
visage diagnostique d'une personne ou d'une chose. Le visage central est lu
selon les auteurs comme Tonatiuh, comme Tlalteuctli, ou comme un portrait
divinise de Moteuczoma II.

<https://mayadecipherment.com/tag/nahui-ollin/>

**A NE PAS reprendre tel quel** : on lit souvent que cet oeil central serait
l'oeil perdu de Xolotl. La formule est belle et Xolotl marche deja dans notre
Ouest et notre Nord, mais elle est donnee **sans aucune source** (« it is
said »), y compris par le musee qui la publie, et l'etude savante de ce glyphe
n'en dit rien. Donc : soit on ne s'en sert pas, soit on l'assume comme NOTRE
licence, declaree comme telle dans le Codex. Jamais presentee comme attestee.
<https://www.aao.org/museum-blog/detail/lost-eye-of-xolotl>

## La desaturation par le feu (idee de Sylvain, 08/09)

Idee : « une pierre qui brule, et plus on s'eloigne de la pierre, plus le tour
est desature ». Elle est juste, et elle est presque gratuite : le mecanisme
existe deja.

depth-fade.ts (18/08, « plus on est loin et plus ca devient gris, comme en
peinture ») fait exactement ce melange, mais ancre sur la CAMERA :

    float t = smoothstep(uNear, uFar, length(vViewPosition));
    float grey = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(grey), t);

Il suffit de changer l'origine de la distance : au lieu de la camera, le
foyer. Le moins couteux est de passer la position du foyer en espace CAMERA
dans un uniform, mis a jour une fois par image cote JS (aucune varying
supplementaire, aucun cout par fragment) :

    float t = smoothstep(uNear, uFar, length(vViewPosition + uHearthView));

vViewPosition valant -mvPosition.xyz dans three, la somme est bien la distance
du fragment au foyer.

Trois points a tenir :

1. **Ca REMPLACE la desaturation par la camera sur jade, ca ne s'ajoute pas.**
   Empilees, les deux se battent : un objet proche de l'oeil mais loin du feu
   serait gris deux fois, et le degrade ne raconterait plus rien.
2. **Plafonner le melange** (0,85 et non 1) : une peripherie totalement grise
   se lit comme un bug de rendu, surtout sur mobile ou le cadre est plus
   serre.
3. **Le cerf n'est pas concerne** (il est deja exclu de depth-fade, il a
   rim-light a la place), et c'est exactement ce qu'il faut : il se tient pres
   du feu, il garde sa couleur.

Et le sens tombe juste avec le rite ci-dessus : **la couleur est le tonalli que
le feu donne**. Ce que le feu touche est vivant et colore ; le reste attend.
Seule page du site ou la perspective atmospherique n'est pas une distance a
l'oeil mais une distance a la chaleur.

## ARBITRAGE A RENDRE : qui allume le feu ?

Le 08/09, deux reponses opposees existent en meme temps dans le projet, et il
faut en choisir une :

- **Le brief ci-dessus (element 2)** : a l'arrivee le foyer est FROID, et le
  premier scroll le fore (mamalhuaztli). Le geste d'origine du site est celui
  du visiteur.
- **Le chantier src/lib/foyer.ts** (ecrit le meme jour dans une autre
  session) : le feu du foyer **ne s'eteint jamais**, c'est un etat et non un
  evenement ; l'ecran de chargement est la nuit du rite, et « le visiteur
  n'allume rien : le voile s'ecarte parce qu'il s'est approche assez pres pour
  voir que le foyer brulait depuis le debut ».

Les deux sont defendables et attestees : le feu domestique se garde, le Feu
Nouveau se fore. Mais elles ne peuvent pas etre vraies **sur la meme page au
meme moment**. Le rite du nouveau-ne tranche plutot pour la seconde : pendant
quatre jours on ne prend meme pas de feu au foyer, il brule. Si on garde la
seconde, le forage n'est pas perdu : il devient le geste du Feu Nouveau, donc
de la mue d'or de fin de parcours, ou il a davantage de poids parce qu'il se
merite.
