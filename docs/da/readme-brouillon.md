# README, brouillon (N3), entre dans README.md le 11/09/2026

**Ecrit le 11/09/2026, pose dans `README.md` le soir meme** avec le
« Pourquoi » a l'angle metier choisi par Sylvain (a reecrire a son ton) et
une ligne sur les cantares. Ce brouillon est la trace ; le ton est a toi, la redaction est
la mienne. Rien ne part sur GitHub avant ta relecture (le depot est
public). Pas de tiret cadratin. Aucune affirmation mythologique qui ne
soit dans les fichiers de sources (`docs/da/*-sources.md`).

---

# Nahual

Un portfolio en trois dimensions, construit sur une cosmologie : cinq
directions, cinq pages, une seule scene qui ne recharge jamais.

Le Centre est le foyer, d'ou partent les chemins. L'Est est le jour qui se
leve sur un monde de verre. Le Sud est le midi, et le serpent de feu. L'Ouest
est le soleil qui descend. Le Nord est ce qui est garde. Chaque page tient
une idee, la raconte au defilement, puis passe la main a la suivante par un
voyage cardinal, sans coupure : le cerf, le sol, la lumiere restent, seule
la direction change.

Site : https://nahual.fr

## Ce qu'on y trouve

- Une scene persistante en WebGL (three.js, react-three-fiber) partagee par
  toutes les pages ; le contenu change, le monde ne recharge pas.
- Un arc par page : deux hauteurs d'ecran de defilement qui font orbiter la
  camera, monter la lumiere et arriver le geste de la direction (le lever,
  la frappe, le coucher, le bassin), puis un acte de sortie vers la page
  suivante.
- Des simulations legeres et testees : herbe instanciee sous une grille de
  vent, tissu de Verlet pour les porteuses, ondes et fluide pour le bassin
  du Nord, feuilles portees par le vent de l'Ouest.
- Un son genere, sans echantillon : cinq elements, une nappe par direction,
  un accord au depart, un motif a l'arrivee. Coupe par defaut, propose au
  voile.
- L'accessibilite comme partie du dessin : navigation au clavier et a la
  manette, lien d'evitement, annonces de route, mouvement reduit respecte et
  une pause du mouvement, mode lecture, description de scene, contrastes
  mesures au pixel, axe a chaque commit.
- Trois langues : francais, anglais, espagnol, avec le nahuatl la ou il est
  attestee.

## Comment c'est fait

| couche | choix |
| --- | --- |
| cadre | Next.js (App Router, pages statiques), TypeScript |
| 3D | three.js, react-three-fiber, drei, postprocessing (bureau seulement) |
| mouvement | GSAP pour les passages, Lenis pour le defilement |
| modeles | GLB nettoyes et compresses (meshopt) par `scripts/optimise-models.mjs` |
| son | Web Audio, generatif |
| tests | Vitest (unitaires, les regles du monde sont des fonctions pures), Playwright (parcours, voile, transitions, clavier, axe), sondes de mesure dans `.scratch/` |

Les regles qui font le monde (arcs, cameras, tissus, ondes, calendrier)
vivent dans `src/lib`, en fonctions pures avec leurs tests ; les composants
de scene dans `src/app/components/stag-scene`. Les noms d'annee mexica
viennent de la bibliotheque `aztec-year`, publiee a part.

## Mesurer avant de croire

Le depot garde ses mesures dans `docs/da` : l'etat de l'art vise, le tableau
de bord, le backlog, et pour chaque decision technique le chiffre qui l'a
motivee (images en retard, programmes compiles en cours d'arc, appels de
rendu, octets du premier chargement). La regle : reproduire par le vrai
chemin, mesurer contre le bruit de fond, comparer A/B sur la meme machine.

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
`est-sources.md`, `sud-sources.md`, `ouest-sources.md`. Rien n'est affirme
sur la cosmologie nahua qui ne s'y trouve. Aucun dieu n'est represente ;
l'iconographie sacree n'est pas copiee.

## Auteur

Sylvain Maurier, developpeur front senior, hybride UX et developpement.
Contact : bonjour@nahual.fr

---

**Notes de relecture attendues** : le paragraphe d'ouverture (ton) ; la
liste « ce qu'on y trouve » (ordre, ce que tu veux mettre en avant) ; la
phrase sur l'auteur ; ajouter ou non les badges et la licence ; la version
anglaise, a faire une fois le francais fixe.
