# Revue SOTY du 10/09/2026 — concurrence, mesures, et le chemin vers 10

Demande de Sylvain : « étude de la concurrence cinématographique, perf,
technique et tous les critères que tu juges utile. Regarde ce que l'on peut
faire dans notre contexte et respectant notre cosmogonie. On est où pour
avoir 10/10 côté soty sur toutes les pages mais aussi sur le site,
globalement ? »

Complète `etat-de-l-art.md` (08/09) : les sept constantes des lauréats n'y
sont pas répétées, seulement ce qui a changé et ce que la mesure de ce jour
ajoute.

---

## 1. Ce qui est mesuré ici, et comment

Trois choses qu'on n'avait jamais faites, et qui changent le diagnostic.

**On mesure la PRODUCTION.** `next build` puis `next start`, jamais le
serveur de développement : React en mode dev fausse tout, et une bonne part
de nos mesures antérieures portaient sur lui.

**On mesure à la barre du métier.** Les analyses de lauréats 2026 citent
toutes le même protocole discriminant : 60 images par seconde sur mobile
milieu de gamme, testé en **CPU ×4 + Fast 3G** (Hon Tran, « 10
Award-Winning Websites of 2026, Judged »). Émulation Pixel 7 complète, donc
le profil de rendu mobile du site s'active vraiment.

**On profile le processeur, en temps propre.** Les appels de rendu étant
réglés (91 à 216 sur les cinq pages depuis le 09/09), ce qui reste se joue
côté JavaScript, et seul un profil le dit.

---

## 2. La concurrence 2026 : ce qui sépare vraiment

Rien de neuf sur les techniques : instanciation, lumière cuite, collisions
BVH, budgets d'octets. Ce que la passe de ce jour ajoute, c'est le
**critère de jugement**, formulé trois fois de la même façon par des
sources indépendantes :

1. **Une direction artistique qui a un point de vue.** C'est ce qui sépare
   un lauréat d'un gabarit. → *C'est notre force et elle est unique : aucun
   concurrent ne peut copier une cosmogonie sourcée. On ne gagne pas là.*
2. **Un mouvement DIRIGÉ.** « De la chorégraphie », des transitions qui
   portent le récit. IVRESS : « le mouvement est délibéré, le graphe de
   scène est budgété, pas forcé ». → *C'est exactement notre arc en actes.*
3. **La performance comme critère éliminatoire.** « 60 fps sur mobile
   milieu de gamme » est présenté comme non négociable, et le test sur
   appareil réel « détermine le classement ».

Et un détail de vocabulaire qui compte : Iventions est loué pour un WebGL
« utilisé pour l'ATMOSPHÈRE plutôt que pour le spectacle ». C'est notre
ligne aussi, et il faut s'y tenir : n'ajouter aucun effet qui ne raconte
rien.

---

## 3. Où nous en sommes : les chiffres de ce jour

### La barre du métier (production, Pixel 7 émulé, CPU ×4, Fast 3G)

| page | arrivée | fps médian | fps p5 | images > 33 ms |
| --- | --- | --- | --- | --- |
| Accueil | 22,5 s | **59,9** | 59,5 | 9 / 1193 |
| Services | 22,4 s | **59,9** | 59,5 | 6 / 1196 |
| Projets | 27,3 s | **59,9** | 59,5 | 6 / 1196 |
| **Contact** | 38,9 s | **30,0** | 20,0 | **526 / 564** |
| **Mémoire** | 36,0 s | 59,9 | **29,9** | **224 / 844** |

Trois pages sur cinq tiennent la barre avec de la marge. **Deux échouent**,
et pas de la même façon : Contact tourne à moitié régime en permanence,
Mémoire tient 60 mais lâche une image sur quatre.

### Ce que voit un jury qui arrive

FCP **2,7 s**, DOM interactif 2,6 s : correct, à la limite haute du « bon »
de Google (1,8 s). Mais le **voile ne se lève qu'à 22-39 s**. Le visiteur
voit donc la page en moins de trois secondes, puis attend vingt à
trente-six secondes de plus devant une phrase en nahuatl.

~~Et le chargement n'est PAS lié au poids : 0,6 à 0,8 Mo transférés, soit
trois secondes à 1,6 Mbit/s. Le temps part dans le calcul, pas dans le
réseau. Compresser les textures ne servirait presque à rien.~~

