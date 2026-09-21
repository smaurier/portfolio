# La pose au repos : ce que voit un visiteur en mouvement reduit

*Constat et tentative, 20-21/09/2026. Rien n'est implemente : ce document
existe parce que la tentative a echoue d'une facon qui merite d'etre gardee.*

---

## 1. Le constat

L'intention est ecrite depuis le 28/08 et reaffirmee le 09/09 dans
`src/lib/reduced-motion.ts` : sous `prefers-reduced-motion`, le visiteur doit
voir **« une scene statique et lisible »**. Le canvas passe en frameloop
`demand`, l'arc ne progresse plus (`handleScroll` sort avant d'ecrire
`progressRef`), et la scene reste sur l'etat de l'arc **zero**.

Or a zero, deux directions n'ont aucune lumiere :

- **l'Est** : `eastDay(p)` rend 0 tant que `p <= EST_ARC.riseStart` (0,42).
  Le ciel ne s'eclaire qu'avec le soleil qui fait eclater le gel.
- **le Sud** : `remapSouthArc(0).day` vaut 0. C'est la nuit de Coatepec,
  avant la naissance de Huitzilopochtli.

L'Ouest part de `dayTop` (plein apres-midi) et le Nord de `TOP_LIGHT`.

**Mesure du 20/09**, sur les references de `regression-visuelle` -- qui sont
prises exactement dans ces conditions (mouvement reduit, theme sombre,
1280 x 720) -- part de pixels quasi noirs (< 8/255) dans la bande de scene,
interface exclue :

| direction | a 35 % de page | a 80 % | 
| --- | --- | --- |
| Ouest | 0 % | 0 % |
| Nord | 0,4 % | 0,4 % |
| Centre | 11 % | 79 % |
| Sud | **57 %** | 2 % |
| Est | **61 %** | **84 %** |

Statique, oui. Lisible, non, sur deux directions sur cinq.

---

## 2. Ce que le modele ne sait pas dire

Premier reflexe : garder la promesse par un test unitaire sur `dayAtArc` et
`lightPAtArc`. **Le modele ment dans les deux sens** face a la mesure :

| direction | clarte du modele a l'arc 0 | mesure |
| --- | --- | --- |
| Centre | 0 (noir) | 11 % -- se lit |
| Sud | 0,18 (correct) | 57 % -- ne se lit pas |

Le Centre se lit par son champ d'etoiles, que ce modele ne decrit pas ; le
Sud a une lampe de nuit qui n'eclaire rien de visible. Tordre le seuil pour
reconcilier les deux aurait fabrique un test qui ne garde que son propre
reglage. **La lisibilite se mesure sur le rendu, pas sur les courbes.**

---

## 3. La tentative, et pourquoi elle a echoue

L'idee : sous mouvement reduit, poser l'arc au **moment signature** de la
direction au lieu de zero. Ce n'est pas du mouvement -- rien ne bouge,
l'image est simplement prise ailleurs. Les valeurs ne s'inventent pas, elles
sont les constantes du dessin :

| direction | pose | pourquoi |
| --- | --- | --- |
| Est | `FROST.shatterAt` = 0,55 | la glace eclate, le soleil se leve |
| Sud | `SUD_ARC.battleEnd` = 0,52 | la bataille finit, Huitzilopochtli est ne et arme |
| Centre, Nord, Ouest | 0 | deja lisibles ; la penombre du Centre est son ouverture voulue, et c'est la page que le jury charge en premier |

Implemente le 21/09 dans `relireMouvement` (scene-refs-context), la ou le
mouvement reduit se decide. **Resultat mesure : `progressRef` vaut bien 0,55
a l'Est et 0,52 au Sud -- et l'image reste noire.**

La cause : le canvas tourne en frameloop `demand` et ne redessine pas ; et
surtout, **quarante composants court-circuitent `reducedMotionRef`** pour
poser eux-memes leur valeur gelee (le motif est visible dans
`environment-depth-fade` : « sous mouvement reduit, le canvas cesse de
rendre : un fondu progressif resterait fige a mi-chemin, on pose la valeur
d'arrivee tout de suite »). Ecrire une position d'arc dans un ref que ces
quarante-la ne relisent pas ne change rien a l'ecran.

**Le piege qu'il fallait voir** : l'oracle ecrit pour garder cette pose
verifiait que `progressRef` valait 0,55. Il serait passe au VERT pendant que
le visiteur regarde un ecran noir -- vert par accident, precisement ce que
ce depot refuse. La tentative a donc ete retiree entierement plutot que
livree.

---

## 4. Ce qu'il resterait a faire, si on le fait

Ce n'est pas un correctif, c'est une passe : il faut decider, direction par
direction, ce que chacun des composants concernes montre au repos. Trois
chemins, par cout croissant :

1. **Ne rien faire.** La nuit de Coatepec et le gel de l'Est sont des images
   justes ; le mode recit accessible reste l'alternative offerte, et le
   texte est entier dans le DOM. C'est defendable, et ca se dit.
2. **Rendre une image, une fois.** Sous mouvement reduit, demander un rendu
   apres avoir pose l'arc, et verifier lesquels des quarante composants
   suivent `progressRef` plutot qu'une constante. Le cout est dans
   l'inventaire, pas dans le code.
3. **Une pose par direction, assumee comme une image de DA**, avec les
   quarante composants ranges derriere -- c'est-a-dire une passe de la
   famille « rendre visible ce qui existe », a placer apres le Sud.

**Ce qui ne doit PAS etre refait** : un oracle sur `progressRef`. La seule
garde qui vaille ici se prend sur des pixels, et `regression-visuelle` est
deja au bon endroit pour la porter -- ses references sont prises en
mouvement reduit.

---

## 5. Lien avec le reste

- L'arbitrage du 20/09 sur le son (`docs/da/arc-dure-la-page.md` section 3) :
  le bourdon du Sud gele avec la scene, a sa valeur de nuit. Si une pose
  etait adoptee un jour, il deviendrait audible a cette pose -- les deux
  decisions se tiennent.
- La mesure du 20/09 vient des references regenerees ce jour-la, apres la
  decouverte que les anciennes dataient d'avant que le mouvement reduit
  s'applique reellement au test (voir l'en-tete de
  `tests/e2e/regression-visuelle.spec.ts`).
