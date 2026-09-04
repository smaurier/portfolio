# Outils Blender (pilotage sans interface)

Modeles construits par script, reproductibles, versionnes ici plutot que
comme fichiers .blend. Blender 5.1 est installe sur SYLVAIN-PC dans
`C:\Program Files\Blender Foundation\Blender 5.1\`.

## xiuhcoatl.py

Le serpent de feu du Sud, modelise d'apres les references de
`docs/da/sud-sources.md` (rien de repris des scans, tout est construit en
courbes et primitives) : corps segmente, crete de flammes, museau en
volute, yeux, crocs, pattes avant griffues, queue en signe de l'annee.
Squelette de 16 os, actions `Slither` (48 images) et `Idle` (72 images),
export GLB avec animations, rendus de controle.

```
"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --python tools/blender/xiuhcoatl.py -- public/models/xiuhcoatl.glb <dossier_rendus>
```

### Skinning : poids calcules par le script, pas par Blender

Le mesh est une reunion de dizaines de coques disjointes (tubes, boites,
perles). Le skinning automatique de Blender (`ARMATURE_AUTO`, bone heat)
echoue dessus : 0 poids sur 2524 sommets, et le GLB sortait sans skin
(`skins 0` malgre les attributs `JOINTS_0`/`WEIGHTS_0`). Le script marque
donc chaque piece avant la jonction (groupes `hint_jaw`, `hint_leg`,
fusionnes par nom au `join`), parente par nom (`ARMATURE_NAME`) puis
calcule les poids lui-meme : melange lisse entre os voisins le long du
corps (50/50 a l'articulation), os `jaw` pour la machoire inferieure,
melange hanche/pied pour les pattes. Le script affiche `unweighted 0` en
fin de course ; verifier `skins 1` dans le GLB apres tout changement.

Export : `export_apply=False` (appliquer les modificateurs cuirait
l'armature) et `use_selection=False`.
