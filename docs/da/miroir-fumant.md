# Le miroir fumant : les deux faces du monde

**Ouvert le 13/09/2026** (Sylvain : « fais-moi un bouton pour switcher au
light theme [...] fidele au theme mythologique [...] de grosses allusions
au miroir fumant [...] une vraie transition cinematographiee aux deux
passages »). Dernier enrichissement du site. Meme rigueur que les
directions : ce qui est atteste, ce qui est notre lecture.

## L'idee

Le site est ne dans la nuit : le voile est « la nuit du rite », le foyer
brule dans le noir, l'obsidienne garde le Nord. Le theme clair ne peut donc
pas etre un « mode jour » d'interface plaque dessus. C'est **l'autre face**,
le monde vu dans le **tezcatl**, le miroir de Tezcatlipoca, que le Codex du
site decrit deja au Nord : « il ne reflete pas, il revele ou il ment ».
Retourner le miroir, c'est voir le reflet du monde ; la fumee qui le couvre
et se retire est le geste qui passe d'une face a l'autre. Dans les deux
sens, la meme ceremonie.

## Ce qui est atteste

- **Tezcatlipoca, « miroir fumant »** (tezcatl, miroir ; ihpoca, fumer) :
  le dieu au miroir d'obsidienne, lie a la nuit, au jaguar, au Nord. Sahagun,
  *Historia general*, livre I (les dieux) et livre VI (les prieres a
  Tezcatlipoca, « le seigneur du proche et du pres ») ; le miroir
  d'obsidienne comme objet de divination, et les miroirs conserves (British
  Museum, le miroir dit de John Dee, obsidienne mexicaine).
- **Le couple noir / blanc est cardinal** : l'*Historia de los mexicanos por
  sus pinturas* nomme quatre Tezcatlipocas, fils d'Ometeotl : le rouge
  (Est), le NOIR (Nord), le blanc qui est **Quetzalcoatl** (Ouest), et le
  bleu qui est Huitzilopochtli (Sud). Le noir et le blanc sont freres et
  adversaires ; les deux faces du monde sont deja deux directions du site.
- **Ometeotl, le « dieu deux », et Omeyocan, « le lieu de la dualite »**, le
  ciel le plus haut : la dualite comme principe (Leon-Portilla, *La
  filosofia nahuatl*, ch. II). Le site n'en montre rien : il en vit.
- **Deja a l'ecran** : Xolotl et Quetzalcoatl sont jumeaux, etoile du soir
  a l'Ouest, etoile du matin a l'Est, la meme planete reglee sur le vrai
  ciel (lib/venus). Le miroir ne fait que nommer cette dualite.

## Ce qui est notre lecture

- Le theme clair comme reflet dans le miroir : aucune source ne dit que le
  monde vu dans le tezcatl est clair. C'est une licence, dite ici.
- La fumee comme passage : le miroir « fume » dans son nom ; en faire la
  transition est notre geste.
- Aucun glyphe, aucune figure : le bouton est un disque d'obsidienne poli,
  la fumee est de la fumee. Rien de sacre n'est copie (regle du site).

## Ce que le jury et l'etat de l'art demandent d'un theme (2026)

- La preference se persiste et se pose AVANT le premier paint (script
  inline) : aucun eclair de mauvaise face. Fait.
- `color-scheme` et `theme-color` suivent la face (barres du navigateur,
  controles de formulaire, defilement). Fait.
- Contraste 4,5:1 sur les deux fonds, mesure contre le fond reellement
  peint (e2e `miroir.spec.ts`, cinq pages). Fait.
- Mouvement reduit : pas de ceremonie, la face change tout de suite
  (RGAA 13.6). Fait.
- Les quatre contextes sans canvas (robots, Lighthouse, crash WebGL, mode
  recit) doivent rester lisibles sur les deux faces : ils lisent les memes
  jetons, et le mode recit a son fond en jeton. A verifier a chaque lot.
