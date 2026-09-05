"use client";

import { useEffect, useState } from "react";
import { aztecYear, YEAR_BEARER_INFO } from "aztec-year";
import { renderWithNahuatl } from "../../lib/nahuatl";

/** « 1 Tochtli · Lapin » : numeral + nom nahuatl + glose dans la langue de la page. */
export function formatFooterAztecYear(locale: string, date?: Date): string {
  const year = aztecYear(date);
  const info = YEAR_BEARER_INFO[year.bearer];
  const gloss = locale === "en" ? info.en : locale === "es" ? info.es : info.fr;
  return `${year.number} ${info.nahuatl} · ${gloss}`;
}

/**
 * L'annee mexica du pied de page, calculee CHEZ LE VISITEUR (05/09, retour
 * Sylvain « ce rocher glyphe devra lui aussi changer avec la date »). Le
 * layout est rendu en statique au build (generateStaticParams) : une
 * annee calculee cote serveur serait figee jusqu'au prochain deploiement,
 * et un 14 fevrier le pied de page mentirait. Ici le serveur rend la
 * valeur du build (pas de saut de mise en page), puis le client la
 * recalcule au montage avec sa propre horloge : la meme lib et la meme
 * date que le rocher-glyphe et la queue du serpent.
 */
export default function FooterAztecYear({ locale, initial }: { locale: string; initial: string }) {
  const [label, setLabel] = useState(initial);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recalcul volontaire au montage avec l'horloge du visiteur (le rendu serveur est fige au build)
    setLabel(formatFooterAztecYear(locale));
  }, [locale]);
  return <>{renderWithNahuatl(label)}</>;
}
