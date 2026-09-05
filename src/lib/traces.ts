/**
 * Les traces (05/09, controles de scene : « le carnet des traces »). Le
 * site savait deja si Xolotl avait ete vu ; il sait maintenant si la
 * scene vous a montre les 400 jetees, un colibri prendre une etoile, le
 * lever du soleil, la frappe du xiuhcoatl, le glyphe s'embraser. Un
 * petit panneau les liste, dans le ton du Codex, sans jamais dire ce qui
 * reste a voir. Pur : identifiants, enregistrement immuable, stockage.
 */

export const TRACE_IDS = ["centzon-thrown", "huitzilin-catch", "sunrise", "xiuhcoatl-strike", "glyph-lit", "xolotl"] as const;
export type TraceId = (typeof TRACE_IDS)[number];

/** Trace -> date (ms) de la premiere fois. */
export type Traces = Partial<Record<TraceId, number>>;

export function recordTrace(traces: Traces, id: TraceId, now: number): Traces {
  if (traces[id] !== undefined) return traces;
  return { ...traces, [id]: now };
}

export function traceCount(traces: Traces): number {
  return TRACE_IDS.filter((id) => traces[id] !== undefined).length;
}

export function serializeTraces(traces: Traces): string {
  return JSON.stringify(traces);
}

export function parseTraces(raw: string | null): Traces {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object") return {};
    const out: Traces = {};
    for (const id of TRACE_IDS) {
      const v = (obj as Record<string, unknown>)[id];
      if (typeof v === "number" && Number.isFinite(v)) out[id] = v;
    }
    return out;
  } catch {
    return {};
  }
}