**CE PARAGRAPHE ÉTAIT FAUX, sur les trois points, et le § 10 le corrige.**
Les 0,6 Mo venaient d'une somme des en-têtes `content-length`, absents des
réponses compressées : la vérité est 3,73 Mo décodés et 2,01 Mo sur le fil.
Le voile se lève 1,1 s après le dernier octet reçu, donc il n'attend aucun
calcul. Et les 22 à 41 s étaient mesurées sur un `next start` local qui ne
compressait pas : le vrai site, servi par Netlify, ouvre à **16,6 s**.

### Où part le processeur (profil en temps propre)

Sur **Contact** :

| part | ms/s | fonction |
| --- | --- | --- |
| 26,6 % | 266 | `stepGrassGrid` |
| 12,1 % | 121 | `stepStrip` |
| 6,1 % | 61 | `updateMatrixWorld` (three) |
| 4,3 % | 43 | `writeRibbonSlot` |
| 1,5 % | 15 | `Cihuateteo.useFrame` |

**L'herbe seule prend 266 ms par seconde**, soit 4,4 ms par image à 60 fps.
Les rubans des Cihuateteo en ajoutent 164. À deux, 43 % du budget.

C'est cohérent avec la mesure du 09/09 : l'herbe est aussi **44 à 48 % de
tous les triangles** de chaque page. Elle est le premier poste sur les deux
axes à la fois.

### Le défaut que personne ne cherchait : les shaders se compilent en cours de route

| page | programmes à l'arrivée | après tout le scroll |
| --- | --- | --- |
| Mémoire | 32 | **49** |
| Contact | 26 | **40** |

**Dix-sept programmes se compilent pendant que le visiteur descend** sur
Mémoire, quatorze sur Contact, groupés entre 35 % et 80 % de l'arc.
Chaque compilation bloque le fil principal. C'est la cause de la signature
« une image sur quatre en retard » de Mémoire : ce ne sont pas des images
lentes, ce sont des **arrêts**.

Deux causes, toutes deux dans notre code :

- des matériaux qui n'apparaissent que tard, compilés à leur premier rendu ;
- surtout, `shader-patch.ts` : `customProgramCacheKey = () => mods${n}`.
  La clé dépend du NOMBRE de modificateurs, donc **ajouter un modificateur
  à un matériau déjà compilé le recompile**. Or nos systèmes en ajoutent au
  fil de l'arc (le givre par-dessus la perspective atmosphérique, la
  révélation par curseur, le rim du cerf). C'était nécessaire pour que les
  modificateurs tardifs prennent effet — mais personne n'avait mesuré ce
  que ça coûte au milieu d'un geste.

**C'est le défaut le plus grave de la revue**, parce qu'il attaque
directement la consigne « les effets doivent être exécutés parfaitement » :
un arrêt de 60 ms au milieu de la frappe du serpent ruine la frappe.

### Le manque cinématographique

La chaîne de post-traitement est complète (bloom, aberration chromatique
modulée, vignette, teinte, plus nos trois effets propres). **Mais la
profondeur de champ est à `bokehScale: 0` au repos** : elle ne monte que
sur un coup de focus ponctuel.

Conséquence : le cadre est net du cerf jusqu'aux montagnes, en permanence.
C'est le marqueur cinématographique le plus reconnaissable, et nous ne
l'avons pas.

---

## 4. Note par page, et ce qui manque pour 10

Barème Awwwards : design 40, utilisabilité 30, créativité 20, contenu 10.
Les notes ci-dessous sont sévères par construction — un 8 est déjà un site
du jour.

### Accueil / Centre — **7,0**

Ce qui tient : la scène occupe 100 % du cadre (aucune colonne de texte),
59,9 fps avec marge, le cerf redevenu brun, le foyer, la sortie de scène
enfin affichée.

Ce qui manque pour 10 : **elle n'a pas de climax à elle.** Les quatre
autres pages ont un geste qui les définit (la glace qui éclate, la frappe
du serpent, la descente des porteuses, le miroir). Le Centre a un feu et
une carte de sortie. L'arc vertical prévu (caméra vers le zénith, colonne
de fumée, Voie lactée) EST son climax, et il était bloqué sur ta mesure
téléphone.

