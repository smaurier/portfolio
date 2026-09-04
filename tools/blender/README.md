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