- La transition par View Transitions (cercle depuis le bouton) est le
  patron courant ; ici la ceremonie est plus longue et plus dessinee (la
  fumee), donc un canvas plutot qu'un `clip-path`, et elle ne depend
  d'aucune API recente.
- Choix assume : la nuit reste la face par defaut, quelle que soit la
  preference systeme. Le site est une nuit ; le miroir se retourne a la
  main. Si un jure sous preference claire s'en plaint, c'est une ligne dans
  `layout.tsx` (lire `prefers-color-scheme` a defaut de memoire).

## Les trois lots

1. **Le disque, les jetons, la fumee, les tests** (fait le 13/09) :
   `lib/theme` (pur, teste : phases de la fumee, memoire), `theme-store`,
   `miroir-fumant.tsx` (canvas au cinquieme, bruit de valeur, le monde
   change au milieu de la tenue), `theme-toggle.tsx` (bandeau et menu
   mobile), jetons de la face claire dans `globals.css`, les cinq blocs
   `prefers-color-scheme` passes par attribut (la nuit ne dependait plus de
   la preference systeme pour le fond, mais SI pour les fonds des
   directions : corrige), le souffle sonore sur `nahual:miroir`.
2. **La scene refletee** (fait le 13/09) : `lib/reflet` (pur, teste : a
   k = 0 l'identite, la nuit ne bouge pas d'un poil) et `refletStore`, la
   part de reflet lissee une fois par image par le rig de lumiere
   (`reveal-lighting`, qui lit `useTheme()`), composee PAR-DESSUS les rigs
   de direction : brume de papier qui garde un souvenir de la direction
   (far x 0,85, le near ne bouge pas : le brouillard ne touche jamais la
   scene proche), ambiante x 2,2 teintee papier, directionnelle x 1,15,
   grade (saturation -0,2, cadre ouvert -0,3, bloom x 0,45, `post-fx`),
   Voie lactee effacee, et la couleur de clear du renderer qui suit la
   face. Ce dernier point est une decouverte : la chaine d'effets sort un
   noir OPAQUE la ou rien n'est dessine (alpha 255 mesure au readPixels,
   quel que soit l'alpha de clear), le sol CSS ne s'est donc jamais vu a
   travers le canvas ; la nuit le cachait. Mesure e2e `reflet.spec.ts` :
   luminance moyenne d'une zone du canvas, claire dans le miroir (> 0,45),
   sombre la nuit (< 0,25), et claire apres la ceremonie sans
   rechargement. Les panneaux de scene restent a 0,82 de papier sur la
   face claire : a revoir avec l'oeil de Sylvain maintenant que la scene
   est claire derriere (peut-etre suivre `--scene-lum` comme la nuit).
3. **Direction par direction** (a faire, avec l'oeil de Sylvain) : ce que chaque monde devient dans
   le miroir, sans trahir son arc (l'Est commence gele et de nuit, l'Ouest
   finit dans le noir : le reflet inverse la lumiere, pas le recit).

## Ce que la premiere capture du reflet a montre (13/09)

- Centre en tete de page : le cerf dans une brume de papier, les
  montagnes en gris, le foyer chaud a mi-arc : le « dessin sur amate ».
- Est : l'aube rose sur le monde gele tient telle quelle (le dome de ciel
  garde ses couleurs : lot 3 si Sylvain veut un reflet plus franc).
- Sud : brume blanche, Piedra turquoise, serpent orange : franc.
- Ouest : au tiers de l'arc, le monde est presque tout papier ; le cerf se
  lit, pale. A regarder avec Sylvain (l'arc de l'Ouest va du clair au
  sombre : dans le miroir, il finit dans la nuit ?).
- Nord : le cerf d'obsidienne sur le papier, les lames noires : la plus
  belle face du miroir. Le ciel du Mictlan (texture cuite) reste a
  refleter (lot 3).
