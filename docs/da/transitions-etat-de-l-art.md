# Les passages : etat de l'art, et ce qu'il dit de nous

*16/09/2026. Ecrit apres le constat de Sylvain, « je trouve les
transitions assez perfectibles pour l'instant tant esthetiquement que
mythologiquement qu'au niveau perf ». Toutes les sources sont citees en
fin de document, avec la date de consultation.*

---

## 0. Ce que ce document cherche

Pas un catalogue d'effets. Les trois axes que Sylvain a nommes se
trouvent, dans l'etat de l'art, sur trois plans differents :

- le plan **technique** dit ce qu'on a le droit de montrer a l'ecran
  pendant un passage (et surtout ce qu'on n'a pas le droit de montrer) ;
- le plan **grammatical** dit ce qu'une transition SIGNIFIE, et c'est la
  que se joue le mythologique ;
- le plan **du tempo** dit combien de temps on a, et c'est la que se
  joue la performance percue.

Les trois sont separables. On peut corriger le premier sans rien
decider sur les deux autres, ce qui tombe bien : nos deux defauts
mesures sont sur le premier.

---

## 1. Les trois familles techniques

### A. Le conteneur persistant et le gestionnaire de passage

C'est la famille de Barba.js, Taxi.js et Swup, et c'est deja la notre.
Le principe : **ce qui doit survivre au changement de page vit en
dehors du conteneur qu'on echange.** Le tutoriel Codrops du 18/03/2026
le montre explicitement pour une scene Three.js : la balise canvas est
posee hors du conteneur Barba, avec le commentaire `<!-- Persists
across pages -->`, et la classe Experience est un singleton cree une
seule fois.

Le cycle de Barba nomme les moments : `before`, `beforeLeave`, `leave`,
`afterLeave`, `beforeEnter`, `enter`, `afterEnter`. Et la
documentation pose la regle de sequencement qui nous interesse
directement :

> « The common/default behaviour is to start **leave** as soon as
> possible. Then **enter** will be called when **leave** ends _AND_
> next page is "available": fetched or cached. »

En mode synchrone, c'est plus strict encore : « this mode will always
wait for the next page to be "ready" (prefetched) in order to run both
leave/enter transitions ».

**Ce qu'il faut retenir : l'entree est GARDEE. Elle ne part pas a
l'heure, elle part quand la destination existe.** Une transition n'est
pas une animation qu'on lance, c'est une machine a etats avec une
condition de passage.

Le tutoriel Codrops ajoute la piece qui fait la difference sur un site
3D : pendant que le DOM s'echange, **la camera, elle, ne s'arrete pas**.
Le mouvement de camera dure deux secondes, en `expo.inOut`, et il
chevauche l'echange. Le contenu sort en 0,8 s, le DOM bascule, le
contenu entre. La couche 3D ne connait aucune discontinuite parce
qu'elle n'est jamais interrompue : elle est le fil continu sous la
coupe.

### B. Le rendu composite

Codrops, 23/02/2026. On ne rend plus la scene a l'ecran mais dans une
texture (`WebGLRenderTarget`), et une passe finale melange deux
textures dans un shader plein ecran. L'article cite Active Theory
(Slosh Seltzer), Kenta Toshikura et Aircord comme praticiens, et donne
la liste des problemes que ca resout : « Flash prevention during scene
changes », « State continuity across page transitions », « Layered
compositing of multiple 3D scenes ».

La forme minimale du melange, chez Maxime Heckel :

```glsl
float noise = clamp(cnoise(vUv * 2.5) + uProgress * 2.0, 0.0, 1.0);
vec4 color = mix(colorA, colorB, noise);
```

Le bruit fait que le passage n'est pas un fondu uniforme : la
dissolution mord par plaques. C'est exactement la difference entre un
fondu de logiciel de montage et un fondu qui a une matiere.

**Le cout est reel et l'article ne le cache pas** : rendre les deux
scenes a chaque image est inefficace. L'astuce citee, attribuee a
Active Theory, est d'alterner les scenes image par image (A, puis B,
puis A) pour ne pas payer les deux dans la meme image.