**Ce blocage tombe** : la mesure de ce jour donne 59,9 / 59,5 fps sur
l'accueil à la barre du métier. Il y a la marge. (Réserve honnête : un
Pixel 7 émulé n'a pas la chauffe d'un vrai téléphone ; ton test USB reste
utile pour le comportement après deux ou trois minutes.)

### Services / Est — **8,0**

La scène la plus riche du site et la plus distinctive : le monde de verre
est une idée que personne d'autre n'a. Huit gestes, 59,9 fps, le ciel
d'avant-jour corrigé, le balai d'Itztlacoliuhqui qui CAUSE la repousse.

Pour 10 : deux blocs de texte sous le seuil de contraste à mi-arc (50 % et
78 % de leur surface), et l'étoile du matin n'apparaît que si Vénus est
réellement du matin — donc invisible jusqu'au 8 novembre. Ce dernier point
est un choix que je ne discute pas, mais un jury de septembre ne verra
jamais ce geste.

### Projets / Sud — **7,5**

La frappe du serpent est désormais le geste le plus fort du site : il
plonge, rase l'anneau au sol, l'embrase et repart. 59,9 fps alors que la
page était à 1550 appels de rendu il y a vingt-quatre heures.

Pour 10 : **la colonne de contenu tient 50 % du cadre jusqu'à la fin**, et
elle est centrée, donc c'est le CERF qu'elle couvre pendant toute la
seconde moitié. Le plus beau geste du site se joue derrière du texte une
fois sur deux.

### Contact / Ouest — **6,0**

Le fond est bon : les Cihuateteo attestées, l'atterrissage, l'étoile du
soir réglée sur le vrai ciel, Xolotl qui traverse.

Pour 10 : **la page échoue à la barre du métier**, 30 fps médian, 93 % des
images en retard, 38,9 s avant que le voile se lève. C'est éliminatoire au
sens propre : « la performance détermine le classement ».

### Mémoire / Nord — **7,0**

Le miroir de Tezcatlipoca qui garde la chaleur du cerf est la plus belle
idée conceptuelle du site. Les cempasúchil portent leur lumière. Xolotl ne
bascule plus en entrant dans le bassin.

Pour 10 : une image sur quatre en retard (les compilations tardives), et la
même colonne centrée à 50 % qui masque le cerf.

### Le site, globalement — **7,0**

- **Design (40)** — 6,5. La typographie vient d'être réparée (le site
  rendait en Arial), mais treize tailles de police dont neuf à moins de
  11 % d'écart ne forment pas une échelle, et 480 éléments n'ont pas
  d'interlignage explicite. Pas de profondeur de champ permanente.
- **Utilisabilité (30)** — 6,5. Deux pages échouent à la barre, le voile
  dure 22 à 39 s, mais l'accessibilité est réellement bonne (mouvement
  réduit, sans JavaScript, contraste mesuré, RGAA tenu par des tests).
- **Créativité (20)** — 9. C'est notre point fort et il est structurel : la
  cosmogonie tient la navigation, pas la décoration.
- **Contenu (10)** — 8. Le codex est sourcé, les trois études de cas sont
  complètes dans les trois langues depuis hier.

---

## 5. Le programme vers 10, par levier décroissant

### Levier 1 — Anticiper la compilation des shaders (fait, voir § 8)

**Gain** : supprime la cause des 224 images en retard de Mémoire. C'est le
levier qui sert directement « les effets exécutés parfaitement ».

**Ce qui a marché** : pas la chauffe des shaders, qui a aggravé la
situation et a été retirée, mais la suppression de la cause elle-même. Une
lumière ponctuelle qui apparaît en cours d'arc fait recompiler tous les
matériaux éclairés ; la braise de Xolotl est maintenant montée dès la
première image, et seulement là où elle sert. Vingt-deux des trente et une
compilations tardives sont parties, les images en retard de Mémoire passent
de 27 % à 8 %. Le détail, la mesure et ma propre erreur de diagnostic sont
au § 8.

**Oracle** : `.scratch/programmes-tardifs.mjs`, qui nomme les paramètres
qui distinguent un programme tardif de son parent, plutôt que de les
compter.

**Cosmogonie** : aucune, c'est de l'artisanat pur.

### Levier 2 — L'herbe, 266 ms/s et 45 % des triangles (à toi de trancher)

