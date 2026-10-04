# La nuit mobile : design (04/10/2026)

## 0. Le constat, mesure

Le 04/10 a 01h, premiere ouverture du site sur un vrai telephone (Redmi
Note 9 Pro de Sylvain, Android 12, Chrome 154, Adreno 618, 392 x 732 CSS,
dpr 2,75), en face sombre : l'accueil et Projets sont quasi noirs. On
distingue des etoiles, un peu d'herbe, pas le cerf, pas le foyer ; les
boutons de scene sont des disques noirs sur noir. Sylvain : « on a des
boutons et des parties toutes noires ».

Ce n'est pas le GPU du telephone. Le Chromium du PC en emulation Pixel 7
produit la meme image ; et un A/B sur le PC tranche : la meme page sombre
a **769 px** de large montre la nuit du Centre eclairee (braises qui
luisent, disque du sol, foyer), a **767 px** elle est noire. Deux pixels,
meme code, meme GPU : c'est le palier `QUALITY_MOBILE` de
`src/lib/scene-controls.ts`, choisi sous 768 px par
`src/lib/mobile-perf.ts`, qui coupe le post-traitement (`postFx: false`),
les ombres, et baisse la densite.

Ce que le post-traitement apportait a la nuit (`post-fx.tsx`) : un Bloom
a seuil de luminance 0,35 (flou en mipmaps) qui fait rayonner la carte
emissive du disque du sol (`piedra-ground.tsx`), les sprites de braise des
braseros (`copal-braziers.tsx`) et les speculaires du cerf, plus un grade
de saturation. Sans lui, ces emissifs restent a leur valeur brute, sous
ce qu'un ecran de telephone rend visible. Les lumieres elles-memes sont
identiques sur les deux profils : ambiante 0,35 et directionnelle 0,5 a
l'arc zero (`reveal-arc.ts`), point de lumiere du foyer a 40, portee 7,
decroissance 2 (`copal-braziers.tsx`, `persistentLights.ember`).

Le meme telephone, mesure par la sonde adb (meme tracage que la barre,
balayage de six secondes, budget 33 ms) : accueil **263 images perdues**,
68 au-dela, pire 134 ms, p5 8,6 fps. Rallumer le Bloom n'est pas une
option : c'est une passe plein ecran de plus sur un appareil deja a dix
images par seconde.

## 1. La cible, decidee par Sylvain (04/10)

- **Ce que montre la premiere image de nuit sur telephone** : le cerf et le
  foyer lisibles. On distingue la silhouette du cerf, la lueur du foyer au
  sol et les braises. Pas forcement le meme rayonnement qu'en bureau, mais
  les trois sujets de la penombre sont la. C'est la promesse du texte
  (« penombre », pas « noir »).
- **Le prix** : zero image de plus sur le vrai telephone. Le remede est
  fait de lumieres, d'emissifs et d'exposition ; aucune passe plein ecran,
  aucun appel de rendu en plus.
- **Le bureau ne bouge pas** : tout facteur vaut 1 quand le profil porte
  le post-traitement.

## 2. L'approche retenue : compenser ce que le Bloom ajoutait

Une lib pure, `src/lib/nuit-mobile.ts`, rend trois facteurs a partir du
profil de performance et du progres de l'arc :

```ts
export type CompensationNuit = { ambiant: number; emissif: number; exposition: number };
export function compensationNuit(profil: { postFx: boolean }, progress: number): CompensationNuit;
```

- Si `profil.postFx` est vrai : `{ ambiant: 1, emissif: 1, exposition: 1 }`,
  toujours. Le bureau et le mode eco avec post-traitement ne voient rien.
- Sinon, chaque facteur part de sa valeur de nuit a l'arc zero et rejoint
  1 sur la meme courbe que la lumiere de l'arc (`easeWithinRange` entre
  `PHASE_START.penombre` et `PHASE_START["chemins-reveles"]` de
  `reveal-arc.ts`) : la compensation n'existe que la ou le Bloom manquait,
  la nuit, et s'efface quand le jour se leve de lui-meme.
- Valeurs de depart, a doser a l'oeil contre la capture a 769 px, puis a
  figer dans la lib avec leur preuve : ambiant **1,6** (0,35 → 0,56 a
  l'arc zero, au-dessus du seuil de 0,3 ou le cerf tombe a (0,0,0), note
  de `reveal-arc.ts`), emissif **2,5** (le disque du sol et les braises),
  exposition **1** (`toneMappingExposure`).
- **L'ordre des leviers, et pourquoi** (04/10, doute nomme et accepte) :
  l'exposition est globale, elle eclaircit aussi le ciel, le brouillard et
  les etoiles, et transformerait la penombre en nuit grise. On dose donc
  d'abord ce qui eclaire LOCALEMENT (le point de lumiere du foyer, les
  braises, le disque du sol), puis l'ambiante, et l'exposition reste a 1
  tant que le cerf est lisible sans elle. Si elle doit monter, elle ne
  depasse pas 1,15, et la capture a 769 px reste le juge de la penombre.
- Ces nombres sont des hypotheses, pas des mesures. Ce qui est mesure :
  l'ecart 767 / 769 (section 4) et la cible « cerf et foyer lisibles »,
  validee a l'oeil par Sylvain. Deux ou trois allers-retours de captures
  sont attendus ; l'oracle garde le niveau une fois le dosage accepte.

Les consommateurs, chacun une ligne :

