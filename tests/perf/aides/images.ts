/**
 * DES EVENEMENTS AUX IMAGES PRESENTEES.
 *
 * Ce que la barre mesure, c'est ce que le compositeur a PRESENTE, pas la
 * cadence du script : `requestAnimationFrame` ne voit ni la 2D du voile
 * (animee sur le fil du compositeur) ni une image perdue. Une trame est
 * un `PipelineReporter` du fil Compositor du processus de rendu ; son etat
 * dit si elle a ete presentee, perdue, ou si rien n'etait a dessiner.
 * Ce module est pur.
 */
import type { Evenement } from "./evenements";
import { processusDeRendu } from "./evenements";

export type Trame = { sequence: number; debut: number; fin: number; etat: string };
export type Paire = { debut: number; fin: number; ms: number };
export type Resume = { images: number; auDela: number; pire: number; hz60: number; hz30: number; hz20: number; p5Fps: number };

/** Une demi-periode de balayage : une image presentee a 16,8 ms n'est pas en retard, une a 25 a manque un balayage. */
export const TOLERANCE_MS = 8.3;
export const BUDGET_BUREAU_MS = 16.7;
export const BUDGET_TELEPHONE_MS = 33.3;

type Rapporteur = { frame_sequence: number; state: string };

/**
 * Les trames du compositeur du processus de rendu, `b` et `e` apparies par
 * identifiant local dans l'ordre du temps (un identifiant est reutilise
 * une fois sa trame finie), triees par sequence. Une trame sans `e` est
 * encore en vol : ignoree.
 */
export function trames(evts: Evenement[], pid = processusDeRendu(evts)): Trame[] {
  const propres = evts
    .filter((e) => e.name === "PipelineReporter" && e.pid === pid && e.id2?.local !== undefined)
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
    const r = (b.args as { frame_reporter?: Rapporteur } | undefined)?.frame_reporter;
    if (r) t.push({ sequence: r.frame_sequence, debut: b.ts, fin: e.ts, etat: r.state });
  }
  return t.sort((a, b) => a.sequence - b.sequence);
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
 * dessiner, ce n'est pas une image en retard).
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
    if (precedente) out.push({ debut: precedente.fin, fin: x.fin, ms: (x.fin - precedente.fin) / 1000 });
    precedente = x;
  }
  return out;
}

const dixieme = (n: number): number => Math.round(n * 10) / 10;

/** Le resume d'une serie d'intervalles (ms) contre un budget (ms). */
export function resumer(intervallesMs: number[], budgetMs: number): Resume {
  const n = intervallesMs.length;
  if (n === 0) return { images: 0, auDela: 0, pire: 0, hz60: 0, hz30: 0, hz20: 0, p5Fps: 0 };
  const seuil = budgetMs + TOLERANCE_MS;
  const seuil60 = BUDGET_BUREAU_MS + TOLERANCE_MS;
  const seuil30 = BUDGET_TELEPHONE_MS + TOLERANCE_MS;
  const tri = [...intervallesMs].sort((a, b) => a - b);
  const part = (garde: (d: number) => boolean): number => dixieme((intervallesMs.filter(garde).length / n) * 100);
  return {
    images: n,
    auDela: intervallesMs.filter((d) => d > seuil).length,
    pire: dixieme(tri[n - 1]),
    hz60: part((d) => d <= seuil60),
    hz30: part((d) => d > seuil60 && d <= seuil30),
    hz20: part((d) => d > seuil30),
    p5Fps: dixieme(1000 / tri[Math.min(n - 1, Math.floor(n * 0.95))]),
  };
}

export const perdues = (t: Trame[]): number => t.filter(perdue).length;

/** La mediane, pour tenir le bruit d'une machine a trois passes. */
export function mediane(nombres: number[]): number {
  if (nombres.length === 0) throw new Error("mediane d'une serie vide");
  const tri = [...nombres].sort((a, b) => a - b);
  const m = Math.floor(tri.length / 2);
  return tri.length % 2 ? tri[m] : (tri[m - 1] + tri[m]) / 2;
}