**Gain** : c'est le premier poste sur les deux axes. Diviser son coût par
deux réglerait Contact à lui seul.

**Trois voies**, par ordre de coût visuel croissant :

1. **Simuler à 30 Hz au lieu de 60**, en interpolant entre deux pas. Le
   vent est un signal de basse fréquence : l'œil ne verra rien, et le coût
   est divisé par deux. *C'est celle que je recommande.*
2. Réduire la grille de simulation sur le profil mobile seulement.
3. Moins de brins, ou un brin à moins de six triangles.

**Pourquoi c'est ta décision** : la densité de l'herbe EST la texture du
site, et c'est déjà pour la protéger que le plafond de densité de pixels
n'a pas été baissé le 08/09.

### Levier 3 — Le son comme couche narrative (à toi)

**Gain** : c'est le plus gros écart avec les lauréats, identifié le 08/09 et
inchangé. Cartier est cité pour « une partition Web Audio comme couche
narrative ».

**Ce que la cosmogonie permet, sans rien inventer** : chaque direction a
son élément attesté, et chacun a un son évident.

- **Est / Tlahuizcalpan** : la glace. Le monde de verre qui craque, puis
  éclate au dard du soleil. Le geste existe déjà, il est muet.
- **Sud / Huitztlampa** : la chaleur. Le bourdon du midi, et le tonnerre
  sec de la frappe du serpent sur l'anneau.
- **Ouest / Cihuatlampa** : **le vent**. Ehecatl est le vent, littéralement,
  et il balaie déjà la route à l'écran.
- **Nord / Mictlampa** : l'eau. La nappe existe, avec son simulateur
  d'ondes ; chaque pas de Xolotl y pousse déjà une onde qu'on ne
  l'entend pas faire.
- **Centre / Tlalxicco** : le feu. Le foyer qui ne s'éteint jamais.

