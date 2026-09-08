# Plan des huit lots, 08/09/2026

Issu d'un panel de quatre analyses independantes du 08/09 au soir, trois
experts et un dissident mandate, sur la base de douze captures de la
PRODUCTION, cinq pages a l'arrivee et en fin de scroll, deux vues mobiles
Pixel 7 et deux zooms a 1:1. Complete `docs/da/etat-de-l-art.md`, qui reste la
base sur ce que font les laureats.

Objectif visé : une mention Awwwards, site du jour, un soir de decembre 2026.
Ponderation du jury : design 40, usabilite 30, creativite 20, contenu 10.

## Notes par scene, du point de vue d'un jury

| Scene | Note | Ce qui la tient | Ce qui la coule |
| --- | --- | --- | --- |
| Est / Services | 8 | Monde de verre gele, aube doree, seule vraie dramaturgie | Frangeage colore, semis de points sur la glace |
| Nord / Memoire | 7 | Disque grave lisible, grotte, nappe d'eau, cempasuchil, Xolotl | Page la plus longue, donc arc dilue |
| Ouest / Contact | 6,5 | La meilleure ARRIVEE du site | Pas d'acte de sortie, cf lot 5 |
| Sud / Projets | 5 | La Piedra qui s'allume en turquoise a mi-parcours | Arrivee sous le neutre, ciel plat, signes propres invisibles |
| Centre / Accueil | 3 | Le texte et la promesse | Presque noir, aucune identite. Chantier du foyer en cours |

## TROIS CORRECTIONS a mon propre diagnostic, verifiees

1. **Le pied de page ne mange rien.** Il est en `position: relative`, en flux
   normal. Le vrai defaut est ailleurs : l'arc se termine a DEUX ecrans de
   scroll (`ARC_SCROLL_VIEWPORTS = 2`, `scene-refs-context.tsx:32`) alors que
   le conteneur en fait trois (`min-height: 300vh`,
   `scene-stage.module.css:21`), plus 80vh de marge (`globals.css:785`, pose
   le 28/08 sur retour de Sylvain). Soit **180vh de scroll mort**, ou la
   camera est figee sur son dernier cadrage. Capture de l'Ouest a la fin
   REELLE de l'arc : composition pleine, intacte, cerf et quatre porteuses
   dans le cadre. Il ne manque pas de la place, il manque une SORTIE.
2. **Le ciel du Sud existe.** Dome plus photo de nuages reels,
   `public/sky/sud-sky.jpg`, servie en production, 200, 122 Ko, verifie au
   curl. Au contraste force les nuages sont la mais illisibles. Deux causes
   nommees : a `uDay` plein le melange REMPLACE le degrade du zenith par la
   seule photo teintee (`sud-sky.tsx:118`), et la bande d'horizon `uDusk`
   n'est cablee que pour cendre et dore (`sud-sky.tsx:213`). Dosage et
   cablage, pas une scene non concue.
3. **Sans JavaScript, le site n'est pas noir.** Teste en production, JS
   coupe : 98 Ko de HTML servi, le voile s'affiche avec la Piedra et le nom
   de la fleur, et tout le texte du site est dans le DOM. Mais on ne franchit
   JAMAIS le voile, `data-loaded` etant pose par le client, et il n'existe
   aucun `<noscript>` dans `src/`.

## Les huit lots

