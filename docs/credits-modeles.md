# Origine et licence de chaque modele 3D

Etabli le 09/09/2026. **Regle posee : plus aucun fichier n'entre dans
`public/models` sans sa ligne ici et son attribution dans la page de credits
du site, dans le meme commit.**

Pourquoi ce fichier : la page de credits du site etait deja soigneuse (elle
attribue correctement le colibri en CC BY 3.0, nomme les auteurs du ciel de
Poly Haven, et distingue ce qui est modelise par script pour le site), mais
elle raisonnait par familles. Deux fichiers sur treize n'etaient couverts par
aucune ligne nommee, et il n'existait aucune correspondance fichier par
fichier ou verifier. Le site est public et il porte le nom de Sylvain.

| Fichier | Origine | Licence |
| --- | --- | --- |
| `stag.glb` | Quaternius | CC0 |
| `cihuateotl.glb` | Quaternius, habille pour le site (jupe simulee, pantalon du modele masque, cf `docs/da/ouest-sources.md`) | CC0 |
| `agave.glb` | Quaternius | CC0 |
| `nopal-quaternius.glb` | Quaternius | CC0 |
| `cactus-quaternius.glb` | Quaternius | CC0 |
| `flowers-quaternius.glb` | Quaternius | CC0 |
| `cactus-barrel.glb` | Quaternius | CC0 |
| `corn.glb` | Quaternius | CC0 |
| `vine-flower.glb` | Quaternius | CC0 |
| `hummingbird-poly.glb` | Poly by Google, recolore par espece | **CC BY 3.0**, attribue dans les credits du site |
| `nopal-google.glb` | archive Poly by Google, meme source que le colibri | **traite comme CC BY 3.0**, voir la note ci-dessous |
| `xiuhcoatl.glb` | modelise par script pour ce site, `tools/blender/xiuhcoatl.py` | notre travail |
| `xolotl.glb` | Xoloitzcuintle de Nyilonelycompany, achete sur Fab.com, teinte en obsidienne | licence Fab.com, achat |

## La note sur `nopal-google.glb`

Son nom indique l'archive Poly by Google, dont le catalogue est en licence
**MIXTE CC0 / CC BY**, et la fiche d'origine n'est plus consultable depuis la
fermeture de Poly en 2021 (le successeur non officiel Poly Pizza en heberge
une partie). Faute de pouvoir verifier la licence exacte du fichier, il est
traite comme **CC BY 3.0** et attribue comme tel : attribuer une ressource
CC0 ne coute rien, ne pas attribuer une ressource CC BY est une faute. Si la
fiche d'origine est retrouvee un jour, on precisera.

## Ce qui n'est pas un modele mais porte une licence

- `public/sky/sud-sky.jpg` : « Kloofendal 48d Partly Cloudy (Pure Sky) » de
  Greg Zaal et Jarod Guest, Poly Haven, CC0, teintee pour la scene.
- Les fleurs de cempasuchil du Nord, l'ocotillo et les lianes sont generes
  proceduralement : notre travail, aucun fichier.

## Compression : a faire

`docs/da/etat-de-l-art.md` note que `stag.glb` est en meshopt et que les
autres ne sont pas verifies. Choix arrete le 09/09 : **meshopt et non Draco**
pour nos modeles, parce que Draco ne compresse QUE la geometrie alors que
meshopt compresse aussi les animations et les morph targets, et decode plus
vite sur un telephone milieu de gamme, ou le decodage Draco peut se voir
comme un a-coup. Candidats par priorite : `xolotl.glb` (1,9 Mo, le plus gros
du site) puis `xiuhcoatl.glb` (780 Ko, skinne, 22 os).
