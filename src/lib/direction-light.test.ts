import { describe, expect, it } from "vitest";
import { approachRig, DIRECTION_LIGHT_RIG, getLightRig, moonDirection, NEUTRAL_RIG, rigAtArc, sunDirection, sunUp } from "./direction-light";
import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

const DIRECTIONS = Object.keys(DIRECTION_LIGHT_RIG) as DirectionKey[];

describe("DIRECTION_LIGHT_RIG", () => {
  it("laisse le jade sur le rig neutre (comportement historique intact)", () => {
    expect(getLightRig("jade")).toEqual(NEUTRAL_RIG);
  });

  it("laisse dore/cendre neutres tant que leurs fiches ne sont pas enrichies", () => {
    expect(getLightRig("dore")).toEqual(NEUTRAL_RIG);
    expect(getLightRig("cendre")).toEqual(NEUTRAL_RIG);
  });

  it("donne au Sud le zenith : lumiere quasi verticale, la plus haute du site", () => {
    const rig = getLightRig("turquoise");
    const [x, y, z] = rig.position;
    expect(Math.abs(x)).toBeLessThan(2);
    expect(Math.abs(z)).toBeLessThan(2);
    expect(y).toBeGreaterThanOrEqual(9);
    for (const dir of DIRECTIONS) expect(y).toBeGreaterThanOrEqual(getLightRig(dir).position[1]);
  });

  it("eclaire le Sud au-dessus du neutre (la page la plus lumineuse), le Nord en dessous", () => {
    const sud = getLightRig("turquoise");
    expect(sud.ambientScale).toBeGreaterThan(NEUTRAL_RIG.ambientScale);
    expect(sud.directionalScale).toBeGreaterThan(NEUTRAL_RIG.directionalScale);
    expect(sud.colorMix).toBeGreaterThan(0.5);
    const nord = getLightRig("obsidienne");
    expect(sud.ambientScale).toBeGreaterThan(nord.ambientScale);
  });

  it("la couleur du Sud est chaude et claire (midi), pas froide", () => {
    const hex = getLightRig("turquoise").color.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    expect(r).toBeGreaterThanOrEqual(g);
    expect(g).toBeGreaterThanOrEqual(b);
    expect(b).toBeGreaterThan(150); // claire, pas orange
  });

  it("donne au Nord une top light : position quasi zenithale", () => {
    const [x, y, z] = getLightRig("obsidienne").position;
    expect(Math.abs(x)).toBeLessThan(1);
    expect(Math.abs(z)).toBeLessThan(1);
    expect(y).toBeGreaterThanOrEqual(7);
  });

  it("assombrit le Nord : ambient et directional sous le neutre", () => {
    const rig = getLightRig("obsidienne");
    expect(rig.ambientScale).toBeLessThan(NEUTRAL_RIG.ambientScale);
    expect(rig.directionalScale).toBeLessThan(NEUTRAL_RIG.directionalScale);
  });

  it("teinte la lumiere du Nord (colorMix > 0), le neutre reste sans teinte", () => {
    expect(getLightRig("obsidienne").colorMix).toBeGreaterThan(0);
    expect(NEUTRAL_RIG.colorMix).toBe(0);
  });

  it("borne toutes les echelles et mix dans des plages saines", () => {
    for (const dir of DIRECTIONS) {
      const rig = getLightRig(dir);
      // Plafonds releves le 04/09 : le Sud (midi) depasse le neutre par
      // intention ; au-dela de 1.6 / 2 l'image crame (bloom, blancs).
      expect(rig.ambientScale).toBeGreaterThan(0);
      expect(rig.ambientScale).toBeLessThanOrEqual(1.6);
      expect(rig.directionalScale).toBeGreaterThan(0);
      expect(rig.directionalScale).toBeLessThanOrEqual(2);
      expect(rig.colorMix).toBeGreaterThanOrEqual(0);
      expect(rig.colorMix).toBeLessThanOrEqual(1);
    }
  });
});

describe("approachRig", () => {
  it("rapproche position, echelles et mix de la cible proportionnellement", () => {
    const from = { position: [4, 6, 4] as [number, number, number], color: "#ffffff", ambientScale: 1, directionalScale: 1, colorMix: 0 };
    const to = { position: [0, 8, 0] as [number, number, number], color: "#8a7fb0", ambientScale: 0.4, directionalScale: 0.5, colorMix: 0.8 };
    const next = approachRig(from, to, 0.5);
    expect(next.position[0]).toBeCloseTo(2);
    expect(next.position[1]).toBeCloseTo(7);
    expect(next.position[2]).toBeCloseTo(2);
    expect(next.ambientScale).toBeCloseTo(0.7);
    expect(next.directionalScale).toBeCloseTo(0.75);
    expect(next.colorMix).toBeCloseTo(0.4);
    // La couleur cible est portee telle quelle : c'est colorMix qui dose
    expect(next.color).toBe("#8a7fb0");
  });

  it("converge exactement sur la cible (snap epsilon, pas d'asymptote)", () => {
    let rig = { position: [4, 6, 4] as [number, number, number], color: "#ffffff", ambientScale: 1, directionalScale: 1, colorMix: 0 };
    const target = getLightRig("obsidienne");
    for (let i = 0; i < 400; i++) rig = approachRig(rig, target, 0.06);
    expect(rig).toEqual(target);
  });
});

