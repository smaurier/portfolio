/**
 * LES EVENEMENTS DE TRACE, ET COMMENT S'Y REPERER.
 *
 * Un evenement de tracage Chromium tel que `Tracing.dataCollected` le livre
 * (forme relevee le 22/09, `.scratch/trace-images.mjs`). Les instants `ts`
 * et les durees `dur` sont en microsecondes, a l'horloge de la trace.
 * Ce module est pur : des evenements en entree, des identifiants en sortie.
 */
export type Evenement = {
  name: string;
  ph: string;
  cat?: string;
  pid: number;
  tid: number;
  ts: number;
  dur?: number;
  id2?: { local?: string };
  args?: Record<string, unknown>;
};

/** Les fils nommes par les evenements de metadonnees : "pid/tid" -> nom. */
export function filsNommes(evts: Evenement[]): Map<string, string> {
  const fils = new Map<string, string>();
  for (const e of evts) {
    if (e.ph !== "M" || e.name !== "thread_name") continue;
    fils.set(`${e.pid}/${e.tid}`, ((e.args as { name?: string } | undefined)?.name) ?? "");
  }
  return fils;
}

/**
 * Le processus de rendu de la page : celui dont le fil `Compositor` porte
 * le plus de trames. Le processus navigateur en emet aussi quelques-unes
 * (son propre compositeur), jamais autant.
 */
export function processusDeRendu(evts: Evenement[]): number {
  const fils = filsNommes(evts);
  const comptes = new Map<number, number>();
  for (const e of evts) {
    if (e.name !== "PipelineReporter" || e.ph !== "b") continue;
    if (fils.get(`${e.pid}/${e.tid}`) !== "Compositor") continue;
    comptes.set(e.pid, (comptes.get(e.pid) ?? 0) + 1);
  }
  let pid = -1;
  let meilleur = -1;
  for (const [p, c] of comptes) {
    if (c > meilleur) {
      meilleur = c;
      pid = p;
    }
  }
  if (pid < 0) throw new Error("aucun fil Compositor avec des trames : la trace ne porte pas d'images");
  return pid;
}

function fil(evts: Evenement[], pid: number, nomDuFil: string): number {
  for (const [cle, nom] of filsNommes(evts)) {
    const [p, t] = cle.split("/").map(Number);
    if (p === pid && nom === nomDuFil) return t;
  }
  throw new Error(`pas de fil ${nomDuFil} dans le processus ${pid}`);
}

/** Le fil principal (`CrRendererMain`) d'un processus. */
export const filPrincipal = (evts: Evenement[], pid: number): number => fil(evts, pid, "CrRendererMain");
/** Le fil du compositeur (`Compositor`) d'un processus : celui qui porte les trames. */
export const filCompositeur = (evts: Evenement[], pid: number): number => fil(evts, pid, "Compositor");

/**
 * Les reperes poses depuis la page par `console.timeStamp(nom)` : nom ->
 * instant de trace, le PREMIER de chaque nom (un observateur d'attributs
 * peut poser le meme repere plusieurs fois).
 */
export function reperes(evts: Evenement[]): Map<string, number> {
  const r = new Map<string, number>();
  for (const e of evts) {
    if (e.name !== "TimeStamp") continue;
    const nom = (e.args as { data?: { message?: string } } | undefined)?.data?.message;
    if (nom && !r.has(nom)) r.set(nom, e.ts);
  }
  return r;
}
