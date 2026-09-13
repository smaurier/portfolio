# La profondeur des mecaniques : ce qui compte vraiment

**Ouvert le 13/09/2026**, sur une remarque de Sylvain : « je crois que l'on
va arriver a un moment ou les mecanismes vont etre riches en variete mais
que l'on va devoir plutot s'interroger sur la profondeur de chaque
mecanisme utilise et leur interet sur le site ». Il a raison, et ce
document le met en chiffres plutot qu'en opinions.

## La regle

Une mecanique se juge sur trois questions, dans cet ordre. Elle doit
repondre oui aux trois pour rester.

1. **Est-elle vue ?** Pas « existe-t-elle », mais : se joue-t-elle devant
   un visiteur qui ne sait rien et ne cherche rien ? Une mecanique qu'on ne
   declenche pas ne compte pas, quel que soit son code.
2. **A-t-elle une seconde lecture ?** La premiere fois, c'est joli. La
   deuxieme, apprend-on quelque chose ? Une mecanique sans seconde lecture
   est un effet ; avec, c'est une idee.
3. **Sert-elle le site ?** Le site dit deux choses : un developpeur
   frontend qui sait faire ce que peu savent faire, et un hommage a une
   culture vivante. Une mecanique qui ne sert ni l'une ni l'autre est un
   ornement, meme reussie.

Corollaire, qui devient la doctrine de la fin du chantier : **a partir du
13/09, on n'ajoute plus une mecanique sans avoir approfondi celles qui
echouent a la question 1.** Ajouter coute peu et se voit dans un dossier ;
approfondir coute cher et se voit a l'ecran.

## La mesure : ce qu'une visite type declenche vraiment

Sonde `.scratch/audit/visite-type.mjs`, 78 secondes, un visiteur qui fait
ce que fait un jure : il arrive au Centre, descend la page, passe au Sud
par la boussole, descend, passe au Nord, descend. Il ne clique sur rien
d'autre. Ce qui s'est joue devant lui, mesure et non suppose :

| mecanique | s'est jouee ? |
| --- | --- |
| La ceremonie du foyer, le voile, l'arc de revelation | oui |
| Les transitions cardinales (deux voyages) | oui |
| Les rigs par direction (brume, lumiere, grade) | oui |
| Le chant, le calque de texte, les chapitres | oui |
| Cinq traces sur sept : les 400 jetees, le colibri, le lever du soleil, la frappe du serpent, le glyphe embrase | oui |
| Le passage de Xolotl | non (tirage) |
| **Le miroir fumant et ses deux faces** | **non** |
| **La veille** | **non** |
| **La boussole vraie** | non (telephone seulement) |

Le resultat important est en gras. **Les deux mecaniques ecrites le
13/09, les plus couteuses de la journee, ne se jouent pas une seule fois
devant un jure qui se comporte normalement.** Le miroir attend un clic sur
un disque de 32 pixels que rien ne designe ; la veille attend vingt
secondes d'immobilite qu'un jure qui fait defiler n'a jamais.

Deux faits de plus, trouves par la meme sonde :

- La boussole se cache pendant la descente (`dock-sentinel`, corrige le
  13/09 pour les recouvrements de texte). Pour changer de direction, il
  faut remonter d'un cran. C'est un choix defendable, mais cela veut dire
  que **la navigation atypique du site est invisible la moitie du temps**.
- Le chant est monte a l'ecran pendant presque toute la visite, et le
  calque de texte n'est visible que 838 images sur environ 4500 : le texte
  du site est vu beaucoup moins longtemps que la scene. Ce n'est pas un
  defaut, c'est une information pour ecrire court.

## L'inventaire, mecanique par mecanique

Trois verdicts : **profonde** (elle tient les trois questions),
**a approfondir** (elle echoue a une), **ornement** (elle echoue a deux).

### Profondes, on n'y touche plus

- **L'arc de revelation.** Le defilement est l'heure du monde : penombre,
  regard, face-a-face, chemins reveles. Vue par tous, seconde lecture
  evidente (la lumiere raconte), sert le site (c'est la demonstration
  technique centrale).
- **Les cinq identites de direction** (brume, rig de lumiere, grade,
  ciel). Vues, lues deux fois (chaque monde a son heure cosmique
  attestee), et elles portent la cosmogonie.
- **Les transitions cardinales.** Vues a chaque voyage, seconde lecture
  dans la grammaire (le soleil ne recule jamais, le Centre est une
  implosion), et c'est la piece de bravoure technique.
- **La ceremonie d'entree et le foyer de quatre jours.** Vue, et la
  seconde lecture est la meilleure du site : revenir dans les quatre jours
  ne rejoue pas la ceremonie, la maison est deja allumee.
