@AGENTS.md

# La branche de travail et les constructions Netlify

**Decide le 14/09/2026, sur le constat de Sylvain : « je risque d'etre
facture car je push trop ».** Ce n'est pas GitHub qui facture (depot sans
workflow d'actions) : c'est **Netlify**, qui reconstruit le site a chaque
poussee sur la branche de production. Le compte gratuit donne 300 minutes
par mois, et ce depot fait vingt a cinquante commits par jour.

La regle, desormais :

- **On travaille sur `dev`.** On y commit et on y pousse autant qu'on veut :
  aucune construction n'en part (`netlify.toml` saute explicitement les
  deploiements de branche et les apercus de fusion).
- **On ne pousse sur `main` que lorsqu'il y a quelque chose a MONTRER** :
  une correction visible, un jalon, une demonstration. Jamais pour une
  documentation, jamais pour un test, jamais pour confort.
- **Au plus UNE poussee sur `main` par jour.** S'il en faut une seconde,
  c'est qu'il y avait urgence : la dire.
- Passer de `dev` a `main` se fait en avance rapide en local
  (`git switch main && git merge --ff-only dev && git push`), **sans ouvrir
  de pull request** : une pull request declencherait un apercu de
  deploiement, donc une construction de plus.
- `netlify.toml` saute aussi la construction quand la seule difference
  depuis le dernier deploiement touche `docs/`, `tests/`, `.scratch/` ou un
  fichier `.md` : ces chemins ne sont pas servis au visiteur.
