# La dispersion du monde : etat de l'art

*16/09/2026. Suite du chantier des passages. La mesure a montre que le
decor propre a une direction sort et entre EN UNE IMAGE, alors que tout le
reste de l'atmosphere traverse. La question qui en sort n'est pas
mecanique : comment le monde d'une direction s'en va-t-il ? Sources en fin
de document, consultees le 16/09/2026.*

---

## 0. Ce qu'on a deja, et qui change la question

Avant de chercher dehors, il faut regarder ce qui est ecrit ici, parce que
ca deplace le probleme.

**La machinerie existe.** `MountForDirection` garde le sous-arbre monte
**2 500 ms apres qu'on a quitte la page**, et son commentaire dit
exactement pourquoi : « chacun de ces composants fonde son opacite au fil
des images (blendRef lerp 0,06). Les demonter net ferait un a-coup a la
navigation ; on attend donc que le fondu ait eu le temps de finir. »

**Et plusieurs composants fondent vraiment.** `year-stones` porte un
`blendRef` qui descend a 0,06 par image, une porte `g.visible = blend >
0.01`, et une mise a l'echelle `g.scale.setScalar(blend)`. Les ambiances
cardinales font pareil depuis longtemps.

**Donc le chantier n'est pas d'inventer un mecanisme, il est de choisir
une maniere de partir.** Et la, une observation qui est deja un avis : une
pierre qui rapetisse jusqu'a zero ne part pas, elle est **supprimee**. Le
regard lit une suppression, pas un depart. C'est le defaut le plus courant
des sorties d'objets, et il est invisible tant qu'on ne le nomme pas.

---

## 1. Les six manieres de partir

### A. Le fondu d'opacite

La plus evidente, et la plus piegeuse sur une scene comme la notre.
Passer un materiau opaque en `transparent = true` le fait changer de file
de rendu : three rend les objets opaques d'abord, puis les transparents
tries par distance a la camera, et ce tri est approximatif. Sur cent
cinquante objets qui s'entrecoupent, ca se voit.

Cout : nul en calcul, eleve en risque visuel.

### B. Le fondu trame, ou stochastique

C'est la reponse de l'industrie du jeu au meme probleme, et elle est
ancienne. Unity et Unreal font leurs transitions de niveau de detail par
**dithering** plutot que par transparence ; Unreal l'a introduit en 4.11.
Le principe : chaque pixel choisit aleatoirement d'etre rendu ou non,
selon l'opacite voulue. L'objet reste opaque du point de vue du moteur,
donc aucun probleme de tri.

three le fournit en une ligne. La documentation de `Material.alphaHash` :

> « Enables alpha hashed transparency, an alternative to `Material.transparent`
> or `Material.alphaTest`. The material will not be rendered if opacity is
> lower than a random threshold. Randomization introduces some grain or
> noise, but approximates alpha blending without the associated problems of
> sorting. **Using TAA can reduce the resulting noise.** »

L'exemple officiel `webgl_materials_alphahash` pose les trois reglages
ensemble : `alphaHash = true`, `transparent = false`, `depthWrite = true`,
et un `TAARenderPass` par-dessus.

**Le point dur pour nous : nous n'avons pas de TAA, et plus de MSAA du
tout a densite 2** (`post-fx` met `multisampling` a zero au-dela de
densite 2, decision du 15/09 qui a ramene 478 Mo de tampon a 3,8). Le
grain du tramage serait donc visible, non lisse.

Ce qui peut retourner l'objection, mais seulement en partie : notre bruit
a un nom et un generateur, `lib/amate-texture`, celui des bandes d'amate
du Codex. Un tramage tire de CE bruit-la n'est pas du bruit de moteur,
c'est du papier. Attention toutefois : **le grain d'amate n'est cuit que
pour la face claire** (`grain-amate`, « seulement si la face claire est
demandee : un visiteur qui reste dans la nuit ne paie rien »). Dans la
nuit, qui est la face par defaut, l'argument ne tient pas tel quel.

Cout : une ligne de materiau. Risque : du grain visible, a juger a l'oeil.

### C. La dissolution par seuil de bruit