| Lot | Contenu | Cout | Collision |
| --- | --- | --- | --- |
| 0 | Supprimer les six `.glb.bak` suivis dans `public/models` : 2,6 Mo deployes et servis pour rien, dont `stag.uncompressed.glb.bak` a 1 Mo | 20 min | aucune |
| 1 | Post-traitement, cf ci-dessous | 1 soiree | aucune |
| 2 | Le couloir mobile, cf ci-dessous | 1 soiree | aucune |
| 3 | `AUDIT-COMPLET.md` et `AUDIT-EXHAUSTIF.md` ne s'accordent pas sur ce que couvrent les criteres 10.11 et 13.9, orientation et reflow inverses dans l'un des deux. A corriger avant l'examen du 23/10 | 30 min | aucune |
| 4 | Le Sud, cf ci-dessous | 1 a 2 soirees | aucune |
| 5 | L'acte de sortie sur les 180vh morts | 1 a 2 soirees | OUI |
| 6 | Le son : les cloches par direction existent (`CHIME_FREQ`, `sound-design.tsx:29-34`) mais ne jouent qu'au clic. Les brancher sur le signal de scroll deja calcule (`getNavEmphasis`, celui que recoit deja `PageClosure`) | 1 soiree | aucune |
| 7 | `<noscript>` utile, et sortie de secours du voile si le client ne repond pas | 1 soiree | OUI |

### Lot 1, le post-traitement, deux experts convergent sans s'etre vus

- **L'aberration chromatique est uniforme sur tout l'ecran**, centre compris :
  `<ChromaticAberration offset={[CA_BASE, CA_BASE]} />` (`post-fx.tsx:181`) ne
  passe pas `radialModulation`, dont la valeur par defaut est `false` dans
  `postprocessing@6.39.4`. Le decalage R/B est donc constant partout. Ce n'est
  pas un objectif, c'est un defaut. Correctif : `radialModulation` plus
  `modulationOffset={0.5}`, deux proprietes, zero dependance, cout GPU nul.
  Le tiers central redevient propre, l'effet se concentre en peripherie.
- **La paillette de givre alias** : `pow(frostNoise(vFrostW * 70.0), 16.0) *
  2.0` (`frost-store.ts:116`) travaille au-dela de Nyquist, sans `fwidth` ni
  mise a l'echelle par la distance. Effet VOULU, implementation non filtree.
  Piste : frequence 70 vers 25, exposant 16 vers 7, retirer le facteur 2.
- **Le plafond de densite de pixels est le poste de cout dominant**, pas un
  effet en particulier : `DESKTOP_DPR_CAP = 2` (`mobile-perf.ts:18`) multiplie
  le shading de chaque pixel ET chaque passe de post-traitement. Passer a
  1,5, valeur que le meme fichier juge deja nette a l'oeil cote mobile, retire
  environ 44 % de charge sans enlever un objet de l'ecran. Une ligne.
- Ne PAS couper le multisampling pour gagner en perf : c'est lui qui limite
  deja l'aliasing geometrique de l'herbe.
- Note annexe : `focalLength={0.06}` sur `<DepthOfField>` (`post-fx.tsx:171`)
  est deprecie et ne signifie plus ce que le commentaire affirme.

### Lot 2, le couloir mobile

- **La vraie cause n'est ni le z-index ni le `position: fixed`** : c'est
  `scene-text-overlay.module.css:13`, `padding: 0 6vw ...`, qui n'a jamais
  connu l'existence de la colonne de boutons. Sur un Pixel 7, 412 px de
  large, 6vw vaut 25 px alors que la colonne va jusqu'a x = 64 px. Le texte
  commence donc SOUS les boutons.
- **La colonne fait 428 px de haut sur mobile**, soit 51 % d'un ecran de
  839 px : sept boutons dans `scene-controls.tsx` plus le bouton son, qui vit
  dans un autre fichier et s'aligne par un nombre magique. Ils GROSSISSENT
  sous 767 px, 48 px au lieu de 44, geste de visibilite du 28/08 dont
  l'effet de bord n'avait pas ete vu.
- **Collision non reperee jusqu'ici** : le bouton mode recit et le bouton son
  se chevauchent sur environ 36 x 33 px, et c'est le bouton du MODE
  D'ACCESSIBILITE qui passe dessous. Sur le site d'un futur auditeur RGAA.
