import { parseTraces, recordTrace, serializeTraces, type TraceId, type Traces } from "@/lib/traces";

/**
 * Les traces, cote navigateur (05/09) : un objet immuable en memoire,
 * relu du localStorage une fois, ecrit a chaque nouvelle trace, avec des
 * abonnes (le panneau). `markTrace` est appele depuis la scene a 60 fps
 * en toute securite : idempotent, sans ecriture si rien ne change.
 * Xolotl a sa propre memoire historique (`nahual-xolotl-witnessed`) :
 * on la lit aussi, pour ne pas perdre les temoins d'avant.
 */

const KEY = "nahual-traces";
const XOLOTL_LEGACY_KEY = "nahual-xolotl-witnessed";

let traces: Traces = {};
let hydrated = false;
const listeners = new Set<(t: Traces) => void>();

export function hydrateTraces(): Traces {
  if (hydrated || typeof window === "undefined") return traces;
  hydrated = true;
  try {
    traces = parseTraces(window.localStorage.getItem(KEY));
    if (window.localStorage.getItem(XOLOTL_LEGACY_KEY) === "1" && traces.xolotl === undefined) {
      traces = recordTrace(traces, "xolotl", Date.now());
    }
  } catch {
    traces = {};
  }
  return traces;
}

export function getTraces(): Traces {
  return traces;
}

export function markTrace(id: TraceId): void {
  if (typeof window === "undefined") return;
  hydrateTraces();
  const next = recordTrace(traces, id, Date.now());
  if (next === traces) return;
  traces = next;
  try {
    window.localStorage.setItem(KEY, serializeTraces(traces));
  } catch {
    /* stockage indisponible : la trace vit en memoire */
  }
  for (const l of listeners) l(traces);
}

export function subscribeTraces(listener: (t: Traces) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
