import { HEARTH_STORAGE_KEY, shouldPerformCeremony } from "../../../lib/foyer";

/**
 * LA DECISION DU FOYER, PRISE UNE FOIS PAR CHARGEMENT (12/09).
 *
 * Mesure du 12/09 (sonde `.scratch/voile.mjs`, contexte vierge, sans
 * visite enregistree) : `data-hearth="lit"` posé a 0,6 s, cérémonie
 * sautee, caracteres jamais animes, voile ouvert par le secours de 6 s.
 * Cause : FoyerArrival decidait ET notait la visite dans le meme effet ;
 * en dev, React (StrictMode, par defaut dans l'App Router) joue chaque
 * effet deux fois, et la seconde execution relisait la date que la
 * premiere venait d'ecrire : « vous etes revenu il y a 0 ms ». En
 * production l'effet ne joue qu'une fois, mais RevealTrigger et
 * FoyerArrival lisaient l'attribut chacun de leur cote, dans un ordre de
 * montage non garanti.
 *
 * Ici : une seule lecture, une seule ecriture, un seul resultat memorise
 * pour toute la vie de la page (etat de module : survit aux remontages de
 * StrictMode, meurt avec la page). Les deux composants posent la meme
 * question et recoivent la meme reponse, et l'attribut sur <html> est pose
 * au premier appel, quel que soit l'appelant.
 */
let decision: boolean | null = null;

function readLastVisit(): number | null {
  try {
    const raw = window.localStorage.getItem(HEARTH_STORAGE_KEY);
    return raw === null ? null : Number.parseInt(raw, 10);
  } catch {
    return null;
  }
}

function markVisit(now: number): void {
  try {
    window.localStorage.setItem(HEARTH_STORAGE_KEY, String(now));
  } catch {
    // Navigation privee, stockage refuse : la ceremonie rejouera. C'est le
    // comportement le moins surprenant.
  }
}

/** Vrai si la ceremonie d'arrivee doit se jouer sur ce chargement. */
export function decideCeremony(now: number = Date.now()): boolean {
  if (decision !== null) return decision;
  decision = shouldPerformCeremony(readLastVisit(), now);
  markVisit(now);
  const root = document.documentElement;
  if (decision) root.removeAttribute("data-hearth");
  else root.setAttribute("data-hearth", "lit");
  return decision;
}

/** Pour les tests seulement : rejoue une page neuve. */
export function resetCeremonyDecisionForTests(): void {
  decision = null;
}
