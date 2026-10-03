import { describe, expect, it } from "vitest";
import type { Evenement } from "./evenements";
import { filPrincipal, processusDeRendu, reperes } from "./evenements";
import { BUDGET_BUREAU_MS, fenetre, fenetrePaires, mediane, paires, perdues, presentees, resumer, trames } from "./images";

/**
 * LE COEUR DE LA BARRE, SUR DES EVENEMENTS FABRIQUES.
 *
 * La forme des evenements est celle relevee le 22/09 sur le tracage
 * Chromium (`.scratch/trace-images.mjs`) : une trame est un PipelineReporter
 * `b`/`e` apparie par `id2.local`, sur le fil Compositor du processus de
 * rendu ; les fils sont nommes par des evenements `M`.
 */
const RENDU = 100;
const NAVIGATEUR = 1;
const fils: Evenement[] = [
  { name: "thread_name", ph: "M", pid: RENDU, tid: 11, ts: 0, args: { name: "CrRendererMain" } },
  { name: "thread_name", ph: "M", pid: RENDU, tid: 12, ts: 0, args: { name: "Compositor" } },
  { name: "thread_name", ph: "M", pid: NAVIGATEUR, tid: 2, ts: 0, args: { name: "CrBrowserMain" } },
];

/** Une trame : debut `ts`, presentee `dur` us plus tard, dans l'etat donne. */
function trame(pid: number, tid: number, sequence: number, ts: number, dur: number, etat: string, id = `0x${sequence.toString(16)}`): Evenement[] {
  return [
    { name: "PipelineReporter", ph: "b", pid, tid, ts, id2: { local: id }, args: { frame_reporter: { frame_sequence: sequence, state: etat } } },
    { name: "PipelineReporter", ph: "e", pid, tid, ts: ts + dur, id2: { local: id }, args: {} },
  ];
}

/** Six trames a 16 667 us, la quatrieme perdue : un trou de 33 ms entre la 3 et la 5. */
const reguliere: Evenement[] = [
  ...fils,
  ...trame(NAVIGATEUR, 2, 1, 0, 5_000, "STATE_PRESENTED_ALL"),
  ...trame(RENDU, 12, 1, 0, 10_000, "STATE_PRESENTED_ALL"),
  ...trame(RENDU, 12, 2, 16_667, 10_000, "STATE_PRESENTED_ALL"),
  ...trame(RENDU, 12, 3, 33_334, 10_000, "STATE_PRESENTED_PARTIAL"),
  ...trame(RENDU, 12, 4, 50_001, 10_000, "STATE_DROPPED"),
  ...trame(RENDU, 12, 5, 66_668, 10_000, "STATE_PRESENTED_ALL"),
  ...trame(RENDU, 12, 6, 83_335, 10_000, "STATE_PRESENTED_ALL"),
];

describe("le processus et les fils", () => {
  it("le processus de rendu est celui dont le fil Compositor porte le plus de trames", () => {
    expect(processusDeRendu(reguliere)).toBe(RENDU);
  });
  it("sans fil Compositor, la trace ne porte pas d'images et on le dit", () => {
    expect(() => processusDeRendu(fils)).toThrow(/aucun fil Compositor/);
  });
  it("le fil principal est CrRendererMain du processus de rendu", () => {
    expect(filPrincipal(reguliere, RENDU)).toBe(11);
  });
  it("les reperes TimeStamp donnent le premier instant de chaque nom", () => {
    const evts: Evenement[] = [
      { name: "TimeStamp", ph: "I", pid: RENDU, tid: 11, ts: 500, args: { data: { message: "nahual:data-loaded" } } },
      { name: "TimeStamp", ph: "I", pid: RENDU, tid: 11, ts: 900, args: { data: { message: "nahual:data-loaded" } } },
      { name: "TimeStamp", ph: "I", pid: RENDU, tid: 11, ts: 1200, args: { data: { message: "nahual:data-foyer-done" } } },
    ];
    expect([...reperes(evts)]).toEqual([["nahual:data-loaded", 500], ["nahual:data-foyer-done", 1200]]);
  });
});

