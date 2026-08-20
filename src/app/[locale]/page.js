"use client";

import { use } from "react";
import { getDictionary } from "../../dictionaries";
import { getPath } from "../../lib/routes";
import StagScene from "../components/stag-scene/stag-scene";

// Home en prod (19/08) : bascule de l'ancienne home (Piedra del Sol +
// hero/à-propos statiques) vers la scène du cerf, désormais intégrée ici
// plutôt qu'isolée sur /lab (supprimée, cf memory project-nahual-da). Le
// contenu hero/à-propos n'est pas perdu — il habille la scène en overlay
// (cf stag-scene.tsx/scene-text-overlay.tsx), la Piedra del Sol reste en
// préface (piedra-del-sol.tsx, migrée telle quelle depuis cette page).
export default function Home({ params }) {
  // Composant client (use() pour déballer params) : StagScene l'exige déjà
  // (Canvas r3f), même raison qu'avant.
  const { locale } = use(params);
  const dict = getDictionary(locale);

  return (
    <StagScene
      loadingPhrase={dict.lab.loadingPhrase}
      loadingTranslation={dict.lab.loadingTranslation}
      loadingLabel={dict.lab.loadingLabel}
      home={dict.home}
      servicesHref={getPath(locale, "services")}
      contactHref={getPath(locale, "contact")}
    />
  );
}
