import { describe, expect, it } from "vitest";
import type { Evenement } from "./evenements";
import { tempsPropre } from "./fil-principal";

/**
 * UN ROUGE N'EST JAMAIS NU : la pire image dit ce qui l'a occupee.
 *
 * Les evenements complets du fil principal sont imbriques : un RunTask
 * contient un FunctionCall qui contient un Layout. Le temps propre d'un
 * evenement est sa duree moins celle de ses enfants. On decoupe a la
 * fenetre de l'image.
 */
const PID = 100;
const TID = 11;
const X = (name: string, ts: number, dur: number, args: Record<string, unknown> = {}): Evenement => ({ name, ph: "X", pid: PID, tid: TID, ts, dur, args });

describe("le temps propre", () => {
  it("retire les enfants, etiquette les appels de fonction, trie du plus lourd au plus leger", () => {
    const evts = [
      X("RunTask", 0, 10_000),
      X("FunctionCall", 1_000, 8_000, { data: { functionName: "tick", url: "http://localhost:3100/_next/static/chunks/abc.js?x=1", lineNumber: 4, columnNumber: 12 } }),
      X("Layout", 2_000, 3_000),
      X("Paint", 6_000, 1_000),
      // Un autre fil, un autre processus : ignores.
      { name: "RunTask", ph: "X", pid: PID, tid: 99, ts: 0, dur: 50_000, args: {} },
      { name: "RunTask", ph: "X", pid: 7, tid: TID, ts: 0, dur: 50_000, args: {} },
    ];
    expect(tempsPropre(evts, PID, TID, 0, 10_000)).toEqual([
      { nom: "tick abc.js:5:12", propreMs: 4 },
      { nom: "Layout", propreMs: 3 },
      { nom: "RunTask", propreMs: 2 },
      { nom: "Paint", propreMs: 1 },
    ]);
  });
  it("decoupe a la fenetre : ce qui deborde n'est compte que dedans", () => {
    const evts = [X("RunTask", 0, 10_000), X("Decode Image", 8_000, 6_000)];
    expect(tempsPropre(evts, PID, TID, 5_000, 10_000)).toEqual([
      { nom: "RunTask", propreMs: 3 },
      { nom: "Decode Image", propreMs: 2 },
    ]);
  });
  it("agrege par etiquette et s'arrete a la limite", () => {
    const evts = [X("RunTask", 0, 1_000), X("RunTask", 2_000, 1_000), X("Paint", 4_000, 500)];
    expect(tempsPropre(evts, PID, TID, 0, 10_000, 1)).toEqual([{ nom: "RunTask", propreMs: 2 }]);
  });
  it("etiquette un script evalue par son fichier, et un appel sans url sans fichier", () => {
    const evts = [
      X("EvaluateScript", 0, 2_000, { data: { url: "http://localhost:3100/_next/static/chunks/main.js" } }),
      X("FunctionCall", 3_000, 1_000, { data: { functionName: "O", lineNumber: 0, columnNumber: 3115 } }),
      X("v8.compile", 5_000, 500),
    ];
    expect(tempsPropre(evts, PID, TID, 0, 10_000)).toEqual([
      { nom: "EvaluateScript main.js", propreMs: 2 },
      { nom: "O :1:3115", propreMs: 1 },
      { nom: "v8.compile", propreMs: 0.5 },
    ]);
  });
  it("une fenetre vide rend une liste vide", () => {
    expect(tempsPropre([], PID, TID, 0, 10)).toEqual([]);
  });
});