| ou | quoi | aujourd'hui |
| --- | --- | --- |
| `reveal-lighting.tsx` ligne 221 | `ambientRef.current.intensity *= c.ambiant` | `getAmbientIntensity(p) * rig.ambientScale * reflet.ambientScale` |
| `copal-braziers.tsx` ligne 147 | `b.ember.material.opacity = 0.55 * lit * flicker * c.emissif` (borne a 1) | sans facteur |
| ~~`piedra-ground.tsx`~~ | retire a la lecture du code (04/10) : le disque n'a PAS d'emissif (`PIEDRA_NEUTRAL`, opacite 0,1, or de l'Est seulement) ; en bureau sa lueur vient du Bloom sur le sol eclaire par le foyer. Son levier mobile est donc le foyer (`c.ambiant` sur `hearth.intensity`), pas un uniform | |
| `copal-braziers.tsx` ligne 129 | `hearth.intensity = HEARTH_LIGHT * intensity * pulse * c.ambiant` | sans facteur |
| un composant mince `NuitMobile` dans le `Canvas` de `persistent-scene.tsx` | `gl.toneMappingExposure = c.exposition` a chaque image | 1 |

Le facteur se calcule UNE fois par image dans `NuitMobile` et se depose
dans un store simple (`nuit-mobile-store.ts`, meme motif que
`refletStore`) ; les consommateurs le lisent. Loi 1 : la mecanique est
pure et testee ; les composants ne font que lire et appliquer.

**Ce qui n'est pas fait** : pas de Bloom allege (budget), pas de pose de
nuit dediee (recoupe « pose au repos », tranchee pour apres le Sud), pas
de changement des lumieres du bureau, pas de changement du seuil 768.

## 3. Ce que ca ne doit pas casser

- Le bureau : la barre `perf-bureau` tenue (aucun chemin de code ne change
  quand `postFx` est vrai, les facteurs valent 1).
- Le telephone emule : `perf-telephone` tenue dans son enveloppe.
- Le vrai telephone : zero image de plus, mesure (section 5).
- La loi « rien ne disparait » : rien n'est retire, on ajoute de la
  lumiere.
- Le mouvement reduit : l'arc reste a zero, la compensation est a son
  maximum, c'est exactement la pose qu'on veut lisible.

## 4. L'oracle, sur des pixels

`tests/e2e/nuit-mobile.spec.ts` (suite e2e par defaut, serveur de dev,
comme `regression-visuelle`). Face sombre (`colorScheme: "dark"`),
mouvement reduit (`reducedMotion: "reduce"`, l'arc figé a zero), texte
masque (`?scene=1`, lu quelle que soit la version du lien), `?shaders-prod`
pour la poignee `__nahualR3f`. Deux fenetres de meme hauteur (839) : **767
px** (profil mobile) et **769 px** (profil bureau). On attend
`data-foyer=done`, deux secondes, puis on lit le tampon de dessin du
canvas (`preserveDrawingBuffer: true` est deja pose ;
`gl.readPixels` est permis dans `tests/`, pas dans `src/`).

Deux mesures, sur la moitie basse du canvas (la ou vivent le sol, le
foyer et le cerf ; la moitie haute est le ciel etoile, noir par
construction) :

1. **la part de pixels quasi noirs** (max des trois canaux < 12/255) ;
2. **la luminance mediane** (0,2126 R + 0,7152 G + 0,0722 B).

Le verdict compare le mobile au bureau mesure dans la meme passe, jamais a
un nombre choisi : **la part de noir du mobile ne depasse pas celle du
bureau de plus de 10 points, et sa luminance mediane atteint au moins 70 %
de celle du bureau.** Les deux seuils sont ecrits dans le test avec la
mesure du point zero a cote (rouge aujourd'hui : a lire a la premiere
passe, attendu : noir mobile >> noir bureau).

Un rouge imprime les deux mesures pour les deux largeurs. Le test lit des
PIXELS, pas `progressRef` (lecon de `pose-au-repos.md`).

Dosage a l'oeil : les captures 767 px avant / apres et la capture 769 px
sont jointes a la relecture de Sylvain ; c'est lui qui dit « le cerf et le
foyer sont la ». L'oracle garde le niveau une fois le dosage accepte.

## 5. La mesure sur le vrai telephone

Avant et apres, sur le Redmi, sonde `.scratch/adb-barre.mjs` (balayage de
`fr`, six secondes, budget 33 ms), **trois courses chacune**, mediane des
perdues et du p5. Acceptation : la mediane des perdues apres ne depasse
pas celle d'avant de plus de l'ecart observe entre les trois courses
d'avant. Si l'ecart depasse, le remede coute des images et on revient a la
section 2 (l'exposition est gratuite ; l'emissif et l'ambiante aussi ; si
quelque chose coute, c'est qu'un chemin de code a bouge ailleurs).

Chiffres dans le message de commit et dans `docs/harnais.md` (ligne du
vrai telephone).

## 6. Criteres d'acceptation

1. `src/lib/nuit-mobile.ts` existe, pure, testee a l'unite : facteurs a 1
   si `postFx`, valeurs de nuit a l'arc zero sinon, 1 au-dela de
   `chemins-reveles`, monotones entre les deux.
2. L'oracle `nuit-mobile.spec.ts` a ete vu rouge avant le dosage (chiffres
   dans le commit), vert apres.
3. Sylvain a valide les captures 767 px apres contre 769 px : « le cerf et
   le foyer sont la ».
4. `pnpm run perf` tenue ; `pnpm run perf:telephone` tenue.
5. Vrai telephone : trois courses avant, trois apres, mediane des perdues
   dans l'ecart.
6. `docs/harnais.md` et `project_nahual_da` (memoire) portent les chiffres ;
   `docs/da/pose-au-repos.md` renvoie ici pour la nuit mobile.
