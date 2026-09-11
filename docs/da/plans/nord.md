# Nord, obsidienne : ce qui est garde

Une idee : Mictlampa, la region de l'obsidienne et de la nuit ; le bassin,
le miroir qui ment, Xolotl de braise ; le teyolia, ce qui voyage jusqu'ici
et ne s'efface pas. Pas de `nord-sources.md` encore (M1 du backlog : a
ecrire depuis le Codex de Florence, livre 3).

| # | position | plan | tenue | son | fichier |
| --- | --- | --- | --- | --- | --- |
| 1 | voile | la nuit ; la nappe d'eau calme sur toute la surface (opacite au plancher `GATE_FLOOR`, puis selon la profondeur de defilement) ; la margelle d'obsidienne | | le lit d'eau (bruit brun, passe-bande 260) | `tezcatl-water.tsx` |
| 2 | arrivee | la lueur violette de l'arrivee (`arrivalGlow`), la lumiere remappee (`remapNorthArc`) | | | `reveal-lighting.tsx`, `lib/direction-arc` |
| 3 | arc | les volees de fleches d'obsidienne selon la profondeur (`arrowVolley`), leurs impacts dans l'eau (une goutte par impact, `impactSerial`), la vaporisation des fleches plantees | | un plip par impact | `obsidian-arrows.tsx`, `arrow-vapor.tsx` |
| 4 | arc | les lames d'obsidienne du vent d'Itzehecayan (un InstancedMesh), les bandelettes d'amate aux bois et sur le dos du cerf, le poil du cerf noir (bureau) | | | `obsidian-blades.tsx`, `amate-strips.tsx`, `fur-shells.tsx` |
| 5 | 0,62 a 0,92 | Izmictlan : la chaleur s'en va (`strippedWarmth`) | | | `lib/direction-arc` |
| 6 | apres 10 s | Xolotl apparait (`APPEAR_DELAY_FIRST_MS`), corps d'obsidienne, braise portee, ondes a ses pattes ; son reflet de braise dans l'eau depuis la camera miroir ; le chemin de cempasuchil flotte sur la nappe | | | `xolotl-companion.tsx`, `cempasuchil-path.tsx` |
| 7 | arc | les nappes de brume du fluide aux bords du bassin | | | `mictlan-mist.tsx` |
| 8 | 0,75 | climax de la camera, carillon du Nord ; le miroir menteur du tezcatl | | accord obsidienne | `stag-mirror.tsx` |
| 9 | sortie | cloture « Nord · Obsidienne », pas de direction suivante : le lien ramene au Centre | | | `page-closure.tsx` (`NEXT_KEY.obsidienne = null`) |

**Ce qui manque** : `nord-sources.md` (M1) ; la ligne de seuil (N1) ; le
motif d'arrivee : deux gouttes dans le bassin.