Aucun de ces cinq sons n'est une invention : ils sont l'élément de la
direction. Et la brique existe (`CHIME_FREQ`, l'accord cardinal au climax).

**Réserve** : le son reste coupé par défaut, ce qui est la bonne pratique.
Un jury qui ne l'active pas ne l'entendra pas. La question à trancher est
donc l'INVITE, pas le son.

### Levier 4 — La profondeur de champ permanente (à toi, je peux la poser)

**Gain** : le marqueur cinématographique le plus reconnaissable, et il nous
manque entièrement.

**Ce que la cosmogonie en dit** : c'est de notre licence, pas de
l'attesté, et il faut le déclarer comme tel. Mais la lecture tient : le
site est construit sur un CENTRE et quatre horizons. Un cadre où le sujet
proche est net et où l'horizon se dissout dit exactement ça. Et à l'Est, où
le monde est en verre, une profondeur de champ ferait enfin lire
l'ÉPAISSEUR de la glace.

**Budget** : les trois pages saines ont 59,9 fps avec marge. À poser sur le
profil bureau d'abord, mesuré avant/après à la barre.

### Levier 5 — Le rapport contenu / scène au Nord et au Sud (à toi)

Mesuré le 09/09 : 50 % du cadre jusqu'à la fin, colonne CENTRÉE, donc c'est
le cerf qui est couvert. C'est la décision de mise en scène que je te
signale depuis deux jours et que je ne prendrai pas à ta place.

### Levier 6 — L'échelle typographique (à toi)

Treize tailles, neuf à moins de 11 % d'écart, 480 éléments sans
interlignage. Dis-moi le rapport que tu veux (1,25 tierce majeure ou 1,333
quarte) et je pose l'échelle en une passe.

### Levier 7 — L'arc vertical du Centre (débloqué, à moi sur ton go)

Le blocage était ta mesure téléphone. La barre du métier y répond : 59,9 /
59,5 fps sur l'accueil, avec marge. Le chantier est prêt (E1/E2 du plan) :
caméra qui pique vers le zénith plafonnée à 78°, `SunBeam` repointé en
colonne de fumée, Voie lactée au zénith après vérification de source.

---

## 6. La règle « exécuté parfaitement » : un oracle par effet

C'est la consigne, et elle mérite d'être écrite comme une règle du projet,
parce que la revue de ce jour montre trois façons de rater un effet
pourtant bien conçu :

1. **Il joue trop vite pour être vu.** La frappe du serpent traversait son
   moment le plus intéressant à sa vitesse maximale. Oracle : filmer image
   par image et mesurer la vitesse de la phase qui compte.
2. **Il est interrompu.** Dix-sept compilations de shader au milieu de
   l'arc. Oracle : le compte de programmes ne bouge plus après l'arrivée.
3. **Il joue devant une salle vide, ou derrière un mur.** Les 400 étoiles
   se jetaient pendant le fondu du voile ; la frappe se jouait derrière les
   cartes. Oracle : mesurer où est l'œil à cet instant, et ce qui est
   devant.

Aucun de ces trois ratés n'était un défaut de conception : les trois
effets étaient bien pensés et bien codés. **Un effet n'existe que s'il est
vu, entier, sans arrêt.**

---

## 7. Ce que je propose de faire ensuite, sans attendre

Deux choses ne demandent aucun arbitrage et rendent le plus :

- **Le levier 1** (compilation anticipée) : pur artisanat, oracle net,
  et il sert directement ta consigne.
- **Vérifier Contact après**, parce que si la compilation tardive pèse plus
  que je ne crois, la page pourrait repasser la barre sans toucher à
  l'herbe.

Le reste attend une décision de ta part, et je les ai classées ci-dessus
par ce qu'elles rapportent.

---

## 8. Addendum du 10/09 : la compilation tardive, cause trouvée et corrigée

Ce qui suit corrige deux choses écrites plus haut le même jour. Le
correctif que j'annonçais « sans arbitrage » ne marchait pas, et une piste
que j'avais déclarée fausse était la bonne.

### 8.1 La chauffe des shaders : essayée, mesurée, retirée

Un composant dans le Canvas qui attend `useProgress() >= 100`, laisse douze
images aux traversées idempotentes pour poser leurs modificateurs, puis
appelle `renderer.compileAsync(scene, camera)`. Le choix de `compileAsync`
était bon et vérifié à la source : en three r185 il parcourt la scène en
`traverse` et non `traverseVisible`, donc il couvre aussi les objets encore
invisibles.

| | à l'arrivée | après tout le scroll |
| --- | --- | --- |
| sans chauffe | 32 | 49 |
| avec chauffe | 50 | **67** |

Dix-huit programmes compilés en plus, et **aucune** compilation tardive
empêchée. Retirée.

### 8.2 La vraie cause : une lumière ponctuelle qui apparaît en cours d'arc

La bonne question n'était pas *combien* de programmes se compilent tard,
mais **lesquels**. three range chaque programme sous une clé de cache qui
est la liste de tout ce qui le détermine. La queue de cette liste est de
longueur fixe, donc on peut nommer chaque jeton en comptant depuis la fin,
et lire la différence entre un programme tardif et son plus proche parent
déjà compilé.

Le verdict est sans ambiguïté :

| page | compilations tardives | dont `numPointLights: 0 -> 1` |
| --- | --- | --- |
| Mémoire | 17 | **11** |
| Contact | 14 | **11** |

Le nombre de lumières ponctuelles entre dans la clé de cache. Xolotl porte
une braise (`pointLight`), et tout son sous-arbre vivait sous un
`if (!spawn) return null` : la lumière **naissait au milieu de l'arc**, et
sa naissance faisait recompiler tous les matériaux éclairés de la scène,
exactement pendant son passage. À Contact, la braise n'est même jamais
allumée : onze recompilations pour une lumière d'intensité nulle du début
à la fin.

### 8.3 Pourquoi j'avais innocenté cette piste, à tort

Ma sonde comparait deux courses, passage forcé à « oui » puis à « non », et
trouvait le même compte de lumières. Elle forçait le « non » en écrivant
`0` dans la clé `sessionStorage` du tirage. Or `decideSpawn` dit :

```ts
if (probability <= 0) return false;
if (probability >= 1) return true;   // le Nord : probabilité 1
if (cached !== null) return cached === "1";
```

Au Nord, la règle prime sur le tirage caché, **et la fonction sort avant de
lire le cache**. Mon « sans Xolotl » avait donc Xolotl. Je comparais une
course avec lui à une autre course avec lui, et j'ai lu cette égalité comme
une innocence.

La leçon est celle que Sylvain répète : reproduire par le vrai chemin. Un
drapeau qui court-circuite la logique métier ne prouve rien tant qu'on n'a
pas vérifié qu'il produit vraiment l'état voulu.

### 8.4 Le correctif, et ce qu'il donne

La braise est montée dès la première image, et **seulement au Nord** où
elle éclaire vraiment. Les deux branches de rendu renvoient un fragment
dont le premier enfant est la braise, donc React la conserve à l'identique
quand le reste du chien apparaît : le nombre de lumières ne change jamais.
Sa position, qui venait de la hiérarchie, est maintenant posée à la main
dans le même repère, au même endroit.

| | avant | après |
| --- | --- | --- |
| Mémoire, programmes | 32 -> 49 | 32 -> **38** |
| Contact, programmes | 26 -> 40 | 26 -> **29** |
| Mémoire, images en retard | 224 / 844 | **92 / 1090** |
| Mémoire, images en 20 s | 844 | **1090** |

Vingt-deux des trente et une compilations tardives sont parties. À Mémoire,
les images en retard passent de 27 % à 8 %, et la page rend 1090 images là
où elle en rendait 844 dans la même fenêtre : 42 images par seconde en
moyenne, contre 54 maintenant.

Vérifié aussi : la braise s'allume toujours (intensité 9 au pic) et suit
Xolotl d'un bout à l'autre du bassin ; à Contact elle n'existe plus du
tout, ce qui ne change rien puisqu'elle y restait éteinte.

**Contact ne bouge pas** (30 images par seconde médianes) : sa limite n'est
pas la compilation, c'est l'herbe, 266 ms par seconde de processeur. C'est
le levier 2, et il attend ton arbitrage.

### 8.5 Ce qui reste

Six compilations tardives à Mémoire, trois à Contact. Ce ne sont plus des
recompilations de matériaux existants mais des **matériaux créés tard**
(sources de shaders nouvelles, une sprite, une variante de peau animée).
Les traiter demanderait de les instancier plus tôt, ce qui coûte de la
mémoire à l'arrivée : le rapport n'est plus évident, et le défaut n'est
plus au niveau où il ruinait un geste.

---

## 9. Ce que la nuit du 10/09 a change

Trois arbitrages de Sylvain (l'herbe, la profondeur de champ, l'arc du
Centre), et le défaut de compilation tardive dont la cause a fini par se
laisser prendre.

### La barre du métier, avant et après

| page | images en retard, le matin | ce soir |
| --- | --- | --- |
| Accueil | 9 / 1193 | **0 / 1201** |
| Services | 6 / 1196 | **0 / 1201** |
| Projets | 6 / 1196 | **0 / 1202** |
| Contact | **526 / 564**, 30 images par seconde | 141 / 1062, **59,9** |
| Mémoire | **224 / 844** | 7 / 1182 |

Les cinq pages tiennent maintenant la médiane de 60. Contact la tenait à
moitié ce matin ; il reste son cinquième centile à 29,9, soit 13 % d'images
en retard.

### Les leviers, un par un

**Levier 1, la compilation tardive : fait**, mais pas par la chauffe des
shaders, qui aggravait (§ 8). La cause était une lumière ponctuelle qui
naissait au milieu de l'arc. Vingt-deux des trente et une compilations
tardives sont parties.

**Levier 2, l'herbe : fait, et autrement que proposé.** Les deux options
soumises à Sylvain valaient moins que ce que le code disait. Simuler à
30 Hz aurait économisé 0,4 ms par image, parce que le coût n'était pas
l'intégration mais le VENT : six sinus par cellule, 4096 cellules, soixante
fois par seconde. Le champ voyage sans se déformer, donc il se précalcule :
266 ms/s deviennent 36. Et la piste de la densité reposait sur une prémisse
fausse : la prairie s'arrête déjà au pied des montagnes (`MAX_RADIUS = 16`,
et les pentes sont exclues), et le profil mobile ne pose pas 26 000 brins
mais 9 000.

