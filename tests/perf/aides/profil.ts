/**
 * LE PROFIL D'UN PROJET DE LA BARRE (B2a, 04/10).
 *
 * Les specs de la barre tournent sous plusieurs projets Playwright et ne se
 * dupliquent pas : elles demandent ici le budget d'image et l'emulation qui
 * vont avec le nom du projet. Le bureau juge a 16,7 ms sans emulation ; le
 * telephone a 33,3 ms (design, section 2 : Pixel 7, processeur divise par
 * quatre, Fast 3G sur le voile). Les valeurs du Fast 3G sont celles des
 * DevTools de Chrome : 1,6 Mbit/s en descente, 750 kbit/s en montee, 562,5
 * ms de latence (`.scratch/apres-voile.mjs`, 14/09). Ce module est pur.
 */
import { BUDGET_BUREAU_MS, BUDGET_TELEPHONE_MS } from "./images";

export type Profil = { budgetMs: number; telephone: boolean };

/** Le processeur du telephone emule : celui du PC divise par quatre (design, section 2). */
export const PROCESSEUR_TELEPHONE = 4;

/** Le Fast 3G des DevTools, en octets par seconde et millisecondes, tel que `Network.emulateNetworkConditions` le prend. */
export const FAST_3G = {
  offline: false,
  latency: 562.5,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
} as const;

const PROFILS: Record<string, Profil> = {
  "perf-bureau": { budgetMs: BUDGET_BUREAU_MS, telephone: false },
  "perf-telephone": { budgetMs: BUDGET_TELEPHONE_MS, telephone: true },
};

export function profilDuProjet(nom: string): Profil {
  const p = PROFILS[nom];
  if (!p) throw new Error(`le projet ${nom} n'a pas de profil dans tests/perf/aides/profil.ts : budget et emulation inconnus`);
  return p;
}
