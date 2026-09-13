"use client";

const CLE = "nahual-premiere-visite";

/**
 * LE JOUR DU VISITEUR (13/09). Le site retient l'instant de la premiere
 * visite, et lui seul : de la vient le jour du tonalpohualli qui porte le
 * nom de cette visite (lib/tonalpohualli, explique au Codex). Ecrit une
 * fois, jamais remis a jour, jamais envoye nulle part.
 *
 * Rendu serveur ou stockage refuse : on retourne l'instant courant sans
 * rien ecrire. Le jour reste juste, il ne survit simplement pas.
 */
export function premiereVisite(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const brut = window.localStorage.getItem(CLE);
    const v = brut === null ? NaN : Number(brut);
    if (Number.isFinite(v) && v > 0) return v;
    const maintenant = Date.now();
    window.localStorage.setItem(CLE, String(maintenant));
    return maintenant;
  } catch {
    return Date.now();
  }
}
