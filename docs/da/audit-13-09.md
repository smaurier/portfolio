# Audit du 13/09/2026 : le site, critere par critere

Demande de Sylvain : « Peux-tu faire un audit serieux de la cinematographie,
des transitions, de la perf, de la cosmogonie, de l'execution [...] en
utilisant egalement Playwright, des captures video aussi, test de perf,
accessibilite etc. Traitement du son. Avant l'audit tu chercheras si j'ai
oublie des criteres d'etudes. Apres l'audit, tu feras un etat de l'art pour
les criteres pertinents et tu chercheras des solutions adequates. »

Tout ce qui suit est mesure sur la PRODUCTION du jour (`next build` du
13/09, `next start` sur le port 3100 ; un serveur de production d'une
session precedente tournait encore sur ce port avec un vieux build, il a ete
tue avant toute mesure), agent Chrome reel, bureau 1440x800 et Pixel 7
emule. Sondes et pieces dans `.scratch/audit/` : 40 captures bureau (cinq
pages, six points de l'arc), 10 captures Pixel 7, la video du voyage
complet (`video/*.webm`, 11 Mo), la video et 60 images de l'entree de
Xolotl (`video-xolotl/`, `xolotl/`), les pieds des danseuses en plein cadre
et en zoom 2x (`danseuses-*.png`), les etats degrades (`etat-*.png`), la
verification a densite 2 (`dpr-*.png`). Les notes suivent l'echelle du
depot : 8 = site du jour, 6,5 = mention honorable (seuils Awwwards, sources
en fin de document).

## 0. La note, et ce qui la fait bouger

**8,1 sur 10** (le tableau de bord disait 8,85 le 12/09 ; il ne savait pas
ce que cet audit a trouve). Par axe du jury : design 8,5 (l'Est et le Nord
sont des images de site du jour, le Centre et le Sud non), utilisabilite 7,0
(deux pages a 30 images par seconde sur telephone, et trois defauts de
mise en page qui cachent du texte ou le recouvrent), creativite 9,0,
contenu 8,0. Pondere 40/30/20/10 : 8,1.

Ce qui fait tomber la note, par ordre de gravite, tout mesure :

| # | defaut | ou | preuve |
| --- | --- | --- | --- |
| P0 | **Le calque de texte des pages n'est pas fixe** : il est ancre au premier ecran et defile hors champ. Sur ordinateur, les chapitres 2 a 4 de l'accueil (« Un silence », « Quatre directions », « L'Ollin ») et LA CLOTURE DES QUATRE PAGES ECHO (le lien vers la direction suivante) ne sont JAMAIS visibles. C'est vrai aussi sur nahual.fr en ligne : le defaut date du passage au canvas fixe (25/08), pas de cette semaine | `scene-text-overlay.module.css` (`position: absolute; inset: 0`, aucun ancetre positionne) | sonde `overlay-home.mjs` : chapitre « Quatre directions » a opacite 1 et y = -941 px ; cloture de Services a y = -1487 px a 75 % de l'arc |
| P0 | **La ligne de seuil est recouverte par le bouton du mode recit** sur les quatre pages echo (et par la boussole sur telephone) | `.seuilTete` posee au bas du premier ecran (main a 90vh de marge haute), x = 96 px | sonde `cloture-seuil.mjs` : chevauchement avec « Activer le mode recit accessible » sur services, projets, contact, memoire ; captures `*-bureau-0.png`, `*-pixel7-0.png` |
| P0 | **Sur telephone, des textes passent sous la colonne de boutons** : le bloc du chant (regression du 11/09, centre sous 720 px au lieu du couloir de 72 px) et les legendes en miroir des cartes de Memoire (« Vingt fleurs », « Celui par qui nous vivons ») | `.cantarFlow`, `.cantar`, cartes du cimetiere | e2e `controls-overlap` : 2 echecs (Pixel 7, telephone etroit : « Photo de la scene » recouvre 47 px2 de la legende) ; captures `fr-projets-pixel7-75.png`, `fr-memoire-pixel7-75.png` pour le chant |
| P1 | **La barre du metier n'est pas tenue sur trois pages** : Contact 30 im/s en mediane, Projets et Memoire 30 au 5e centile, sous CPU x4 + Fast 3G ; blocage total (TBT) de 1,5 a 3,5 s | Contact, Projets, Memoire | `vitals.mjs`, tableau en 3 |
| P1 | **La cloture du Centre passe sous le pied de page** des 85 % : un jure qui va au bout voit le panneau coupe | `.closureSlot` fixe, pied de page au-dessus | `cloture-seuil.mjs` : sousPied = true de 85 a 100 % ; `fr-bureau-92.png` |
| P1 | **Sur telephone, la colonne de boutons recouvre la cloture et le pied de page** | Pixel 7 a 75 % et 100 % | `fr-pixel7-75.png` |
| P1 | **L'image fixe du Centre est noire** : le cerf est un fantome dans le noir, le premier geste d'un jure (capturer le hero) donne du texte sur du noir | Centre 0 % | `fr-bureau-0.png`, `fr-pixel7-0.png` |
| P2 | Le ciel du Sud est un aplat cyan sur des montagnes grises (deja note le 08/09, lot 4, pas traite) | Sud 25 a 100 % | `fr-projets-bureau-50.png` |
| P2 | « Tu reviens au foyer » s'affiche a la PREMIERE visite, alors qu'on n'est jamais venu | Centre 0 % | `fr-bureau-0.png` |
| P2 | Ce qu'il y a aux pieds des danseuses (papiers, braises, papillons) fait 2 a 4 px et elles restent a 30 cm du sol ; la camera ne s'approche jamais du carrefour | Ouest 75 a 100 % | `danseuses-90-zoom.png` |
| P2 | Le chien : l'entree dans l'eau est correcte a cette distance (marche sur la margelle, descente, eclaboussure) ; ce qui reste visible est le tangage bride et les pattes qui ne se posent pas exactement sur la pierre | Nord | `xolotl/x-13..x-17`, `video-xolotl` |
| P2 | Le chemin de cempasuchil se vide en 30 s au repos : les fleurs derivent hors du bassin et ne reviennent pas | Nord, au repos | `xolotl/x-18` contre `x-46` |

## 1. La grille : ce que tu as liste, et ce qui manquait

Ta liste : cinematographie, transitions, performance, cosmogonie,
execution, accessibilite, son. Le jury Awwwards pese design 40, utilisabilite
30, creativite 20, contenu 10 ; ses membres regardent d'abord une capture
FIXE du hero sans mouvement, puis le site sous CPU x4 + Fast 3G, puis les
transitions, puis `prefers-reduced-motion` (Hon Tran, juge, 2026). Ce que ta
liste ne nommait pas, et que le jury note :

| critere oublie | pourquoi il compte | ou il est traite ici |
| --- | --- | --- |
| **L'image fixe** (le hero sans mouvement) | premier geste d'un juge : il capture le hero et juge la composition, la typo, la couleur sans l'animation | 2 |
| **Typographie et grille** hors 3D | design 40 : « echelle coherente, rythme, hierarchie a chaque point de rupture » ; c'est la moitie de la note qu'on ne travaille pas | 2 et 6 |
| **Orientation en 3 secondes** | utilisabilite : « un visiteur qui arrive doit savoir ou il est et quoi faire en moins de 3 s » | 2 |
| **Le mobile reel** (pas seulement la perf) | « une experience mobile faible plafonne la note » ; le mobile est juge sur un vrai appareil | 3 et 6 |
| **Le premier chargement en octets** (pas seulement en secondes) | un juge ouvre sur un portable, souvent en 4G ; le poids conditionne l'arrivee | 3 |
| **Reactivite aux entrees** (INP, clic, molette) | « input responsiveness » est cite avec la fluidite | 3 |
| **Memoire et duree** (fuite, chauffe) | un juge reste 2 a 5 minutes ; un onglet qui gonfle ou un telephone qui chauffe se voit | 3 |
| **Etats degrades** : sans WebGL, sans JavaScript, mouvement reduit, mode recit | un juge sous `prefers-reduced-motion` doit avoir une experience complete, pas une page vide | 5 |
| **Metadonnees et partage** (OG, titres, 404, robots, sitemap) | le site est partage par lien ; un apercu vide ou une 404 en erreur se remarquent | 5 |
| **Coherence des trois langues** | contenu 10 : une langue a moitie traduite ou un registre qui change coute plus qu'une langue absente | 5 |
| **Microinteractions** : survols, focus, curseur, boutons | design et utilisabilite ; c'est la « finition » que les juges nomment | 6 |
| **Securite et vie privee** (en-tetes, RGPD) | pas note par le jury, mais un recruteur ou un client le regarde | 5 |
| **Le son : pas seulement « y a-t-il du son », mais la chaine** | niveaux, limiteur, espace, transitions, silence | 8 |

Les criteres de ta liste sont tous pertinents et restent le coeur ; les
lignes ci-dessus s'y ajoutent.

## 2. Cinematographie et image fixe, page par page

Methode du jury (Hon Tran) : d'abord la capture fixe du hero, puis l'arc.
Captures `.scratch/audit/<page>-bureau-<0|25|50|75|92|100>.png`.

| page | image fixe (0 %) | arc et climax | note design |
| --- | --- | --- | --- |
| Centre | **Faible.** Fond noir, cerf fantome a peine lisible, texte a gauche : la capture d'un jure est du texte sur du noir. Le foyer (braseros) ne se lit pas a 0 % | monte bien : a 50 % le cerf de dos, a 75 % le monde entier net (valide le 11/09). Mais les chapitres 2 a 4 ne sont jamais vus (P0) et la cloture passe sous le pied de page | 6 |
| Est | **Excellente.** Le monde de verre gele, montagnes de glace, cerf de cristal, ciel noir : la meilleure image fixe du site | l'aube, l'eclatement, l'or a 75 % : la seule vraie dramaturgie ; l'or de 92 % est sous-expose (le monde s'assombrit a la sortie) | 9 |
| Sud | Moyenne : nuit, lune, cerf tres petit dans un disque sombre ; la ligne de seuil recouverte | la frappe du serpent a 25 % est le geste le plus spectaculaire du site (texte efface pendant la frappe : voulu) ; ensuite ciel cyan plat et montagnes grises, sans nuages lisibles (deja note 08/09) | 7 |
| Ouest | Moyenne : brume, feuilles, cerf lointain et petit, ligne de seuil recouverte | descente des porteuses, crepuscule mauve ; a 75 et 92 % elles flottent a 30 cm du sol, papiers et braises minuscules, camera lointaine ; Xolotl passe (Venus du soir) | 7,5 |
| Nord | **Forte.** Bassin noir, chemin de cempasuchil, Xolotl sur la margelle, cerf d'obsidienne | cartes du cimetiere avec leur reflet, Xolotl dans l'eau avec sa braise, fleches plantees, bandelettes : la page la plus riche ; a 92 % une image de site du jour | 8,5 |

Ce que la video du voyage (`video/*.webm`, 1440x800, cinq pages et quatre
voyages) montre : les passages cardinaux sont propres (cadre nepantla, pas
de gel), et c'est bien la CHOREGRAPHIE entre les pages qui fait le site.
Ce qui manque de cinema, une fois les P0 regles : une profondeur de champ
au repos (le cadre est net du cerf aux montagnes, en permanence ; cf revue
du 10/09, levier 4), et des mouvements de camera qui s'approchent des
gestes (les danseuses, le foyer) au lieu de les regarder de loin.

## 3. Performance, en production

Bureau 1440x800, sans bridage ; puis Pixel 7 emule, CPU x4, Fast 3G (la
barre du metier). `charge` = le voile leve (la ceremonie de 3,5 s incluse).

| page | charge | FCP | CLS | taches > 50 ms | TBT | pire tache | im/s med / p5 | INP | tas JS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accueil bureau | 7,5 s | 0,9 s | 0,007 | 7 | 540 ms | 312 ms | 60 / 60 | 48 ms | 33 Mo |
| Services bureau | 7,3 s | 0,2 s | 0,007 | 3 | 229 ms | 206 ms | 60 / 60 | 48 ms | 36 Mo |
| Projets bureau | 7,4 s | 0,2 s | 0,007 | 4 | 128 ms | 152 ms | 60 / 60 | 32 ms | 36 Mo |
| Contact bureau | 7,4 s | 0,2 s | 0,007 | 5 | 147 ms | 111 ms | 60 / 60 | 32 ms | 54 Mo |
| Memoire bureau | 7,4 s | 0,3 s | 0,007 | 7 | 955 ms | 384 ms | 60 / 60 | 32 ms | 36 Mo |
| Accueil Pixel 7 x4 | 8,5 s | 0,5 s | 0,048 | 32 | 1 513 ms | 417 ms | 60 / 60 | 72 ms | 25 Mo |
| Services Pixel 7 x4 | 8,4 s | 0,5 s | 0,048 | 20 | 1 560 ms | 521 ms | 60 / 60 | 40 ms | 26 Mo |
| Projets Pixel 7 x4 | 8,4 s | 0,5 s | 0,048 | 40 | 1 585 ms | 467 ms | 60 / **30** | 64 ms | 26 Mo |
| Contact Pixel 7 x4 | 8,6 s | 0,5 s | 0,048 | 43 | 2 157 ms | 422 ms | **30 / 30** | 48 ms | 32 Mo |
| Memoire Pixel 7 x4 | 8,7 s | 0,5 s | 0,048 | 28 | **3 541 ms** | **1 471 ms** | 60 / **30** | 48 ms | 28 Mo |

Lecture : sur ordinateur, tout tient (60 images par seconde, aucune image
au-dessus de 50 ms en defilement, INP sous 50 ms, tas stable). Sur la barre
du metier, l'Accueil et l'Est tiennent ; le Sud et le Nord decrochent au
5e centile ; l'Ouest est a 30 en mediane. Le blocage total au chargement
(1,5 a 3,5 s) est le decodage des modeles et le premier rendu, la ou le
voile revele les caracteres. Le pire cas est Memoire : une tache de 1,5 s
(les simulateurs du bassin qui s'initialisent). Le CLS de 0,048 sur
telephone vient du voile qui laisse la place au contenu.

**Le poids sur le fil** (gzip, `next start` ; Netlify sert en brotli, un peu
mieux) : scripts 589 Ko pour 11 fichiers (2 018 Ko bruts, dont un morceau de
957 Ko brut, three et la scene), modeles et images 0,6 a 1,1 Mo selon la
page (Contact et Projets chargent `cihuateotl.glb`, 408 Ko, `xiuhcoatl.glb`
181 Ko, `hummingbird-poly.glb` 228 Ko), fontes 132 Ko, HTML 18 Ko. Soit
environ 1,5 Mo pour ouvrir l'Accueil et 2 Mo pour Contact. Un jure en 4G
attend 4 a 6 s de reseau avant la ceremonie. La `piedra-del-sol-v2.svg`
fait 160 Ko : c'est le voile, elle est sur le chemin critique.

Ce qui est deja bon et mesure ailleurs : zero programme compile en cours
d'arc sur les cinq pages (suite `programmes-tardifs`), appels de rendu sous
les plafonds (`appels-de-rendu`), plus aucune image longue liee aux shaders
pendant le voile (12/09).

## 4. Transitions

Suite e2e `transitions.spec.ts` : quatre trajets sous 300 ms par image,
verte. Mesure directe en production, agent reel, pire image du clic a +9 s :

| trajet | URL changee | images en 9 s | > 33 ms | > 100 ms |
| --- | --- | --- | --- | --- |
| Accueil -> Contact (bureau) | 1,02 s | 514 | 9 | 2 |
| Projets -> Services (bureau) | 1,10 s | 531 | 6 | 0 |
| Contact -> Memoire (Pixel 7, CPU x4) | la sonde a plante (erreur Node, a reprendre) | | | |

Rappel du 11/09 avant correction : 1,8 a 2,6 s de gel par trajet. Les deux
images de plus de 100 ms sur Accueil -> Contact sont l'arrivee des
porteuses (deja mesuree a 211 ms le 11/09).

Les passages entre pages sont regles depuis le 11/09 (la chauffe des
shaders a l'intention). Ce qui reste perceptible n'est pas un gel mais un
manque de LIAISON : le son ne fait pas de pont entre deux directions
(pas de fondu croise des nappes, le whoosh est seul), et la ligne de seuil,
qui devait porter le fil, est aujourd'hui cachee (P0).

## 5. Accessibilite, etats degrades, metadonnees

- **axe** (suite `accessibilite-axe`) : verte sur les cinq pages.
- **Clavier** (suite `clavier`) : ordre du document, focus visible : verte.
- **Chevauchements** (suite `controls-overlap`) : **2 echecs** sur 9, les
  deux sur telephone (Pixel 7 et telephone etroit) : un controle recouvre
  du texte lisible. C'est le bloc du chant (P0 de la section 0). Sur
  ordinateur : vert.
- **Mouvement reduit** : l'accueil et Contact a 75 % rendent, sans
  animation, avec la scene figee (`etat-mouvement-reduit-*.png`). Le
  message de statut du voyage n'a rien a annoncer (l'arc est fige), c'est
  coherent.
- **Sans JavaScript** : le voile s'affiche, le contenu est dans le DOM, le
  `<noscript>` previent ; on ne franchit pas le voile (voulu, documente).
- **Mode recit** : la scene se coupe, le texte reste lisible, le chant est
  la (`etat-mode-recit.png`).
- **Sans WebGL** : non teste ce jour (Chromium ANGLE ne permet pas de le
  couper proprement depuis Playwright) ; le repli existe dans le code
  (is-bot, crash WebGL) et a ete verifie le 01/09.
- **Metadonnees** : titre, description (au tutoiement, a jour), canonical,
  hreflang fr/en/es, Open Graph complet avec image 1200x630, Twitter card,
  manifest, theme-color, robots.txt, sitemap.xml (17 Ko) : complet. Les
  routes inconnues repondent 404 (le 500 vu ce matin venait du vieux build
  du port 3100).
- **En-tetes de securite** : aucun `Content-Security-Policy`,
  `Permissions-Policy`, `Referrer-Policy` ou `X-Frame-Options` defini dans
  le depot (Netlify n'en pose pas par defaut). Pas note par le jury ; un
  client, si.
- **Trois langues** : parite testee (unitaire), tutoiement coherent depuis
  le 12/09 ; l'anglais ne tranche pas.
- **RGAA, ce que l'audit ajoute** : un texte recouvert par un bouton (la
  ligne de seuil, le chant sur telephone) est un echec de lisibilite (10.x,
  contenu visible) ; le lien de cloture invisible est un lien qui n'existe
  pas pour qui defile (le header offre la meme destination, donc pas de
  perte fonctionnelle, mais la promesse narrative est perdue).

## 6. Execution, ce qu'un oeil de jury voit

1. **Le calque de texte** (P0) : tout ce qui devait apparaitre pendant
   l'arc (chapitres, clotures) est dans un calque `absolute` sans ancetre
   positionne. Une ligne le repare (`position: fixed`), et deux choses
   suivent : en mode recit le calque doit redevenir statique (sinon les
   cinq chapitres s'empilent en fixe), et la cloture des pages echo passera
   alors, comme celle du Centre, sous le pied de page en fin de course.
2. **Le pied de page et la cloture** : le panneau de sortie est fixe en
   bas, le pied de page defile par-dessus. Deux solutions honnetes : le
   panneau s'efface quand le pied entre dans le cadre (le pied est la vraie
   fin), ou le pied ne commence qu'apres une hauteur d'ecran de plus, le
   panneau ayant eu son temps.
3. **La ligne de seuil** : elle vit au bas du premier ecran, sous la colonne
   de boutons. Sa place est dans le calque fixe, en haut a gauche sous le
   bandeau, pendant le premier quart de l'arc, puis elle s'efface ; c'est
   aussi la ou un lecteur la cherche.
4. **Le chant sur telephone** : le couloir de 72 px des controles s'applique
   a tout texte lisible (`scene-text-overlay` le fait deja) ; le bloc du
   chant doit le respecter sous 767 px, et le test `controls-overlap` le
   garde.
5. **Les danseuses** : les offrandes existent (papiers d'amate, braises,
   papillons, bols) mais a 18 unites de la camera elles font 3 px. Trois
   leviers, du moins cher au plus juste : (a) grossir les papiers et les
   bols d'un facteur 2 a 3 et leur donner une braise plus vive (un point
   lumineux se lit a toute distance) ; (b) une lumiere ponctuelle par bol,
   qui eclaire la jupe et le sol autour (les porteuses se detachent alors
   du fond mauve) ; (c) un mouvement de camera de fin de page qui DESCEND
   vers le carrefour a l'atterrissage (grammaire cendre : la camera suit
   le soleil qui tombe), au lieu de rester au niveau de l'escorte. Et les
   poser vraiment : leur `settle` les laisse a 30 cm au-dessus de l'herbe
   au repos ; la hauteur de repos doit etre celle du sol plus la hauteur des
   pieds, comme pour le chien.
6. **Le chien et le bassin** : la geometrie est bonne (margelle en relief,
   tangage borne a 21 degres, eclaboussure) ; ce qui se voit encore, c'est
   que les pattes ne cherchent pas la pierre (elles suivent le sol calcule,
   pas un contact) et que la vitesse ne change pas au bord. Solution
   raccord avec le site : une cinematique inverse a deux os par patte
   (hanche, genou) vers la hauteur d'appui deja calculee (`supportHeight`),
   un ralenti de 30 % sur les 40 cm autour de la margelle, et deux
   eclaboussures (une par patte avant) au lieu d'une. Le tout dans
   `xolotl-companion` et `lib/xolotl-rim`, testable comme le reste.
7. **Le ciel du Sud** : la photo de nuages existe et est illisible a `uDay`
   plein (08/09, lot 4) ; dosage et cablage de la bande d'horizon.
8. **L'image fixe du Centre** : le foyer doit se voir a 0 % : braseros
   allumes des l'arrivee (ils le sont, mais a l'intensite de l'offrande 0),
   une lueur chaude au sol autour du cerf, et le cerf eclaire par le bas.
   C'est le tonalli, la chaleur recue : elle doit etre la premiere image.
9. **« Tu reviens au foyer »** a la premiere visite : deux lignes pour le
   Centre, une a la premiere arrivee (« Tu es au foyer... ») et une au
   retour ; la decision existe deja (`foyer-decision`).
10. **Le chemin de cempasuchil** se vide au repos : les fleurs sont portees
    par le fluide et sortent du bassin sans etre recyclees ; un recyclage
    au bord (elles reviennent au depart du chemin) tient en dix lignes.

## 7. Cosmogonie et sources

Ce qui est fort et rare : chaque page cite ce qui est atteste et ce qui est
notre lecture, dans le Codex du site, et les sources par direction
(`docs/da/*-sources.md`) sont tenues. Aucun dieu represente, aucun glyphe
copie, les Cihuateteo jamais dramatisees, la Voie lactee ecartee faute de
source, les cantares cites avec folio. C'est notre creativite 9.

Ce que l'audit trouve :

- **Le Nord n'a pas ses sources** : le Codex affirme le voyage de quatre
  annees, les neuf strates, le fleuve Chiconahuapan et le chien, les
  montagnes qui s'entrechoquent, Itzehecayan, Temiminaloyan. Tout cela est
  exact (Sahagun, livre III, appendice ; Codex Vaticanus A) mais
  `nord-sources.md` ne le cite pas encore (M1 du backlog, lecture du Codex
  de Florence a faire). Un lecteur mexicain verifiera : il faut la
  reference livre et folio.
- **Deux affirmations a verifier avant qu'un jure mexicain ne les lise** :
  « Sahagun (livre III) dit que les femmes mortes en couches reviennent en
  papillons » : le livre III, appendice, dit que les GUERRIERS reviennent
  en oiseaux et papillons apres quatre ans ; les Cihuateteo sont au livre VI
  (et au livre I). Il faut soit trouver le passage exact, soit reformuler
  (« comme les guerriers, dit Sahagun... »). Et « Xolotl guide les ames vers
  Mictlan » : Xolotl accompagne le SOLEIL sous la terre (Codex Borgia,
  Seler) ; c'est le chien (itzcuintli) sacrifie qui fait traverser le
  fleuve au mort. Le site fond les deux ; a dire comme lecture.
- **Le tutoiement** rend le Codex plus proche ; il ne change rien aux faits.
- **Les cantares** : traductions FR et EN a relire par toi (11/09).

## 8. Le son

Ce qui existe (`sound-design.tsx`, 855 lignes, tout genere) : une nappe
(trois sinus F2, A2, C3) ; par direction, une couche narrative (le feu qui
crepite au Centre, la glace qui craque et eclate a l'Est, le tonnerre sec
de la frappe et le vent du Sud, le vent de l'Ouest, l'eau et les gouttes du
Nord) ; la cloche du climax sur le defilement, cinq accords ; les motifs
d'arrivee ; l'invite au voile (deux boutons) ; volume persistant ; un
analyseur qui module le bloom. Coupe par defaut, et c'est juste.

Ce qui manque, par rapport a ce que fait un site prime (Cartier, Web Audio
score ; Primland ; les lauréats cites par Utsubo) :

1. **Pas de limiteur** : la chaine est gain -> analyseur -> sortie. Cinq
   couches et une cloche peuvent depasser 0 dB : ca s'entend sur telephone.
   Un `DynamicsCompressorNode` en fin de chaine (seuil -18 dB, ratio 8,
   attaque 3 ms, relache 250 ms) est la norme, une ligne.
2. **Pas d'espace** : aucune reverberation, aucune position. Le Nord (une
   grotte, un bassin) et l'Est (le verre) devraient sonner differemment :
   une convolution courte generee (bruit decroissant de 0,8 s pour le Nord,
   0,3 s pour l'Est), un `StereoPannerNode` pour le chien qui passe et le
   serpent qui frappe.
3. **Pas de pont entre les directions** : au voyage cardinal, la nappe
   de depart devrait descendre pendant que celle d'arrivee monte (fondu
   croise de 1,2 s, le temps du cadre nepantla), et le whoosh les relier.
   Aujourd'hui le whoosh est seul et la couche suivante demarre au warm.
4. **Le silence n'est pas dessine** : le foyer crepite en continu ; un
   site prime laisse des trous (le vent qui tombe, une goutte seule). Une
   enveloppe lente (respiration de 40 s) sur la nappe suffit.
5. **La cloche au clic** double la cloche au climax ; garder une seule
   voix par geste.

## 9. Etat de l'art et solutions, critere par critere

Sources : Awwwards, systeme d'evaluation ; Hon Tran, « Awwwards Judging
Criteria » et « 10 Best Award-Winning Websites of 2026 (Judged) » ;
Utsubo, « Best Three.js Websites 2026 » et « 100 Three.js tips » ;
Metabole, « Immersive Website Examples 2026 » ; MDN, DynamicsCompressorNode ;
pmndrs postprocessing, DepthOfField ; three.js, KTX2Loader et
EXT_meshopt_compression.

| critere | ce que font les laureats 2026 | ou nous sommes | solution raccord avec le site | cout |
| --- | --- | --- | --- | --- |
| Image fixe | « Le hero se juge sans mouvement » ; Iventions : la lumiere traite chaque sujet comme une installation eclairee | Est et Nord au niveau ; Centre noir ; Sud plat | Centre : le foyer allume a 0 %, une lueur au sol, le cerf eclaire par le bas. Sud : le ciel (lot 4) | S, S |
| Narration au defilement | « scene logic, not page logic » ; « chaque pas gagne sa place » (Metabole) ; By-Kin : « des transitions qui n'attirent pas l'attention » | l'arc en actes est notre force, MAIS ses chapitres et ses clotures ne sont pas visibles | `position: fixed` sur le calque de texte ; mode recit en statique ; cloture qui cede au pied de page ; ligne de seuil dans le calque | S |
| Cinema | mouvement de camera dans la profondeur, avec poids (Oryzo, Primland) ; profondeur de champ comme marqueur | cadre net en permanence ; camera loin des gestes (danseuses, chien) | DoF au repos (bureau seulement : `bokehScale` 1 a 1,5, `focusDistance` sur le cerf, `resolutionScale` 0,5, coupe sous `postFx` false) ; une descente de camera au carrefour de l'Ouest ; une approche du foyer au Centre | M |
| Barre du metier (mobile) | « 60 im/s sur un Android milieu de gamme sous CPU x4 + Fast 3G determine le classement » (Hon Tran) ; « performance is a feature » (Utsubo) | Accueil et Est OK ; Sud, Nord au 5e centile a 30 ; Ouest a 30 | Ouest : les 52 bandelettes et 160 feuilles sont deja le profil telephone ; il reste l'herbe (9 000 brins, 45 % des triangles, revue du 10/09 levier 2) : passer a 5 000 sur telephone et couper le vent sous 30 im/s. Nord : la tache de 1,5 s est l'initialisation des simulateurs (ondes, fluide) : la faire en tranches (une par image, comme la chauffe). Sud : les 400 etoiles et les colibris sur telephone : moitie | M |
| Chargement | « differer le paquet 3D et rendre du HTML utile d'abord » ; KTX2 et meshopt en worker pour eviter le fil principal | 589 Ko de JS gzip, 0,6 a 1,1 Mo de modeles ; decodage sur le fil principal (1,5 s d'images longues pendant le voile, T10) | meshopt deja la ; decodage en worker (`MeshoptDecoder` supporte `useWorkers`) ; textures en KTX2 quand `toktx` sera installe (V2) ; la Piedra du voile (SVG 160 Ko) a simplifier ou a inliner | M |
| Reactivite | « input responsiveness » | INP 32 a 72 ms : bon | rien | |
| Accessibilite | focus visible, mouvement reduit respecte, clavier, lecteur d'ecran (r3f a11y) ; « une experience mobile faible plafonne la note » | axe et clavier verts ; mouvement reduit et mode recit complets ; DEUX textes recouverts | corriger les trois chevauchements ; garder `controls-overlap` vert sur les trois cadrages | S |
| Son | une couche narrative : nappes par scene, ponts, espace, limiteur (Cartier, Primland) | couches par direction, cloche au climax, motifs d'arrivee ; pas de limiteur, pas d'espace, pas de pont | limiteur, deux convolutions generees, panoramique du chien et du serpent, fondu croise au voyage, respiration de la nappe (section 8) | M |
| Cosmogonie | « une direction artistique qui a un point de vue » ; l'honnetete des sources est notre difference | sources par direction sauf le Nord ; deux affirmations a verifier | `nord-sources.md` depuis le Codex de Florence livre III ; reformuler papillons et Xolotl | S (a toi) |
| Typographie et grille | echelle coherente a chaque point de rupture | echelle 1,333 posee le 10/09 ; le couloir de 72 px sur telephone | le chant et la ligne de seuil dans le systeme (couloir, calque) | S |
| Metadonnees, 404, partage | apercu complet, 404 dessinee | complet ; 404 par defaut de Next (blanche) | une page 404 dans le monde (le cerf de dos, « ce chemin n'existe pas », les cinq directions) | S |
| Securite | non note par le jury | aucun en-tete | `netlify.toml` : CSP (script-src self + inline hash Next), Referrer-Policy, Permissions-Policy, X-Content-Type-Options | S |

## 10. L'ordre propose

1. **Le calque fixe, la cloture et le pied de page, la ligne de seuil, le
   chant sur telephone** : quatre corrections de mise en page, une soiree,
   les suites `controls-overlap`, `clavier`, `transitions` en garde, plus un
   test qui verifie que les chapitres et les clotures sont DANS la fenetre
   quand leur opacite est 1 (celui qui manquait depuis le 25/08).
2. **Le Centre a 0 %** : le foyer visible ; et la ligne de premiere arrivee.
3. **La barre du metier** : Ouest (herbe), Nord (simulateurs en tranches),
   Sud (etoiles et colibris sur telephone) ; mesure `vitals.mjs` avant et
   apres.
4. **Le son** : limiteur, ponts, espace.
5. **Les danseuses et le chien** : offrandes lisibles, pose au sol, camera
   qui descend ; cinematique inverse des pattes.
6. **La profondeur de champ au repos** (bureau).
7. **Le Sud** : le ciel.
8. **Le Nord** : sources, et les affirmations a verifier.
9. **Chargement** : decodage en worker, KTX2 (quand `toktx`), SVG du voile.
10. **404, en-tetes**.

## 11. RESOLU le 14/09 : le monde disparaissait a densite 2 apres un saut

**La cause, trouvee en instrumentant une compilation de production** (le
defaut se reproduit a la quatrieme tentative environ) : le pilote refusait
le tracé. `getError` rendait 1282 et la console disait « GL_INVALID_OPERATION:
glDrawElements: Mismatch between texture format and sampler type
(signed/unsigned/float/shadow) ». Tout ce qui recoit une ombre disparaissait
donc, c'est-a-dire les materiaux standard : le sol, l'herbe, les montagnes,
le cerf. Ce qui n'en recoit pas continuait de s'afficher, d'ou l'image a
moitie vide.

Le gel des ombres (`freezeShadow`) coupait le rendu de profondeur EN
ATTENTE avant de regarder si la carte existait, puis sortait si elle etait
absente. Quand le gel tombait avant le premier rendu de la carte, celle-ci
n'etait donc JAMAIS creee, pendant que les materiaux, eux, avaient ete
compiles avec les ombres : ils echantillonnaient une carte qui n'existe
pas. Densite 2 et saut de defilement ne faisaient que decaler l'ordre des
premieres images assez pour que la course se perde de ce cote-la, ce qui
explique l'intermittence et l'absence sur le serveur de dev.

**La correction** : une carte d'ombre jamais rendue ne se gele pas, elle se
RECLAME ; et l'appelant ne bascule son etat que si le gel a vraiment eu
lieu. Verifie : douze tentatives de la recette exacte, plus aucune erreur
GL, le monde entier rendu a chaque fois. Oracle dans
`persistent-lights.test.ts`.

### L'enonce d'origine



Reproduit trois fois en production (`dpr.mjs`, `dpr-temps.mjs`) : Contact,
densite 2 (un MacBook), saut direct de 0 a 80 % de l'arc apres le voile.
Le sol, l'herbe, les montagnes et le cerf ne sont plus rendus ; restent
les porteuses, la litiere, les papiers, les braises, Xolotl et la lune.
L'etat dure au moins 20 s (`dpr-temps-20s.png`). Il ne se produit ni a
densite 1 (`dpr-contact-dpr1-saut.png`), ni a densite 2 en defilement
progressif (`dpr-contact-dpr2-progressif.png`), ni sur le serveur de dev
avec la meme recette (`dpr-dev-dpr2-saut.png`, etat de scene identique :
brouillard 8 a 26, 223 objets visibles, aucun sur la couche froide).
Hypothese la plus courte : les objets a materiau standard (sol, herbe,
cerf) restent sur la couche froide de la chauffe apres une recompilation
declenchee par le saut (balayages de version), et `isReady()` ne repond
jamais vrai pour ces programmes en production a cette taille de rendu
(2880x1600) ; le garde-fou de 240 images devient 40 s a 6 images par
seconde. A verifier avec un handle de production temporaire ou un build
de dev sans StrictMode, puis : ne garder la porte de liaison que pour les
objets jamais rendus, et la borner en temps (500 ms), pas en images.
Priorite P1 : un jure sur MacBook qui saisit l'ascenseur voit un monde
vide.

**Suite du 13/09, apres les corrections.** L'hypothese de la porte de
liaison est ECARTEE : sur le serveur de dev, meme recette, aucun objet sur
la couche froide, aucune attente. Un build de production avec les poignees
de sonde (`NEXT_PUBLIC_NAHUAL_SONDE=1`, nouveau `src/lib/sonde.ts`) a ete
mesure trois fois (saut, progressif, densite 1) : etat de scene identique
et sain (brouillard 8 a 26, sol, herbe et cerf visibles, 0 objet froid), et
le monde etait la (`dpr-prod-saut.png`). Le defaut est donc INTERMITTENT
et n'a plus reproduit sur le build corrige ; le gel n'est pas en cause
(`FrostWorld` n'est monte qu'a l'Est, `uFrost` reste a 0 ailleurs). Ce
qu'on sait : les objets qui disparaissaient sont ceux des materiaux
standard (sol, herbe, montagnes, cerf), pas les sprites ni les porteuses.
A surveiller a la prochaine reproduction avec la sonde `dpr-prod.mjs`,
qui lit maintenant tout l'etat utile.


## 12. Ce qui a ete corrige le jour meme

Sylvain, apres lecture : « Corrige tout, sans discontinuer. Ne t'arrete que
lorsque tu auras corrige tout le possible. » Etat en fin de journee, dans
l'ordre de la section 10 ; les lignes X du backlog (section 0 bis) portent
le detail et les oracles.

| # | fait | reste |
| --- | --- | --- |
| X1 | Le calque de texte est fixe ; statique en mode recit ; e2e `calque-fixe` (chapitres allumes dans la fenetre) | |
| X2 | La ligne de seuil vit dans le calque, en haut a gauche, le premier quart de l'arc ; le contenu des pages echo commence sous le pli | |
| X3 | Couloir de 72 px pour tout le contenu et le chant ; la colonne de boutons se retire quand on descend sur telephone (droit et couche) et n'apparait qu'apres l'arrivee ; `controls-overlap` vert sur quatre cadrages, mi-parcours compris | |
| X4 | Le pied de page efface les calques fixes (`footer-sentinel`) ; la cloture des pages echo est le dernier bloc du contenu, dans le flux ; celle du Centre reste fixe | |
| X5 | Profil telephone allege (5 000 brins, 120 feuilles, 32 meches) ; les simulateurs du Nord se chauffent une etape par image. Mesure seule, build corrige, Pixel 7 x4 + Fast 3G : Contact passe de 30 a 60 im/s en mediane (5e centile 30), Memoire de 1 471 a 1 178 ms de pire tache et de 3,5 a 2,8 s de blocage ; Projets reste a 30 au 5e centile ; Accueil et Services a 60 / 60. Le bruit entre deux passes est de l'ordre de 30 % sur le blocage | le 5e centile de Projets et Contact ; etoiles et colibris du Sud ; le blocage au chargement (1,3 a 2,8 s) qui est le decodage des modeles (X13) |
| X6 | La lumiere du foyer eclaire le sol et le cerf des 0 % | la ligne de premiere arrivee (texte a toi) |
| X7 | Limiteur, pont entre directions, espace par direction, pas du chien panoramiques, respiration de la nappe, une seule cloche | ton oreille |
| X8 | Danseuses posees au sol, braises x2,2, papiers x2 | la descente de camera (mise en scene, a toi) |
| X9 | Le chien ralentit sur la margelle, deux eclaboussures | |
| X10 | La profondeur de champ au repos existe deja (1,4) | son dosage, a ton oeil |
| X11 | | le ciel du Sud, a ton oeil |
| X12 | Papillons et Xolotl reformules en trois langues, comme « notre lecture » | ta relecture ; les sources du Nord |
| X13 | | KTX2 (toktx), worker meshopt (drei), SVG du voile |
| X14 | 404 dans le monde, en-tetes de securite dans `netlify.toml` | CSP (nonce, chantier a part) |
| X15 | Les fleurs de cempasuchil reviennent en 4 a 14 s | |
| 11 | Poignees de sonde activables en production (`NEXT_PUBLIC_NAHUAL_SONDE=1`) pour reproduire le monde disparu a densite 2 | le diagnostic (voir ci-dessous) |

## Sources

- Awwwards, systeme d'evaluation : https://www.awwwards.com/about-evaluation/
- Hon Tran, Awwwards Judging Criteria (2026) : https://www.hontran.dev/blog/awwwards-judging-criteria
- Hon Tran, 10 Best Award-Winning Websites of 2026 (Judged by a Juror) : https://www.hontran.dev/blog/best-award-winning-websites-2026
- Utsubo, Best Three.js Websites 2026 : https://www.utsubo.com/blog/best-threejs-websites-2026
- Utsubo, 100 Three.js Tips (2026) : https://www.utsubo.com/blog/threejs-best-practices-100-tips
- Metabole, Immersive Website Examples 2026 : https://metabole.studio/en/blog/immersive-website-examples
- MDN, DynamicsCompressorNode : https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
- pmndrs, DepthOfField (react-postprocessing) : https://react-postprocessing.docs.pmnd.rs/effects/depth-of-field
- three.js, GLTFLoader (KTX2, meshopt) : https://threejs.org/docs/pages/GLTFLoader.html
- Pip Lev, Three.js & Accessibility : https://medium.com/@piplev/three-js-accessibility-c4f45d83f2c6
- Lightmap baking, Blender vers three.js (PixelCapture) : https://pixel-capture.com/tutorials/lightmap-baking-in-blender