describe("rigAtArc (la lune, puis le soleil qui se leve)", () => {
  it("un rig sans etat de nuit est rendu tel quel", () => {
    expect(rigAtArc(NEUTRAL_RIG, 0)).toEqual(NEUTRAL_RIG);
    expect(rigAtArc(getLightRig("obsidienne"), 0.5)).toEqual(getLightRig("obsidienne"));
  });

  it("au Sud : la lune en haut de page (basse, froide, sous le jour), le zenith en bas", () => {
    const sud = getLightRig("turquoise");
    const night = rigAtArc(sud, 0);
    const noon = rigAtArc(sud, 1);
    expect(night.position[1]).toBeLessThan(noon.position[1]);
    expect(night.color.toLowerCase()).toBe(sud.night!.color.toLowerCase());
    expect(noon.color.toLowerCase()).toBe(sud.color.toLowerCase());
    expect(night.directionalScale).toBeLessThan(noon.directionalScale);
    // froide : le bleu domine la nuit, le rouge domine le jour
    const nb = parseInt(night.color.slice(5, 7), 16), nr = parseInt(night.color.slice(1, 3), 16);
    const db = parseInt(noon.color.slice(5, 7), 16), dr = parseInt(noon.color.slice(1, 3), 16);
    expect(nb).toBeGreaterThan(nr);
    expect(dr).toBeGreaterThan(db);
  });

  it("la source passe de la lune au soleil sans jamais passer sous l'horizon, puis monte au zenith", () => {
    const sud = getLightRig("turquoise");
    // Le relais lune -> soleil (t 0.15 -> 0.4) peut faire baisser la source
    // (la lune se couche, le soleil se leve bas) : c'est l'astronomie ; mais
    // jamais sous l'horizon, et une fois le soleil maitre (t >= 0.4) il ne
    // fait que monter.
    for (let k = 0; k <= 20; k++) expect(rigAtArc(sud, k / 20).position[1]).toBeGreaterThan(0.5);
    let prev = rigAtArc(sud, 0.4).position[1];
    for (let k = 9; k <= 20; k++) {
      const y = rigAtArc(sud, k / 20).position[1];
      expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = y;
    }
    expect(rigAtArc(sud, 1).position[1]).toBeGreaterThan(rigAtArc(sud, 0).position[1]);
  });
});

describe("astronomie du Sud (sunDirection / moonDirection)", () => {
  it("le soleil est sous l'horizon la nuit, se leve a l'est (+x) et finit au zenith", () => {
    expect(sunUp(0)).toBe(false);
    expect(sunUp(0.3)).toBe(true);
    const rise = sunDirection(0.3);
    expect(rise.x).toBeGreaterThan(0.3); // a l est (28 deg a droite du regard)
    const noon = sunDirection(1);
    expect(noon.y).toBeGreaterThan(0.95); // au zenith
    let prev = sunDirection(0).y;
    for (let k = 1; k <= 20; k++) {
      const y = sunDirection(k / 20).y;
      expect(y).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = y;
    }
  });

  it("la lune est a l'ouest (-x), basse la nuit, et se couche quand le soleil monte", () => {
    const night = moonDirection(0);
    expect(night.x).toBeLessThan(0);
    expect(night.y).toBeGreaterThan(0.15);
    expect(night.y).toBeLessThan(0.45);
    expect(moonDirection(0.6).y).toBeLessThan(0); // couchee
    let prev = moonDirection(0).y;
    for (let k = 1; k <= 20; k++) {
      const y = moonDirection(k / 20).y;
      expect(y).toBeLessThanOrEqual(prev + 1e-12);
      prev = y;
    }
  });

  it("la lumiere suit les astres : lune a l'ouest la nuit, zenith a midi, et jamais sous l'horizon", () => {
    const sud = getLightRig("turquoise");
    const night = rigAtArc(sud, 0);
    expect(night.position[0]).toBeLessThan(0);
    const noon = rigAtArc(sud, 1);
    expect(noon.position[1]).toBeGreaterThan(9);
    for (let k = 0; k <= 20; k++) expect(rigAtArc(sud, k / 20).position[1]).toBeGreaterThan(0);
  });
});
