"use client";

import { useEffect, useState } from "react";
import { ceQueLeMondeSait, type CleDuMonde } from "@/lib/ce-que-le-monde-sait";
import { renderWithNahuatl } from "@/lib/nahuatl";
import { premiereVisite } from "./premiere-visite";

/**
 * CE QUE LE MONDE SAIT (14/09, O1 du registre des mecaniques). Le site
 * calcule Venus, l'annee mexica, le cote du midi ou se trouve le visiteur,
 * le jour qui a nomme sa premiere venue, le feu qui brule encore, et il
 * n'en disait rien. Cette section du Codex le dit, en trois a cinq lignes.
 *
 * Tout depend de l'horloge et du stockage du visiteur : rien n'est rendu
 * au serveur, sinon les deux rendus differeraient. Le texte n'apparait
 * donc qu'apres le montage, et son absence ne laisse aucun trou (la
 * section entiere ne s'affiche pas).
 */
export type MondeLabels = { title: string; intro: string; lines: Record<CleDuMonde, string> };

export default function CeQueLeMondeSait({ labels, locale }: { labels: MondeLabels; locale: string }) {
  const [lignes, setLignes] = useState<string[] | null>(null);

  useEffect(() => {
    // Le feu etait-il deja allume ? L'attribut est pose AVANT le premier
    // paint par le script du layout ; la cle du stockage, elle, est
    // reecrite a chaque visite et vaudrait toujours « aujourd'hui ».
    const foyerDejaAllume = document.documentElement.getAttribute("data-hearth") === "lit";
    const maintenant = new Date();
    const faits = ceQueLeMondeSait({
      maintenant,
      fuseauMinutes: maintenant.getTimezoneOffset(),
      premiereVisite: premiereVisite(),
      foyerDejaAllume,
      locale,
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depend de l'horloge et du stockage du visiteur, jamais du serveur
    setLignes(
      faits.map((f) => {
        let phrase = labels.lines[f.cle] ?? "";
        for (const [cle, valeur] of Object.entries(f.valeurs ?? {})) phrase = phrase.replace(`{${cle}}`, valeur);
        return phrase;
      }),
    );
  }, [labels, locale]);

  if (!lignes || lignes.length === 0) return null;

  return (
    <section className="codexSection">
      <h2>{renderWithNahuatl(labels.title)}</h2>
      <p>{renderWithNahuatl(labels.intro)}</p>
      <ul className="codexDirections mondeSait">
        {lignes.map((l) => (
          <li key={l}>{renderWithNahuatl(l)}</li>
        ))}
      </ul>
    </section>
  );
}