- **Les traces.** Cinq sur sept se posent toutes seules en 78 secondes,
  et le carnet donne la seconde lecture sans jamais dire ce qui reste.

### A approfondir, par ordre d'urgence

1. **Le miroir fumant.** Mecanique la plus riche du site, jamais
   declenchee. Il lui manque la question 1, et elle seule. Ce qu'il faut
   n'est pas plus de code cote scene, c'est une raison de poser l'oeil sur
   le disque. Fait le 13/09 : le disque accroche un reflet, une fois, quand
   le monde vient de se poser (le tezcatl est un miroir poli, il capte la
   lumiere : c'est le geste le plus juste qu'on puisse lui donner).
2. **La veille.** Meme probleme, mais l'inverse : on ne peut pas la
   provoquer sans mentir. Ce qui peut se travailler, c'est sa recompense :
   aujourd'hui elle efface et derive ; elle pourrait, apres une minute,
   donner quelque chose que la visite active ne donne jamais. A voir avec
   Sylvain, c'est une decision de recit, pas de code.
3. **La boussole du bandeau.** Cachee pendant la descente. Piste : la
   rendre a mi-page quand le defilement s'arrete, plutot qu'au seul
   defilement vers le haut.
4. **Le passage de Xolotl.** Tirage au sort : un jure a une chance sur
   quelques-unes de le voir. La mecanique est belle et ratee pour cette
   seule raison.
5. **Le mode recit.** Excellent pour le dossier d'accessibilite, jamais
   ouvert par un visiteur. Il ne sera jamais vu : c'est acceptable, parce
   qu'il repond a la question 3 a lui seul.

### Ornements assumes

- Le curseur personnalise, la secousse d'Ollin au clic, le halo de
  revelation. Ils sont vus, ils n'ont pas de seconde lecture, et c'est
  bien ainsi : ils sont le grain de l'interface, pas son propos. On ne les
  approfondit pas, on ne les retire pas.

## Ce que font les laureats, et ce qui nous manque

Reponse a la deuxieme question de Sylvain : « est-ce qu'on a exploite tous
les mecanismes utilises par les SOTY ? ». Les recurrences chez les
laureats recents, et ou nous en sommes :

| mecanique de laureat | chez nous |
| --- | --- |
| Scene 3D temps reel comme sujet, pas comme decor | oui, c'est le site entier |
| Ecran de chargement qui fait partie du recit | oui (le voile, la Piedra qui se dessine) |
| Son concu, pas ajoute (couches, espaces, reactivite) | oui (couches par direction, convolution, limiteur, souffle, musique de veille) |
| Deux faces claire et sombre | oui depuis le 13/09, et ce n'est pas un mode jour |
| Navigation atypique mais accessible | oui (boussole cardinale, clavier, libelles, mode recit) |
| Transitions de page cinematographiees | oui |
| Curseur et micro-interactions | oui |
| Mouvement reduit respecte partout | oui, et teste |
| Etat qui se souvient du visiteur | oui (foyer, traces, faces), plus que la plupart |
| **Contenu editorial long et assume** (le making-of, les sources) | oui (le Codex, les fiches, la page Memoire) |
| **Capteurs du telephone** | oui depuis le 13/09 (la boussole vraie) |
| Un moment de contemplation sans interface | oui depuis le 13/09 (la veille) |
| **Image de partage par page** | non, et c'est la seule vraie absence |
| Multijoueur, curseurs des autres visiteurs | non, et hors sujet ici |
| Intelligence artificielle dans la page | non, et contraire au propos |

Conclusion honnete : **il ne manque plus de mecanique a inventer.** La
seule case vide qui vaille est l'image de partage par page, qui n'est pas
une mecanique du monde mais un outil de diffusion. Tout le reste du
travail qui reste est de la profondeur, pas de la variete.

## Les trois mecaniques mises en attente, et pourquoi

Proposees le 13/09, non retenues pour l'instant, en application de la
regle ci-dessus :

- **Le jour du visiteur** (tonalpohualli, le nom nahuatl du jour de la
  premiere visite). Elle repond aux questions 2 et 3 mieux qu'aucune
  autre, mais elle ajoute. A reprendre quand le miroir et la veille
  auront passe la question 1.
- **La lumiere du lieu** (l'aube et le couchant a l'heure du visiteur).
  Faible gain visible, forte coherence. Bonne derniere touche, mauvaise
  priorite.
- **L'image de partage par page.** Utile, non mythologique. A faire avant
  la diffusion, pas avant le jury.
