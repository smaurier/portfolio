# Etat de l'art et budget technique

Analyse du 08/09/2026 : ce que font les sites primes, COMMENT c'est fait, ou
nous en sommes, et dans quel budget la page d'accueil doit tenir. Complete
l'etude concurrentielle du 19/08 (panel de 23 sites, conclusion : la scene
tient la comparaison sur le fond, l'ecart etait qu'elle ne menait nulle part
— ecran de chargement, repli mobile, sortie de scene, tous trois traites
depuis).

## Les sept constantes des laureats

Sources : analyses techniques de laureats Awwwards/CSS Design Awards
2025-2026 (Utsubo, « Best Three.js Websites 2026 » ; Hon Tran, « WebGL
Website Examples : The Code Behind Them »).
<https://www.utsubo.com/blog/best-threejs-websites-2026>
<https://www.hontran.dev/blog/webgl-website-examples>

1. **Une seule idee dure, executee proprement.** La phrase qui revient
   partout. Oryzo : « un seul objet heros rendu en direct avec un vrai poids
   et de l'inertie ». IVRESS : « le mouvement est delibere, le graphe de
   scene est budgete, pas force ». Ils refusent d'empiler.
2. **La camera traverse une vraie profondeur au scroll**, pas des calques
   qui glissent (Oryzo : « la camera avance en Z, pas des couches 2D »).
   → nous l'avons.
3. **Chaque section est un moment mis en scene : entree, tenue, sortie**
   (Shopify Editions : « chaque section est son propre moment »).
   → c'est notre arc en actes.
4. **Le curseur revele du detail dans la geometrie et la lumiere**
   (Hubtown : « le curseur decouvre le detail »). → nous l'avons depuis le
   18/08.
5. **Des pieces modulaires, une par sujet** (Cartier Watches & Wonders :
   six alcoves 3D, une par montre). → nous avons cinq directions, meme
   architecture.
6. **Une partition Web Audio comme couche narrative, et des gestes caches
   qui recompensent l'exploration** (Cartier). → nos traces et l'easter egg
   oui ; le SON non : generique et coupe par defaut. **Notre plus gros ecart
   de conception.**
7. **Les disciplines qui separent les laureats** : instanciation, **lumiere
   precalculee**, collisions BVH, chargement differe du paquet 3D avec du
   HTML utile d'abord, densite de pixels plafonnee, textures compressees
   (KTX2/Basis), geometrie compressee (Draco/meshopt), rendu seulement quand
   c'est visible, `prefers-reduced-motion` respecte.

Note stratégique : IVRESS livre un moteur **WebGPU avec repli WebGL, shaders
ecrits une seule fois en TSL**. C'est exactement la branche `webgpu` garee le
06/09. Elle n'est pas perdue : c'est la direction que le metier a prise.

## Ou nous en sommes, discipline par discipline

| Discipline | Etat |
| --- | --- |
| Instanciation | OK (herbe, lames, fleches, eclats, dards) |
| Densite de pixels plafonnee | OK (`perfProfile.dprCap`) |
| Post-traitement conditionnel | OK (`perfProfile.postFx`) |
| `prefers-reduced-motion` | OK, reellement respecte partout |
| Rendu a la demande | Partiel : `frameloop` passe en « demand » quand l'onglet est cache (28/08) |
| Geometrie compressee | Partiel : `stag.glb` est en meshopt ; les autres non verifies |
| Textures compressees | NON : aucun KTX2/Basis (mais 1 Mo au total, faible priorite) |
| **Lumiere precalculee** | **NON : tout est en temps reel** |
| **Chargement differe du 3D** | **NON : voir le probleme des preloads ci-dessous** |
| Son comme couche narrative | NON |

### Lumiere precalculee : la nuance qui compte

On ne peut pas tout cuire : la lumiere change par direction ET avec l'arc du
scroll, c'est le sujet meme du site. Mais l'**occlusion ambiante** est
independante de la lumiere. La cuire dans les sommets du decor statique
(sol, montagnes, flore de fond, Piedra) donnerait du relief gratuit et
allegerait le temps reel. C'est la version applicable de la discipline.

## Le budget mesure (08/09, poste de dev, 1280x800, DPR 1)

