# Audit visuel complet, les 5 pages : dessin

Date : 10/10/2026 (soir). Decide par Sylvain, en reaction directe : « on a
deja une tres bonne base [...] mais je ne suis pas content [...] on doit se
rapprocher de l'excellence et du SOTY. Pour moi la on en est loin. J'ai
presque honte de le montrer pour le moment. » Quatre reproches nommes, dans
l'ordre ou il les a dits :

1. **Confusion visuelle** : « ce qu'il y a devant les fantomes, on se
   demande ce que c'est » -- la page Contact (cendre, Ouest), ou vivent les
   Cihuateteo (`docs/da/plans/ouest.md`).
2. **Transitions et saccades** : « on doit mieux lecher les transitions, on
   arrete les mesures, je ne veux plus de saccades. »
3. **Texte en exces** : « trop de textes partout, on explique trop [...]
   KISS [...] c'est le Codex si ca a vraiment besoin d'etre explique, sinon
   poubelle. »
4. **Ecart au niveau SOTY** : « on doit se rapprocher de l'excellence [...]
   pour moi la on en est loin. »

Ce document cadre un AUDIT, pas des correctifs : une liste priorisee de
constats, rien de modifie sur le site. Les corrections viennent ensuite,
en sessions separees et bornees (regle de `CLAUDE.md` : une session = une
chose, bornee, avec une capture regardee).

## Ce qui existe deja, a ne pas refaire

- **`docs/da/backlog-soty.md`** (652 lignes) : les transitions ENTRE pages
  ont deja ete mesurees et en grande partie corrigees (T1-T9 faits,
  `29468c3` et suites : chauffe des shaders a l'intention, voile mesure et
  resorbe de 3,9 s a ~1,5 s d'images longues). **T10 reste ouvert** : le
  chargement des modeles pendant le voile (600-700 ms vers 0,8 s de l'arc).
  L'audit ne remesure pas ca au chiffre ; la video de chaque page sert a
  voir SI, a l'oeil, une saccade reste visible malgraa ce travail -- et si
  oui, la nommer, pas la re-profiler depuis zero.
- **Le mapping page <-> direction**, verifie dans le code
  (`src/app/[locale]/[slug]/page.tsx:27-30`,
  `src/app/components/stag-scene/direction-colors.ts`) :

  | page (route) | direction (couleur) | doc |
  | --- | --- | --- |
  | Accueil (`/`) | Centre, jade | `docs/da/plans/centre.md` |
  | Services | Est, dore | `docs/da/plans/est.md` |
  | Projets | Sud, turquoise | `docs/da/plans/sud.md` |
  | Contact | Ouest, cendre | `docs/da/plans/ouest.md` |
  | Memoire | Nord, obsidienne | `docs/da/plans/nord.md` |

- **Le lien de l'instant** (`src/lib/instant-link.ts`) : une URL
  `?t=<0..1>&v=2` ouvre directement sur un moment precis de l'arc, sans
  scroll anime a simuler. C'est le mecanisme de capture ; `scene=1` n'est
  PAS utilise ici (on veut voir le texte d'interface, c'est un des quatre
  sujets de l'audit).

## Portee (decidee avec Sylvain)

**Profondeur retenue : croisement allege.** Pas le produit cartesien complet
(5 pages x tous les moments x 2 themes x 2 appareils, 150-250 images,
invivable a produire et a lire) :

- **Chaque page, TOUS ses moments documentes** (colonne « position » de son
  `docs/da/plans/<direction>.md`), en **theme sombre + bureau (1280x800)**.
  C'est la reference que Sylvain juge contre le SOTY. Le nombre de moments
  suit le contenu de la page (Sylvain : « c'est selon le contenu de la
  page ») -- entre 5 et 7 selon le tableau de la direction, pas un compte
  fixe invente.
- **+ une image d'arrivee seule (le premier moment, pas l'arc entier)**, en
  **clair** et en **mobile** (Pixel 7, meme profil que les captures du
  colibri du jour), par page. Attrape une regression de theme ou d'appareil
  sans refaire chaque page quatre fois.
- **+ une courte video de defilement par page**, sombre + bureau
  (defilement reel, pas des sauts `?t=`, pour voir une vraie saccade si
  elle existe), quelques secondes, format court (gif ou mp4 -- au choix de
  l'executant, ce n'est pas un choix de DA).

**Total approximatif** : 5 pages x (5 a 7 images sombre/bureau + 1 claire +
1 mobile) + 5 videos, soit environ 35 a 45 images fixes et 5 videos.

## Ce que l'audit regarde, par image

Pour chaque image/video, un jugement ecrit (pas juste la piece jointe), le
long des quatre axes nommes par Sylvain :

1. **Confusion** : un element dont la fonction ou la nature n'est pas lisible
   au premier regard (le cas des Cihuateteo est le signal connu a verifier
   en premier sur Contact).
2. **Texte** : la densite et la necessite du texte visible a cet instant --
   ce qui reste narratif/essentiel vs ce qui pourrait etre coupe ou deplace
   au Codex (regle KISS de Sylvain : si ca a vraiment besoin d'etre
   explique, Codex ; sinon, a couper).
3. **Niveau DA / SOTY** : un ecart de finition reperable (eclairage plat,
   composition faible, transition d'interface brute) compare au niveau que
   les references Awwwards deja citees dans `docs/da/etat-de-l-art.md`
   tiennent.
4. **Saccade** (sur la video seulement) : un a-coup visible au defilement,
   et si l'un des items deja ouverts du backlog SOTY (T10 notamment)
   l'explique probablement.

## Livrable

Une page HTML privee (Artifact), organisee par page (5 sections), chaque
section montrant ses images dans l'ordre de l'arc + la video + les constats
ecrits juste a cote de chaque image concernee. Pas de verdict global
unique : une liste, que Sylvain priorise ensuite lui-meme (c'est sa
decision, pas la notre -- meme logique que le reste du depot).

## Hors de cette passe

- Aucune correction n'est appliquee aujourd'hui.
- Pas de remesure chiffree des transitions (deja fait, voir
  `backlog-soty.md`) -- seulement un reperage a l'oeil sur les 5 videos.
- Pas de mouvement reduit dans cette matrice (c'est le sujet separe de la
  pose au repos, `docs/da/pose-au-repos.md`, deja decide pour plus tard).
