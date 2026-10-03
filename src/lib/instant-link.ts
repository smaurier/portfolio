/**
 * Le lien de l'instant (05/09, controles de scene) : l'URL porte le moment
 * de l'arc (`t`, 0 la nuit, 1 le midi) et l'etat scene seule (`scene=1`).
 * Un lien partage s'ouvre exactement la. Le meme mecanisme sert a
 * « reprendre ou j'etais » : la derniere visite (page + moment) est gardee,
 * et l'accueil propose d'y retourner. Pur, sans navigateur.
 *
 * LE LIEN PORTE SA VERSION (03/10). Le 20/09, « l'arc dure la page » a change
 * la longueur de l'arc page par page : un `?t=0.9` partage avant renvoyait
 * 5,6 fenetres trop bas sur Memoire. Un lien neuf porte donc `v=2` ; un `t`
 * sans cette version est un lien d'avant, et il ouvre en haut de page plutot
 * que de viser un moment qui n'a plus de traduction. `scene=1` n'a jamais
 * change de sens et reste lu quelle que soit la version.
 */

export type Instant = { t: number; sceneOnly: boolean };

/** La version de l'arc que `t` mesure ; a incrementer si la longueur de l'arc change encore de sens. */
export const INSTANT_VERSION = "2";
export type LastVisit = { path: string; t: number; at: number };

/** Une visite plus vieille que ca n'est plus proposee (ms). */
export const RESUME_MAX_AGE_MS = 30 * 24 * 3600 * 1000;
/** En dessous de ce progres, l'arc n'avait pas vraiment commence. */
export const RESUME_MIN_T = 0.05;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function buildInstantSearch(instant: Instant): string {
  const t = Math.round(clamp01(instant.t) * 1000) / 1000;
  const params = new URLSearchParams();
  params.set("t", String(t));
  params.set("v", INSTANT_VERSION);
  if (instant.sceneOnly) params.set("scene", "1");
  return `?${params.toString()}`;
}

export function parseInstant(search: string): { t: number | null; sceneOnly: boolean } {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const sceneOnly = params.get("scene") === "1";
  if (params.get("v") !== INSTANT_VERSION) return { t: null, sceneOnly };
  const raw = params.get("t");
  const n = raw === null ? NaN : Number(raw);
  return { t: Number.isFinite(n) ? clamp01(n) : null, sceneOnly };
}

export function shouldOfferResume(visit: LastVisit | null, currentPath: string, now: number): boolean {
  if (!visit) return false;
  if (visit.path === currentPath) return false;
  if (visit.t < RESUME_MIN_T) return false;
  if (now - visit.at > RESUME_MAX_AGE_MS) return false;
  return true;
}
