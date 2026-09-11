# Nahual

Un portfolio en trois dimensions, construit sur une cosmologie : cinq
directions, cinq pages, une seule scène qui ne recharge jamais.

Le Centre est le foyer, d'où partent les chemins. L'Est est le jour qui se
lève sur un monde de verre. Le Sud est le midi, et le serpent de feu. L'Ouest
est le soleil qui descend. Le Nord est ce qui est gardé. Chaque page tient
une idée, la raconte au défilement, puis passe la main à la suivante par un
voyage cardinal, sans coupure : le cerf, le sol, la lumière restent, seule
la direction change.

Site : https://nahual.fr

## Pourquoi

J'ai voulu un portfolio qui ne soit pas une liste de projets mais un lieu.
Une cosmologie donne une structure que je n'aurais pas inventée seul : cinq
directions, une par page, et un monde qui reste quand on change de page. Le
reste est du métier : mesurer avant de croire, tester ce qui fait le monde,
et le rendre accessible, parce qu'un lieu où l'on n'entre pas n'est pas un
lieu.

## Ce qu'on y trouve

- Une scène persistante en WebGL (three.js, react-three-fiber) partagée par
  toutes les pages ; le contenu change, le monde ne recharge pas.
- Un arc par page : deux hauteurs d'écran de défilement qui font orbiter la
  caméra, monter la lumière et arriver le geste de la direction (le lever,
  la frappe, le coucher, le bassin), puis un acte de sortie vers la page
  suivante.
- Des simulations légères et testées : herbe instanciée sous une grille de
  vent, tissu de Verlet pour les porteuses, ondes et fluide pour le bassin
  du Nord, feuilles portées par le vent de l'Ouest.
- Un son généré, sans échantillon : cinq éléments, une nappe par direction,
  un accord au départ, un motif à l'arrivée. Coupé par défaut, proposé au
  voile.
- L'accessibilité comme partie du dessin : navigation au clavier et à la
  manette, lien d'évitement, annonces de route, mouvement réduit respecté et
  une pause du mouvement, mode lecture, description de scène, contrastes
  mesurés au pixel, axe à chaque commit.
- Un chant par direction, tiré des *Cantares mexicanos* (XVIe siècle), en
  nahuatl, dans l'espagnol de l'édition León-Portilla (UNAM, 2011) et dans
  notre traduction, visible pour tout le monde.
- Trois langues : français, anglais, espagnol, avec le nahuatl là où il est
  attesté.

## Comment c'est fait

| couche | choix |
| --- | --- |
| cadre | Next.js (App Router, pages statiques), TypeScript |
| 3D | three.js, react-three-fiber, drei, postprocessing (bureau seulement) |
| mouvement | GSAP pour les passages, Lenis pour le défilement |
| modèles | GLB nettoyés et compressés (meshopt) par `scripts/optimise-models.mjs` |
| son | Web Audio, génératif |
| tests | Vitest (unitaires, les règles du monde sont des fonctions pures), Playwright (parcours, voile, transitions, clavier, axe), sondes de mesure dans `.scratch/` |

Les règles qui font le monde (arcs, caméras, tissus, ondes, calendrier)
vivent dans `src/lib`, en fonctions pures avec leurs tests ; les composants
de scène dans `src/app/components/stag-scene`. Les noms d'année mexica
viennent de la bibliothèque `aztec-year`, publiée à part.

## Mesurer avant de croire

Le dépôt garde ses mesures dans `docs/da` : l'état de l'art visé, le tableau
de bord, le backlog, et pour chaque décision technique le chiffre qui l'a
motivée (images en retard, programmes compilés en cours d'arc, appels de
rendu, octets du premier chargement). La règle : reproduire par le vrai
chemin, mesurer contre le bruit de fond, comparer A/B sur la même machine.

## Lancer

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # unitaires
pnpm run test:e2e # Playwright, contre le serveur de dev
pnpm run build    # production
```

## Sources

Les pages citent leurs sources : `docs/da/centre-sources.md`,
`est-sources.md`, `sud-sources.md`, `ouest-sources.md`, `nord-sources.md`.
Rien n'est affirmé sur la cosmologie nahua qui ne s'y trouve. Aucun dieu
n'est représenté ; l'iconographie sacrée n'est pas copiée. Les chants
viennent de l'édition ouverte des *Cantares mexicanos* de l'UNAM
(`docs/da/cantares-choix.md`).

## Auteur

Sylvain Maurier, développeur front senior, hybride UX et développement.
Contact : bonjour@nahual.fr
