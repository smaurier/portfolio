# Les mécaniques du site, une par une, et ce qu'il reste à en tirer

**Ouvert le 13/09/2026**, sur la demande de Sylvain : « tu dois référencer
chaque mécanique du site [...] et on doit le prendre comme un os, comment
le ronger au maximum pour qu'on arrive à l'utiliser au maximum de son
potentiel sur tous nos axes ».

Ce document est le registre. La règle de sélection est dans
`profondeur-des-mecaniques.md` ; ici, on ne trie pas, on inventorie et on
cherche ce que chaque mécanique peut encore donner.

## Les axes

Sylvain en nommait trois. Il en manque trois, et le site les sert déjà
sans les avoir écrits.

1. **Mythologie** : est-ce attesté, et qu'est-ce qui est notre lecture ?
2. **Cinématographie** : qu'est-ce que ça fait à l'image, au rythme, au
   regard ?
3. **Implémentation** : qu'est-ce que ça prouve techniquement, et à quel
   coût ?
4. **Accessibilité** : que devient la mécanique sans souris, sans
   JavaScript, sans mouvement, sans canvas ? C'est l'axe qui différencie
   ce site de tous les autres sites primés.
5. **Preuve de compétence** : qu'est-ce qu'un recruteur ou un jury en
   déduit sur celui qui l'a écrite ? C'est la raison d'être du site.
6. **Diffusion** : la mécanique se raconte-t-elle hors du site, dans un
   lien partagé, un making-of, une conférence ?

Un os est bien rongé quand il donne sur au moins quatre de ces six axes.

---

## 1. L'entrée dans le monde

`piedra-skeleton`, `loading-cycle`, `reveal-trigger`, `foyer-arrival`,
`foyer-decision`, `lib/foyer`, `seuil-line`, `seuil-tete`, `apres-le-voile`,
`veil-sound-choice`.

| axe | état |
| --- | --- |
| Mythologie | La Piedra del Sol se dessine pendant le chargement ; le foyer de Xiuhtecuhtli s'allume au Centre. Le feu qui ne s'éteint pas quatre jours est notre lecture, dite comme telle. |
| Cinématographie | Le chargement EST le premier plan : trait qui se dessine, phrase nahuatl, puis descente de la caméra sur l'axe du monde. Aucune coupure entre le voile et la scène. |
| Implémentation | Le voile connaît la pose réelle du foyer 3D et pose sa flamme sur sa projection : le raccord DOM vers WebGL est invisible. Décision d'arrivée prise avant le premier paint. |
| Accessibilité | Sans JavaScript, le voile est masqué et tout le texte est là. Le choix du son est offert au clavier avant d'entrer. |
| Preuve | C'est la partie que personne ne sait faire proprement : un chargement qui ne ment pas sur ce qu'il charge. |
| Diffusion | Sous-exploitée : personne ne voit le voile deux fois. |

**À ronger.** La phrase nahuatl du voile est tirée au sort et disparaît en
deux secondes. Elle pourrait être le premier fil du récit : la phrase du
jour, la même pour toute la journée, reprise en bas du Codex avec sa
source. Coût faible, gain sur mythologie, contenu et diffusion.

---

## 2. Le défilement, la caméra, le cadre

`lib/reveal-arc`, `orbit-camera`, `camera-path`, `face-a-face-pin`,
`frame-offset`, `nepantla-frame`, `nepantla-blur`, `zenith-arc`,
`contemplation`, `solar-camera`, `lib/tilt`.

| axe | état |
| --- | --- |
| Mythologie | Le défilement est l'heure du monde : pénombre, regard, face à face, chemins révélés. Le Centre est hors du temps. |
| Cinématographie | C'est la colonne vertébrale : une seule orbite, un sujet qui ne quitte jamais le cadre, un cadre décalé aux deux tiers pour laisser la colonne de texte. |
| Implémentation | Tout est piloté par des refs et une boucle d'image, jamais par l'état React. Le flou suit une cible, pas une distance figée : c'est un vrai focus rack. |
| Accessibilité | Sous mouvement réduit, la progression reste à zéro : aucune branche spéciale à maintenir. |
| Preuve | La maîtrise de la boucle de rendu se lit en trois secondes par qui sait regarder. |
| Diffusion | Le making-of de la caméra est le meilleur article que le site n'a pas encore écrit. |

