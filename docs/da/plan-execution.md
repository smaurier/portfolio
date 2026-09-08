# Plan d'execution scelle, 09/09/2026

Un seul plan qui reprend TOUT ce qui est decide et rien d'autre : la
reparation du serpent de feu, les trois etages du deuxieme panel, les lots
restants du premier, le lot de contenu, et les finitions reperees. Ecrit pour
etre repris par n'importe quelle session, y compris celle du foyer.

Sources : `docs/da/plan-jury.md` (premier panel, diagnostic et lots),
`docs/da/etat-de-l-art.md` (les sept constantes et le budget mesure),
`docs/da/centre-sources.md` (brief du Centre).

## Etat de reference, a ne pas regresser

Mesure du 09/09 au moment d'ecrire ce plan. Toute tache doit laisser ces
chiffres au moins aussi bons.

| Oracle | Valeur |
| --- | --- |
| `npx tsc --noEmit` | aucune erreur |
| `npx vitest run` | 61 fichiers, 614 tests verts |
| `npx playwright test` | 14 tests verts |
| `npx eslint .` | propre |
| Appels de rendu, accueil | 133 |
| Appels de rendu, Contact | 415 |
| Modeles telecharges sur l'accueil | 8 (1,25 Mo) |

Commande de mesure des appels de rendu : `node .scratch/drawcalls.mjs`
(`gl.info.autoReset = false`, moyenne sur trois images ; lire `info.render`
sans couper l'auto-reset ne renvoie que la derniere passe).

## Invariants, jamais negociables

1. **Aucun dieu modelise a l'ecran.** On montre ce qu'il porte, ce qu'il
   laisse, ses consequences. Jamais son corps.
2. **Atteste contre notre licence.** Chaque element cite sa source ; ce qui
   est de nous est declare comme tel dans le Codex. Jamais une belle formule
   non sourcee presentee comme attestee.
3. **Aucune iconographie sacree recopiee.**
4. **Vocabulaire du Codex** : `teyolia` voyage vers Mictlan et nomme la page
   Memoire ; `tonalli` est la chaleur recue a la naissance et appartient au
   Centre. Ne jamais confondre les deux, meme si une source secondaire le
   fait.
5. **Aucune bibliotheque nouvelle** (plafond d'apprentissage). WebGL, pas
   WebGPU : la branche `webgpu` reste garee.
6. **TDD** : le test d'abord, rouge, puis le code. Pour ce qui n'est pas
   testable unitairement (shaders, reglages visuels), l'oracle est une
   capture au zoom 1:1 ou une mesure dans le navigateur, nommee dans la
   tache.
7. **Ne jamais stager par repertoire** : une autre session travaille dans le
   meme arbre. Uniquement les chemins qu'on a soi-meme ecrits.
8. **Rien ne s'ecrit sans le « go » de Sylvain.**

## Les quatre arbitrages rendus, deja scelles

1. La danse des Cihuateteo est **gardee**, et l'atterrissage s'ajoute.
2. Le test de perf telephone passe **apres l'etage 0 et avant le Centre**.
3. Au zenith du Centre : la **Voie lactee**, les Pleiades gardees en reserve
   pour le Feu Nouveau.
4. Nord : le **8e niveau d'abord**, le chapitrage du scroll ensuite.

---

# PHASE A — Le serpent de feu, repare (priorite)

Le plus beau geste du Sud est mort. Trois defauts empiles, tous mesures le
09/09. Voir la section « Diagnostic verifie » a la fin pour les preuves.

## A1. Le serpent surgit vraiment pour la charge

**Fichier** : `src/app/components/stag-scene/xiuhcoatl-companion.tsx`.

**Le defaut** : la boucle d'image commence par
`const w = wanderRef.current; if (!g || !w) return;` (~ligne 222). La branche
qui doit faire surgir le serpent quand le tirage 1/3 a dit non se trouve
APRES cette garde (~ligne 228). Elle est donc inatteignable dans le seul cas
pour lequel elle existe. Mesure : trois visites normales, zero objet serpent
dans le graphe de la scene, y compris 4,5 s apres le franchissement du seuil
de la frappe.

**Oracle, ecrit d'abord** : `tests/e2e/xiuhcoatl-strike.spec.ts`, sur le
serveur de dev avec `?scene=1` (le graphe n'est expose qu'en dev). Sans
forcer la presence : apres un scroll au-dela du seuil, un objet nomme
`Xiuhcoatl` doit apparaitre dans le graphe en moins de 1,5 s. Le test doit
ECHOUER avant le correctif.

**Le correctif** : deplacer la condition de surgissement AVANT la garde, ou
n'exiger `w` que pour la partie vol errant. Ne pas toucher au tirage 1/3 :
il decide si le serpent erre AVANT la frappe, pas s'il vient.

## A2. La charge part vraiment

**Le defaut** : presence forcee (`?xiuhcoatl=1`), le serpent est la, visible,
a 8 unites de hauteur, mais sa distance a l'origine CROIT : 15,8 → 17,9 →
21,1 → 24 → 27 unites en 4,5 s. Il s'eloigne au lieu de piquer. La cause
n'est pas identifiee. Ecartes par mesure : la detection de robot
(`is-bot.ts` ne teste que l'agent utilisateur, le notre est un Chrome
normal), le mouvement reduit (l'anneau s'embrase, donc l'arc avance), le mode
recit (« Masquer le texte » pose `sceneOnly`, pas `readingMode`), le
melange d'horloges (les deux cotes utilisent `state.clock.elapsedTime`), et
`strikeArmed` qui vaut bien `true` a l'initialisation du store.

**Piste a instrumenter en premier** : exposer `xiuhcoatlStore` sur `window`
en dev, comme `frostStore` le fait deja (`window.__nahualFrost`), et
enregistrer `strikeAt`, `strikeHit` et `strike.fire` image par image en
franchissant le seuil. On saura en une mesure si le ciel arme, si le serpent
voit l'ordre, et si le directeur calcule l'enveloppe.

**Oracle** : meme fichier de test. Apres le declenchement, la distance du
serpent a la Piedra doit DESCENDRE sous 4 unites en moins de 3,5 s
(`STRIKE_MS = 3200`).

## A3. La gerbe de feu et la porte de chaleur s'ouvrent

**Fichiers** : `piedra-ring-fire.tsx`, `piedra-xiuhcoatl-ring.tsx`,
`xiuhcoatl-strike-director.tsx` (les trois sont montes, verifie).

**Oracle** : apres l'impact, `xiuhcoatlStore.strike.fire > 0` et
`xiuhcoatlStore.heatGate > 0` dans la fenetre des 2 s qui suivent, releves
par le meme test. Et une capture a l'instant du pic, regardee a l'oeil :
si la gerbe existe mais ne se voit pas, c'est un probleme de rendu et il
faut le dire, pas le supposer.

## A4. La frappe ne se joue plus derriere un mur de texte

**Le defaut, independant des deux autres** : au point de scroll ou la frappe
se declenche (arc > 0,7, soit environ 1 250 px sur un ecran de 800), les
cartes de projets couvrent tout le centre de l'ecran. Deux captures
comparees, avec et sans le texte : sans le texte la scene est pleine et
belle, avec le texte on ne voit que les bords.

**DECISION SCELLEE** : c'est le CONTENU qui s'ecarte, pas la frappe qui se
deplace. Pendant l'enveloppe de la frappe (charge, impact, gerbe), les
cartes reculent en opacite et glissent lateralement, puis reviennent. Le
signal existe deja : `xiuhcoatlStore.strike` est calcule chaque image par le
directeur. La recherche technique en cours pourra affiner la maniere, pas la
decision.

**Oracle** : test de geometrie sur le modele de
`tests/e2e/controls-overlap.spec.ts` : pendant la frappe, aucun panneau
opaque ne doit recouvrir le rectangle central de la fenetre (40 % au centre).

---

# PHASE B — Etage 0 : ce qui est deja ecrit et ne se voit pas

Aucun geste neuf. Que du branchement, et deux gains de cout.

## B1. Le jet des quatre cents etoiles, au bon moment

**Fichier** : `src/app/components/stag-scene/centzon-stars.tsx:142-146`.

**Le defaut** : le declenchement s'arme 0,5 s apres `data-loaded="true"`,
donc pendant le fondu du voile, quand l'oeil est encore sur le chrome de la
page. Un commentaire cite deja le retour de Sylvain du 05/09, « je ne vois
pas l'apparition des 400 » : on avait ajoute une demi-seconde, ca n'a pas
suffi, parce que le probleme n'est pas le delai.

**Le correctif** : armer sur une condition de REGARD et non de minuterie :
le Sud, le voile tombe, et le scroll a atteint un seuil ou le dome du ciel
est dans le cadre. Tout est deja disponible dans `sceneRefs.progressRef`.

**Oracle** : le jet ne doit pas avoir commence tant que le scroll est a 0
(la trace `centzon-thrown` absente), et doit avoir eu lieu apres avoir
franchi le seuil. Test e2e sur la trace, comme le fait deja le systeme de
traces.

## B2. La sortie du Centre, qui existe et n'a jamais ete affichee

**Fichiers** : `page-closure.tsx:45` (entree `jade` complete depuis le debut,
« Le nombril du monde. D'ou partent les chemins », lien vers l'Est) et
`stag-scene.tsx`, qui ne monte pas `PageClosure`, contrairement a
`echo-scene-page.tsx:42-51`.

**Le correctif** : monter `PageClosure` au Centre, avec `progressRef` et
`reducedMotionRef` comme les quatre autres. Une ligne. Bonus gratuit : le
clic sur ce lien declenche deja le voyage cardinal complet
(`NepantlaFrame` + `swingAzimuth`), que le Centre n'a jamais eu.

**Oracle** : e2e, sur `/fr`, en fin d'arc, le texte « Le nombril du monde »
est visible.

## B3. Les rubans des Cihuateteo groupes

**Fichier** : `src/app/components/stag-scene/cihuateteo.tsx:266-305`.

**Le defaut** : 14 plumes du dais + 3 papiers par porteuse = **26 draw calls
individuels** via `createRibbonGeometry`, alors que le MEME fichier utilise
deja `createRibbonBundleGeometry` / `writeRibbonSlot` / `finishRibbonBundle`
(`ribbon-geometry.ts:76-127`) deux blocs plus haut pour les cheveux et la
jupe.

**Le correctif** : rebrancher plumes et papiers sur l'API bundle. Rendu
identique au pixel.

**Oracle** : `node .scratch/drawcalls.mjs` sur `/fr/contact` : 415 doit
tomber a 395 ou moins. Et une capture avant/apres du meme cadrage, regardee
a l'oeil, pour verifier que rien n'a change visuellement.

## B4. `FrostWorld` et `SunBeam` gates par direction

**Fichiers** : `frost-world.tsx`, `sun-beam.tsx`, `scene-content.tsx`.

**Le defaut** : ce sont les deux seuls composants de direction non gates par
`MountForDirection`, alors que sept l'ont ete le 08/09. Cout paye sur les
cinq pages : un clone de squelette complet, un traverse pleine scene toutes
les 20 images, ~640 eclats et 360 poussieres alloues.

**Oracle** : sonde du graphe, aucun objet de gel hors de l'Est ; suite
complete verte ; et l'Est rend toujours son monde de verre (capture).

---

# PHASE C — La mesure sur telephone (arbitrage 2)

## C1. Android en USB, avant de toucher au Centre

**Protocole** : telephone en USB, `chrome://inspect`, panneau Performance.
Mesurer, page par page, sur les trois lourdes (Contact les porteuses,
Memoire la nappe d'eau, Services le monde de verre) : les fps **apres deux a
trois minutes** (le telephone se bride en chauffant), et le **pire centile**
plutot que la moyenne. Mesurer aussi, sur un ecran dense, le plafond de
densite de pixels a 2 contre 1,5, pour trancher la question laissee ouverte
le 08/09 (`DESKTOP_DPR_CAP`, `mobile-perf.ts:18`).

**Oracle** : les chiffres ecrits dans `docs/da/etat-de-l-art.md`, section
budget, avec la date et l'appareil. Sans ces chiffres, la phase E ne
commence pas.

---

# PHASE D — Etage 1 : trois substitutions mythologiques

## D1. Est, le balai d'Itztlacoliuhqui

Il porte aussi un balai de paille (tlachpanoni), « qui nettoie le chemin pour
la vie nouvelle » (Andrews, deja cite dans `est-sources.md`). A l'instant du
dard retourne, quelque chose balaie le dernier givre hors du champ, dans le
sens ou la lumiere avance, et **c'est ce geste qui cause la repousse du
mais** deja ecrite dans le Codex, au lieu qu'elle ressemble a une
coincidence. Remplace la lame plantee comme unique relique immobile.

**Oracle** : `milpa-frost` a un test ; y ajouter que la repousse ne commence
pas avant le passage du balai. Plus une capture de la sequence.

## D2. Nord, le 8e niveau de Mictlan

La scene finit aujourd'hui sur la traversee du PREMIER fleuve, etape 1 sur 9,
utilisee a contresens comme climax. L'etape a montrer est *Izmictlan
Apochcalolca*, les eaux noires ou le mort est depouille. L'outil existe : le
miroir tezcatl « ne reflete pas, il revele ou il ment ». A cet endroit
seulement, il PREND : la derniere couleur chaude du reflet du cerf reste dans
l'eau noire au lieu de remonter avec lui.

**Invariant 4** : c'est `teyolia` qui se depouille la, jamais `tonalli`.

**Oracle** : un test pur sur la courbe de retention de couleur (meme forme
que les enveloppes existantes), plus une capture.

## D3. Nord, le chapitrage du scroll

`getChapterOpacity` (`reveal-arc.ts:239-255`) existe et n'est utilise que par
le Centre. Le Nord est la page la plus longue (4 901 px) et son arc est
dilue. Appliquer aux pages echo le meme etagement, sur le modele prouve.

**Oracle** : e2e, les chapitres apparaissent l'un apres l'autre au scroll et
aucun ne reste invisible en fin de page.

## D4. Ouest, l'atterrissage (la danse est gardee)

Les quatre Cihuateteo descendent en dansant, puis **touchent le sol au
carrefour comme un impact**, et c'est cet instant qui enflamme ou plaque au
sol les offrandes deja posees devant le cerf. Atteste : les cinq dates de
descente (1 Cerf, 1 Pluie, 1 Singe, 1 Maison, 1 Aigle), la hantise des
carrefours, les offrandes laissees pour les apaiser (Sahagun,
`ouest-sources.md`). Reemploi direct : `applyRadialImpulse`
(`grass-sim.ts:178-191`) pour le coup de vent au sol.

**Interdit** : jamais un enfant a l'ecran, jamais un geste qui mime un
enlevement ou une possession, meme atteste.

**Oracle** : un test pur sur l'enveloppe de l'impact, plus une capture de la
sequence.

---

# PHASE E — Etage 2 : l'arc vertical du Centre

Ne commence pas avant les chiffres de la phase C.

## E1. La camera pique vers le zenith

**Fichiers** : `camera-path.ts`, `orbit-camera.tsx`, `solar-camera.ts`.

`solarCamera` est deja generique (une `spec` de hauteurs, de leve de cible et
de champ) et `orbit-camera.tsx:112-124` porte deja trois refs de melange par
direction ; il en manque une pour jade. Remplace le `finalDrift`
(`camera-path.ts:81`), la rotation residuelle horizontale d'apres climax qui
ne raconte plus rien.

**ECUEIL NOMME, a ne pas redecouvrir** : `camera.up` n'est JAMAIS touche dans
tout le projet. Viser la verticale fait degenerer le `lookAt` et se lit comme
un roulis brutal dans les derniers degres. Le depot a deja pris cette licence
ailleurs : `BEAM_ELEVATION_DEG = 62` (`est-arc.ts:71`). **Plafonner a 78°,
jamais 90.**

**Oracle** : un test pur sur la courbe d'elevation, qui verifie qu'elle ne
depasse jamais 78° ; plus une capture en fin d'arc.

## E2. La colonne de fumee et la Voie lactee

`SunBeam` est un rig complet deja parametre par un axe quelconque
(`beamAxis`) : le repointer sur la verticale, le recolorer en braise, le
gater `jade`, et le brancher sur le scroll. Zero geometrie neuve, zero shader
neuf.

Au zenith, la **Voie lactee**, le chemin blanc de Mixcoatl : un signe
d'ETAT, present n'importe quelle nuit, accorde a un feu qui ne s'eteint
jamais. Les Pleiades restent en reserve pour le Feu Nouveau.

**A FAIRE AVANT D'ECRIRE AU CODEX** : la Voie lactee comme route des ames
n'est attestee qu'au niveau secondaire (worldhistory, digitalmaps). Relire
Leon-Portilla, deja dans nos sources. Si ca ne se confirme pas, le declarer
comme notre licence dans le Codex.

---

# PHASE F — Les lots restants du premier panel

## F1. Le Sud, la nuit de Coatepec puis midi (lot 4)

Arbitrage du 08/09 : on garde le depart nocturne et on ecrit un vrai arc qui
monte vers midi, sur le modele de `remapWestArc` (`arc-day.ts`). Le rig de
nuit du Sud est aujourd'hui SOUS le neutre a l'arrivee (`ambientScale: 0.9`,
`directionalScale: 0.85`, `direction-light.ts:59`) alors que le meme fichier
documente le Sud comme la page la plus lumineuse du site.

**PIEGE DE COHERENCE, a respecter** : Coatepec est un lever de soleil et
l'Est en est deja un. Le Sud va de la nuit au ZENITH **sans jamais passer par
des couleurs d'aube**. Donc la bande d'horizon `uDusk` non cablee pour
turquoise (`sud-sky.tsx:213`) n'est PAS un defaut a corriger, c'est le bon
choix. Ce qui doit se voir a la place : la lune et les quatre cents etoiles a
l'arrivee, leur dispersion, et le soleil deja au zenith a la fin.

A regler au passage : a `uDay` plein, le melange du dome REMPLACE le degrade
du zenith par la seule photo teintee (`sud-sky.tsx:118`), ce qui aplatit le
ciel. Les nuages sont la mais illisibles (verifie au contraste force).

**Oracle** : test pur sur le nouvel arc ; captures a l'arrivee, a mi-course
et en fin d'arc ; et l'ecart-type du bandeau de ciel doit augmenter.

## F2. L'acte de sortie sur les 180vh morts (lot 5)

Arbitrage du 08/09 : **les deux**, raccourcir le flow et ecrire un vrai
depart. L'arc se termine a deux ecrans (`ARC_SCROLL_VIEWPORTS`, maintenant
dans `reveal-arc.ts`) alors que le conteneur en fait trois
(`scene-stage.module.css:21`) plus 80vh de marge (`globals.css:785`, demandee
par Sylvain le 28/08 pour garder le cerf visible au climax : on reduit, on ne
supprime pas).

Reemploi : `face-a-face-pin.tsx` est ORPHELIN alors que son `pinProgressRef`
est deja lu par `post-fx.tsx:111` pour un boost de bloom. Il tient le scroll
au climax 5 s maximum, avec relachement automatique.

**COORDINATION OBLIGATOIRE** : ce lot touche `reveal-arc`, `SceneStage`,
`globals.css` et `layout.tsx`, que le chantier du foyer modifie. Et le Centre
prevoit un climax au zenith : **l'acte de sortie doit passer avant ce climax,
ou etre concu avec lui**, sinon la page la plus jugee du site herite du
defaut de l'Ouest.

**Oracle** : e2e, en fin de page, le pied de page n'occupe plus la moitie de
la fenetre, et un mouvement de camera a bien eu lieu apres le climax.

## F3. `<noscript>` et sortie de secours du voile (lot 7)

Teste le 08/09 : sans JavaScript, le site n'est PAS noir (98 Ko de HTML
servi, le voile s'affiche avec la Piedra et le nom de la fleur, tout le texte
est dans le DOM), mais **on ne franchit jamais le voile** et il n'existe
aucun `<noscript>` dans `src/`. Pour la vitrine d'un futur auditeur RGAA,
c'est un point de credibilite autant que d'ergonomie.

**Oracle** : Playwright avec `javaScriptEnabled: false`, le contenu
principal doit etre atteignable et le voile ne doit pas rester opaque.

---

# PHASE G — Contenu

## G1. Ce que les projets montrent d'un point de vue recruteur

Signale deux fois par le dissident : aucun des trois projets
(`src/dictionaries/fr.json:168,206,244`) ne montre de travail backend, alors
que c'est le differenciateur de marche declare. Un jury pese le contenu a
10 %, un recruteur a 100 %.

**Regle d'honnetete** : on ne revendique pas NestJS ni PostgreSQL tant qu'un
projet publie ne les utilise pas. Ce qui EXISTE et n'est pas montre : du
Node/TypeScript, une couverture de tests reelle, de l'integration continue,
un paquet publie sur npm, un plugin adopte. La tache est de rendre ce travail
LISIBLE pour un lecteur qui cherche un profil fullstack, pas d'inventer une
competence.

**Oracle** : relecture par Sylvain. Aucune ligne ne doit affirmer une techno
qu'il ne pratique pas encore.

---

# PHASE H — Finitions reperees, a ne pas perdre

Aucune n'est bloquante, toutes sont notees pour ne pas etre oubliees.

- **Est** : une bande de ciel noir en haut du cadre a l'arrivee, et le titre
  sous la ligne de flottaison. La bande du zenith du dome pourrait rester
  sombre a l'Est au lieu de deriver vers le bleu profond partage
  (`sud-sky.tsx:30,194`).
- **Nord** : les cempasuchil sont des taches saturees.
- **Centre** : le cerf est d'un vert plastique plat en fin d'arc.
- **Mobile** : la colonne d'outils occupe encore 415 px sur un ecran de 839.
  La reduire vraiment veut dire moins de boutons, deux colonnes ou un tiroir.
  **Decision de conception, pas un correctif.**
- **Note technique** : `focalLength={0.06}` sur `<DepthOfField>`
  (`post-fx.tsx:171`) est deprecie dans `postprocessing@6.39.4` et ne
  signifie plus ce que le commentaire affirme (c'est une plage de nettete en
  unites monde, pas une focale).
- **Backlog deja acte** : les quatre arbres cardinaux (a refaire, les quatre
  a la fois dans le decor tourne, pas un par page), la mue d'or et le Feu
  Nouveau en finale, le mode light, le swap Xolotl payant.

---

# Diagnostic verifie du serpent, pour memoire

Mesures du 09/09, reproductibles.

1. **Rien n'a ete retire.** `XiuhcoatlCompanion` (`scene-content.tsx:181`),
   `XiuhcoatlStrikeDirector` (`:188`), `PiedraRingFire` (`:189`) et
   `PiedraXiuhcoatlRing` (`:220`) sont tous les quatre montes.
2. **La chaine du geste** : le ciel arme la frappe quand
   `getRevealFloor(progress) > 0.7` au Sud, une fois par arrivee
   (`sud-sky.tsx:175-183`) ; le serpent voit l'ordre dans les 0,5 s et charge
   pendant `STRIKE_MS = 3200` ; a l'impact il pose `strikeHit`
   (`xiuhcoatl-companion.tsx:270`), et c'est seulement la que la gerbe part
   et que la porte de chaleur s'ouvre.
3. **En visite normale, le serpent n'existe pas.** Trois sondes du graphe :
   zero objet a l'arrivee, zero 4,5 s apres le seuil.
4. **Presence forcee, il ne charge pas** : distance a l'origine 15,8 → 17,9 →
   21,1 → 24 → 27 unites en 4,5 s.
5. **La frappe se joue derriere les cartes de projets**, qui couvrent tout le
   centre de l'ecran a ce point du scroll.

---

# PHASE 0 — LA BARRE DE RENDU (a lire avant toute tache visuelle)

Ajoutee le 09/09 sur rappel de Sylvain : « je veux tout implementer mais
avoir un vrai effet et pas un truc tout pourri mal modelise et documente et
qui ne donne rien ». Le plan ci-dessous verifiait que les effets PARTENT, pas
qu'ils sont BEAUX. Cette phase corrige ca : c'est une barre, pas une tache.

## La loi de la mise en scene, apprise cette nuit

Le serpent de feu est correctement modelise, correctement anime, avec une
enveloppe d'impact ecrite dans une lib dediee et testee. Et il ne donne rien,
parce qu'il ne se voit pas. **Un effet ne vaut que l'instant ou il est vu.**
Avant de construire un geste, trois questions dans cet ordre, et la reponse
s'ecrit dans le commit :

1. **Ou est l'oeil a cet instant ?** Pas « ou est la camera » : ou regarde le
   visiteur. Le jet des 400 se joue pendant un fondu de voile, la frappe
   pendant la lecture d'une carte.
2. **Qu'est-ce qui couvre l'ecran ?** Le contenu DOM gagne toujours contre la
   3D : il est opaque et il est devant.
3. **Combien de temps ca dure, et qu'est-ce qui l'annonce ?** Un evenement de
   deux secondes sans anticipation est un evenement rate. Les lauréats
   annoncent (un son, une lueur, un ralenti) avant de frapper.

## Les trois portes que chaque geste visuel doit franchir

Aucune tache visuelle n'est « faite » avant les trois. A citer dans le commit.

- **Porte 1, la reference nommee.** Une image ou un site precis dont on veut
  l'effet, cite en URL. Pas « plus cinematographique » : « le rayon de
  Hubtown a 0:12 », « la fumee de tel site primé ». Sans reference nommee, on
  ne sait pas ce qu'on vise et on livre au hasard.
- **Porte 2, la capture a l'instant du pic, au zoom 1:1.** Pas une vue
  d'ensemble : le crop a 100 % du moment le plus fort. C'est la methode qui a
  fait tomber le frangeage chromatique et le semis de givre, deux defauts
  invisibles en vue d'ensemble.
- **Porte 3, la paire avant / apres sur le MEME cadrage.** Meme page, meme
  position de scroll, meme instant. Si la difference ne se voit pas sur la
  paire, l'effet ne se verra pas non plus pour un visiteur.

## Ce qui fait le cinema en WebGL, dans l'ordre du levier

Constat de nos propres mesures : notre chaine de post-traitement est deja
riche (bloom, profondeur de champ, vignette, aberration desormais radiale,
grade par direction). **Le levier n'est pas d'ajouter des effets.** Dans
l'ordre de ce qui a change quelque chose chez nous :

1. **La direction de la lumiere.** L'Est est notre meilleure scene parce que
   la lumiere vient de l'horizon et rase tout. Le Centre est le plus faible
   parce que sa lumiere ne vient de nulle part. Le Sud est plat parce que son
   rig d'arrivee est sous le neutre.
2. **Le contraste et la silhouette.** Le cerf lisible au Nord est une
   silhouette sombre sur un disque clair. Le cerf illisible au Centre est un
   vert plat sur un fond noir.
3. **Le minutage et l'anticipation**, cf la loi ci-dessus.
4. **La profondeur en couches** : brume, perspective atmospherique,
   parallaxe. Nous l'avons (`depth-fade`), c'est ce qui fait tenir les
   montagnes.
5. **Le detail au bon endroit seulement.** Un objet lu a 27 unites ne merite
   pas de topologie. Un objet au centre du cadre en merite.

## Discipline des modeles recuperes

Sylvain : « recuperer des modeles et surtout prendre le meilleur ». Regles,
pour que ca reste tenable et honnete :

- **Sources acceptables** : CC0 ou licence explicitement compatible d'un
  usage commercial (Poly Haven, Quaternius, Kenney, Sketchfab CC0,
  Smithsonian 3D). Le depot en utilise deja (flore CC0, Quaternius, Google
  Poly). **Toute licence se note dans les credits du site AVANT le commit qui
  ajoute le modele.**
- **Verifications avant integration** : format glTF/GLB, poids sur disque,
  nombre de triangles, echelle en unites monde, et compression (meshopt ou
  Draco) comme pour `stag.glb`. Un modele non compresse ne rentre pas.
- **Quand modeliser soi-meme plutot que recuperer** : quand l'objet doit
  etre NOTRE licence declaree (un signe stylise, jamais une copie d'objet
  sacre), quand il faut le parametrer (les quatre especes d'arbres l'ont
  ete), ou quand aucun modele libre ne correspond. Le depot a deja la chaine
  complete dans `tools/blender/` (bmesh, materiaux nommes, export GLB,
  rendus de controle).
- **Interdit** : recopier une iconographie sacree, meme depuis un modele
  libre. La regle du site ne se negocie pas avec une licence.

## Le budget est la contrainte, pas une suggestion

Accueil 133 appels de rendu et 316 000 triangles, Contact 415 et 351 000,
pour une cible mobile de 100 a 200 appels. **Chaque geste visuel doit dire ce
qu'il coute et ce qu'il retire en echange.** L'etage 0 du plan retire 24
appels sur Contact et deux composants pleine scene : c'est ce qui paie l'arc
vertical du Centre.

## Ce qui alimente cette barre

Une recherche technique approfondie est en cours sur : la mise en scene d'un
evenement dans un scroll (epinglage, scrub de timeline, anticipation), le
rapport entre contenu DOM et scene 3D chez les lauréats, le feu et les
impacts en WebGL du meilleur effet possible sans usine a gaz, et les sources
de modeles librement reutilisables. Ses conclusions viendront completer cette
phase 0 avec des references nommees, qui sont exactement ce que la porte 1
exige.

---

# Ce que la recherche technique apporte au plan (09/09)

Recherche demandee par Sylvain : « appuie-toi fortement sur ce qui existe
partout sur Internet en etude de la concurrence pour voir comment tout ca
peut etre implemente du meilleur effet ». Elle fournit les REFERENCES NOMMEES
qu'exige la porte 1 de la phase 0, et elle a trouve un risque juridique.

## Les cinq sites de reference, et ce qu'on vole a chacun

1. **[joseph-san.com](https://joseph-san.com/)** ([analyse Codrops, 04/2026](https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/))
   Verrouillage par blocs reserve au SEUL moment le plus important du site,
   « the medium matches the weight of the message ». **A voler** : traiter la
   frappe du Sud comme LE moment que les autres scenes servent, pas comme un
   effet parmi d'autres.
2. **[maxmilkin.com](https://maxmilkin.com/)** ([analyse Codrops, 12/2025](https://tympanus.net/codrops/2025/12/02/two-portfolios-one-process-where-design-motion-and-code-come-together/))
   DOM et WebGL jamais pleinement visibles en meme temps : sequences, pas
   empiles. **A voler** : la regle elle-meme, pour la tache A4.
3. **[olhalazarieva.com](https://olhalazarieva.com/)** (meme analyse)
   Le monde 3D orbite, le texte ne bouge JAMAIS. **A voler** : l'option la
   plus sure cote RGAA, si faire bouger le texte pose probleme.
4. **[jordan-breton.com](https://jordan-breton.com/)** (FWA site du jour, 02/10/2025)
   Un diorama unique avec beaucoup de petits elements vivants (herbe,
   cascade, feu, vent, papillons), et une camera qui ne navigue QUE entre des
   points fixes decides a l'avance. Meme famille compositionnelle que nous.
   **A voler** : la navigation par points fixes comme garantie structurelle
   de cadrage au climax, jamais generalisee au reste du site.
5. **[iventions.com](https://iventions.com/)** par tin.studio ([CSS Design Awards, mois d'octobre 2025](https://www.cssdesignawards.com/wotm/iventions/48253/))
   Chaque projet traite comme une installation eclairee, « guided
   walk-through rather than a grid ». **A voler** : exactement ce qui manque
   a notre page Projets, un projet installe a la fois au lieu d'une liste de
   cartes.

## A4 precise : la technique exacte, avec nos propres precedents

L'outil qui resout le probleme EXISTE DEJA dans le depot et n'est pas branche
sur la frappe : `face-a-face-pin.tsx` est un epinglage GSAP ScrollTrigger
avec `scrub` et relachement automatique, et il pilote `pinProgressRef` dans
`scene-refs-context.tsx`, deja consomme par le bloom de `post-fx.tsx`.

1. **Epingler la fenetre de la frappe** plutot que declencher sur un seuil
   instantane : dupliquer le motif de `face-a-face-pin.tsx` autour de
   `ignite > 0.7`, epinglage de 100 a 150vh, et ne poser `strikeAt` qu'une
   fois l'epinglage engage. Un scroll rapide ne peut alors plus rater le
   geste. Relachement cale sur la vraie duree de la sequence et non sur les
   5 s copiees d'un autre contexte : `strike-sequence.ts` donne
   **hitAt 1,6 s + shakeLen 1,5 s = 3,1 s**, ce qui recoupe exactement les
   3,2 s mesurees a l'ecran.
2. **Annoncer le coup** : `sound-design.tsx` ecoute DEJA un evenement
   `'nahual:whoosh'` (bruit blanc filtre, utilise pour les transitions
   cardinales). Le declencher 0,8 a 1 s avant l'impact donne une amorce
   sonore gratuite. Cote visuel, `stiffIn` vaut 0,2 s dans
   `strike-sequence.ts`, trop court pour etre percu comme un signal :
   l'etirer a 0,6-0,8 s rend le raidissement du serpent visible AVANT le
   flash.
3. **Ecarter le contenu** : poser un drapeau (`stiffen > 0 || fire > 0.3`)
   depuis `xiuhcoatl-strike-director.tsx`, et le lire en CSS exactement comme
   le depot le fait deja pour `.nahual-lab-reveal` sur `<body>` et
   `data-loaded` sur `<html>`. `.contentPage` descend a ~0,15 d'opacite avec
   `pointer-events: none` pendant la fenetre, puis revient.

**Constat de fond sur la page Projets** : `.contentPage` (`globals.css:557`)
est une colonne centree de 720 px en flux normal, **strictement aveugle** au
canvas fixe derriere elle. C'est elle qui couvre le centre pendant la frappe.
Et le systeme de chapitres pilote par le scroll existe deja
(`.chapterKicker` / `.chapterLine` dans `scene-text-overlay.module.css`) mais
Projets ne l'utilise pas : la page est restee sur l'ancien flux.

## A3 precise : pourquoi notre feu ne ressemble pas a du feu

`piedra-ring-fire.tsx` emet 700 Points additifs dont le sprite est un
**degrade radial genere au Canvas** (`spriteTexture()`). Ce sont donc des
orbes rondes, pas des flammes. Trois pistes, par ordre de rapport
effet / cout, aucune n'ajoute de dependance :

- **Atlas anime (flipbook).** [CGHEVEN publie 20 flipbooks de feu en CC0](https://cgheven.com/assets/flipbooks),
  gratuits et sans inscription, meme reflexe de licence que notre flore CC0.
  Cout : quelques dizaines de Ko de texture, un attribut `aFrame` et un
  remappage de `gl_PointCoord` sur la cellule. La boucle CPU qui tourne deja
  sur 700 particules ne change pas. Reference technique :
  [vfxapprentice, what are flipbooks](https://www.vfxapprentice.com/blog/what-are-flipbooks-in-games).
- **Entierement procedural**, plus conforme a nos conventions puisqu'on ecrit
  deja tout le bruit a la main : reutiliser `hash2` et `vnoise2` deja ecrits
  dans `xiuhcoatl-heat-effect.ts` pour donner a chaque point une forme de
  goutte de flamme (anisotropie verticale, bord bruite) au lieu du disque, ET
  pour perturber la velocite des braises au lieu de l'amortissement lineaire
  actuel. Reference : le curl noise comme champ de vitesse a divergence
  nulle, [iagokrt/curl-noise-threejs](https://github.com/iagokrt/curl-noise-threejs).
- **Trainee de mouvement sur les braises rapides** : deja codee a trois
  fichiers de distance. `centzon-stars.tsx` fait exactement ca pour les
  etoiles filantes, un `LineSegments` additif separe avec un alpha qui
  s'eteint vers la queue. On copie le motif, pas une bibliotheque.

**Bonus zero dependance** : `GodRaysEffect` est deja dans notre
`postprocessing` installe, et son `lightSource` accepte un `Points`, donc
directement celui de `PiedraRingFire`.
[Documentation](https://pmndrs.github.io/postprocessing/public/docs/class/src/effects/GodRaysEffect.js~GodRaysEffect.html).
⚠️ A tester ISOLE dans son propre `EffectGroup` avant integration : c'est
exactement la lecon du crash du 01/09 documentee dans `post-fx.tsx` (un
effet qui transforme les UV ne peut pas fusionner avec une convolution).

---

# PHASE I — Deux taches nouvelles, trouvees par la recherche

## I1. Deux modeles sans ligne de credit nommee

**⚠️ CORRECTION D'UNE ERREUR DE LA RECHERCHE.** Elle annoncait « aucun
resultat » pour credits, attribution et licence dans le depot, et donc un
risque juridique ouvert. C'est FAUX, verifie : une page de credits existe
(route `credits`, `src/lib/routes.ts:13`) et elle est soignee. Elle nomme
Quaternius en CC0 pour le cerf et une partie de la flore, le Xoloitzcuintle
de Nyilonelycompany achete sur Fab.com, le ciel du Sud de Poly Haven en CC0
avec ses deux auteurs, et surtout elle attribue DEJA correctement le colibri
de Poly by Google en **CC BY 3.0**, c'est-a-dire le cas exact que la
recherche craignait de voir manquer. La discipline est donc en place ; la
recherche n'a pas su lire la structure du dictionnaire.

**Le vrai trou, beaucoup plus petit** : sur les treize fichiers de
`public/models`, deux ne sont couverts par aucune ligne nommee.
`nopal-google.glb`, dont le nom suggere l'archive Google Poly, au catalogue
en licence MIXTE CC0 / CC BY : s'il est en CC BY il faut le nommer comme le
colibri l'est deja. Et `cihuateotl.glb`, dont l'origine n'est pas ecrite.
La mention generale « une partie de la flore » couvre les fichiers
`*-quaternius.glb` mais pas ces deux-la.

**La tache** : retrouver l'origine exacte de ces deux fichiers, completer la
section « Modeles 3D » des credits en fr, en et es, et ecrire la
correspondance fichier par fichier dans `docs/credits-modeles.md` pour que
le prochain import n'ait plus a chercher.

**Oracle** : `docs/credits-modeles.md` liste les treize GLB avec origine,
licence et URL. Zero fichier sans ligne.

**Regle a poser dans la foulee** : plus aucun modele n'entre dans
`public/models` sans sa ligne de licence dans le meme commit.

## I2. Recompresser les modeles animes en meshopt

`etat-de-l-art.md` note « `stag.glb` est en meshopt, les autres non
verifies ». La recherche tranche le choix : **meshopt plutot que Draco pour
nos modeles**, parce que Draco ne compresse QUE la geometrie alors que
meshopt compresse aussi les animations et les morph targets, et decode plus
vite sur un telephone milieu de gamme, ou le decodage Draco peut se voir
comme un a-coup. Reference :
[gltf-transform, EXTMeshoptCompression](https://gltf-transform.dev/modules/extensions/classes/EXTMeshoptCompression).

**Candidats, par priorite** : `xolotl.glb` (1,9 Mo, le plus gros modele du
site) puis `xiuhcoatl.glb` (780 Ko, skinne, 22 os).

**Oracle** : poids avant / apres dans le commit, et les deux modeles
s'affichent et s'animent toujours (capture de l'Ouest et du Sud).

---

# Ce que la recherche deconseille formellement

1. **Intercepter les evenements wheel et touch** pour remplacer le scroll
   natif. Casse la navigation clavier.
   [Source](https://scrollytelling.ai/scrollytelling-design-patterns/).
2. **Le raymarching volumetrique en boite** (motif classique THREE.Fire) pour
   notre anneau de 700 particules reparties sur un large rayon : soit une
   boite immense au cout plein ecran, soit N petites boites donc N appels de
   rendu, sur un budget deja a 133-415 pour une cible mobile de 100-200.
3. **Les HDRI Poly Haven en 8 a 16K tels quels** sur un site qui n'a encore
   aucune texture compressee KTX2.
4. **Garder Draco sur les modeles animes**, cf I2.
5. **Installer une bibliotheque de shader de feu** trouvee sur npm, meme
   « juste pour regarder » : plafond d'apprentissage. Le bon geste est de
   lire son shader source, qui est public, et de transposer a la main les
   quelques lignes utiles, ce qu'on fait deja pour tout le reste.

# Une idee recue corrigee, qui debloque A4

**L'epinglage GSAP n'est PAS le scroll-jacking que les guides
d'accessibilite condamnent**, et la distinction n'est pas un detail : elle
valide directement l'extension de `face-a-face-pin.tsx` a la frappe.

Le `pin` de ScrollTrigger travaille AVEC la vraie barre de defilement du
document : il fige visuellement l'element via un espaceur, mais le scroll
natif reste maitre, donc Page suivante, Espace, les fleches et le
glisser-deposer de la barre continuent de fonctionner. Ce que les guides
visent, c'est l'interception des evenements wheel et touch pour remplacer la
navigation par une position virtuelle pilotee en JS. Notre
`face-a-face-pin.tsx` fait deja les choses correctement : il ne s'enregistre
meme pas sous `prefers-reduced-motion` et ne touche jamais aux evenements
wheel ou touch. **Consequence : on peut etendre ce motif a la frappe du Sud
sans rouvrir d'arbitrage d'accessibilite**, le travail a ete fait a la
conception du composant.

*Verifie au passage, contre l'intuition* : le Smithsonian, avec plus de 1700
scans 3D en CC0, n'a **rien d'exploitable** sur l'aztheque. Les seuls
resultats « aztec » sur `3d.si.edu` sont des maillots de baseball nommes
« Aztecas ». La vraie Piedra del Sol est au Museo Nacional de Antropologia de
Mexico, hors du programme Smithsonian, et n'a aucun scan CC0 public connu.
