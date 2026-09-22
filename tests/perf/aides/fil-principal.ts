/**
 * LE TEMPS PROPRE DU FIL PRINCIPAL DANS UNE FENETRE.
 *
 * Pour la pire image d'un moment rouge, ce qui l'a occupee : chaque
 * evenement complet (`ph: "X"`) du fil, decoupe a la fenetre, moins ses
 * enfants (les evenements d'un fil sont proprement imbriques, une pile
 * suffit), agrege par etiquette. `RunTask` contient tout : son temps propre
 * est ce que rien ne nomme, on le garde tel quel.
 *
 * LIMITE CONNUE (22/09) : en production les fonctions s'appellent `O` et
 * vivent a `chunk.js:1:3115`. Les categories (`EvaluateScript`, `Decode
 * Image`, `Layout`, `v8.compile`...) parlent deja ; les noms de source
 * viendront avec les cartes de source (tranche B2).
 */
import type { Evenement } from "./evenements";

export type Part = { nom: string; propreMs: number };

type Donnees = { functionName?: string; url?: string; lineNumber?: number; columnNumber?: number };

const fichier = (url: string | undefined): string => (url ?? "").split("/").pop()?.split("?")[0] ?? "";

function etiquette(e: Evenement): string {
  const d = (e.args as { data?: Donnees } | undefined)?.data;
  if (e.name === "FunctionCall" && d) return `${d.functionName || "(anonyme)"} ${fichier(d.url)}:${(d.lineNumber ?? 0) + 1}:${d.columnNumber ?? 0}`;
  if ((e.name === "EvaluateScript" || e.name === "v8.compile") && d?.url) return `${e.name} ${fichier(d.url)}`;
  return e.name;
}

export function tempsPropre(evts: Evenement[], pid: number, tid: number, debut: number, fin: number, limite = 8): Part[] {
  const dans = evts
    .filter((e) => e.ph === "X" && e.pid === pid && e.tid === tid && e.dur !== undefined && e.ts < fin && e.ts + e.dur > debut)
    .map((e) => ({ e, debut: Math.max(e.ts, debut), fin: Math.min(e.ts + (e.dur ?? 0), fin), enfants: 0 }))
    .sort((a, b) => a.debut - b.debut || b.fin - a.fin);
  const pile: typeof dans = [];
  for (const x of dans) {
    while (pile.length > 0 && pile[pile.length - 1].fin <= x.debut) pile.pop();
    const parent = pile[pile.length - 1];
    if (parent) parent.enfants += x.fin - x.debut;
    pile.push(x);
  }
  const propre = new Map<string, number>();
  for (const x of dans) {
    const ms = (x.fin - x.debut - x.enfants) / 1000;
    if (ms <= 0) continue;
    const nom = etiquette(x.e);
    propre.set(nom, (propre.get(nom) ?? 0) + ms);
  }
  return [...propre.entries()]
    .map(([nom, ms]) => ({ nom, propreMs: Math.round(ms * 10) / 10 }))
    .sort((a, b) => b.propreMs - a.propreMs)
    .slice(0, limite);
}
