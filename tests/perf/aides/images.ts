/**
 * DES EVENEMENTS AUX IMAGES PRESENTEES.
 *
 * Ce que la barre mesure, c'est ce que le compositeur a PRESENTE, pas la
 * cadence du script : `requestAnimationFrame` ne voit ni la 2D du voile
 * (animee sur le fil du compositeur) ni une image perdue. Une trame est
 * un `PipelineReporter` du fil Compositor du processus de rendu ; son etat
 * dit si elle a ete presentee, perdue, ou si rien n'etait a dessiner.
 * Ce module est pur.
 *
 * Relecture du 22/09, trois regles qui en sortent :
 *  - les trames se trient par instant de PRESENTATION, jamais par sequence :
 *    la sequence repart a 1 a chaque navigation (et l'auto-test prenait
 *    pour premiere trame une trame perdue posee une seconde plus tard) ;
 *  - on apparie TOUTES les trames, puis on decoupe les paires par leur fin :
 *    decouper les trames d'abord perdait un blocage a cheval sur la
 *    frontiere de deux moments, des deux cotes ;
 *  - un resume compte des INTERVALLES ; le nombre d'images presentees est
 *    une autre quantite (`presentees`), c'est elle qui dit si la barre a
 *    mesure quelque chose.
 */
import type { Evenement } from "./evenements";
import { filCompositeur, processusDeRendu } from "./evenements";

export type Trame = { sequence: number; debut: number; fin: number; etat: string };
export type Paire = { debut: number; fin: number; ms: number };
export type Resume = { intervalles: number; auDela: number; pire: number; hz60: number; hz30: number; hz20: number; p5Fps: number };

/** Une demi-periode de balayage : une image presentee a 16,8 ms n'est pas en retard, une a 25 a manque un balayage. */
export const TOLERANCE_MS = 8.3;
export const BUDGET_BUREAU_MS = 16.7;
export const BUDGET_TELEPHONE_MS = 33.3;
/** Les seuils des paliers, en dixiemes exacts (16,7 + 8,3 et 33,3 + 8,3 ne le sont pas en virgule flottante). */
export const SEUIL_60_MS = 25;
export const SEUIL_30_MS = 41.6;

type Rapporteur = { frame_sequence: number; state: string };
type ArgsRapporteur = { frame_reporter?: Rapporteur; chrome_frame_reporter?: Rapporteur };

const dixieme = (n: number): number => Math.round(n * 10) / 10;

/**
 * Les trames du fil Compositor du processus de rendu, `b` et `e` apparies
 * par identifiant local dans l'ordre du temps (un identifiant est reutilise
 * une fois sa trame finie), triees par instant de presentation. Une trame
 * sans `e` est encore en vol : ignoree. Le rapporteur s'appelle
 * `frame_reporter` ici, `chrome_frame_reporter` ailleurs : les deux passent.
 */
export function trames(evts: Evenement[], pid = processusDeRendu(evts)): Trame[] {
  const tid = filCompositeur(evts, pid);
  const propres = evts
    .filter((e) => e.name === "PipelineReporter" && e.pid === pid && e.tid === tid && e.id2?.local !== undefined)
    .sort((a, b) => a.ts - b.ts);
  const enVol = new Map<string, Evenement>();
  const t: Trame[] = [];
  for (const e of propres) {
    const id = e.id2?.local;
    if (id === undefined) continue;
    if (e.ph === "b") {
      enVol.set(id, e);
      continue;
    }
    if (e.ph !== "e") continue;
    const b = enVol.get(id);
    if (!b) continue;
    enVol.delete(id);
    const args = b.args as ArgsRapporteur | undefined;
    const r = args?.frame_reporter ?? args?.chrome_frame_reporter;
    if (r) t.push({ sequence: r.frame_sequence, debut: b.ts, fin: e.ts, etat: r.state });
  }
  return t.sort((a, b) => a.fin - b.fin);
}

export const presentee = (t: Trame): boolean => t.etat.startsWith("STATE_PRESENTED");
export const perdue = (t: Trame): boolean => t.etat === "STATE_DROPPED";

/** Les trames dont la presentation tombe dans [debut, fin] (us de trace). */
export function fenetre(t: Trame[], debut: number, fin: number): Trame[] {
  return t.filter((x) => x.fin >= debut && x.fin <= fin);
}

/**
 * Les intervalles entre presentations consecutives, avec leurs bornes : une
 * trame perdue entre deux presentees allonge l'intervalle (c'est l'image en
 * retard) ; une trame sans mise a jour coupe la serie (rien n'etait a
 * dessiner, ce n'est pas une image en retard). A calculer sur TOUTES les
 * trames, puis a decouper par `fenetrePaires`.
 */
export function paires(t: Trame[]): Paire[] {
  const out: Paire[] = [];
  let precedente: Trame | null = null;
  for (const x of t) {
    if (x.etat === "STATE_NO_UPDATE_DESIRED") {
      precedente = null;
      continue;
    }
    if (!presentee(x)) continue;
    if (precedente && x.fin >= precedente.fin) out.push({ debut: precedente.fin, fin: x.fin, ms: (x.fin - precedente.fin) / 1000 });
    precedente = x;
  }
  return out;
}

/** Les paires dont la presentation tombe dans [debut, fin] : un intervalle appartient au moment ou il finit. */
export function fenetrePaires(p: Paire[], debut: number, fin: number): Paire[] {
  return p.filter((x) => x.fin >= debut && x.fin <= fin);
}

/** Le resume d'une serie d'intervalles (ms) contre un budget (ms). */
export function resumer(intervallesMs: number[], budgetMs: number): Resume {
  const n = intervallesMs.length;
  if (n === 0) return { intervalles: 0, auDela: 0, pire: 0, hz60: 0, hz30: 0, hz20: 0, p5Fps: 0 };
  const seuil = dixieme(budgetMs + TOLERANCE_MS);
  const tri = [...intervallesMs].sort((a, b) => a - b);
  const part = (garde: (d: number) => boolean): number => dixieme((intervallesMs.filter(garde).length / n) * 100);
  // Le 95e centile au rang le plus proche : a n = 20, floor(n * 0,95) donnait le maximum.
  const p95 = tri[Math.max(0, Math.ceil(n * 0.95) - 1)];
  return {
    intervalles: n,
    auDela: intervallesMs.filter((d) => d > seuil).length,
    pire: dixieme(tri[n - 1]),
    hz60: part((d) => d <= SEUIL_60_MS),
    hz30: part((d) => d > SEUIL_60_MS && d <= SEUIL_30_MS),
    hz20: part((d) => d > SEUIL_30_MS),
    p5Fps: dixieme(1000 / p95),
  };
}

export const perdues = (t: Trame[]): number => t.filter(perdue).length;
/** Le nombre d'images presentees (entieres ou partielles) : ce qui dit si la barre a mesure quelque chose. */
export const presentees = (t: Trame[]): number => t.filter(presentee).length;

/** La mediane, pour tenir le bruit d'une machine a trois passes. */
export function mediane(nombres: number[]): number {
  if (nombres.length === 0) throw new Error("mediane d'une serie vide");
  const tri = [...nombres].sort((a, b) => a - b);
  const m = Math.floor(tri.length / 2);
  return tri.length % 2 ? tri[m] : (tri[m - 1] + tri[m]) / 2;
}
