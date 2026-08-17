"use client";

import { useEffect, useState } from "react";

// Adresse assemblée côté client (useEffect), absente du HTML envoyé par le
// serveur — les scrapers qui se contentent de parser le HTML statique n'y
// voient rien. Ne bloque pas un bot qui exécute du JS, mais arrête la
// grande majorité des collecteurs d'adresses. Vrai fix (formulaire, sans
// email exposé du tout) : backlog.
const USER = "sylvain.maurier";
const DOMAIN = "gmail.com";

export default function ObfuscatedEmail({ className }: { className?: string }) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    setAddress(`${USER}@${DOMAIN}`);
  }, []);

  if (!address) {
    return <span className={className}>Afficher l&apos;email</span>;
  }

  return (
    <a href={`mailto:${address}`} className={className}>
      {address}
    </a>
  );
}
