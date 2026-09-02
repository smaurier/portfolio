import { describe, expect, it } from "vitest";
import { pickNorthClip, NORTH_CLIP_MIN, NORTH_CLIP_MAX } from "./north-clips";

describe("pickNorthClip (le cerf du Nord varie ses gestes, 02/09)", () => {
  it("deterministe : meme temps, meme clip", () => {
    expect(pickNorthClip(37.2)).toEqual(pickNorthClip(37.2));
  });

  it("les trois clips finissent par apparaitre sur une longue periode", () => {
    const seen = new Set<string>();
    for (let t = 0; t < 600; t += 0.5) seen.add(pickNorthClip(t).clip);
    expect(seen).toEqual(new Set(["Idle", "Idle_2", "Eating"]));
  });

  it("jamais deux fois le meme clip de suite (c'est la repetition qu'on casse)", () => {
    let prev = pickNorthClip(0);
    for (let t = 0.25; t < 600; t += 0.25) {
      const cur = pickNorthClip(t);
      if (cur.segment !== prev.segment) {
        expect(cur.clip).not.toBe(prev.clip);
        prev = cur;
      }
    }
  });

  it("chaque segment dure entre NORTH_CLIP_MIN et NORTH_CLIP_MAX secondes", () => {
    let start = 0;
    let seg = pickNorthClip(0).segment;
    for (let t = 0.1; t < 600; t += 0.1) {
      const cur = pickNorthClip(t);
      if (cur.segment !== seg) {
        const duration = t - start;
        expect(duration).toBeGreaterThanOrEqual(NORTH_CLIP_MIN - 0.2);
        expect(duration).toBeLessThanOrEqual(NORTH_CLIP_MAX + 0.2);
        start = t;
        seg = cur.segment;
      }
    }
  });
});