La famille la plus repandue chez les creative devs, documentee de bout en
bout par Codrops (17/02/2025). On injecte dans le materiau existant, via
`onBeforeCompile`, un test sur un bruit de Perlin evalue en espace objet :

```glsl
float noise = cnoise(vPos * uFreq) * uAmp;
if (noise < uProgress) discard;
float edgeWidth = uProgress + uEdge;
if (noise > uProgress && noise < edgeWidth) {
  gl_FragColor = vec4(vec3(uEdgeColor), noise);
}
```

Trois uniformes suffisent : `uProgress` (le seuil qui monte), `uFreq` (la
finesse du grain), `uEdge` (la largeur du liseré). Le liseré est ce qui
fait la difference entre une dissolution et un objet qui clignote : le
bord qui vient de ceder s'allume.

**Le cout cache, et il est serieux chez nous.** `discard` empeche le rejet
de profondeur anticipe. La documentation Arm est sans ambiguite : si un
fragment shader peut appeler `discard`, le GPU ne peut pas activer
l'Early-Z, parce que le test de profondeur a deja ecrit une valeur qu'il
ne pourrait plus annuler. Sur les GPU a tuiles, c'est-a-dire tous les
telephones, l'effet deborde du dessin concerne. C'est exactement la
plateforme qu'on n'a jamais testee.

Cout : modere au bureau, potentiellement lourd sur telephone.

### D. La dissolution, plus des particules au bord

Le meme article de Codrops continue : un `Points` construit **sur la meme
geometrie** que le maillage, avec quatre attributs (`initPosition`,
`currentPosition`, `velocity`, `maxOffset`), et un test de bruit identique
qui ne garde que la bande du bord :

```glsl
if (vNoise < uProgress) discard;
if (vNoise > uProgress + uEdge) discard;
```

Les particules ne naissent donc que la ou la matiere cede. C'est ce
detail qui fait lire une desintegration plutot qu'un effet plaque. Ajoute
par-dessus : une ondulation en sinus, une taille qui decroit avec la
distance, une rotation par particule, et un bloom selectif.

Cout : celui de C, plus un systeme de particules par objet qui part.

### E. Le gommage : la matiere devient poussiere et petales

Codrops, 28/01/2026, le plus recent et le plus abouti. Le seuil de
dissolution n'est plus uniforme : l'UV du bruit melange le centre de
chaque glyphe et son UV propre, `center * uCenterScale + glyphUv *
uGlyphScale`, **pour que chaque element parte a son heure** plutot que
tous ensemble. Deux systemes d'instances suivent : de la poussiere (cent
instances, quatre secondes de vie) et des petales (quatre cents
instances, six secondes), avec vent, montee modulee par un bruit, et une
turbulence en tourbillon tiree de deux echantillons de bruit.

C'est la reference esthetique la plus proche de ce qu'on chercherait, et
c'est aussi la plus chere. Ecrit en TSL sur WebGPU, dont la branche est
garee chez nous depuis le 06/09 ; le coeur (seuil de bruit, instances,
vent) se transpose en GLSL, le bloom selectif par cibles multiples non.

### F. Le deplacement : l'objet s'en va

La famille qu'aucun tutoriel ne documente parce qu'elle n'a pas besoin de
shader. L'objet ne se dissout pas : il **sort**. Il s'enfonce, il est
emporte, il tombe, il s'eloigne. `year-stones` fait deja la version pauvre
de cette famille en rapetissant.

Et pour tout ce qui est **instancie** chez nous (`maille-instanciee`,
`preparerPieces`), c'est presque gratuit : on ecrit deja les matrices
d'instance une fois : les animer vers une dispersion coute une ecriture
par instance et par image, sans nouveau materiau, sans `discard`, sans
tri. C'est la seule famille dont le cout est connu d'avance et faible.

---

## 2. Le tableau des couts, pour nos contraintes

| Maniere | Ce que ca coute | Ce qui nous gene |
| --- | --- | --- |
| A. Fondu d'opacite | rien | le tri des transparents sur 150 objets |
| B. Fondu trame | une ligne | grain visible : ni TAA ni MSAA a densite 2 |
| C. Dissolution au bruit | une injection de shader par materiau | `discard` tue l'Early-Z, cher sur GPU a tuiles |
| D. C + particules de bord | un systeme de particules par objet | cumule le cout de C |
| E. Gommage complet | deux systemes d'instances, bloom selectif | le plus cher, et sa reference est WebGPU |
| F. Deplacement | une ecriture de matrice | rien, et c'est suspect : a verifier a l'oeil |

