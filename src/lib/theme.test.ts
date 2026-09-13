import { describe, expect, it } from "vitest";
import { MIROIR_TIMING, miroirDuration, miroirPeakAt, nextTheme, parseStoredTheme, smokeAlpha, smokePhase } from "./theme";

describe("le miroir fumant (13/09)", () => {
  it("deux faces, et la memoire ne lit que ces deux mots", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(parseStoredTheme("light")).toBe("light");
    expect(parseStoredTheme("dark")).toBe("dark");
    expect(parseStoredTheme("jour")).toBeNull();
    expect(parseStoredTheme(null)).toBeNull();
  });

  it("la ceremonie : la fumee monte, tient, se retire ; le monde change au milieu de la tenue", () => {
    expect(smokePhase(0).phase).toBe("in");
    expect(smokePhase(0).k).toBe(0);
    expect(smokePhase(MIROIR_TIMING.smokeIn - 0.001).k).toBeGreaterThan(0.95);
    expect(smokePhase(MIROIR_TIMING.smokeIn + 0.1)).toEqual({ phase: "hold", k: 1 });
    const out = smokePhase(MIROIR_TIMING.smokeIn + MIROIR_TIMING.hold + MIROIR_TIMING.smokeOut / 2);
    expect(out.phase).toBe("out");
    expect(out.k).toBeCloseTo(0.5, 5);
    expect(smokePhase(miroirDuration() + 1).phase).toBe("done");
    const peak = miroirPeakAt();
    expect(peak).toBeGreaterThan(MIROIR_TIMING.smokeIn);
    expect(peak).toBeLessThan(MIROIR_TIMING.smokeIn + MIROIR_TIMING.hold);
    expect(smokePhase(peak).phase).toBe("hold");
  });

  it("la fumee couvre d'abord pres du disque, et se retire d'abord pres du disque", () => {
    const debut = smokePhase(MIROIR_TIMING.smokeIn * 0.4);
    expect(smokeAlpha(debut, 0.05, 0.5)).toBeGreaterThan(smokeAlpha(debut, 0.95, 0.5));
    expect(smokeAlpha({ phase: "hold", k: 1 }, 0.5, 0.5)).toBe(1);
    const retrait = smokePhase(MIROIR_TIMING.smokeIn + MIROIR_TIMING.hold + MIROIR_TIMING.smokeOut * 0.4);
    expect(smokeAlpha(retrait, 0.05, 0.5)).toBeLessThan(smokeAlpha(retrait, 0.95, 0.5));
    expect(smokeAlpha({ phase: "done", k: 1 }, 0.3, 0.5)).toBe(0);
  });

  it("un instant invalide laisse la fumee au depart", () => {
    expect(smokePhase(Number.NaN)).toEqual({ phase: "in", k: 0 });
  });
});