**À ronger.** La contemplation (la caméra qui tourne seule à l'heure de
Tenochtitlan) est enfouie dans les contrôles de scène et personne ne la
trouve. Elle mériterait d'être ce que la veille déclenche, ou d'avoir sa
propre entrée dans le Codex.

---

## 3. Les cinq mondes

`direction-fog`, `direction-light`, `direction-grade`, `direction-arc`,
`est-arc`, `ouest-arc`, `sud-arc`, `sky-photo`, `sky-zenith`, `sud-sky`,
`mictlan-sky`, `mictlan-mist`, `frost-world`, `tezcatl-water`,
`piedra-ground`, `milpa`, `grass`, `background-flora`, `ocotillo`,
`west-leaves`, `obsidian-blades`, `cempasuchil-path`, `year-stones`.

| axe | état |
| --- | --- |
| Mythologie | Chaque direction a son heure cosmique, son gardien, sa couleur, ses sources écrites dans `docs/da/*-sources.md`. C'est la partie la plus documentée du site. |
| Cinématographie | On ne teinte pas une scène, on la rééclaire : chaque monde a une source de lumière nommable. L'Est commence gelé et de nuit, l'Ouest finit dans le noir. |
| Implémentation | Trois rigs purs et testés (brume, lumière, grade) qui se fondent à la même cadence, plus les arcs propres à chaque direction. |
| Accessibilité | Le mode récit rend chaque monde en texte ; les contrastes sont mesurés contre le fond réellement peint. |
| Preuve | Cinq scènes qui partagent un moteur sans se ressembler : c'est un travail d'architecture, pas de démo. |
| Diffusion | Depuis le 13/09, chaque page a sa carte de partage dans sa direction. |

**À ronger.** Le Centre est le monde le moins caractérisé : il n'a ni rig
de lumière propre, ni grade, ni ciel. C'est volontaire (le Centre est hors
du temps) mais c'est aussi la première image que voit un jury. La question
n'est pas de lui ajouter une identité, c'est de rendre son absence
d'identité lisible comme un choix.

---

## 4. La navigation

`cardinal-compass`, `compass-overlay`, `cardinal-link`,
`cardinal-transition-context`, `nepantla`, `journey-cues`, `instant-link`,
`keyboard-nav`, `gamepad-nav`, `shortcuts`, `skip-nav`, `route-announcer`,
`cardinal-announcer`, `dock-sentinel`, `footer-sentinel`, `lib/boussole`.

| axe | état |
| --- | --- |
| Mythologie | La navigation EST la cosmogonie : cinq directions, cinq pages, un voyage qui ne fait jamais reculer le soleil. |
| Cinématographie | Chaque voyage est un plan : élan, envol, arrivée, avec son heure traversée. |
| Implémentation | Clavier, manette, raccourcis, annonces vocales, préchargement au survol. La rose tourne vers le vrai nord sur téléphone. |
| Accessibilité | C'est le point fort absolu : une navigation atypique entièrement utilisable au clavier, annoncée, et doublée d'une navigation ordinaire dans le bandeau. |
| Preuve | Un développeur qui prépare la certification RGAA et qui prouve qu'atypique ne veut pas dire inaccessible. |
| Diffusion | Jamais racontée. C'est pourtant l'argument le plus vendeur du site. |

**À ronger.** La page Accessibilité déclare la conformité mais ne montre
rien. Elle pourrait démontrer : ici, la même navigation, au clavier, sans
JavaScript, en mode récit, avec les annonces. C'est l'axe 5 à son maximum,
et c'est ce qu'un client de Nuada veut voir.

---

## 5. Les deux faces

`lib/theme`, `theme-store`, `theme-toggle`, `miroir-fumant`, `lib/reflet`,
`reflet-store`.

| axe | état |
| --- | --- |
| Mythologie | Le tezcatl de Tezcatlipoca ; les quatre Tezcatlipocas dont le noir et le blanc sont frères et adversaires. Le clair comme reflet est notre lecture, dite. |
| Cinématographie | La fumée couvre, le monde change dessous, la fumée se retire. Même cérémonie dans les deux sens. |
| Implémentation | Un seul nombre pilote la scène entière, composé par-dessus les rigs. À zéro, la nuit ne bouge pas d'un pixel, et c'est testé. |
| Accessibilité | La face est posée avant le premier paint, le contraste est mesuré sur cinq pages, le mouvement réduit saute la cérémonie. |
| Preuve | La plupart des sites primés ont un thème clair plaqué ; celui-ci change la lumière d'une scène 3D. |
| Diffusion | L'éclat du disque, depuis le 13/09, est ce qui la rend trouvable. |

