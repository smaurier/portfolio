"use client";

import { useEffect, useState } from "react";

// Adresse assemblée côté client (useEffect), absente du HTML envoyé par le
// serveur — les scrapers qui se contentent de parser le HTML statique n'y
// voient rien. Ne bloque pas un bot qui exécute du JS, mais arrête la
// grande majorité des collecteurs d'adresses. Vrai fix (formulaire, sans
// email exposé du tout) : backlog.
const USER = "bonjour";
const DOMAIN = "nahual.fr";

export default function ObfuscatedEmail({
  className,
  placeholder = "Afficher l'email",
}: {
  className?: string;
  placeholder?: string;
}) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    // set-state-in-effect volontaire : c'est tout le principe du composant
    // (adresse absente du HTML serveur, peuplée seulement après hydratation
    // côté client, cf. commentaire en tête de fichier) — pas une synchro
    // ratée avec un système externe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAddress(`${USER}@${DOMAIN}`);
  }, []);

  if (!address) {
    return <span className={className}>{placeholder}</span>;
  }

  return (
    <a href={`mailto:${address}`} className={className}>
      {address}
    </a>
  );
}