- Criteres RGAA en jeu : **10.7** focus visible, le plus litteral, un lien du
  bloc de texte peut recevoir un anneau de focus recouvert ; et **10.11**
  reflow, retenu par consequence plutot que par correspondance exacte, alors
  que l'audit maison le donne attendu conforme sur la seule presence de media
  queries.
- Refuse : mesurer la colonne en direct au `ResizeObserver`. Le depot n'a que
  le motif mesure une fois puis fige en CSS, cf `--header-height`.

### Lot 4, le Sud, ARBITRAGE RENDU par Sylvain le 08/09

**Decision : la nuit de Coatepec PUIS midi.** On garde le depart nocturne
comme intention narrative, et on ecrit un vrai arc qui monte vers midi. Ce
n'est donc pas un simple reglage de rig, c'est un arc a ecrire pour turquoise,
sur le modele de `remapWestArc` dans `arc-day.ts`, plus le cablage de `uDusk`
pour turquoise, plus l'arret de l'effacement du degrade du zenith. Le rig de
nuit du Sud est aujourd'hui SOUS le neutre a l'arrivee (`ambientScale: 0.9`,
`directionalScale: 0.85`, `direction-light.ts:59`) alors que le meme fichier
documente le Sud comme la page la plus lumineuse du site : l'arc doit partir
de la nuit assumee, pas d'un neutre affaibli.

Deux precisions du panel a garder en tete : les colibris minuscules et hauts
sont un choix assume et itere par Sylvain (`BASE_SCALE = 0.06`), et le serpent
de feu n'est pas casse, il est statistiquement absent, `PRESENCE_PROBABILITY`
= 1/3 une fois par visite. Trois mecanismes, un seul symptome : le signe ne
porte pas pour un testeur qui ne fait qu'un passage.

### Lot 5, l'acte de sortie, ARBITRAGE RENDU par Sylvain le 08/09

**Decision : les deux.** Raccourcir le flow pour se rapprocher de la longueur
reelle de l'arc, ET ecrire un vrai acte de sortie sur la fenetre restante :
dernier mouvement de camera, resserrement de cadre, fondu. Attention, la
marge de 80vh a ete demandee par Sylvain le 28/08 pour garder le cerf visible
en pose de climax : on reduit, on ne supprime pas.

**Coordination necessaire avec le chantier du foyer.** Ce lot touche
`reveal-arc`, `SceneStage`, `globals.css` et `layout.tsx`, que la session du
foyer modifie. Et surtout : le Centre prevoit un climax au ZENITH en fin de
page. S'il le construit sur la mecanique actuelle, la page la plus jugee du
site herite du defaut de l'Ouest, en pire. **L'acte de sortie doit passer
AVANT le climax zenithal du Centre, ou etre concu avec lui.**

## Calendrier, ARBITRAGE RENDU par Sylvain le 08/09

**Decision : on continue le plan complet**, sans gel avant le 23/10. Le
dissident defendait zero soiree de direction artistique avant l'examen ;
Sylvain a tranche l'inverse en connaissance de cause.

## La dissidence, gardee au dossier

- Aucun des trois projets du portfolio ne montre NestJS ni PostgreSQL
  (`src/dictionaries/fr.json`), alors que c'est le differenciateur de marche
  que Sylvain se donne comme priorite. Un recruteur pese le contenu a 100 %,
  ce jury a 10 %. A traiter comme un lot de CONTENU, distinct de ces huit.
- Le lot 5 touche des fichiers qu'une autre session committe le soir meme,
  trois commits en treize minutes. Le risque de casse est reel et l'ordre des
  lots ci-dessus le contourne : 0, 1, 2, 3, 6 n'ont aucune collision.
- Ce que le dissident concede : le bloc lecteur d'ecran permanent de la home,
  le plancher de la revelation au curseur pour le visiteur qui ne bouge pas la
  souris, et l'honnetete du texte, qui assume que la certification n'est pas
  encore obtenue.