**À ronger.** Le miroir ne sert encore qu'à changer de face. Il pourrait
dire quelque chose : le Codex du Nord affirme que le miroir « ne reflète
pas, il révèle ou il ment ». Une phrase différente selon la face, dans le
Codex, fermerait la boucle pour rien.

---

## 6. Le monde réglé sur le réel

`lib/venus`, `aztec-year`, `lib/solar`, `lib/heure-du-lieu`,
`lib/boussole`, `lib/tonalpohualli`, `xiuhcoatl-companion`, `year-stones`,
`footer-aztec-year`.

| axe | état |
| --- | --- |
| Mythologie | Vénus est Quetzalcóatl et Xólotl, étoile du matin et du soir : le site la place où elle est vraiment. L'année mexica en cours est calculée chez le visiteur. Le jour du visiteur vient du tonalpohualli, avec sa corrélation et son débat. |
| Cinématographie | Invisible et décisif : les ombres tombent du bon côté, la lune se couche quand le soleil se lève. |
| Implémentation | Astronomie à quelques degrés près, sans dépendance et sans permission. Le fuseau donne la longitude. |
| Accessibilité | Rien à faire : ce sont des valeurs, pas des interactions. |
| Preuve | C'est la signature du site : un monde qui ne triche pas. |
| Diffusion | Quatre lignes de making-of qui valent mieux qu'une démo. |

**À ronger.** Le site sait tout cela et ne le dit presque jamais au
visiteur. Une ligne, une seule, quelque part : « ce soir, Vénus est
l'étoile du soir, et Xólotl passe ». Le savoir sans le dire, c'est du
travail perdu pour cinq des six axes.

---

## 7. La mémoire du visiteur

`lib/foyer`, `foyer-decision`, `lib/traces`, `traces-store`,
`traces-panel`, `premiere-visite`, `xolotl-spawn`, `xolotl-witness`,
`xolotl-codex-reader`, `easter-egg`.

| axe | état |
| --- | --- |
| Mythologie | Le feu du foyer qui ne s'éteint pas, le chien qui accompagne, le jour qui nomme. |
| Cinématographie | Revenir dans les quatre jours ne rejoue pas la cérémonie : la maison est déjà allumée. C'est la plus belle seconde lecture du site. |
| Implémentation | Tout en local, rien n'est envoyé nulle part : le site se souvient sans pister. |
| Accessibilité | Le carnet est une boîte de dialogue conforme, avec piège de focus et échappement. |
| Preuve | Respect de la vie privée démontré par le code, pas promis par une bannière. |
| Diffusion | Un argument fort pour un public sensible au pistage. |

**À ronger.** Le carnet ne se montre qu'à qui ouvre un bouton discret.
Huit traces, un jour nommé, un foyer qui se souvient, et personne ne le
voit. Piste : au retour d'un visiteur connu, une ligne à la place de « Tu
reviens au foyer », qui dise depuis quand.

---

## 8. Le son

`sound-design`, `lib/climax-chime`, `lib/envelope-clock`, `veil-sound-choice`.

| axe | état |
| --- | --- |
| Mythologie | Une ambiance par direction, un espace de réverbération par monde, un souffle pour le miroir, une mélodie pour la veille. |
| Cinématographie | Le son croise pendant les voyages : les couches se recouvrent au lieu de se couper. |
| Implémentation | Tout est écrit en Web Audio, rien n'est un fichier : aucun droit à régler, aucun octet à charger. |
| Accessibilité | Le son ne démarre jamais sans choix explicite, et se coupe d'un bouton. |
| Preuve | Très peu de développeurs frontend savent faire ça. |
| Diffusion | Inaudible dans une capture : c'est le grand absent des partages. |

**À ronger.** Le son n'existe pas hors du site. Une courte vidéo avec le
son, sur la page Projets ou dans le making-of, vaudrait plus que dix
captures. Et la lecture des cantares reste au backlog.

