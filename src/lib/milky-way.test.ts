import { describe, expect, it } from "vitest";
import { makeMilkyWay, MILKY_WAY } from "./milky-way";

const champ = makeMilkyWay();

describe("makeMilkyWay (l'arche de Mixcoatl)", () => {
  it("pose toutes ses etoiles sur le ciel, a rayon constant", () => {
    for (let i = 0; i < champ.kept; i++) {
      const x = champ.positions[3 * i], y = champ.positions[3 * i + 1], z = champ.positions[3 * i + 2];
      expect(Math.sqrt(x * x + y * y + z * z)).toBeCloseTo(MILKY_WAY.radius, 3);
    }
  });

  it("n'en pose aucune sous l'horizon (les montagnes cachent tout)", () => {
    for (let i = 0; i < champ.kept; i++) {
      expect(champ.positions[3 * i + 1]).toBeGreaterThanOrEqual(MILKY_WAY.radius * MILKY_WAY.minHeight - 1e-6);
    }
  });

  it("PASSE PAR LE ZENITH : c'est la que la camera regarde en fin d'arc", () => {
    let meilleur = Infinity;
    for (let i = 0; i < champ.kept; i++) {
      const y = champ.positions[3 * i + 1] / MILKY_WAY.radius;
      meilleur = Math.min(meilleur, Math.acos(Math.min(1, y)));
    }
    expect((meilleur * 180) / Math.PI).toBeLessThan(4);
  });

  it("fait une BANDE et non un semis : le coeur est bien plus dense que le ciel uniforme", () => {
    const az = (MILKY_WAY.azimuthDeg * Math.PI) / 180;
    const nx = Math.cos(az), nz = Math.sin(az);
    let dansLaBande = 0;
    for (let i = 0; i < champ.kept; i++) {
      const x = champ.positions[3 * i] / MILKY_WAY.radius;
      const z = champ.positions[3 * i + 2] / MILKY_WAY.radius;
      const ecart = Math.abs(Math.asin(Math.max(-1, Math.min(1, x * nx + z * nz))));
      if ((ecart * 180) / Math.PI < MILKY_WAY.spreadDeg) dansLaBande += 1;
    }
    const part = dansLaBande / champ.kept;
    // Une gaussienne met 68 % de ses tirages a moins d'un ecart type ; un
    // ciel uniforme n'en mettrait que 12 % dans une bande de 7 degres.
    expect(part).toBeGreaterThan(0.6);
  });

  it("est deterministe : deux appels donnent le meme ciel", () => {
    const b = makeMilkyWay();
    expect(b.kept).toBe(champ.kept);
    expect(b.positions[0]).toBe(champ.positions[0]);
    expect(b.brightness[7]).toBe(champ.brightness[7]);
  });

  it("garde a peu pres la moitie des tirages : l'autre moitie est sous l'horizon", () => {
    expect(champ.kept).toBeGreaterThan(MILKY_WAY.count * 0.35);
    expect(champ.kept).toBeLessThan(MILKY_WAY.count * 0.65);
  });
});

describe("les grains de poussiere (ce qui fait le laiteux)", () => {
  it("sont une minorite, et seulement au coeur de la bande", () => {
    let grains = 0;
    for (let i = 0; i < champ.kept; i++) if (champ.dust[i] === 1) grains += 1;
    expect(grains).toBeGreaterThan(20);
    expect(grains / champ.kept).toBeLessThan(0.12);
  });

  it("sont larges et faibles : sans quoi ils feraient des taches", () => {
    for (let i = 0; i < champ.kept; i++) {
      if (champ.dust[i] !== 1) continue;
      expect(champ.sizes[i]).toBeGreaterThan(0.4);
      expect(champ.brightness[i]).toBeLessThan(0.05);
    }
  });

  it("laisse les etoiles petites : la plupart sous un quart de la taille max", () => {
    let petites = 0, etoiles = 0;
    for (let i = 0; i < champ.kept; i++) {
      if (champ.dust[i] === 1) continue;
      etoiles += 1;
      if (champ.sizes[i] < 0.25) petites += 1;
    }
    expect(petites / etoiles).toBeGreaterThan(0.45);
  });
});
