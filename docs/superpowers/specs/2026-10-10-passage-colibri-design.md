# Le passage du colibri (Sud) : dessin

Date : 10/10/2026. Decision de Sylvain : « A » (le passage), apres le
brainstorm du 21/09 (« les colibris = la chose a avoir vue en quittant
Projets » ; quatre leviers, proximite / geste lisible / isolement / son ;
« tout est important » donc on sequence, on ne sacrifie pas).

## Le probleme, mesure

Cinq colibris a l'echelle 0,06 (choix de Sylvain, realiste) vivent dans une
boite x ±9, z -9..3, y 1,2..6,5 au-dessus du cerf. La camera du Sud en tete
de page est a ~11 u du cerf (rayon × 1,62, recul demande le 05/09) : aucun
oiseau ne passe jamais a moins de 8 u de l'objectif. Trois pixels. Le geste
du mythe (une fleche vise une etoile vivante, l'etoile tombe a l'arrivee,
`centzonStore.killedAt`, trace `huitzilin-catch`) se joue chez 5 visiteurs
sur 7 (visite-type du 13/09) et personne ne le voit : l'oiseau est
invisible et l'etoile qui tombe n'est reliee a rien pour l'oeil.

## Ce que le site montrera de plus

Une fois par arrivee au Sud, UN colibri quitte le groupe, vient en
stationnaire a 1,3 u devant l'objectif, en haut a droite du cadre, tient
2,5 s, puis file en fleche sur une etoile qui tombe a son arrivee. Trois
leviers en un moment : proximite (c'est la distance qui le rend lisible,
pas l'echelle), isolement (un seul), geste lisible (l'oeil est pose dessus
quand l'etoile tombe). Le son attend.

## Le dessin

### Quand

- Declenche a 4 s apres l'arrivee au Sud (la meme horloge que les etoiles :
  `arrivedAtRef`, posee quand `data-loaded` est vrai, + 0,5 s ; vaut pour
  l'arrivee par le voile comme par le voyage Nepantla).
- Seulement si le progres est encore dans la nuit : p < 0,5 (il reste des
  etoiles a prendre, la bataille n'a pas disperse les quatre cents). Si le
  visiteur a deja file plus bas : pas de passage, on ne force rien.
- Une fois par montage du composant (`MountForDirection is="turquoise"`) :
  l'etat repart avec lui, rien a stocker.
- Mouvement reduit : rien (dt = 0, la machine ne bouge pas).

### Qui

L'oiseau le plus proche de la camera a l'instant du declenchement, quelle
que soit l'espece.

### Le point

- A 1,3 u devant l'objectif, decale dans le repere camera de +0,35 u a
  droite et +0,15 u en haut : le cerf (au centre sur telephone, aux deux
  tiers au bureau avec la colonne de texte a gauche) n'est jamais couvert.
- Le point suit la camera chaque image (parallaxe, scroll, derive) : il
  reste pose devant l'oeil. Calcul pur : position + quaternion de la
  camera -> point monde.
- Echelle INCHANGEE (0,06 × espece). A 1,3 u un corps de 0,17 u fait
  ~130 px sur 800 px de haut a 45° : lisible, ailes floues, teinte.
- Vibration du stationnaire × 0,4 (0,12 u a cette distance serait un saut).
- Le stationnaire de visite ne subit pas les bornes de la boite (le point
  est hors boite, z ≈ 9,7).

### La sequence

approche (fleche, vitesse actuelle 9 u/s, ~1 s depuis la boite)
-> stationnaire 2,5 s devant l'objectif
-> fleche de chasse vers une etoile vivante devant la camera (la regle de
   proie existante : vivante, jetee, z < -0,2, 0,1 < y < 0,6)
-> l'etoile tombe a l'arrivee (`killedAt`, trace : inchanges)
-> l'oiseau reprend sa vie normale (hover/dart dans la boite).
Sans proie disponible : fleche vers une ancre de la boite ; l'oiseau est
quand meme venu.

### La lumiere (risque DA)

La nuit du Sud est a 0,18 : un oiseau sombre devant un ciel sombre est une
silhouette. Une emissive chaude est posee sur le materiau a la creation
(intensite 0 : aucune recompilation, `emissiveIntensity` est un uniform)
et monte a ~0,4 pendant la visite, fondu a l'aller et au retour : le
guerrier du soleil porte un eclat. **Le dosage se decide a la capture**,
pas au seuil.

## Ce qui ne change pas

- Aucun mesh, aucun appel de rendu, aucun programme en plus : les cinq
  memes oiseaux. La barre de perf n'a rien a voir de plus.
- `huitzilin.ts` reste pur et deterministe ; `stepBird` garde sa signature
  (la visite est un etat de plus dans `BirdState`, et un parametre
  optionnel).
- `centzon-store`, `centzon-stars`, les traces : inchanges.

## Oracles

- Lib pure (`vitest`) : le passage ne joue qu'une fois ; pas sous p ≥ 0,5 ;
  l'oiseau choisi est le plus proche ; la sequence des modes (approche,
  stationnaire, chasse, retour) ; le point devant la camera (position +
  quaternion -> monde, cas identite et cas tourne) ; la vibration reduite ;
  pas de borne de boite en visite.
- Capture (`.scratch/passage-colibri.mjs`) : attend
  `window.__huitzilinPassage` (`"stationnaire"`, puis `"prise"`), meme
  motif que `__huitzilinForward` ; une image au stationnaire, une a la
  prise ; bureau 1280 et Pixel 7 ; copiees dans Downloads. L'oeil de
  Sylvain decide (le dosage de l'emissive, le decalage, la duree).

## Hors de cette session (notes, pas d'engagement)

- B : la ligne de trace affichee sur le moment (« un colibri a pris une
  etoile »), pas seulement dans le carnet.
- C : le son, huitzilin = « qui bourdonne », spatialise, qui monte quand
  un oiseau est pres (le son est coupe par defaut sur le site).
