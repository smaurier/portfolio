import { describe, expect, it } from "vitest";
import { MIROIR_TIMING, codexDraw, miroirDuration, miroirPeakAt, nextTheme, parseStoredTheme, smokeAlpha, smokePhase } from "./theme";

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
    // Le temps de la fumee part APRES le trace (13/09) : a t = 0 le monde se
    // dessine encore, rien ne le couvre.
    expect(smokePhase(0).phase).toBe("in");
    expect(smokePhase(0).k).toBe(0);
    expect(smokePhase(MIROIR_TIMING.trace).k).toBe(0);
    expect(smokePhase(MIROIR_TIMING.trace + MIROIR_TIMING.smokeIn - 0.001).k).toBeGreaterThan(0.95);
    expect(smokePhase(MIROIR_TIMING.trace + MIROIR_TIMING.smokeIn + 0.1)).toEqual({ phase: "hold", k: 1 });
    const out = smokePhase(MIROIR_TIMING.trace + MIROIR_TIMING.smokeIn + MIROIR_TIMING.hold + MIROIR_TIMING.smokeOut / 2);
    expect(out.phase).toBe("out");
    expect(out.k).toBeCloseTo(0.5, 5);
    expect(smokePhase(miroirDuration() + 1).phase).toBe("done");
    const peak = miroirPeakAt();
    expect(peak).toBeGreaterThan(MIROIR_TIMING.trace + MIROIR_TIMING.smokeIn);
    expect(peak).toBeLessThan(MIROIR_TIMING.trace + MIROIR_TIMING.smokeIn + MIROIR_TIMING.hold);
    expect(smokePhase(peak).phase).toBe("hold");
  });

  it("la fumee couvre d'abord pres du disque, et se retire d'abord pres du disque", () => {
    const debut = smokePhase(MIROIR_TIMING.trace + MIROIR_TIMING.smokeIn * 0.4);
    expect(smokeAlpha(debut, 0.05, 0.5)).toBeGreaterThan(smokeAlpha(debut, 0.95, 0.5));
    expect(smokeAlpha({ phase: "hold", k: 1 }, 0.5, 0.5)).toBe(1);
    const retrait = smokePhase(MIROIR_TIMING.trace + MIROIR_TIMING.smokeIn + MIROIR_TIMING.hold + MIROIR_TIMING.smokeOut * 0.4);
    expect(smokeAlpha(retrait, 0.05, 0.5)).toBeLessThan(smokeAlpha(retrait, 0.95, 0.5));
    expect(smokeAlpha({ phase: "done", k: 1 }, 0.3, 0.5)).toBe(0);
  });

  it("un instant invalide laisse la fumee au depart", () => {
    expect(smokePhase(Number.NaN)).toEqual({ phase: "in", k: 0 });
  });
});

describe("le trace du codex : la scene se dessine, puis se recolore", () => {
  const T = MIROIR_TIMING;

  it("rien n'est dessine au tout premier instant", () => {
    const d = codexDraw(0);
    expect(d.amount).toBe(1);
    expect(d.front).toBe(0);
    expect(d.sign).toBe(1);
  });

  it("le trait se pose depuis le disque, sans jamais reculer", () => {
    let precedent = -1;
    for (let t = 0; t < T.trace; t += 0.02) {
      const d = codexDraw(t);
      expect(d.sign).toBe(1);
      expect(d.front).toBeGreaterThanOrEqual(precedent);
      precedent = d.front;
    }
    // A la fin du trace, le front a passe les bords de l'ecran.
    expect(codexDraw(T.trace - 0.001).front).toBeGreaterThan(1);
  });

  it("la main va vite puis ralentit : plus de la moitie du trait au premier tiers", () => {
    const tiers = codexDraw(T.trace / 3).front;
    const fin = codexDraw(T.trace - 0.001).front;
    expect(tiers / fin).toBeGreaterThan(0.5);
  });

  it("pendant la fumee, le monde reste entierement dessine", () => {
    const pendant = codexDraw(T.trace + T.smokeIn * 0.5);
    expect(pendant.amount).toBe(1);
    expect(pendant.sign).toBe(1);
    expect(pendant.front).toBeGreaterThan(1);
    expect(codexDraw(miroirPeakAt()).sign).toBe(1);
  });

  it("la couleur revient ensuite, depuis le disque", () => {
    const debut = codexDraw(T.trace + T.smokeIn + T.hold + 0.01);
    const milieu = codexDraw(T.trace + T.smokeIn + T.hold + T.smokeOut * 0.5);
    expect(debut.sign).toBe(-1);
    expect(milieu.sign).toBe(-1);
    expect(milieu.front).toBeGreaterThan(debut.front);
  });

  it("apres la ceremonie, plus rien n'est dessine", () => {
    expect(codexDraw(miroirDuration() + 0.1).amount).toBe(0);
    expect(codexDraw(Number.NaN).amount).toBe(0);
    expect(codexDraw(-1).amount).toBe(0);
  });

  it("le trace occupe le premier tiers de la ceremonie", () => {
    expect(T.trace / miroirDuration()).toBeGreaterThan(0.25);
    expect(T.trace / miroirDuration()).toBeLessThan(0.4);
  });
});