describe("les trames", () => {
  it("apparie b et e par identifiant, dans le seul processus de rendu, triees par instant de presentation", () => {
    const t = trames(reguliere);
    expect(t.map((x) => x.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(t[0]).toEqual({ sequence: 1, debut: 0, fin: 10_000, etat: "STATE_PRESENTED_ALL" });
    expect(t[3].etat).toBe("STATE_DROPPED");
  });
  it("une navigation fait repartir la sequence a 1 : l'ordre est celui du temps, pas de la sequence", () => {
    const evts = [
      ...fils,
      ...trame(RENDU, 12, 40, 0, 1_000, "STATE_PRESENTED_ALL", "0x1"),
      ...trame(RENDU, 12, 41, 16_667, 1_000, "STATE_PRESENTED_ALL", "0x2"),
      ...trame(RENDU, 12, 1, 700_000, 1_000, "STATE_DROPPED", "0x3"),
      ...trame(RENDU, 12, 2, 716_667, 1_000, "STATE_PRESENTED_ALL", "0x4"),
    ];
    expect(trames(evts).map((x) => x.sequence)).toEqual([40, 41, 1, 2]);
    expect(paires(trames(evts)).map((x) => Math.round(x.ms))).toEqual([17, 700]);
  });
  it("seul le fil Compositor compte : une trame sur un autre fil du meme processus est ignoree", () => {
    const evts = [...fils, ...trame(RENDU, 12, 1, 0, 1_000, "STATE_PRESENTED_ALL"), ...trame(RENDU, 11, 2, 5_000, 1_000, "STATE_PRESENTED_ALL")];
    expect(trames(evts).map((x) => x.sequence)).toEqual([1]);
  });
  it("le rapporteur peut s'appeler chrome_frame_reporter (autre version de Chromium)", () => {
    const evts: Evenement[] = [
      ...fils,
      { name: "PipelineReporter", ph: "b", pid: RENDU, tid: 12, ts: 0, id2: { local: "0x1" }, args: { chrome_frame_reporter: { frame_sequence: 7, state: "STATE_DROPPED" } } },
      { name: "PipelineReporter", ph: "e", pid: RENDU, tid: 12, ts: 1_000, id2: { local: "0x1" }, args: {} },
    ];
    expect(trames(evts)).toEqual([{ sequence: 7, debut: 0, fin: 1_000, etat: "STATE_DROPPED" }]);
  });
  it("presentees compte les trames entieres et partielles, pas les perdues", () => {
    expect(presentees(trames(reguliere))).toBe(5);
  });
  it("un identifiant reutilise apres sa fin donne deux trames, pas une", () => {
    const evts = [...fils, ...trame(RENDU, 12, 1, 0, 1_000, "STATE_PRESENTED_ALL", "0xa"), ...trame(RENDU, 12, 2, 5_000, 1_000, "STATE_PRESENTED_ALL", "0xa")];
    expect(trames(evts).map((x) => x.sequence)).toEqual([1, 2]);
  });
  it("un b sans e est une trame encore en vol : ignoree", () => {
    const evts = [...fils, ...trame(RENDU, 12, 1, 0, 1_000, "STATE_PRESENTED_ALL"), { name: "PipelineReporter", ph: "b", pid: RENDU, tid: 12, ts: 20_000, id2: { local: "0x9" }, args: { frame_reporter: { frame_sequence: 2, state: "STATE_PRESENTED_ALL" } } } as Evenement];
    expect(trames(evts)).toHaveLength(1);
  });
  it("la fenetre garde les trames dont la presentation tombe entre deux instants, perdues comprises", () => {
    const t = trames(reguliere);
    expect(fenetre(t, 20_000, 60_001).map((x) => x.sequence)).toEqual([2, 3, 4]);
  });
});

describe("les paires d'intervalles", () => {
  it("mesure entre deux presentations consecutives, et une perdue entre elles allonge l'intervalle", () => {
    const p = paires(trames(reguliere));
    expect(p.map((x) => Math.round(x.ms * 10) / 10)).toEqual([16.7, 16.7, 33.3, 16.7]);
    expect(p[2]).toEqual({ debut: 43_334, fin: 76_668, ms: 33.334 });
  });
  it("une trame sans mise a jour coupe la serie : rien n'etait a dessiner", () => {
    const evts = [
      ...fils,
      ...trame(RENDU, 12, 1, 0, 1_000, "STATE_PRESENTED_ALL"),
      ...trame(RENDU, 12, 2, 16_667, 1_000, "STATE_NO_UPDATE_DESIRED"),
      ...trame(RENDU, 12, 3, 500_000, 1_000, "STATE_PRESENTED_ALL"),
      ...trame(RENDU, 12, 4, 516_667, 1_000, "STATE_PRESENTED_ALL"),
    ];
    expect(paires(trames(evts)).map((x) => Math.round(x.ms))).toEqual([17]);
  });
  it("un blocage a cheval sur la frontiere de deux moments appartient au moment ou il finit", () => {
    // Quatre presentations a 10, 26, 726 et 743 ms ; la frontiere a 100 ms.
    // Decouper les TRAMES puis apparier perdrait le trou de 700 ms des deux
    // cotes (relecture du 22/09) : on apparie tout, puis on decoupe les paires.
    const evts = [
      ...fils,
      ...trame(RENDU, 12, 1, 0, 10_000, "STATE_PRESENTED_ALL"),
      ...trame(RENDU, 12, 2, 16_000, 10_000, "STATE_PRESENTED_ALL"),
      ...trame(RENDU, 12, 3, 716_000, 10_000, "STATE_PRESENTED_ALL"),
      ...trame(RENDU, 12, 4, 733_000, 10_000, "STATE_PRESENTED_ALL"),
    ];
    const toutes = paires(trames(evts));
    expect(fenetrePaires(toutes, 0, 100_000).map((x) => x.ms)).toEqual([16]);
    expect(fenetrePaires(toutes, 100_000, 1_000_000).map((x) => x.ms)).toEqual([700, 17]);
  });
});

describe("le resume", () => {
  it("compte les images au-dela du budget avec une demi-periode de tolerance, la pire, la repartition, le p5", () => {
    const r = resumer([16.7, 16.8, 25.1, 33.3, 41.7, 50, 100, 16.6, 16.7, 16.7], BUDGET_BUREAU_MS);
    expect(r).toEqual({ intervalles: 10, auDela: 5, pire: 100, hz60: 50, hz30: 20, hz20: 30, p5Fps: 10 });
  });
  it("les seuils sont des dixiemes exacts : 25,0 est encore a 60 Hz, 41,6 encore a 30 Hz", () => {
    const r = resumer([25, 41.6], BUDGET_BUREAU_MS);
    expect(r.auDela).toBe(1);
    expect([r.hz60, r.hz30, r.hz20]).toEqual([50, 50, 0]);
  });
  it("le p5 est le rang le plus proche du 95e centile, jamais le maximum", () => {
    const vingt = [...Array(19).fill(16.7), 200];
    expect(resumer(vingt, BUDGET_BUREAU_MS).p5Fps).toBe(59.9);
  });
  it("une serie vide est un resume a zero, pas une division par zero", () => {
    expect(resumer([], BUDGET_BUREAU_MS)).toEqual({ intervalles: 0, auDela: 0, pire: 0, hz60: 0, hz30: 0, hz20: 0, p5Fps: 0 });
  });
  it("les perdues sont les trames STATE_DROPPED", () => {
    expect(perdues(trames(reguliere))).toBe(1);
  });
});

describe("la mediane", () => {
  it("impair, pair, et vide", () => {
    expect(mediane([3, 1, 2])).toBe(2);
    expect(mediane([4, 1, 3, 2])).toBe(2.5);
    expect(() => mediane([])).toThrow(/vide/);
  });
});