---

## 3. Ce que la grammaire ajoute

Le jeu video a nomme le defaut avant nous : sans technique de transition,
le passage d'un niveau de detail a l'autre produit un **pop**, une
apparition qui distrait. Et la reponse standard n'est pas le fondu
d'opacite, c'est le tramage, parce qu'il est moins cher que le melange
alpha tout en evitant l'a-coup. Unity va plus loin : **pour le dernier
niveau de detail, il n'utilise pas un fondu croise mais un fondu
sortant**. Partir et se faire remplacer ne sont pas le meme geste.

Applique a nous, ca donne une question par famille d'objets, et elle n'a
pas la meme reponse partout :

- les **pierres d'annee** du Sud sont de la pierre : la pierre ne se
  disperse pas, elle s'enfonce ou elle se couvre ;
- les **feuilles** de l'Ouest sont deja emportees par Ehecatl dans la
  page : elles pourraient simplement continuer de partir ;
- les **cempasuchil** sont faits de cent cinquante ligules : ils ont la
  dispersion inscrite dans leur geometrie, et ils sont instancies ;
- l'**eau** du Nord et l'**obsidienne** ne se dissolvent pas non plus de
  la meme facon.

C'est la le vrai contenu de la decision, et c'est pour ca qu'elle ne se
prend pas dans un tableau de couts.

---

## 4. Ce que je recommande de regarder en premier

Un avis, pas une decision.

1. **Commencer par F, le deplacement, sur ce qui est deja instancie.** Le
   cout est connu et faible, la machinerie de fondu existe deja
   (`MountForDirection` garde 2 500 ms), et ca repond a l'objection la
   plus juste : aujourd'hui les objets sont supprimes, pas congedies.
2. **Essayer B, le fondu trame, sur un seul objet, et le regarder a
   densite 2.** Une ligne de code, et la question du grain se tranche a
   l'oeil en deux minutes au lieu de se discuter.
3. **Garder C et D en reserve pour UN moment**, pas pour tous les
   passages. Une dissolution au bruit avec liseré est un evenement ; si
   elle joue a chaque navigation, elle devient un peage, exactement comme
   la fumee du miroir l'aurait ete.
4. **Ne pas ouvrir E** tant que le telephone n'a pas ete teste une seule
   fois.

---

## 5. Sources

Consultees le 16/09/2026.

- Codrops, *Implementing a Dissolve Effect with Shaders and Particles in Three.js*, 17/02/2025 : https://tympanus.net/codrops/2025/02/17/implementing-a-dissolve-effect-with-shaders-and-particles-in-three-js/
- Codrops, *WebGPU Gommage Effect: Dissolving MSDF Text into Dust and Petals with Three.js & TSL*, 28/01/2026 : https://tympanus.net/codrops/2026/01/28/webgpu-gommage-effect-dissolving-msdf-text-into-dust-and-petals-with-three-js-tsl/
- Codrops, *Crafting a Dreamy Particle Effect with Three.js and GPGPU*, 19/12/2024 : https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/
- three.js, `Material.alphaHash` et l'exemple `webgl_materials_alphahash` (source du depot, via Context7) : https://threejs.org/docs/#api/en/materials/Material.alphaHash
- three.js forum, *How to make .alphaHash material transparency visually same as .transparent* : https://discourse.threejs.org/t/how-to-make-alphahash-material-transparency-visually-same-as-transparent-property-has/53350
- Unity, *Make LOD Group transitions smooth* : https://docs.unity3d.com/6000.2/Documentation/Manual/lod/lod-transitions-lod-group.html
- Unreal Engine, *Fading Between LODs* : https://couchlearn.com/fading-between-lods-in-unreal-engine-4/
- Arm Developer, *Early-Z* : https://developer.arm.com/documentation/102224/0200/Early-Z
- NVIDIA, *Implementing Stochastic LOD with Microsoft DXR* : https://developer.nvidia.com/blog/implementing-stochastic-lod-with-microsoft-dxr
