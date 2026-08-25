"use client";

import { use } from "react";
import { getDictionary } from "../../dictionaries";
import { getPath } from "../../lib/routes";
import StagScene from "../components/stag-scene/stag-scene";

// Home en prod : bascule vers la scène du cerf. Depuis le 25/08 (cf
// memory project-nahual-da), le LoadingVeil est monté globalement par
// [locale]/layout.tsx (une seule instance, persistante entre navs SPA
// pour ne plus réapparaître à chaque changement de page) — StagScene
// n'a donc plus à recevoir/passer les textes de chargement.
export default function Home({ params }) {
  // Composant client (use() pour déballer params) : StagScene l'exige
  // déjà (Canvas r3f), même raison qu'avant.
  const { locale } = use(params);
  const dict = getDictionary(locale);

  return (
    <StagScene
      home={dict.home}
      servicesHref={getPath(locale, "services")}
      contactHref={getPath(locale, "contact")}
    />
  );
}
