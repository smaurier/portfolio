# Les listes de plans (C1)

**Ecrit le 11/09/2026**, item C1 du backlog SOTY : un document par direction,
qui ecrit ce qui existe TEL QUEL dans le code, plan par plan, avec les
positions dans l'arc (0 a 1 = deux hauteurs d'ecran de defilement,
`lib/reveal-arc.ARC_SCROLL_VIEWPORTS`), les durees, et les coupes son.
Rien ici n'est une proposition : quand quelque chose manque ou merite un
arbitrage, la ligne le dit et s'arrete.

Pourquoi ce document existe : le jure regarde les transitions entre etats,
pas les pages (Hon Tran, 2026), et Shopify Editions a montre que « chaque
section est son propre moment », entree, tenue, sortie. Nous avions les
gestes ; nous n'avions pas la liste.

## La grammaire commune a toutes les directions

| temps | position | ce qui se passe | fichier |
| --- | --- | --- | --- |
| le voile | avant 0 | chargement, chauffe des shaders derriere le voile, choix du son (entrer avec ou sans) | `reveal-trigger.tsx`, `shader-warmup.tsx`, `veil-sound-choice.tsx` |
| penombre | 0 a 0,25 | le premier quart : la scene se decouvre, lumiere basse, texte d'intro | `reveal-arc.PHASE_START` |
| conscience | 0,25 a 0,5 | la lumiere monte, la camera orbite (rayon 7 -> 4,5, hauteur 2,6 -> 2) | `camera-path` |
| face a face | 0,5 a 0,75 | le sujet de la direction est devant nous | |
| chemins reveles | 0,75 a 1 | le climax de la camera (`climaxProgress` 0,75), le carillon de la direction | `climax-chime` |
| l'acte de sortie | apres l'arc, 0,55 hauteur d'ecran jusqu'au bas de page | la camera monte (0,6 unite), le champ se resserre de 5 degres, la vignette se ferme (+0,3) ; la cloture de page et son lien vers la direction suivante | `reveal-arc.exitProgress`, `orbit-camera.tsx`, `page-closure.tsx` |
| le voyage cardinal | 2,0 s | la sortie du contenu (0,25 s de latence, 0,7 s), la navigation au coeur du mouvement, l'entree du contenu (0,9 s) quand la chauffe de la direction est faite ; la camera fait son tour (`swingAzimuth`) et le soleil traverse les heures (`journeyHour`) | `nepantla.ts`, `cardinal-transition-context.tsx` |
| les coupes son | au clic, a la chauffe | l'accord de la direction au depart ; le motif de l'element a l'arrivee | `sound-design.tsx`, `journey-cues.ts` |

Sur telephone, meme arc, sans decalage de cadre ; les paliers de qualite
(brins, meches, feuilles, post-traitement, ombres) sont dans
`lib/scene-controls.ts`.

## Les cinq documents

- [Centre, jade](centre.md)
- [Est, dore](est.md)
- [Sud, turquoise](sud.md)
- [Ouest, cendre](ouest.md)
- [Nord, obsidienne](nord.md)