---

## 9. Le silence

`lib/veille`, `veille`, `veille-store`.

| axe | état |
| --- | --- |
| Mythologie | L'entrée à la vingtaine de secondes (les vingt signes, les vingt jours) ; le don à la 52e seconde, le xiuhmolpilli, la ligature des années. |
| Cinématographie | Le ma de Miyazaki : les textes s'effacent, la caméra dérive, le monde continue sans nous. |
| Implémentation | Rien n'est démonté, seule l'opacité bouge : le texte reste dans le DOM et accessible. |
| Accessibilité | Sous mouvement réduit, le fondu joue mais la caméra ne dérive pas. Tout geste rend le monde en moins d'une seconde. |
| Preuve | Savoir retirer son interface est plus rare que savoir en ajouter. |
| Diffusion | C'est le plan le plus beau à filmer du site. |

**À ronger.** Le don ne se voit presque pas : le cadre s'ouvre, une voix
grave passe, une trace s'inscrit. Il pourrait mériter un vrai geste de
scène, et c'est la seule décision de récit encore ouverte.

---

## 10. Le texte, le Codex, les sources

`cantar`, `lib/cantares`, `seuil-line`, `scene-text-overlay`,
`reveal-text`, `split-text`, `page-closure`, le Codex et ses onze sources.

| axe | état |
| --- | --- |
| Mythologie | Des chants réels, cités par folio, avec leur édition ; des fiches par direction ; ce qui est attesté est séparé de notre lecture, partout. |
| Cinématographie | Le texte apparaît par mots, se ferme par une clôture, et le chant monte à l'écran. |
| Implémentation | Trois langues complètes, y compris le Codex et ses sources. |
| Accessibilité | Le mode récit rend tout le texte lisible sans scène. |
| Preuve | La rigueur documentaire est ce qui distingue ce site d'un exercice de style. |
| Diffusion | Le Codex est déjà un contenu autonome. |

**À ronger.** Le Codex est une page ; il pourrait être une ressource. Les
onze sources, leurs liens vérifiés, et les fiches par direction feraient
un document que d'autres citeraient.

---

## 11. Les mondes dégradés

`lib/is-bot`, `lib/reduced-motion`, `reading-mode-toggle`,
`share-skeletons`, `not-found-reveal`, le mode sans JavaScript.

| axe | état |
| --- | --- |
| Mythologie | Aucune, et c'est bien. |
| Cinématographie | Aucune, et c'est bien. |
| Implémentation | Quatre contextes sans canvas tenus à jour : robots, Lighthouse, échec WebGL, mode récit. |
| Accessibilité | C'est l'axe entier. |
| Preuve | Le meilleur argument commercial du site, et le moins montré. |
| Diffusion | Invisible par construction. |

**À ronger.** Ces modes sont testés mais jamais montrés. Une capture
côte à côte, la scène et le mode récit, sur la page Accessibilité, et
l'argument devient démonstration.

---

## 12. Le grain

`custom-cursor`, `ollin-shockwave`, `cursor-reveal`, `tilt-cards`,
`mask-reveal`, `smooth-scroll`, `spirit-particles`, `stag-aura`,
`stag-mirror`, `fur-shells`, `arrow-vapor`, `piedra-ring-fire`.

Vus, sans seconde lecture, et c'est leur rôle : ils sont la matière de
l'interface, pas son propos. **Rien à ronger** : les approfondir les
transformerait en effets qui se remarquent, ce qu'ils ne doivent pas être.

---

## Ce que cet inventaire dit

Trois constats, dans l'ordre d'importance.

1. **Le site sait beaucoup de choses qu'il ne dit pas.** Vénus, l'année
   mexica, l'heure du lieu, le jour du visiteur, les huit traces, le foyer
   qui se souvient : tout cela tourne et presque rien n'atteint le
   visiteur. Le travail qui reste n'est pas de coder, c'est d'énoncer.
2. **L'accessibilité est notre avantage et notre angle mort.** Elle est
   partout dans le code, nulle part dans la vitrine. C'est l'axe qui sert
   à la fois le jury, la certification d'octobre et les clients de Nuada.
3. **Le grain est terminé.** Tout ce qui restait à ajouter à la surface a
   été ajouté. Ce qui reste est de la narration et de la preuve.
