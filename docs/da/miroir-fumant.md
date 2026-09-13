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
2. **La scene refletee** (a faire) : `useTheme()` cote scene ; un rig
   « reflet » commun : ciel clair (le zenith du site, la brume en
   papier), exposition et lumiere ambiante montees, brouillard clair,
   grade desature ; les panneaux de texte reprennent leur transparence
   suivant `--scene-lum`.
3. **Direction par direction** (a faire) : ce que chaque monde devient dans
   le miroir, sans trahir son arc (l'Est commence gele et de nuit, l'Ouest
   finit dans le noir : le reflet inverse la lumiere, pas le recit).
