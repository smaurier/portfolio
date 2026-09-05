import { describe, expect, it } from "vitest";
import { parseTraces, recordTrace, serializeTraces, TRACE_IDS, traceCount, type Traces } from "./traces";

describe("les traces : ce que la scene vous a montre", () => {
  it("six traces, dans l'ordre du recit", () => {
    expect(TRACE_IDS).toEqual(["centzon-thrown", "huitzilin-catch", "sunrise", "xiuhcoatl-strike", "glyph-lit", "xolotl"]);
  });

  it("enregistrer une trace garde la premiere date, ne l'ecrase pas", () => {
    let t: Traces = {};
    t = recordTrace(t, "sunrise", 1000);
    t = recordTrace(t, "sunrise", 5000);
    expect(t.sunrise).toBe(1000);
    expect(traceCount(t)).toBe(1);
  });

  it("recordTrace ne mute pas l'objet d'origine", () => {
    const a: Traces = {};
    const b = recordTrace(a, "xolotl", 42);
    expect(a).toEqual({});
    expect(b.xolotl).toBe(42);
  });

  it("serialise / relit, en ignorant ce qui n'est pas une trace connue ou une date", () => {
    const t = recordTrace(recordTrace({}, "sunrise", 1000), "xolotl", 2000);
    const back = parseTraces(serializeTraces(t));
    expect(back).toEqual(t);
    expect(parseTraces('{"sunrise": 1, "pas-une-trace": 2, "xolotl": "hier"}')).toEqual({ sunrise: 1 });
    expect(parseTraces("n'importe quoi")).toEqual({});
    expect(parseTraces(null)).toEqual({});
  });

  it("compte", () => {
    expect(traceCount({})).toBe(0);
    expect(traceCount(recordTrace({}, "glyph-lit", 1))).toBe(1);
  });
});
