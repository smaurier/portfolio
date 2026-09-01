# Backlog acquisition · Nahual

> Nahual capte les **missions de création/refonte** : sites vitrines, refontes de sites
> vieillissants, dev React senior pour agences. Cible : TPE/PME au site obsolète + agences
> cherchant un creative dev. Nuada (repo `nuada`) capte les missions de conformité, voir son
> `BACKLOG-ACQUISITION.md`. Stratégie complète : mémoire `project_strategie_acquisition`.
>
> Priorité absolue à la certification en cours jusqu'à fin octobre. L'offre commerciale
> explicite ne s'affiche qu'une fois le cadre de facturation en place. Ce fichier prépare.

## Vitrine (recoupe le backlog DA existant, angle commercial)

- [ ] **Case studies profonds** Nuada / KleyFrance / Synapse (déjà livrés 28/08 en v1,
      commit 8eebaa4) : passer chaque fiche au filtre « qu'est-ce que ça prouve à un
      acheteur de refonte » (problème, solution, résultat mesurable).
- [ ] **Fiches missions salariées** : présenter les projets réalisés en ESN/agence comme
      des MISSIONS avec rôle explicite (« développement frontend au sein de l'équipe X,
      pour Y »), jamais comme des clients propres. Modèle : Demeude affiche BNP/La Poste
      qui sont des missions d'agence. Règles dures : zéro code propriétaire, zéro capture
      d'écran non publique, vérifier la clause de confidentialité avant de nommer un
      client final.
- [ ] **Rapport de conformité RGAA publiable** du site lui-même (remédiation des 5 critères
      NC/PC restants, cf docs/a11y-audit/rgaa/AUDIT-COMPLET.md) : un portfolio creative dev
      100% conforme est un argument de vente que quasi personne ne peut produire.
- [ ] Page Services : ajouter l'offre « refonte » explicite (avant/après, délais, process)
      quand l'AE sera ouverte, pas avant.

## Détection de prospects (extension radar-signaux, PAS un nouvel outil)

- [ ] **Mode « scanner de refonte »** dans radar-signaux (3e mode à côté de BODACC/INPI et
      du scanner EAA) : détecter les sites à refaire plutôt que les clients qui cherchent
      un dev. Signaux scannables : pas de responsive, pas de HTTPS, CMS/tech datés
      (jQuery, Flash-era, WordPress non maintenu), Lighthouse mauvais, mentions légales
      absentes, design pré-2015. Sources locales : annuaires CCI/CMA Lyon, BODACC créations.
      Sortie : lead scoré à double étiquette (refonte → Nahual, non-conformité → Nuada).

## Offre & pipeline

- [ ] **Productiser la refonte** : 2-3 formules à prix fixe (site vitrine / refonte
      complète / refonte + conformité livrée avec audit certifié). Prix affichés = filtre
      naturel des prospects non solvables.
- [ ] **Outreach semi-automatique** : leads du mode « scanner de refonte » radar-signaux →
      email personnalisé avec constat concret (site non responsive, perfs, HTTPS). Quota
      partagé avec Nuada : 5/semaine au total.
- [ ] **Métrique pipeline mensuelle** commune aux deux sites : leads → RDV → devis →
      missions.

## Boucle de cross-sell

- [ ] Toute refonte livrée = livrée conforme RGAA + audit certifié Nuada proposé en option.
- [ ] Tout audit Nuada = remédiation ou refonte Nahual proposée en option.
- [ ] Rituel post-mission identique à Nuada : témoignage + fiche + relance datée.