**Levier 4, la profondeur de champ : faite, et elle a révélé un défaut.**
Les paramètres étaient en unités normalisées d'une version antérieure de
`postprocessing` ; en unités monde, le plan de netteté était à trois
centimètres de la caméra. Pendant chaque passage cardinal, tout le cadre
partait dans le flou, le cerf compris.

**Levier 7, l'arc vertical du Centre : fait.** Le regard remonte l'axe du
monde sur le dernier cinquième, la colonne de fumée des cinq offrandes part
avant lui, et l'arche de Mixcoatl passe au zénith.

**Restent à toi** : le son (levier 3), le rapport contenu / scène au Nord et
au Sud (levier 5), l'échelle typographique (levier 6).

### Ce qui reste mesuré, et non traité

- **Contact, 13 % d'images en retard.** Les postes, profil en temps propre :
  `stepStrip` 95 ms/s (les rubans des Cihuateteo), `updateMatrixWorld` 88,
  `writeRibbonSlot` 65, `stepLeaf` 46, `getParameters` 42. Ce dernier ne
  devrait pas exister en régime établi : three ne recalcule les paramètres
  d'un programme que si l'état de rendu a changé. C'est la même famille de
  défaut que la lumière de Xolotl, et il n'est pas diagnostiqué.
- **Le voile se lève encore à 22-41 secondes** sous CPU ×4 et Fast 3G. C'est
  ce qu'un jury voit en premier, et le poids n'y est pour rien (0,6 Mo) :
  le temps part dans le calcul.
