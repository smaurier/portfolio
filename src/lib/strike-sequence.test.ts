import { describe, expect, it } from "vitest";
import { STRIKE_SEQ, strikeState, type StrikeState } from "./strike-sequence";

const HIT = STRIKE_SEQ.hitAt; // instant de l'impact, s apres le declenchement

function at(sinceStart: number, reduced = false): StrikeState {
  return strikeState(sinceStart, reduced, STRIKE_SEQ);
}

describe("strikeState : la frappe du xiuhcoatl, une enveloppe pure du temps", () => {
  it("avant le declenchement (t < 0) : rien", () => {
    const s = at(-1);
    expect(s.stiffen).toBe(0);
    expect(s.flash).toBe(0);
    expect(s.shake).toBe(0);
    expect(s.lift).toBe(0);
    expect(s.fire).toBe(0);
    expect(s.tint).toBe(0);
  });

  it("le serpent se raidit dans les 200 ms AVANT l'impact, pas avant", () => {
    expect(at(HIT - 0.5).stiffen).toBe(0);
    expect(at(HIT - 0.1).stiffen).toBeGreaterThan(0.3);
    expect(at(HIT).stiffen).toBeCloseTo(1, 6);
    // et se detend apres
    expect(at(HIT + STRIKE_SEQ.stiffHold + STRIKE_SEQ.stiffRelease + 0.1).stiffen).toBe(0);
  });

  it("le flash : 0 avant l'impact, 1 a l'impact, eteint en moins de 300 ms", () => {
    expect(at(HIT - 0.01).flash).toBe(0);
    expect(at(HIT).flash).toBeCloseTo(1, 6);
    expect(at(HIT + 0.1).flash).toBeLessThan(at(HIT + 0.05).flash);
    expect(at(HIT + 0.3).flash).toBe(0);
  });

  it("la secousse : nulle avant, forte a l'impact, amortie en ~1 s, jamais negative", () => {
    expect(at(HIT - 0.01).shake).toBe(0);
    expect(at(HIT + 0.02).shake).toBeGreaterThan(0.6);
    let prev = at(HIT + 0.02).shake;
    for (let t = 0.1; t <= 1.5; t += 0.1) {
      const v = at(HIT + t).shake;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(prev + 1e-9);
      prev = v;
    }
    expect(at(HIT + 1.5).shake).toBeLessThan(0.05);
  });

  it("l'anneau se souleve vite, culmine, puis redescend et se pose (0 a 3 s)", () => {
    expect(at(HIT - 0.01).lift).toBe(0);
    const peak = Math.max(...Array.from({ length: 60 }, (_, i) => at(HIT + i * 0.02).lift));
    expect(peak).toBeGreaterThan(0.8);
    expect(at(HIT + 0.15).lift).toBeGreaterThan(0.5);
    expect(at(HIT + 3).lift).toBeLessThan(0.02);
    for (let t = 0; t <= 3; t += 0.05) expect(at(HIT + t).lift).toBeGreaterThanOrEqual(-1e-9);
  });

  it("le feu : jaillit a l'impact, dure plus longtemps que le flash, s'eteint", () => {
    expect(at(HIT - 0.01).fire).toBe(0);
    expect(at(HIT + 0.05).fire).toBeGreaterThan(0.8);
    expect(at(HIT + 0.6).fire).toBeGreaterThan(0.2);
    expect(at(HIT + 3).fire).toBeLessThan(0.02);
  });

  it("reduced-motion : ni raideur, ni flash, ni secousse, ni soulevement ; une montee turquoise lente et le feu", () => {
    const s = at(HIT + 0.02, true);
    expect(s.stiffen).toBe(0);
    expect(s.flash).toBe(0);
    expect(s.shake).toBe(0);
    expect(s.lift).toBe(0);
    expect(s.fire).toBeGreaterThan(0);
    expect(at(HIT + 0.02, true).tint).toBeLessThan(0.1); // pas un eclair
    expect(at(HIT + 1, true).tint).toBeGreaterThan(0.25);
    expect(at(HIT + 4, true).tint).toBeLessThan(0.05);
  });

  it("toutes les composantes restent dans [0, 1]", () => {
    for (let t = -1; t < 8; t += 0.03) {
      for (const reduced of [false, true]) {
        const s = at(t, reduced);
        for (const v of Object.values(s)) {
          expect(v).toBeGreaterThanOrEqual(-1e-9);
          expect(v).toBeLessThanOrEqual(1 + 1e-9);
        }
      }
    }
  });
});