Pour nous, cette famille est la reponse « propre » au saut Sud vers
Ouest, et c'est aussi la plus chere : deux cibles de rendu en plus, sur
une machine ou on vient de se battre pour ramener le tampon de 478 Mo a
3,8. A garder en reserve, pas a ouvrir en premier.

La collection **gl-transitions** est le vocabulaire etabli de cette
famille : une `uniform float progress` de 0 a 1, deux textures `from` et
`to`, et des dizaines de passages nommes (balayages directionnels,
balayage d'horloge, iris, dissolutions). C'est la ou aller chercher une
forme de passage plutot que l'inventer.

### C. La View Transitions API

Le modele, d'apres la documentation Chrome : le navigateur photographie
l'ancien etat, **suspend le rendu**, lance ton rappel qui change le DOM,
photographie le nouvel etat, puis anime entre les deux. « The DOM gets
updated while rendering is suppressed. »

C'est la seule des trois familles qui donne une **garantie du
navigateur** qu'aucune image a moitie mise a jour n'atteint l'ecran.
C'est enorme, et c'est precisement ce qui nous manque aujourd'hui.

Et c'est aussi pourquoi on l'a deposee le 03/09 : elle photographie. Un
canvas WebGL vivant devient un screenshot fige qui glisse en double, ce
que le commentaire de `cardinal-transition-context.tsx` appelle « le
hache ». La documentation Chrome ne traite pas le cas du canvas anime,
ce qui n'est pas un oubli : le modele de l'API est incompatible avec
une couche qui doit continuer de bouger pendant le passage.

**Conclusion sur cette famille : la decision du 03/09 etait la bonne, et
l'etat de l'art la confirme.** Mais on a jete la garantie avec l'API. La
suite du document consiste largement a la reconstruire a la main.

---

## 2. La loi commune : jamais d'etat intermediaire a l'ecran

Les trois familles disent la meme chose sous trois formes :

| Famille | Comment l'etat intermediaire est rendu impossible |
| --- | --- |
| Gestionnaire de passage | `enter` ne part pas tant que la destination n'est pas disponible |
| Rendu composite | Les deux etats existent en textures, on interpole entre eux, il n'y a pas de « pendant » |
| View Transitions | Le navigateur suspend le rendu pendant la mutation |

Aucune des trois ne laisse le nouvel etat s'installer par morceaux
devant le visiteur. C'est LA loi de la famille, et nos deux defauts
mesures sont tous les deux des violations de cette loi.

---

## 3. Le tempo

Ce que dit la litterature de motion design consultee : rester sous
300 ms pour une transition d'interface, sous 400 ms dans presque tous
les cas, et reserver les moments longs aux rares endroits ou la
recompense visuelle justifie l'attente. Un passage de 600 ms fait
paraitre un site lent meme quand la page charge vite. Sur mobile, reduire
encore de 20 a 30 %.

Le second point, plus interessant pour nous : **une transition sert a
masquer un chargement.** Le visiteur ne voit jamais d'etat vide, donc le
temps de chargement percu baisse. Mais l'article pose aussitot la
limite : « even a 300ms GPU-accelerated crossfade can feel slow if the
new page hasn't loaded yet » : on transitionne alors vers un squelette.
D'ou le prechargement, qu'on a mis en place le 16/09 sous forme de
`rel="prefetch"` echelonne.

**Notre tempo actuel, a comparer :** `NEPANTLA_TIMING` porte une duree
de progression (le tour de camera complet, 2π) plus une sortie et une
entree. Un tour de camera est un « moment long » assume, pas une
transition d'interface. C'est defendable, mais ca veut dire que le
budget de 300 ms ne s'applique pas a la camera : il s'applique a la
reponse au clic. Ce que le visiteur juge, c'est le delai entre son clic
et le premier signe que quelque chose se passe.

---

## 4. La grammaire : ce que le passage veut dire

C'est l'axe mythologique, et il a deux corpus etablis.

### Le cinema

Les trois passages primaires sont la coupe, le fondu enchaine et le
volet.

- **La coupe** : le spectateur est instantanement deplace ailleurs. Pas
  de temps ecoule signifie.
- **Le fondu enchaine** : suggere le passage du TEMPS ou le changement
  de LIEU, et peut indiquer un lien emotionnel ou thematique entre les
  deux plans.
- **Le volet** : remplace un plan en le balayant, sert surtout le
  changement de lieu.
- **Le raccord dans le mouvement (match cut)** : deux plans differents
  joints sur une similitude visuelle, ce qui cree un lien THEMATIQUE
  entre deux evenements separes.

Le dernier est le plus riche pour nous. Un raccord se fait sur une forme
qui persiste a travers la coupe. Or nous avons deja cette forme : **le
cerf est l'axe du monde, et la camera fait un tour complet autour de
lui.** Le commentaire de `lib/nepantla.ts` le dit deja : « le cerf est
l'axe du monde, c'est le monde qui tourne autour de lui ». C'est un
raccord dans le mouvement, et il est deja implemente. Ce qui manque,
c'est que le reste de la scene ne trahisse pas ce raccord en clignotant.

### Material Design 3

Un second corpus, plus systematique, qui associe une forme de passage a
une RELATION entre les deux ecrans :

- **Container transform** : quand un element se transforme en un autre,
  pour une relation de contenant a contenu. Le plus dramatique des
  quatre, a reserver au bon contexte.
- **Shared axis** : quand les deux ecrans ont une relation spatiale ou
  de navigation, on partage une transformation sur un axe x, y ou z.
- **Fade through** : quand les deux ecrans n'ont PAS de relation forte,
  fondu sortant puis entrant, pour que l'utilisateur ne croie pas a un
  lien qui n'existe pas.
- **Fade** : entree ou sortie a l'interieur de l'ecran.

**Et la, une bonne nouvelle : notre choix du 28/08 est deja correct
selon cette grille.** Dans `lib/nepantla.ts`, le Centre (jade) ne
glisse pas, il implose en echelle (0,92 en sortie, 1,06 en entree) :
c'est un container transform, et le Centre EST le contenant des quatre
directions. Les quatre directions cardinales, elles, glissent
lateralement sur un axe oppose : c'est un shared axis, et les quatre
sont bien des freres et soeurs sur l'anneau. Le commentaire du fichier
appelle ca « un retour au foyer » contre « un voyage lateral ». La
grammaire etablie dit la meme chose avec d'autres mots.

**Ce qui n'est pas encore exploite** : le passage entre deux directions
NON adjacentes (Est vers Ouest, par exemple) n'est pas le meme voyage
que le passage entre deux voisines. Un anneau a une topologie, et le
menu permet vingt passages la ou l'anneau n'en compte que cinq. C'est
une decision de direction artistique, pas une correction.

---

## 5. Le mouvement reduit, qui est aussi une note de jury

Le critere WCAG 2.3.3 (Animation from Interactions) est de niveau AAA,
donc hors de l'exigence legale, mais la mecanique est celle qu'on
applique deja : `@media (prefers-reduced-motion: reduce)`, et surtout
un reglage DANS le site pour les visiteurs qui ne connaissent pas le
reglage systeme. Le site doit rester lisible avec toutes les animations
coupees.

`cardinal-transition-context.tsx` honore les deux : `prefersReducedMotion()`
remplace le glissement par un fondu court, et le mode recit court-circuite
entierement la timeline. Le controle dans le site existe (scene-controls).
C'est en place, et ca compte pour les 30 % d'Usability du bareme
Awwwards, ou Design 40 et Usability 30 pesent 70 % a eux deux.

**Une attribution que je retire.** J'avais note le 11/09 un protocole de
juge (processeur divise par quatre, reseau Fast 3G, attention portee aux
transitions entre etats) attribue a la page de Hon Tran sur les criteres
Awwwards. En relisant cette page aujourd'hui, je n'y retrouve pas ces
elements. Soit la page a change, soit j'ai sur-attribue. Je ne m'appuie
donc plus dessus. Ce qui reste verifie sur awwwards.com/about-evaluation :
Design 40, Usability 30, Creativity 20, Content 10, dix-huit jures au
minimum, les trois notes les plus eloignees de la moyenne eliminees.

---

## 6. Ce que l'etat de l'art dit de nos deux defauts

Rappel des mesures du 15/09 (echantillon du canvas en vrais pixels) :
Est vers Sud et Ouest vers Nord descendent proprement en quatre a six
images. Les deux autres non.

### Defaut 1, le clignotement au noir de Nord vers Centre

Mesure : luminance moyenne 32, 32, 32, 30, **12**, 71. Une seule image
au noir, entre deux etats eclairés.

Le relevé fin :

```
330 ms  lum 31 | /fr/memoire | ambiante 0,67 | dir. 1,49 | brouillard 482a71
360 ms  lum 15 | /fr         | ambiante 0,30 | dir. 0,45 | brouillard 000000
390 ms  lum 61 | /fr         | ambiante 0,73 | dir. 1,63 | brouillard 00905a
```

`getFogColor` interpole depuis le noir vers la teinte de la direction,
proportionnellement a `getRevealFloor(progress)`, et `getRevealFloor(0)`
vaut zero. A l'avancement zero, l'arc est noir par construction. Donc
cette image est rendue a l'avancement zero, c'est-a-dire a un defilement
de zero.

**Correction d'attribution, faite aujourd'hui en relisant le code.**
J'avais ecrit que `scene-refs-context.tsx` remet le defilement a zero a
la navigation. C'est faux : son `window.scrollTo(0, 0)` est explicitement
garde au montage initial de la session, le layout persistant faisant que
ce montage n'a lieu qu'une fois. Le commentaire du fichier dit meme
l'intention inverse, « l'utilisateur qui navigue en interne ne veut pas
repartir de zero a chaque nav ».

**La cause reelle, et elle est a une ligne de nous.** `CardinalLink`
appelle `router.push(href)` sans options. Le comportement par defaut de
l'App Router est de remonter en haut de page a la navigation. Lenis, lui,
est monte une seule fois dans le layout et garde sa propre valeur de
defilement, qu'il reecrit sur `window` a son tick suivant. Le scenario
colle exactement a la mesure : le routeur remet a zero, une image est
rendue a l'avancement zero donc au noir, Lenis reecrit sa valeur, et la
scene se rallume a la profondeur conservee, cette fois aux couleurs du
Centre.

Le correctif candidat est `router.push(href, { scroll: false })`, ce qui
rend au passage explicite l'intention deja ecrite dans
`scene-refs-context.tsx`. **A confirmer par la sonde avant de le
declarer corrige**, et c'est le genre de chose ou la sonde est le seul
juge : le scenario est coherent, il n'est pas encore verifie.

C'est aussi, dans le vocabulaire de la section 2, exactement la loi
commune : on a laisse le nouvel etat s'installer par morceaux devant le
visiteur.

### Defaut 2, le saut de Sud vers Ouest

Mesure : 20, 20, **72**. Pas de fondu du tout, une marche.

Le mecanisme est visible dans `reveal-lighting.tsx` : la PORTEE du
brouillard est lissee (`approachFog(fogRangeRef.current, target, 0.06)`,
un rapprochement exponentiel), mais la TEINTE ne l'est pas. `getFogColor`
recoit `fogTint`, qui est une propriete de la direction : elle bascule
d'un coup au commit de la route. Est vers Sud et Ouest vers Nord passent
inapercus parce que leur ecart de luminance est faible ; Sud (nuit
turquoise, luminance 20) vers Ouest (crepuscule cendre, luminance 72) ne
pardonne pas.

**Le correctif est de traiter la teinte comme la portee** : la faire
converger au lieu de la snapper, avec le meme respect du mouvement
reduit (snap direct si `prefers-reduced-motion`, ce que le code fait
deja pour la portee). C'est une correction mecanique, pas une decision
esthetique, meme si la constante de convergence, elle, se regle a l'oeil.

---

## 7. Ce qui reste a decider ensemble

Les deux correctifs ci-dessus ne demandent aucun gout : ils remettent le
site dans la loi commune. Ce qui demande le tien :

1. **La forme du passage.** Aujourd'hui le contenu glisse et la camera
   fait un tour. L'etat de l'art propose au-dessus une matiere de
   passage (un bruit qui mord, un volet d'horloge, un iris). Chez nous,
   une matiere qui voudrait dire quelque chose serait la fumee du
   miroir, le grain de l'amate, ou l'obsidienne. Ca se decide, et ca
   coute une passe de rendu composite.
2. **La topologie de l'anneau.** Cinq passages voisins, vingt passages
   possibles. Est-ce que traverser l'anneau doit se sentir plus long que
   le longer.
3. **Le tempo du tour de camera** contre la regle des 400 ms. Notre tour
   complet est un parti pris ; il faut juste que la REPONSE au clic,
   elle, soit immediate.

---

## 8. Sources

Consultees le 16/09/2026.

- Codrops, *Composite Rendering: The Brilliance Behind Inspiring WebGL Transitions*, 23/02/2026 : https://tympanus.net/codrops/2026/02/23/composite-rendering-the-brilliance-behind-inspiring-webgl-transitions/
- Codrops, *Building Seamless 3D Transitions with Webflow, GSAP, and Three.js*, 18/03/2026 : https://tympanus.net/codrops/2026/03/18/building-seamless-3d-transitions-with-webflow-gsap-and-three-js/
- Maxime Heckel, *Beautiful and mind-bending effects with WebGL Render Targets* : https://blog.maximeheckel.com/posts/beautiful-and-mind-bending-effects-with-webgl-render-targets/
- Barba.js, documentation des transitions : https://barba.js.org/docs/advanced/transitions/
- gl-transitions, collection ouverte : https://github.com/gl-transitions/gl-transitions
- Chrome for Developers, *Smooth transitions with the View Transition API* : https://developer.chrome.com/docs/web-platform/view-transitions
- MDN, *View Transition API* : https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- Material Design 3, *Applying transitions* : https://m3.material.io/styles/motion/transitions/applying-transitions
- Wikipedia, *Film transition* et *Dissolve (filmmaking)* : https://en.wikipedia.org/wiki/Film_transition
- Adobe, *Match cut* : https://www.adobe.com/creativecloud/video/post-production/cuts-in-film/match-cut.html
- MDN, *Perceived performance* : https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/Perceived_performance
- Deque University, *2.3.3 Animations from Interactions* : https://dequeuniversity.com/resources/wcag2.1/2.3.3-animations-from-interactions
- Awwwards, *Evaluation System* : https://www.awwwards.com/about-evaluation/

---

## 9. Ce que la correction a donne, et ce qu'elle a revele (16/09, soir)

Les deux correctifs de la section 6 sont faits, avec leurs oracles. L'un
des deux diagnostics etait juste mais incomplet, et c'est la mesure qui
l'a dit.

### Ce qui est acquis

| | avant | apres |
| --- | --- | --- |
| Nord vers Centre, creux | une image a 12 contre 30 et 71 | **plus aucun creux** |
| Nord vers Centre, plus grand pas | 0,65 de l'ecart | 0,36 |
| Sud vers Ouest, plus grand pas | 0,93 de l'ecart | 0,49 |

Trois choses basculaient d'un coup au commit, pas deux.

1. **Le defilement**, corrige par `scroll: false`. Le creux a disparu, et
   c'est verifie par la sonde, pas deduit.
2. **La teinte du brouillard**, corrigee par `approachTint`. Diagnostic de
   la section 6, exact.
3. **L'arc lui-meme**, que la section 6 n'avait pas vu. Chaque direction
   lit le meme defilement a sa facon : l'Ouest inverse l'arc, le Nord
   descend le Mictlan. Cette lecture suivait la ROUTE, donc elle basculait,
   pendant que la portee du brouillard, le rig de lumiere, la teinte et
   meme l'heure traversaient tous proprement. C'etait le terme dominant :
   a lui seul il valait plus que la teinte. D'ou `lib/arc-fondu`, et
   `arc-store` pour qu'il n'y ait qu'une lecture de l'arc par image au lieu
   de trois qui divergent.

### Ce qui reste, et son nom

Une marche subsiste, deux fois plus petite. La sonde la cerne exactement :
a l'image du saut, **les lumieres baissent**, le brouillard, la camera, le
plancher de revelation, la vignette et le bloom sont tous continus, et le
nombre d'objets visibles ne bouge pas. Rien de ce qui s'anime n'explique
le saut.

Ce qui bouge, c'est l'image suivante : **le decor propre a la direction
quittee sort et celui de la nouvelle entre en une seule image.** Les
cranes et les porteuses d'annee du Sud disparaissent, les pieces de
l'Ouest apparaissent, d'un bloc. Les ambiances, elles, fondent deja depuis
longtemps ; le decor non.

C'est exactement la loi commune de la section 2, au dernier etage : un
etat qui s'installe par morceaux. Et c'est un chantier a part, parce qu'il
porte une question de direction artistique que la mecanique ne tranche
pas : **comment le monde d'une direction s'en va-t-il ?** Il s'efface, il
se replie, il se disperse, il reste et se laisse recouvrir. Ce n'est pas
la meme mythologie a chaque fois.

### La lecon de methode

La section 6 tenait un diagnostic exact et se croyait complete. Elle ne
l'etait pas : le terme dominant etait ailleurs, et aucune relecture de code
ne l'aurait donne, parce qu'il fallait voir que les lumieres BAISSENT
pendant que l'image s'eclaircit pour cesser de chercher du cote de la
lumiere. C'est la troisieme fois ce mois-ci qu'une cause plausible et bien
argumentee se revele minoritaire devant la mesure.

---

## 10. Le ciel, et ce que la sonde n'avait pas dit (17/09)

La section 9 nommait ce qui restait : « le decor propre a la direction
quittee sort et celui de la nouvelle entre en une seule image ». C'etait
une hypothese, pas une mesure, et elle etait fausse. Le 16/09 au soir a
ajoute une seconde attribution fausse, les Cihuateteo. Les deux avaient la
meme cause de methode.

### La cause de methode, d'abord

`diff-au-saut` remonte l'ascendance des objets **qui changent de
visibilite**, et imprime le reste des champs modifies en dessous. Les deux
fois, le coupable a ete pris dans la premiere liste sans lire la seconde
jusqu'au bout. Or le terme dominant etait dans la seconde, les deux fois.

Une sonde met en avant ce que son auteur a decide de mettre en avant. Sa
sortie complete, elle, ne decide rien : c'est elle qu'il faut lire.

### La cause

`sud-sky.tsx` et `sud-sky-bodies.tsx` lisaient `dayAtArc(direction, p)` en
direct, avec la direction de la ROUTE. C'est le defaut que `lib/arc-fondu`
corrige depuis le 16/09, et `arc-store` expose `lireArcJour` pour ca. Cinq
machineries etaient passees au depot ; le dome et les astres etaient restes
dehors, et le dome est la plus grande surface de l'ecran.

Au saut : `uDay` de 0,000 a 0,583 en une image, `uSkyOffset` de -0,333 a
0,001, `uDuskColor` de 000000 a 6a2e4f, et le soleil qui se teleporte
d'un sprite a l'autre. Les lumieres, le brouillard et la vignette, eux,
traversaient deja proprement.

### La regression, que le seuil a laissee passer

| | plus grand pas |
| --- | --- |
| 15/09, avant tout | 0,93 |
| 16/09, apres scroll + teinte + fondu d'arc | 0,49 |
| 17/09, apres « on arrive en haut de l'arc » | **0,58 / 0,61** |
| 17/09, apres le ciel par le depot | **0,092 / 0,092 / 0,100** |

Arriver toujours en haut de l'arc (8066788) a fait REMONTER la marche, et
le seuil valait 0,6 : l'oracle n'a pas rougi, il a frole, et le commit est
parti au vert. La decision reste bonne ; c'est sa consequence qui ne
l'etait pas, parce qu'elle rend l'ecart d'arc maximal au commit, donc elle
rend les lecteurs restes en direct beaucoup plus visibles. **Un seuil pose
au ras de la mesure du jour ne garde rien : il attend la regression
suivante pour devenir faux.** Ramene a 0,15, soit la mesure plus la moitie.

### Ce qui reste, mesure et non suppose

Sonde `diff-au-saut` apres correction : 4,0 points de luminance au lieu de
26,2, et plus aucun uniforme du ciel dans le diff. Restent trois choses,
aucune dominante :

1. **La camera se deplace encore de cinq unites dans l'image du commit**,
   ce que le commit du 16/09 affirme ne pas faire (« une descente, pas une
   remise a zero »). A verifier : soit la glissade de Lenis n'est pas aussi
   continue qu'annonce, soit la camera a un ancrage propre a la direction.
2. **Un `Points` persistant entre a 0,06 d'alpha** (enfant direct de la
   scene). C'est le meme objet que le 16/09 designait comme coupable ; il
   ne l'etait pas, et a cet alpha il ne l'est toujours pas.
3. **Une paire mesh/points change de couleur d'un bloc**, `uColor` de
   0f6bb8 a d76464 et `uAccentColor` de ffb400 a 4ade80 : du bleu au rouge
   en une image. Un `look` de direction remplace, pas fondu. Le ciel avait
   le meme defaut sur `uTint`, `uSkyOffset` et `uDuskColor` ; ceux-la ne
   paraissent plus au saut, mais le motif est le meme et il vaut d'etre
   cherche partout : **un fondu qui ne pilote qu'une porte n'est pas un
   fondu.**

### Une note d'outillage

Les sondes de `.scratch` prennent des routes en argument. Sous Git Bash,
`/fr/projets` est converti en `C:/Program Files/Git/fr/projets` avant
d'atteindre node, et la sonde interroge alors une URL qui n'existe pas :
elle expire sur `data-loaded`, ce qui ressemble a une panne du site. Les
passer sans barre de tete (`fr/projets`), ou lancer depuis PowerShell.

---

## 11. Le focus deplaçait le monde (17/09)

La section 10 laissait trois termes. Deux tombent ici, et le troisieme
n'en etait pas un.

### Ce que la camera faisait vraiment

Non pas « cinq unites au commit », mais **dix-huit unites 250 ms APRES le
commit**, et le defilement avec elle. Sonde `.scratch/transitions/glissade.mjs`,
Projets vers Contact, trois passes identiques :

| | |
| --- | --- |
| la descente vers la nuit | atteint zero AVANT le commit, proprement |
| a t + 250 ms | le defilement saute de 0 a **506 px**, la camera de **18,9 unites** |
| pendant une seconde | il y reste |
| ensuite | le filet de `garantirLeHaut` le ramene a zero |

Le visiteur arrivait en haut de l'arc, se faisait jeter a 14 % de l'arc,
puis rappeler. L'invariant de Sylvain tenait a l'arrivee et a la fin,
jamais au milieu -- et l'oracle, qui mesurait quatre secondes apres le
clic, etait vert pendant que le defaut se jouait.

### La methode, encore elle

Trois hypotheses etaient disponibles et plausibles : la glissade de Lenis
qui s'interrompt, la hauteur de page qui change au commit, la restauration
de defilement de l'historique. Aucune n'a ete testee en premier.

Une sonde a note **tout appel JavaScript capable de defiler** --
`scrollTo`, `scrollBy`, `scrollIntoView`, l'ecriture de `scrollTop` -- avec
sa pile. Verdict : **rien** dans les 150 ms qui precedent le saut. Ce
n'etait donc pas le site, c'etait le navigateur. La sonde suivante a ajoute
`document.activeElement` a chaque image : il saute de `body` a un `h1`
exactement a cette image.

`route-announcer`, minuterie de 250 ms, exactement le delai mesure.

### Ce qui etait juste, et ce qui ne l'etait pas

Le geste reste : RGAA 12.8 demande que le focus aille au titre de la
nouvelle page dans une application d'une seule page, sans quoi
l'utilisateur clavier doit reparcourir tout l'en-tete avant d'atteindre le
contenu. Ce qui etait faux, c'est `preventScroll: false`. Sur les pages de
scene le h1 vit dans un conteneur haut : le navigateur amenait sa position
de DOCUMENT a l'ecran. Il ne rendait rien visible -- le titre est deja la,
le calque de scene est pose par-dessus la fenetre -- il deplaçait le monde.

**Un geste d'accessibilite qui deplace la page n'est pas forcement un geste
d'accessibilite.** Ici il en devenait le contraire : il annulait la seule
chose que la navigation promettait au visiteur.

### Les trois termes de la section 10, apres

1. **La camera** : plus grand pas de 4,31 unites au lieu de 18,9, et il
   tombe a l'image du commit, la ou le monde change, et non 250 ms plus
   tard.
2. **Le `Points` a 0,06 d'alpha** : ce n'etait pas un defaut. Sa porte
   `visible` suit son propre fondu d'opacite ; il entre a quatre centiemes
   parce qu'il commence a se fondre, pas parce qu'il surgit.
3. **La paire mesh/points qui changeait de couleur d'un bloc** : corrigee
   (`stag-aura`, `spirit-particles`), avec l'oracle `couleur-qui-traverse`.

Le saut de luminance restant vaut 4,2 points, et ce qui le porte est
desormais le decor lui-meme : un groupe GLB entier qui entre et sort en une
image. C'est le chantier nomme en fin de section 9, et il demande une
decision de direction artistique par point cardinal, pas une mesure de plus.

---

## 12. L'anneau entier, mesure (17/09)

Les sections 9 a 11 n'ont regarde que deux passages, parce que ce sont les
deux que l'oracle garde. Voici les cinq, meme sonde, meme recette.

| passage | saut de luminance |
| --- | --- |
| **Centre vers Est** | **25,6** |
| Ouest vers Nord | -4,6 |
| Nord vers Centre | +4,5 |
| Sud vers Ouest | 3,9 |
| Est vers Sud | 3,3 |

**Le plus gros saut de l'anneau vaut six fois celui qu'on vient de
corriger, et personne ne l'avait vu, parce que l'oracle ne garde que
Nord vers Centre et Sud vers Ouest.** Un oracle ne protege que ce qu'il
regarde ; choisir deux trajets sur cinq, c'etait choisir de ne pas voir les
trois autres. A reprendre quand le chantier ci-dessous sera fait, et pas
avant : poser un seuil sur un defaut connu ne le corrige pas.

### Ce que son diff dit, et c'est le chantier nomme

```
VISIBILITE 1 -> 0  313:Group    5 enfants, 5 mailles     (le monde du Centre)
VISIBILITE 0 -> 1  503:Group   10 enfants, 11 mailles    (le monde de l'Est)
```

Rien ne part, rien n'arrive : **ca commute**. C'est exactement la question
laissee ouverte en fin de section 9, « comment le monde d'une direction
s'en va-t-il », et la mesure dit maintenant ou elle coute le plus cher.

**Le point d'etranglement est unique**, et c'est une bonne nouvelle :
`MountForDirection` rend `<group visible={visible}>`, et c'est cette seule
ligne qui commute pour les cinq directions. La regle generale se posera
donc a un seul endroit.

### La decision arbitree, et celle qui reste

Sylvain a tranche la famille le 17/09 : **le depart par le DEPLACEMENT
partout** (famille F de `dispersion-etat-de-l-art.md` : les objets s'en
vont au lieu d'etre supprimes, une ecriture de matrice, cout quasi nul, et
les 2 500 ms de linger de `MountForDirection` sont deja la), **et la
dissolution au bruit gardee en reserve pour un seul moment**, sans quoi
elle devient un peage a chaque navigation.

Reste ouvert, et c'est a lui : **dans quelle direction**. Deux candidats,
et ils ne coutent pas la meme chose a verifier.

1. **Il s'enfonce, et l'autre monte.** Le sol fait le masque, donc ni brume
   ni transparence ni tri. Une seule ecriture de matrice sur le groupe
   racine. Et ca dit quelque chose de juste : un monde rentre sous la
   terre. A verifier a l'oeil : au ras de l'horizon, des objets peuvent se
   voir traverser le sol.
2. **Il recule vers son point cardinal.** Symetrique a l'arrivee, et c'est
   deja ce que font les porteuses depuis le 16/09. Mais ca depend du `far`
   du brouillard, qui varie par direction : ailleurs qu'a l'Ouest, le decor
   resterait visible en s'eloignant au lieu d'etre mange.
