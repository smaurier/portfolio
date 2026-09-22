@AGENTS.md

# La branche de travail et les constructions Netlify

**Decide le 14/09/2026, sur le constat de Sylvain : « je risque d'etre
facture car je push trop ».** Ce n'est pas GitHub qui facture (depot sans
workflow d'actions) : c'est **Netlify**, qui reconstruit le site a chaque
poussee sur la branche de production. Le compte gratuit donne 300 minutes
par mois, et ce depot fait vingt a cinquante commits par jour.

**GEL LEVE LE 15/09 PAR SYLVAIN, pour une raison qui fait jurisprudence.**
Le gel avait ete pose le 14/09 (« tu ne vas plus rien pousser sur main du
mois »). Le lendemain, `pnpm audit` a revele DEUX EXECUTIONS DE CODE A
DISTANCE non authentifiees dans la version de Next servie en production
(16.3.1, corrigee en 16.3.3). Le gel avait donc ete decide sans cette
information, et il protegeait des minutes de construction que la regle
`ignore` de `netlify.toml`, posee le meme jour, protege deja : une poussee
coute deux minutes sur une enveloppe mensuelle de trois cents.

**La regle qui en sort, et qui vaut pour la suite : un correctif de
securite n'attend jamais un gel de facturation.** Un gel se pose sur du
confort, jamais sur une faille. Tout gel futur porte cette exception.

Hors securite, la regle de fond ci-dessous s'applique : on pousse sur
`main` quand il y a quelque chose a MONTRER, au plus une fois par jour.

La regle de fond, pour quand le gel sera leve :

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

Les trois gardes sont verifiees sur de vrais commits du depot (14/09) : un
commit de documentation seule sort en code 0 (on saute), un commit qui melange
`docs/` et du code sort en 1 (on construit). Sur les quatorze derniers jours,
**342 commits, dont 70 que la seule regle de chemins aurait suffi a ne pas
construire** (20 %). Le reste est couvert par la branche : un commit sur `dev`
ne declenche rien du tout.

# Le harnais

**Reference : `docs/harnais.md`. Design : `docs/superpowers/specs/2026-09-21-harnais-design.md`.**
Decide le 21/09/2026 : la base sur laquelle on itere sans la remettre en
question. Valable pour TOUTE demande, une ligne de CSS comme une nouvelle
direction. La definition du fini :

1. **L'oracle d'abord, vu rouge.** Aucun correctif ni mecanique sans un
   test qui echoue avant et passe apres. Un test jamais vu rouge ne garde
   rien.
2. **Toute mecanique nait pure.** Une lib avec graine et progres en entree,
   testee a l'unite ; le composant qui la rend est mince.
3. **Les regles de code passent** : `tsc`, `eslint`, les tests unitaires.
   Zero erreur, zero avertissement nouveau.
4. **Rien n'a recule.** `perf-bureau` au vert (cliquet) avant toute
   poussee sur `main` ; `perf-telephone` rapportee. Un rouge sur la barre
   se ferme par un oracle de cause, jamais par un seuil. *(Tranche B.)*
5. **Rien n'a disparu.** Aucun element de scene retire pour tenir une
   barre ; le mouvement reduit montre tout ; la premiere image apres le
   voile est complete.
6. **La cloture rapproche.** `close-the-books` : chaque critere
   d'acceptation coche avec sa preuve, la dette nouvelle inscrite, ce
   document mis a jour si une regle ou un mecanisme a bouge.

Les hooks de `scripts/hooks/` tiennent la ligne 3, et la 4 a partir de la tranche B ; les lignes 1, 2, 5 et 6 tiennent par la relecture ; `--no-verify` pour une
faille de securite seulement, dit dans le message.