| Page | Appels de rendu / image | Triangles / image | Programmes | Geometries | Textures |
| --- | --- | --- | --- | --- | --- |
| Accueil (jade) | **133** | **316 000** | 42 | 49 | 43 |
| Contact (Ouest) | **415** | **351 000** | 51 | 178 | 70 |

Methode : `gl.info.autoReset = false`, reset, moyenne sur trois images
(`.scratch/drawcalls.mjs`). Lire `info.render` sans desactiver l'auto-reset
ne renvoie que la derniere passe de post-traitement (1 appel, 1 triangle) :
piege a connaitre.

Ordre de grandeur utile : un mobile milieu de gamme tient a peu pres 100 a
200 appels de rendu et 200 a 300 000 triangles avec des shaders simples.
**L'accueil est a la limite haute, l'Ouest est au-dela.** Les fps mesures au
meme moment ne veulent rien dire sur ce poste (6, 51 puis 19 sur la meme
page apres une longue session) : la seule mesure qui comptera est celle sur
telephone reel, en USB (cf ordre de travail decide le 07/09).

## Le probleme trouve, et CORRIGE le 08/09 (commit 90ab019)

A l'ouverture de `/fr`, le reseau montre **les douze modeles GLB**
demandes, dont `xolotl.glb` (1,9 Mo), `cihuateotl.glb` (1,5 Mo),
`xiuhcoatl.glb` (0,8 Mo) et `hummingbird-poly.glb` (0,2 Mo) — c'est-a-dire
les modeles de l'Ouest, du Nord et du Sud, qui ne s'affichent pas sur
l'accueil. Soit 5,7 Mo de modeles pour une page qui en utilise moins de la
moitie.

Cause : les appels `useGLTF.preload(...)` et `useTexture.preload(...)` sont
au niveau MODULE (seize occurrences). Ils partent donc a l'IMPORT du
fichier, pas au montage du composant, et `scene-content.tsx` importe les
trente-neuf composants de toutes les directions.

Correctifs possibles, du moins au plus lourd :
1. Deplacer les preloads dans un effet conditionne par la direction
   courante (le composant sait deja s'il est concerne) ;
2. Precharger la direction VOISINE seulement, au survol du lien cardinal :
   on garde la navigation instantanee sans payer a l'arrivee ;
3. Charger les composants de direction en `dynamic()`/`lazy` pour sortir
   aussi leur code du paquet de l'accueil.

**CORRIGE le 08/09, commit 90ab019.** Il fallait traiter DEUX causes et non
une : les composants de direction etaient montes sur toutes les pages, ET
leurs preloads etaient au niveau module. Gater le montage seul ne suffisait
pas, le telechargement continuait. Correctifs 1 et 2 de la liste ci-dessus
appliques, via  et
. Mesure apres : l accueil demande 8
modeles au lieu de 12, 1,25 Mo au lieu de 5,68 Mo, et les appels de rendu ne
bougent pas (133 -> 131), donc le gain est en octets et non en temps par
image. Le correctif 3 (/) n a PAS ete fait : il reste
disponible si on veut aussi sortir le code des composants du paquet.

Reste a traiter, trouve le 08/09 au soir : six fichiers  sont
suivis dans  et donc SERVIS en production pour rien, 2,6 Mo.

C etait le plus gros gain disponible, et il tombait au bon moment :
l'accueil est a la fois la page la plus riche a venir (cf
docs/da/centre-sources.md) et la premiere que le jury charge.

## Ce que l'analyse dit du chantier du Centre

- **Une seule idee** : le feu. Les neuf elements listes dans le brief du
  Centre ne tiennent que s'ils sont tous des consequences du feu. Neuf
  elements juxtaposes, c'est une demo ; neuf consequences d'une cause, c'est
  une scene.
- **Entree, tenue, sortie** : foyer froid a l'arrivee, geste qui fore le
  feu, la pierre s'allume et la memoire des quatre soleils avec elle, les
  traces s'allument, le regard monte au zenith.
- **Le son commence ici** : le feu qui crepite est le bon endroit pour
  ouvrir enfin la couche sonore.
- **Progressivite obligatoire** : le foyer d'abord, le reste en s'eveillant,
  sinon on paie au chargement ce qu'on gagne en impression.