- **Six compilations tardives à Mémoire, trois à Contact.** Ce sont des
  matériaux créés tard, plus des recompilations : les traiter coûterait de
  la mémoire à l'arrivée, le rapport n'est plus évident.

---

## 10. Le voile, mesuré pour de bon (10/09, nuit)

Le § 3 disait que le temps de chargement partait dans le calcul. C'était
faux, et voici comment on le sait.

### La cascade, sous Fast 3G et CPU ×4

| phase | de | à | ce qui se passe |
| --- | --- | --- | --- |
| le JavaScript | 0,6 s | 13,5 s | 2,14 Mo de scripts, dont un morceau de 1,44 Mo |
| les modèles | 14,1 s | 21,3 s | huit `.glb`, 832 Ko, qui ne peuvent PAS commencer avant |
| le voile | | 22,4 s | 1,1 s après le dernier octet |

Les modèles ne partent qu'à 14,1 s parce que c'est le JavaScript qui les
demande. Le fil principal, pendant tout ce temps, passe 20 % de son temps
au repos : il attend.

### Ce que ça coûte, et ce que ça ne coûte pas

En production, Netlify compresse : le gros morceau passe de 1438 à 377 Ko,
et le total du fil de 3,73 à **2,01 Mo**. Le voile s'ouvre alors à
**16,6 s** au lieu de 22,4.

Sur ces 2 Mo : le JavaScript en fait 600 Ko compressés, les modèles 830 Ko
qui ne se compressent pas (binaire déjà serré), les images 460 Ko, les
polices 130 Ko.

### Ce qui a été fait dans la nuit

Trois ressources partaient pendant la fenêtre de chargement sans être
nécessaires pour l'ouvrir : la photographie de ciel (120 Ko, jamais
affichée au Centre ni au Nord), les cinq préchargements de destinations, et
les liens cardinaux de l'en-tête que Next préchargeait de son côté dès
qu'ils entraient dans le cadre. Plus la chaîne de post-traitement (116 Ko),
sortie du morceau principal parce que le profil mobile ne l'allume jamais.

Mesure locale : 22,5 s puis 20,9 s ; 39 requêtes puis 29 ; 3,73 Mo puis
3,42 Mo.

### Ce qui reste, et à qui

- **Les modèles, 830 Ko sur le fil, incompressibles.** C'est le lot I2, et
  il est bloqué sur le plafond d'apprentissage : compresser un `.glb`
  demande un outil de build (`gltfpack` ou `@gltf-transform/cli`). Le
  décodeur au runtime existe déjà, drei l'installe par défaut. **Ton
  arbitrage.**
- **Le voile attend les huit modèles**, pas seulement le cerf et la Piedra.
  Lever le voile sur la scène essentielle et laisser la flore arriver
  ensuite gagnerait deux à trois secondes, au prix d'un remplissage visible.
  **Ton arbitrage** : c'est une question de mise en scène, pas de technique.
- **Le morceau principal fait encore 871 Ko** (plus 460). C'est three, react
  et drei : il n'y a pas de gras évident à couper, seulement du découpage
  par page à envisager, et toutes les pages partagent la même scène.
