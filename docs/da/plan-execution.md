# Plan d'execution scelle, 09/09/2026

Un seul plan qui reprend TOUT ce qui est decide et rien d'autre : la
reparation du serpent de feu, les trois etages du deuxieme panel, les lots
restants du premier, le lot de contenu, et les finitions reperees. Ecrit pour
etre repris par n'importe quelle session, y compris celle du foyer.

Sources : `docs/da/plan-jury.md` (premier panel, diagnostic et lots),
`docs/da/etat-de-l-art.md` (les sept constantes et le budget mesure),
`docs/da/centre-sources.md` (brief du Centre).

## AVANCEMENT — nuit du 08 au 09/09 (session autonome)

Sylvain : « on fait tout ca, ne m'attends pas, mets en place tout ce qui est
prevu, travaille toute la nuit s'il le faut ». Voici ou en est le plan.

| Tache | Etat | Commit |
| --- | --- | --- |
| A1 le serpent surgit a chaque visite | ✅ FAIT | `db48692` |
| A2 la charge part vraiment | ✅ FAIT | `632d425` |
| A3 la gerbe et la porte de chaleur | ✅ FAIT | `632d425` |
| A4 le contenu s'ecarte pendant la frappe | ✅ FAIT | `cba5d97` |
| B1 les 400 etoiles au bon moment | ✅ FAIT | `6e5d1d7` |
| B2 la sortie de scene du Centre | ✅ FAIT | `ae018f6` |
| B3 rubans des Cihuateteo groupes | ✅ FAIT, 415 -> 392 appels | `b2b1bf2` |
| B4 FrostWorld et SunBeam gates | ✅ FAIT | `b7914d4` |
| I1 credits des modeles | ✅ FAIT | `6f55b0f` |
| F3 sortie de secours sans JavaScript | ✅ FAIT | `4632cb2` |
| F1 l'arc du Sud (nuit de Coatepec -> zenith) | ✅ FAIT | `cb534f1` |
| L'horloge des gestes, generalisee | ✅ FAIT | `2cbdc16` |
| D4 l'atterrissage de l'Ouest (la danse est gardee) | ✅ FAIT | `1702e30` |
| D1 le balai de l'Est (le degel cause la repousse) | ✅ FAIT | `fb5981a` |
| D2 le 8e niveau du Nord (le reflet garde la chaleur) | ✅ FAIT | `1e510de` |
| H1 le ciel d'avant-jour de l'Est (plus de trou noir) | ✅ FAIT | `6c712f2` |
| H2 les cempasuchil du Nord portent leur lumiere | ✅ FAIT | `fb54620` |
| J1 a11y : la Contemplation ne faisait rien en mouvement reduit | ✅ FAIT | `fe1cdd3` |
| H3 le cerf du Centre redevient brun | ✅ FAIT | `0461329` |
| H4 le titre passait sous le bandeau (telephone etroit) | ✅ FAIT | `56476ff` |
| K1 le Sud passe de 1349 a 211 appels de rendu | ✅ FAIT | `010e62d` |
| K2 la Piedra rend 98 304 triangles | ✅ FAIT | `d1f0c53` |
| L1 la frappe du serpent rechoregraphiee | ✅ FAIT | `1b81dbe` |
| L2 audit des locales EN/ES | ✅ FAIT (constat) | `30bfa51` |
| L3 les dix pages etrangeres ne finissent plus en francais | ✅ FAIT | `59e51b7` |
| L4 Xolotl : l eau s eclaircit la ou il marche | ✅ FAIT | `460f124` |
| M1 le site rendait en Arial (design hors 3D) | ✅ FAIT | `548c3bc` |
| M2 RGAA 3.2 : l appel a l action passait a 1,41 | ✅ FAIT | `1155be7` |
| L5 Xolotl : l entree et la sortie cessent de basculer | ✅ FAIT | `7798dc6` |
| N1 la braise de Xolotl recompilait la scene en cours d arc | ✅ FAIT | `b9d76b1` |
| N2 le vent de la prairie : 266 -> 36 ms/s | ✅ FAIT | `df51ad4` |
| N3 Math.hypot dans les boucles interieures | ✅ FAIT | `98b285a` |
| N4 la profondeur de champ, permanente et juste | ✅ FAIT | `fb59d14` |
| N5 la colonne sur le tiers gauche, le sujet aux deux tiers (cadre decale) | ✅ FAIT | `29a05cb` |
| N6 l echelle typographique 1,333 : cinq tailles, trois interlignes, un interlettrage | ✅ FAIT | `29a05cb` |
| N7 le son : l invite au voile et les cinq elements | ✅ FAIT | `823eb67` |
| N8 le contraste : un fond qui suit la scene | ✅ FAIT | `823eb67` |
| G1 Radar signaux, quatrieme fiche (NestJS) | ✅ FAIT, relecture de Sylvain attendue | `823eb67` |
| D3 le chapitrage des pages a contenu | ✅ FAIT | `823eb67` |
| N9 axe a chaque commit, deux avis corriges (h2, landmarks), scene hors de l arbre d accessibilite | ✅ FAIT | `43d82ae` |
| N10 la densite au bureau : mesuree, reste a 2 (1,5 coute plus cher ici) | ✅ MESURE | `43d82ae` |
| N11 getParameters sur Contact : les bandelettes d amate rendues en deux passes sur les cinq pages | ✅ FAIT | `43d82ae` |
| N12 la chauffe des shaders : le voile l attend ; simulateur et miroir chauffent aussi. Contact 3 -> 0, Memoire 6 -> 0 compilations en cours d arc | ✅ FAIT | `86ae55c` |
| N13 les trois dictionnaires ne partent plus au navigateur (page d accueil en composant serveur, boussole et cloture en props) : accueil 634 -> 575 Ko compresses | ✅ FAIT | `a777e0a` |
| N14 Contact, le graphe : squelettes partages par famille (40 -> 16), fleurs des ocotillos figees (797 -> 629 matrices auto), balayages de materiaux cadences (traverse 19 ms/s -> 0) | ✅ FAIT | `b6ed417` |
| N15 l arrivee chauffee : lumieres persistantes, chauffe en tranches (chien de garde), bonne variante sous post-traitement, Nord sous garde-fou, intention ; voyages 1,8 a 2,6 s de gel -> 56 a 211 ms ; test e2e de transition | ✅ FAIT | `29468c3` |
| N16 deux tests e2e deterministes : zero programme compile en cours d arc (cinq pages), plafond d appels de rendu par page | ✅ FAIT | `programmes-tardifs.spec.ts`, `appels-de-rendu.spec.ts` |
| N17 la pause du mouvement (WCAG 2.2.2) : bouton et touche G, trois langues, test e2e | ✅ FAIT | `pause-du-mouvement.spec.ts` |
| N18 Contact, le contenu : relachements par distance, feuilles par profil, grille de vent a 30 Hz ; et le voile rendu robuste sous CPU x4 | ✅ FAIT | `6e61d58` |
| N19 les coupes son de l arrivee (C2) : cinq motifs generatifs, un par element, a la chauffe de la direction | ✅ FAIT | `lib/journey-cues.ts` |
| C1 mesure sur telephone | ⬜ **c'est a toi**, en USB | |
| I2 les modeles nettoyes et compresses (go de Sylvain sur l outil, 11/09) | ✅ FAIT | `1b37b45` |
| E1, E2 (l'arc vertical du Centre) | ✅ FAIT | `8394028` |

**Le lot H est termine, avec A, B, I1, F3, D1, D2, D4 et J1.** Tout ce qui
etait faisable sans toi est fait. Ce qui reste demande :

- **ta mesure** : C1, le telephone en USB (et E1/E2 en dependent) ;
- **une decision de mise en scene** : D3 le chapitrage du Nord, F2 l'acte de
  sortie -- les deux sur la meme question, mesuree plus bas : le Nord et le
  Sud gardent 50 % du cadre jusqu'a leur climax, l'Est et l'Ouest le
  liberent (et ce n'est pas un mecanisme, juste des pages plus courtes) ;
- **ta relecture** : G1, le contenu ;
- **ton go** : I2, un outil de build pour meshopt (plafond d'apprentissage) ;
- **ta decision d'accessibilite** : sous mouvement reduit et sans
  contemplation, la scene reste sur l'etat d'arrivee (cf J1).

### Pour la session du foyer : un avertissement d'hydratation, diagnostique

Reproduction exacte : dans une MEME session de navigateur, charger `/fr`
(rien), puis `/fr/memoire` (un avertissement React), puis `/fr/contact` (un
de plus). React nomme l'element fautif :

```
<html lang="fr"
-     data-hearth="lit"
>
```

Le HTML servi ne porte PAS `data-hearth` (verifie au curl) : c'est le script
inline du layout qui le pose avant le premier paint, comme prevu, et React
ne le trouve pas dans son propre arbre. D'ou la deuxieme visite seulement :
a la premiere, aucune visite n'est enregistree, donc ceremonie, donc pas
d'attribut, donc pas d'ecart.

C'est le motif classique du script de theme, et la correction est d'une
ligne : `suppressHydrationWarning` sur le `<html>` de
`src/app/[locale]/layout.tsx`. Il y en a deja un dans ce fichier (ligne 282,
pour les extensions de navigateur), mais pas sur `<html>`.

Je n'y touche pas : c'est votre chantier et le fichier peut etre ouvert chez
vous. Consequence reelle : un avertissement en dev, et en production React
garde l'attribut du DOM sans le reconcilier -- ce qui est le comportement
voulu ici. Rien de visible, mais ca pollue la console d'un jury qui
inspecte.

### Deux choses a relire par la session du foyer

1. **Deux tests du voile etaient DEJA rouges** avant cette nuit, verifie en
   mettant mes modifications de cote : ils visaient
   `html[data-loaded="true"] .skeleton { opacity: 0; pointer-events: none }`,
   que le chantier du foyer a remplace le 08/09 par un retrait franc. Je les
   ai reecrits sur le COMPORTEMENT (le voile ne recouvre plus rien au centre
   une fois l'arrivee jouee) plutot que sur le mecanisme. A valider.
2. **L'accueil est passe de 133 a 178 appels de rendu** depuis la mesure du
   08/09, et ce n'est pas mon fait : c'est le feu du Centre. Pour une cible
   mobile de 100 a 200, la marge a fondu. C1 devient urgent.

**La phase A est terminee.** Le geste le plus spectaculaire du Sud etait mort
de trois causes empilees, et les trois sont reparees et verrouillees par
`tests/e2e/xiuhcoatl-strike.spec.ts`.

### Ce que cette nuit a appris, et qui vaut pour tout le reste du plan

1. **Un geste narratif pilote par une difference de temps reel non bornee
   peut etre enjambe par une saccade** — et c'est au DECLENCHEMENT que la
   saccade est la plus probable, puisque c'est la que les shaders se
   compilent. Mesure : l'horloge de la scene a saute de 3,9 s en une image,
   et l'enveloppe de 3,1 s de la frappe a ete consommee d'un coup. D'ou
   `advanceStrike` : un pas borne par image, plus petit que la plus courte
   fenetre de la sequence. **`frostStep` et `solarCamera` ont la meme forme
   et meritent la meme borne.**
2. **Une branche de RATTRAPAGE ne doit jamais vivre sous les gardes du cas
   normal.** Le surgissement du serpent etait enferme derriere trois gardes
   qui sont toutes vraies exactement quand il doit s'appliquer.
3. **Trois de nos gestes jouaient devant une salle vide ou derriere un mur**,
   et aucun n'etait mal fait : la frappe derriere les cartes de projets, les
   400 etoiles pendant le fondu du voile, et la charge de 3,2 s que rien
   n'annoncait. La question « ou est l'oeil a cet instant » est aussi
   importante que la qualite de l'effet.
4. **Un oracle doit viser ce qui compte, pas ce qui est facile a lire.**
   « L'objet est dans le graphe » ne prouvait rien : le groupe du serpent est
   TOUJOURS monte, avec `visible={false}`. Et un pic de 170 ms se mesure avec
   un enregistreur de maximum, pas avec un sondage.

### Ce que la generalisation de l'horloge a appris

J'ai verifie les autres enveloppes du projet au lieu de m'arreter au symptome
de la frappe : **le gel de l'Est etait deja sauf** (`frostStep` recoit
`Math.min(delta, 1/20)`, sa plus courte fenetre fait 1,4 s), **la camera
solaire aussi** (elle est pilotee par le progres du scroll, pas par le
temps), mais **le jet des quatre cents ne l'etait pas**, et c'etait le plus
expose : il ne dure que 2,1 s et il s'arme desormais au premier scroll, donc
pile quand la saccade arrive. Il aurait pu disparaitre exactement comme la
frappe. La regle vit maintenant dans `lib/envelope-clock` avec sa mesure.

Restent non bornees, assume : les decroissances courtes du cerf a l'impact et
la bouffee de l'anneau, qui sont des scintillements et non des gestes.

### Deux corrections a mon propre diagnostic du Sud

1. **« Le ciel du Sud est plat »** : la cause principale n'est pas le
   melange du dome mais le CADRAGE. A midi, la scene ne montre que 40 pixels
   de ciel en haut du cadre, et **c'est voulu** : le rig solaire est
   coherent, nuit = camera basse et regard leve (le ciel ou nait le soleil,
   la lune, les etoiles), midi = camera haute et regard plongeant (la terre
   en pleine lumiere). Je n'ai donc pas touche au rig. Le melange, lui, est
   corrige : il ne remplace plus le degrade vertical, il s'y pose.
2. **Le correctif du melange profite surtout a l'EST**, pas au Sud : les
   nuages du haut de son ciel se lisent maintenant, avec la bande rouge de
   l'aube sous eux. C'est desormais le plus beau plan du site.

### Constat qui change l'ordre du reste : le contenu couvre la scene

En voulant affiner l'ombre du Sud au zenith (geste atteste, propose par le
panel), je me suis heurte a autre chose : **sur les pages longues, les cartes
de contenu couvrent la scene pendant presque tout l'arc**. Le Sud et le Nord
font 4 600 et 5 700 px de haut, l'arc se joue sur les 1 600 premiers, et
`.contentPage` est une colonne centree de 720 px, opaque, posee dessus. On ne
peut donc pas juger, ni affiner, un geste 3D sur ces deux pages.

C'est le meme constat que la recherche technique avait fait (reference
`iventions.com` : « un parcours guide plutot qu'une grille ») et c'est
maintenant mesure chez nous. **Tant que ce rapport contenu / scene n'est pas
traite, tout raffinement visuel sur le Sud et le Nord est invisible.** Le
mecanisme existe deja depuis la frappe (`data-strike` sur `<html>`, le
contenu s'ecarte) : il reste a decider a quels autres moments il s'applique,
et c'est une decision de conception, pas du code.

### Ce qui reste et qui demande une decision, pas du code

- **La mesure sur telephone (C1)** : elle t'appartient, en USB. La phase E,
  l'arc vertical du Centre, ne doit pas commencer avant ses chiffres, c'est
  ton arbitrage du 08/09.
- Le plafond de densite de pixels, toujours ouvert, a trancher avec C1.

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

---

# J1. Le bouton qui ne faisait rien (accessibilite)

Trouve en verifiant une hypothese fausse, ce qui vaut d'etre note : je
croyais que le mouvement reduit DESATURAIT la scene (une premiere mesure de
couleur des cempasuchil le suggerait). Mesure sur trois pages : faux, la
saturation est egale ou superieure. Mais la meme mesure a montre autre
chose -- au Sud, la clarte du cadre tombait de 30 % a 10 %.

Cause : sous mouvement reduit, `handleScroll` retournait sans rien faire.
L'arc ne progressait pas. La scene ne restait pas seulement sur la meme
image, elle restait sur le meme ETAT : au Sud, la nuit d'arrivee, quoi
qu'on scrolle, alors que toute la page raconte le soleil qui monte.

C'est un choix documente (« une scene statique lisible ») et le mode recit
accessible est l'alternative offerte, donc je n'y touche pas. Mais le site
offre AUSSI « Contemplation : la scene deroule seule », et ce bouton ne
faisait rien : 0,0 % des pixels du canvas changeaient dans les 4,5 s
suivant le clic. Trois causes empilees (frameloop « demand » sans jamais
d'invalidate, `reducedMotionRef` figeant chaque composant, l'arc qui ne
progresse pas). La regle vit maintenant dans `lib/reduced-motion` : la
preference systeme gele tout, SAUF demande explicite.

**Reste ta decision** : sous mouvement reduit et SANS contemplation, la
scene reste sur l'etat d'arrivee. Trois options : garder (le recit
accessible est l'alternative), rendre une image quand le scroll se pose
(discret, pas d'animation continue, la scene suit la lecture), ou signaler
a l'utilisateur que la scene est figee et qu'un bouton la reveille. Je n'ai
pas tranche : c'est une decision d'accessibilite sur un choix que tu as
documente.

## Deux pieges de sonde, tous deux capables de faire passer un test vide

1. **`is-bot` demonte le Canvas.** Une sonde Playwright sans UA normal
   mesure une page SANS WebGL. Ca m'a coute une fausse piste sur le ciel de
   l'Est (je cherchais pourquoi un correctif ne changeait rien, alors que
   la scene n'etait pas montee). D'ou la garde `sceneMontee` dans le spec.
2. **`test.use({ reducedMotion: "reduce" })` ne prend pas** dans ce projet :
   `matchMedia` repond faux, le frameloop reste « always ». Un test
   d'accessibilite ecrit ainsi mesure l'etat NORMAL et passe quand meme.
   Il faut `page.emulateMedia()`, avant la navigation.

Et une regle de methode : **ne jamais comparer une capture en mouvement
reduit avec une capture normale.** La premiere mesure des cempasuchil
annoncait 43 % de saturation contre 62 % en realite, uniquement pour cette
raison.

---

# Ce que le contenu couvre vraiment, mesure

Je t'avais dit que « sur les pages longues, la colonne de contenu couvre la
scene pendant presque tout l'arc ». C'etait a la fois trop large et mal
cible. Mesure (union par grille des blocs de texte visibles, cinq pages,
huit points de l'arc, `node .scratch/geo-contenu.mjs`) :

| | p 0,45 | p 0,60 | p 0,75 | p 0,90 | p 1,00 |
| --- | --- | --- | --- | --- | --- |
| Centre | 0 % | 0 % | 0 % | 0 % | 0 % |
| Est | 40 % | 26 % | 10 % | 0 % | 0 % |
| Ouest | 19 % | 4 % | 0 % | 0 % | 0 % |
| Nord | 50 % | 50 % | 50 % | 50 % | 50 % |
| Sud | 50 % | 50 % | 50 % | 50 % | 50 % |

Trois corrections a ce que j'affirmais :

- Le contenu n'ETEINT pas la scene : dans la region qu'il occupe, le cadre
  est plus clair avec lui que sans (les cartes ajoutent du texte clair sur
  un panneau translucide). Un seul bloc du Sud a un fond a 88 % d'opacite.
- La colonne du Nord est CENTREE : ce n'est pas « la scene » qui est
  couverte, c'est le CERF, tandis que la peripherie (ou vivent les
  cempasuchil, les lames, les fleches) reste libre. C'est la que porte tout
  affinage visuel sur ces deux pages.
- L'Est et l'Ouest ne « liberent » pas le cadre par un mecanisme : leurs
  pages sont simplement plus courtes que 200vh. Il n'y a rien a copier de
  chez eux ; il n'y a qu'une decision de mise en scene a prendre pour le
  Nord et le Sud, et elle est a toi (D3, F2).

---

# H3. Le cerf de jade, et la lecon sur les plafonds

Sur la page d'accueil, au climax, le cerf etait du meme vert que les
feuilles de mais, sans variation de valeur : on ne distinguait plus
l'animal du decor. L'intention contraire est ecrite depuis le 28/08 (« le
cerf reste nahual brun mystique plutot que decoration monochrome
cardinale »).

**Une heure de fausses pistes, toutes eliminees par la mesure** : la
lumiere (blanche), le brouillard (jade mais facteur 0 sur le cerf, qui est
a 4,25 unites pour un near a 10), la carte d'environnement (aucune), le
tone mapping (aucun), l'albedo (brun), le rim, les lignes d'aretes, le
halo. La methode qui a fini par trancher : exposer les uniformes du cerf
(`window.__nahualRim`, meme motif que `frostUniforms`) puis **forcer chaque
terme a zero avec un getter**, qui survit aux ecritures par image :

```js
Object.defineProperty(u.uBodyTintAmount, "value", { get: () => 0, set: () => {} });
```

C'etait la teinte de corps, a son plafond DOCUMENTE de 6 %.

## La lecon, qui vaut au-dela de ce cerf

Le screen blend depose la couleur dans les tons sombres et moyens. Sur un
cerf eclaire c'est exactement ce qu'on veut (et ce que Sylvain a demande le
25/08). Mais au Centre le cerf EST dans les tons sombres -- 16 % de
luminance -- et un screen contre une base sombre remonte le vert a 54 % :
6 % de melange ajoutent alors 22 points de vert sur 255 **sans toucher au
rouge**, puisque le jade n'a pas de rouge. Le rapport rouge/vert s'inverse.

Le calcul predit exactement la mesure : 62 attendu, 63 lu.

Donc ce n'etait JAMAIS le coefficient qui etait trop grand. Ce qui explique
l'histoire du plafond, 0,85 -> 0,7 -> 0,5 -> 0,25 -> 0,12 -> 0,06 : six
reductions successives, aucune ne touchant la cause. **Quand un reglage a
ete divise six fois sans que le defaut disparaisse, ce n'est pas le reglage,
c'est l'operation.**

Correction : on garde le depot du screen et on renormalise a la luminance
d'origine. La couleur vient, la valeur reste. Vert/rouge sur la croupe :
1,40 -> 0,96. Les quatre autres pages sont inchangees, a l'oeil comme a la
mesure.

Le plafond est desormais nomme (`BODY_TINT_CEIL`) : le fichier portait
trois valeurs contradictoires, 0,06 dans le code, 0,12 et 0,35 dans deux
commentaires.

---

# H4. Le telephone etroit, et deux trous dans l'oracle

Mesure sur un Galaxy S9+ (320 x 658), page d'accueil : la premiere ligne du
titre etait masquee par l'en-tete. On lisait « studio de creation » avec un
fantome derriere, et le bouton de menu recouvrait 918 px2 du titre.

La cause n'etait pas le rail de boutons, contrairement a ce que disait ma
note du lot H. C'est une variable qui mentait. `--header-height` vaut 81px,
la hauteur de l'en-tete a deux etages ; sous 767px le bandeau superieur et
la nav disparaissent et l'en-tete ne mesure plus que 56px. Or cette
variable sert precisement a reserver l'espace de l'en-tete « pour que le
contenu texte ne passe pas dessous ». Avec les respirations de bureau qui
s'y ajoutent, `<main>` portait **201px de marges sur un ecran de 658**, soit
30 % de la hauteur : le bloc du heros (518px) ne pouvait pas tenir dans les
457px restants, et comme il est ancre en bas, il debordait par le HAUT.
Ce qu'on perdait etait donc le titre.

**Les deux trous de l'oracle, tous deux capables de faire PASSER le test sur
un vrai defaut :**

1. Le telephone etroit n'etait pas dans les cadrages testes (Pixel 7,
   Pixel 7 couche, ordinateur). Or 60px de colonne de boutons ne changent
   pas de place quand l'ecran en perd 60.
2. Un titre de moins de douze caracteres etait exempte de l'invariant. Le
   seuil ecartait les micro-libelles, mais il exemptait « Projets » -- sept
   lettres, et le titre de la page. Un titre est du texte lisible quelle que
   soit sa longueur.

**Ce qui reste et qui t'appartient** : sur un ecran de 320px, le paragraphe
du heros fait 15 lignes et occupe presque tout l'ecran ; la scene ne se voit
quasiment plus derriere. Le bloc TIENT maintenant, mais la question de la
longueur du texte sur telephone est une decision de contenu.

---

# K1. Le Sud etait a 1550 appels de rendu, et personne ne l'avait mesure

Trouve en relevant le budget des cinq pages apres les changements de rendu
de la nuit, par simple prudence. La table du 08/09 dans
`docs/da/etat-de-l-art.md` disait « accueil 133 appels, Contact 415 » : le
Sud n'y figurait pas. Il etait a **1550 appels par image**, huit fois le
plafond d'un mobile milieu de gamme, sur la page Projets qu'un jury ouvre.

## La chaine, mesuree pas a pas

**La passe d'ombres en coutait 748 sur 1349.** Mesure obtenue en
neutralisant le `castShadow` de la directionnelle avec un getter dans la
page vivante : 1281 appels avec, 533 sans.

**Premiere hypothese, fausse, et l'image l'a dit** : couper les ombres de
la flore pour ne garder que le cerf et la Piedra faisait tomber les appels
a 603 mais changeait **62 % des pixels**, avec un ecart moyen de 38 sur
255. Les ombres de la flore SONT le « jeu d'ombres delicats » du Sud. Piste
abandonnee.

**Deuxieme hypothese, la bonne** : sur 891 maillages visibles, 842
partageaient un couple geometrie-materiau avec un autre. Et la cause tient
dans un seul fichier : **`agave.glb` porte 79 sous-maillages pour UN SEUL
materiau**, une feuille chacun, et il est clone neuf fois entre
`background-flora` (4 exemplaires) et `sud-spines` (5). 711 appels pour des
plantes qu'on peut dessiner en une.

## Ce qui a ete fait

`lib/merge-meshes` fusionne, sous une racine, les maillages qui partagent
un materiau, en cuisant les matrices des noeuds intermediaires dans les
sommets. Huit tests, dont l'invariant qui compte : la boite englobante
monde est identique avant et apres, y compris sous des parents tournes et
mis a l'echelle.

Applique sur la **source** et non sur le clone, parce que
`scene.clone(true)` PARTAGE les geometries : fusionner un clone disposerait
celles des autres. Un seul passage profite aux neuf clones.

| page | avant | apres |
| --- | --- | --- |
| Sud | 1349 | **211** |
| Ouest | 363 | **148** |
| Est (mi-arc) | 375 | **141** |
| Est (arrivee) | 169 | **91** |
| Centre | 178 | 178 |
| Nord | 160 | 160 |

Pour memoire, le lot B3 de la nuit precedente avait gagne 23 appels a
l'Ouest en groupant les papiers et les plumes. Celui-ci en gagne 215 sur la
meme page.

## La lecon de methode : mesurer l'image contre son BRUIT, pas dans l'absolu

Le vent et le mais bougent en continu. Deux captures a 1,5 s d'ecart,
**sans rien changer**, differaient deja de 24 % des pixels au Sud. Sans ce
temoin, j'aurais attribue ce bruit a la fusion et rejete un gain de 86 %.
Avec lui : ecart avant/apres 23,8 % contre un temoin a 24,0 au Sud, 1,8 %
contre 3,7 a l'Ouest. Sous le bruit dans les deux cas.

Corollaire : **il faut aussi figer ce qui n'est pas la scene.** Ma premiere
comparaison donnait 66 % d'ecart, uniquement parce que les cartes de
contenu s'etaient effacees et que l'eclairage de l'arc convergeait encore
entre les deux captures. Le protocole final masque contenu, en-tete et
rail, puis attend douze secondes.

## ⚠️ Une reserve, a regarder de ton oeil

A l'Est le monde est en verre, donc les materiaux sont translucides, et 79
feuilles triees separement ne se composent pas comme une geometrie unique.
**Au zoom 3x sur l'image d'aube, l'agave de droite montre une forme
circulaire a sa base qui n'y etait pas.** A l'echelle 1:1, sur l'image
d'ARRIVEE, je ne distingue rien, plein cadre comme au recadrage.

Le compromis me parait tenable pour 234 appels sur une page que la mesure
telephone dira tendue, et c'est reversible en supprimant la ligne
`mergeByMaterial(scene)` dans `background-flora.tsx`. Mais l'Est est ta
scene la plus forte : la decision est a toi.

## Ce que ca change pour C1

La mesure telephone devient bien plus interessante : avant, le Sud aurait
donne un resultat catastrophique qui aurait masque tout le reste. Les trois
pages lourdes que tu voulais mesurer (Contact, Memoire, Services) tiennent
maintenant sous 200 appels. Le prochain gros poste n'est plus les appels
mais les **triangles** : 316 k a l'accueil, 351 k a Contact, 374 k au Sud,
pour un repere de 200 a 300 k.

---

# K2. Les triangles, et ou s'arrete ce que je peux decider

Les appels de rendu regles, le poste suivant etait les triangles : 347 615
visibles a l'accueil pour un repere mobile de 200 a 300 k. Deux surfaces
PLATES en faisaient 47 % -- la Piedra 131 072 et le sol 32 768.

131 072 = 256 x 256 x 2. Le disque est subdivise a 256 pour qu'un
displacementMap y grave la pierre, mais ce relief ne vaut plus que 0,03
unite depuis le retour du 30/08 (« reliefs moins forts ») : ce qu'on lit de
la gravure vient de la carte de COULEUR. A 128 comme a 64 segments, l'ecart
avec 256 reste sous le bruit d'animation, sur trois cadrages dont le plus
proche de l'arc et midi au Sud. Ramene a 128 : 98 304 triangles rendus, et
le double de resolution garde pour les cadrages non testes.

## Le budget, apres K1 et K2

| page | appels avant | appels apres | triangles apres |
| --- | --- | --- | --- |
| Accueil | 178 | 178 | 249 311 |
| Memoire | 160 | 160 | 155 020 |
| Services | 375 | 141 | 253 834 |
| Projets | 1349 | 211 | 274 526 |
| Contact | 363 | 148 | 273 859 |

Les deux mesures sont desormais dans le repere mobile (100 a 200 appels,
200 a 300 k triangles) sur les cinq pages, alors que le Sud etait a huit
fois le plafond.

## ⛔ Ou s'arrete ce que je peux decider seul

Le poste dominant est maintenant l'HERBE : 120 516 triangles sur chaque
page, soit 44 a 48 % du total, pour 20 086 brins instancies en un seul
appel de rendu. Le gain est la, et il est gros -- mais la densite de
l'herbe EST la texture du site. C'est deja pour la proteger que le plafond
de densite de pixels n'a pas ete baisse le 08/09.

Donc : le prochain gain sur les triangles est une decision de DA, pas une
correction, et il attend la mesure telephone pour savoir s'il est meme
necessaire. Trois leviers possibles le jour ou tu decides : moins de brins,
un brin a moins de triangles (6 aujourd'hui), ou une densite qui decroit
avec la distance.

Meme frontiere pour les modeles : le maillage hibiscus_flower-Mesh pese 23 520
triangles a lui seul (28 exemplaires a 840 triangles), et le decimer
demanderait un outil de maillage -- meme famille que I2, meme plafond
d'apprentissage, donc ton go.

---

# Ou en est-on du site du jour, au 09/09/2026 au soir

Passe demandee par Sylvain. La reference est l'avis du 07/09, qui listait
quatre blocages dans l'ordre : perfs et mobile jamais mesures alors que
l'usabilite pese 30 %, la page d'ACCUEIL la plus faible alors que c'est
celle que le jury voit d'abord, le design hors 3D qui pese 40 % et sur
lequel on n'avait presque pas travaille, et le sound design coupe par
defaut.

## Ce qui a change, avec les chiffres

**Blocage 1, perfs et mobile : leve pour la partie mesurable.** Les appels
de rendu par image sont passes de 133-1550 a 91-216 sur les cinq pages, les
triangles de 253-394 k a 155-275 k. Les deux mesures sont desormais dans le
repere d'un mobile milieu de gamme (100-200 appels, 200-300 k triangles),
alors que la page Projets etait a huit fois le plafond sans que personne
l'ait releve. Cote mise en page : le rail de controles ne recouvre plus le
texte sur un telephone etroit (320 px), l'orientation paysage ne perd plus
un bouton hors cadre, et le titre ne passe plus sous le bandeau. **Ce qui
manque encore est ta mesure sur l'appareil reel (C1)** : les fps apres deux
ou trois minutes, quand le telephone se bride en chauffant.

**Blocage 2, la page d'accueil : entamee, pas finie.** Elle avait zero
geste ; elle a maintenant sa sortie de scene (qui n'avait jamais ete
affichee), son foyer, et son cerf a cesse d'etre une decoration monochrome
verte. Il lui manque son arc vertical -- la camera qui pique vers le zenith,
la colonne de fumee, la Voie lactee -- et cet arc est scelle derriere ta
mesure telephone.

**Blocage 3, le design hors 3D : inchange.** Aucune ligne de typographie,
de grille, de panneaux ou de transitions d'interface n'a bouge depuis le
07/09. **C'est desormais le premier poste de la note**, et de loin : 40 %
du bareme, sur lequel on n'a rien fait, quand les 30 % d'usabilite viennent
d'etre serieusement traites.

**Blocage 4, le son : inchange.** Toujours generatif et coupe par defaut.
L'ecart avec les laureats reste celui identifie le 08/09 dans
`etat-de-l-art.md` : ils en font une couche narrative, nous un habillage.
Une seule chose a bouge : l'accord cardinal sonne maintenant au climax de
l'arc et non plus seulement au clic.

## Ce qui s'est renforce sans etre au programme

L'accessibilite, qui n'est pas notee en tant que telle mais qui porte
l'usabilite : le mouvement reduit ne gele plus un bouton qui ne repond pas,
le site franchit son voile sans JavaScript, et trois invariants de
geometrie des controles sont tenus par des tests sur quatre cadrages.

Et la matiere mythologique, qui est le vrai differenciateur du site : le
balai de l'Est, le 8e niveau du Nord, l'atterrissage de l'Ouest, l'arc du
Sud, le ciel d'avant-jour, les cempasuchil qui gardent leur lumiere, et la
frappe du serpent qui plonge, rase l'anneau et repart. C'est la partie du
site qu'aucun concurrent ne peut copier, parce qu'elle demande de LIRE des
sources.

## Un defaut neuf, trouve ce soir, et qui coute cher pour son prix

**Les dix pages etrangeres affichent la sortie de scene en francais.** Un
jury Awwwards est international et ouvrira le site en anglais : la derniere
chose qu'il lit sur chaque page est « Le nombril du monde. D'ou partent les
chemins. » ou « Retour au Centre ». Mesure sur les dix URL : `lang` correct,
titres traduits, mais une a deux fuites de francais par page, toutes venant
de la table `CLOSURES` de `page-closure.tsx`, restee monolingue alors que le
composant recoit deja la locale.

**Et l'espagnol manque 18 chaines**, qui ne sont pas des miettes : les trois
derniers blocs de recit de CHACUNE des trois etudes de cas. En espagnol,
chaque projet s'arrete au premier paragraphe une fois l'etude ouverte.

C'est le meilleur rapport effort/note du moment : quinze lignes de table et
dix-huit chaines, contre une credibilite entamee sur la langue meme du jury.

## Mon estimation, revue

Site du jour : atteignable, et l'obstacle n'est plus technique. Il reste
trois choses, dans cet ordre de levier -- le design hors 3D (40 % de la
note, rien de fait), la traduction (peu cher, tres visible), l'arc du
Centre (bloque sur ta mesure). Le son vient apres : il pese dans la
comparaison avec les laureats, pas dans le bareme.

Site du mois : possible ensuite. SOTY : toujours un autre ordre, celui des
productions de studio, et rien de ce soir ne change ce jugement.

---

# L. Les deux gestes retouches sur retour, et la traduction

## L1. Le serpent

Trois retours de Sylvain (« trop court », « encore trop rigide », « il
devrait presque se poser au sol »), une seule cause trouvee au film image
par image : une Bezier quadratique parcourue uniformement en parametre,
donc le contact tombait a la vitesse MAXIMALE. `lib/strike-path` porte
maintenant plongee / rasement au sol / remontee, onze tests, raccords
Hermite a vitesses appariees.

Ce que je n ai PAS fait, et qui reste a lui : allonger le corps. La seule
longueur disponible passe par l echelle, qui l epaissit d autant, et c est
deja son epaisseur qui le fait lire comme un tube segmente. Ce qui lui
manque est de l articulation, pas de la taille.

## L4. Xolotl

Meme methode : filmer d abord. Il marche sur le FOND du bassin, racine a
y = 0 sur dix-sept images, alors que l eau est a 0,25 ; la nappe etant un
miroir opaque, ce qui traversait etait un torse aux pattes coupees. Trois
options mesurees et portees a l arbitrage de Sylvain ; il a choisi la plus
juste physiquement, une fenetre claire dans l eau autour de lui.

Le detail qui fait la difference entre corriger et deplacer le probleme :
ne baisser QUE le terme de base de l alpha. Le fresnel, le speculaire et la
pente portent le sillage, et les effacer aurait echange des pattes
invisibles contre des pattes visibles dans une eau morte.

## L3. La traduction, et le garde-fou

Les quinze lignes de sortie de scene sont parties dans les dictionnaires
(elles vivaient dans le composant, en francais seulement, alors qu il
recoit deja la locale), et les dix-huit chaines espagnoles manquantes des
etudes de cas sont ecrites. Vocabulaire aligne sur ce que les
dictionnaires disaient DEJA, pas invente a cote.

`lib/i18n-parity.test.ts` compare les trois dictionnaires cle par cle,
index de tableau compris : c est exactement la granularite ou le trou se
cachait, un tableau plus court se rendant simplement plus court sans
qu aucune erreur ne le dise.

**CORRECTION du 09/09 au soir, mon erreur** : j avais annonce que
`shortcuts-toggle.tsx` et `easter-egg.tsx` portaient encore du francais en
dur, et qu il y avait la un point RGAA. **C est faux.** Les deux fichiers
ont leurs tables par locale, completes en fr/en/es. J avais lu un grep sans
verifier la structure : le francais est bien DANS le fichier, mais dans une
table indexee par langue.

Audit refait proprement, sur les VINGT-DEUX pages etrangeres (11 routes x
en/es, le codex et les cinq pages legales incluses, qui manquaient a ma
premiere passe) et sur le texte REELLEMENT rendu : **zero fuite de
francais**.

Une lecon de sonde de plus, de la meme famille que les autres : mon
detecteur a d abord signale neuf pages, toutes a tort. En JavaScript, ``
traite les lettres accentuees comme des NON-lettres, donc `est` matche
« Está » et « estándar ». **Un oracle se valide avant d etre cru**, y
compris quand il dit ce qu on attendait.

## Sur une locale NAHUATL, question de Sylvain

Mon avis : non, et pas par manque d ambition.

Le site PORTE deja le nahuatl, et c est sa force : teyolia, tonalli,
Tlalxicco, Mictlampa, xiuhcoatl, cempoalxochitl. Chaque terme est sourcé
dans le Codex. Une locale entiere est autre chose : 411 chaines
d interface.

Et la question « quel nahuatl » n a pas de reponse simple. Le nahuatl
classique du XVIe siecle, celui des codex, n a pas de mot pour
« portfolio », « faire defiler » ou « raccourcis clavier ». Les variantes
modernes (Huasteca, Centre, Guerrero) diffèrent notablement et chacune a
son orthographe. Choisir est une decision linguistique et politique, pas
graphique.

Surtout : ni lui ni moi ne pourrions le RELIRE. Or toute la credibilite du
site tient a la distinction entre atteste et notre licence. Mettre au coeur
de l interface du texte qu on ne peut pas verifier attaque exactement ce
qui le rend solide.

Ce qui serait defendable et peu cher : approfondir le nahuatl SOURCE la ou
il vit deja. Un difrasismo en epigraphe avec sa source, par exemple, ou le
nom nahuatl de chaque geste. La presence culturelle sans la revendication
d une traduction.

---

# M1. Le site rendait en Arial, et l'echelle typographique n'en est pas une

Premiere entree dans le poste qui pese le plus et qu'on n'avait pas touche :
le design hors 3D, 40 % du bareme. J'y suis entre par ce qui se mesure --
l'echelle typographique reelle, relevee sur le texte rendu de onze pages --
et la premiere mesure a suffi.

## Le defaut, corrige

**920 elements de texte sur 931 rendaient en ARIAL.** `globals.css` posait
`html, body { font-family: var(--font-geist) }` ligne 123, puis, dix-sept
lignes plus bas, un bloc `body` avec `font-family: Arial, Helvetica,
sans-serif` -- exactement ce que genere `create-next-app`. A specificite
egale, la derniere gagne.

Le site telechargeait donc `GeistVF.woff`, la police se chargeait
correctement (verifie dans le navigateur : `geistSans 100 900 loaded`,
`document.fonts.check` a vrai), `html` la rendait, et `body` l'ecrasait --
donc tout ce qui herite de body. **Un reliquat de gabarit ecrasait la
typographie du site.**

Second defaut du meme releve : les CONTROLES n'heritent pas de la police.
Les navigateurs donnent aux boutons, champs et listes leur propre famille
systeme ; la page d'accueil comptait 16 boutons, 1 champ et 15 spans
internes en Arial pendant que le reste passait en Geist. On herite la
FAMILLE seulement, pas `font` entier : les tailles de nos boutons viennent
de leurs modules et `font: inherit` les ecraserait.

Verifie apres correction : 0 element hors Geist, et les retours a la ligne
du codex sont identiques avant/apres, donc aucun reflux malgre le
changement de metriques.

## Les deux decisions qui restent, mesurees et NON tranchees

**Treize tailles de police distinctes**, dont neuf entassees entre 11,2 et
18,4 px :

```
11,2  11,5 (x1,03)  12,8 (x1,11)  13,6 (x1,06)  14,4 (x1,06)
15,2 (x1,06)  15,7 (x1,03)  16 (x1,02)  17,6 (x1,10)  18,4 (x1,05)
28,8 (x1,57)  32 (x1,11)  38,4 (x1,20)
```

15,2 / 15,7 / 16 px coexistent a moins d'un pixel d'ecart : aucun oeil ne
les distingue, mais elles multiplient le CSS et interdisent tout rythme.
Puis un saut de x1,57 vers 28,8. **Ce n'est pas une echelle, c'est un tas.**
Une echelle a un rapport constant (1,25 tierce majeure, 1,333 quarte) ; la
meme hierarchie tiendrait en cinq ou six tailles.

**480 elements sans interlignage explicite**, donc au 1,2 du navigateur,
trop serre pour du texte de lecture.

Les deux sont des decisions de systeme graphique, pas des defauts : elles
changent le rythme de toutes les pages. C'est le premier chantier a ouvrir
sur les 40 %, et il appartient a Sylvain.

## Autre chiffre du meme releve, pour memoire

Trois graisses (400, 600, 700), ce qui est sain. Onze valeurs
d'interlettrage, mais toutes calculees depuis des `em` a des tailles
differentes : normal, pas un defaut.

---

# M2. Le contraste reel, mesure sur les pixels du fond

Suite de l'entree dans les 40 %. Le fond de ce site est une scene 3D
animee : le rapport de contraste d'un paragraphe depend donc de ce qui
passe derriere lui, et **aucun audit statique ne peut le dire**. Il fallait
mesurer les pixels.

Methode : une capture avec le texte, une avec les GLYPHES rendus
transparents (la boite et son fond propre restent en place), puis le
rapport pixel par pixel, l'opacite du texte composee avec le fond. 215
blocs sur six pages, a deux moments de l'arc, seuils RGAA 3.2 (4,5:1
courant, 3:1 texte large).

## Corrige : l'appel a l'action etait a 1,41:1

Sur 100 % de sa surface, la ou il faut 4,5. « Discutons de votre projet » a
mi-arc de la page Services, en creme sur le monde de glace presque blanc,
avec pour tout fond un filet de 1 px. Juste sous la carte intitulee « Audit
accessibilite RGAA ».

Son etat SURVOLE etait deja lisible : le defaut ne tenait qu'au repos. Fond
pose, meme matiere que les cartes. Mediane 2,01 -> 7,81, part sous le seuil
100 % -> 8,8 %.

## Reste SIX blocs, et ils ne font qu'UNE decision

| page | bloc | part sous 4,5:1 | mediane |
| --- | --- | --- | --- |
| Services @0,45 | paragraphe « Specialisation en cours de certification » | 78 % | 3,56 |
| Projets @0,45 | paragraphe « Trois projets recents » | 72 % | 3,22 |
| Services @0,45 | paragraphe « Audit de conformite RGAA/WCAG » | 50 % | 4,49 |
| Codex @0,45 | Tonatiuh | 39 % | 4,70 |
| Codex @0,45 | Huitzilopochtli | 27 % | 5,02 |
| Codex @0,45 | Xiuhtecuhtli, Mictlantecuhtli | 24 % / 20 % | 5,09 / 5,58 |

Verifie, et ce n'est pas ce que je croyais : derriere les noms du codex le
fond n'est PAS la scene claire, il est sombre (mediane 25 a 40 sur 255).
Ce qui les fait tomber, ce sont les zones les plus CLAIRES de leur propre
panneau, jusqu'a 76, ou un vert de luminance moyenne perd sa marge.

Donc les six cas ont la meme racine : **les panneaux translucides laissent
passer assez de scene pour que le texte perde son contraste quand la scene
s'eclaircit.** Le panneau des cartes vaut 0,32 a 0,38 d'opacite, valeur
choisie apres ton retour « trop lourds avec le contour marque » du 27/08.
Je n'y touche donc pas : c'est une decision de DA, et c'est la tienne.

Trois voies, dans l'ordre ou je les recommanderais :

1. **Un fond qui suit la scene.** Une variable CSS portant la luminosite de
   la scene, ecrite par le rig (il connait deja le jour de l'arc), et les
   panneaux se densifient quand le monde s'eclaircit. C'est la seule voie
   qui respecte a la fois le « trop lourds » de la nuit et le seuil de midi,
   et elle est dans l'esprit du site, ou tout suit l'arc.
2. **Monter l'opacite des panneaux** de 0,32 a 0,55 environ. Une ligne, mais
   elle alourdit les scenes sombres, exactement ce que tu avais refuse.
3. **Ne rien changer et l'assumer** : trois paragraphes et quatre noms sur
   215 blocs, sur les seules pages claires, a mi-arc. Defendable comme
   derogation documentee, mais c'est un critere de niveau A du RGAA, et ton
   examen est le 23/10.

## Trois corrections de mon propre oracle, chacune changeant le resultat

C'est la lecon du jour, et elle vaut plus que le correctif.

1. Il comptait le texte DECORATIF. Le reflet en miroir des cartes du Nord
   est `aria-hidden="true"` : hors critere. Trois faux positifs a 100 %
   sous le seuil.
2. Il masquait les blocs en `visibility: hidden` pour lire le fond, ce qui
   retire AUSSI leur fond propre. Un bouton a fond translucide etait donc
   mesure contre la scene nue, et l'oracle ne pouvait pas voir sa propre
   correction. Corrige en rendant les glyphes transparents.
3. Il classait par 5e centile. Un p05 de 1,18 avec une mediane a 16 ne
   signale que les coins arrondis d'un fond propre. Ce qui dit la
   lisibilite est la PART de surface sous le seuil.

**Un oracle se valide avant d'etre cru, y compris quand il dit ce qu'on
attendait.** Sans ces trois corrections, ce rapport annoncait 21 echecs
dont trois inventes, et ratait le seul vrai.

---

# Point SOTY, mise a jour de fin de session (09/09, nuit)

Le point precedent, ecrit quelques heures plus tot dans ce meme document,
listait quatre blocages : perfs et mobile jamais mesures, accueil la plus
faible, design hors 3D intact et premier poste de la note, son coupe.

**Ce qui a bouge depuis ce point-la :**

Le design hors 3D n'est plus « intact ». Il n'est pas travaille pour
autant, mais deux DEFAUTS y ont ete trouves et corriges, et ce sont deux
choses qu'un jury aurait vues avant tout le reste :

- le site rendait en **Arial** sur 920 elements de texte sur 931, un
  reliquat de `create-next-app` ecrasant la police variable qu'il
  telecharge deja ;
- un appel a l'action etait a **1,41:1** de contraste sur 100 % de sa
  surface, la ou RGAA 3.2 demande 4,5.

La credibilite internationale est reglee : les dix pages etrangeres ne
finissent plus en francais, et les trois etudes de cas espagnoles ne
s'arretent plus au premier paragraphe.

Et les deux gestes que Sylvain avait nommes sont corriges avec leurs
mesures : le serpent plonge, rase l'anneau au sol et repart ; Xolotl cesse
de basculer de 30 degres en deux dixiemes de seconde en entrant dans le
bassin.

## Ce qui garde le site du jour hors de portee, aujourd'hui

**Plus rien de technique.** C'est le changement de la journee. Les appels de
rendu et les triangles sont dans le repere mobile sur les cinq pages, le
mobile etroit et le paysage sont tenus par des tests, l'accessibilite a
gagne trois corrections reelles.

Ce qui reste tient en QUATRE decisions, et les quatre sont a Sylvain :

1. **L'echelle typographique.** Treize tailles dont neuf a moins de 11 %
   d'ecart, et 480 elements sans interlignage explicite. C'est la moitie
   visible des 40 % du bareme, et il faut choisir un rapport.
2. **Le fond du texte sur la scene.** Six blocs sous le seuil de contraste
   quand le monde s'eclaircit, parce que les panneaux a 0,32 laissent
   passer la scene. Trois voies proposees en M2.
3. **Le son.** Toujours generatif et coupe par defaut, toujours le plus
   gros ecart avec les laureats.
4. **La mesure telephone (C1)**, qui debloque l'arc vertical du Centre.

## Estimation

Site du jour : atteignable, et desormais sans obstacle technique. Le chemin
critique passe par la typographie et par la mesure telephone.

Site du mois : possible ensuite, si le son devient une couche narrative.

SOTY : toujours un autre ordre, celui des productions de studio. Rien de
cette session ne change ce jugement, et le dire autrement serait mentir.
