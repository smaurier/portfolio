import { describe, expect, it } from "vitest";
import { PHASE_START } from "./reveal-arc";
import { COMPENSATION_NUIT, compensationNuit } from "./nuit-mobile";

/**
 * LA NUIT MOBILE (04/10) : le profil mobile coupe le post-traitement, et
 * avec lui le Bloom qui faisait rayonner le foyer et les braises ; la
 * premiere image de nuit etait noire sur telephone (A/B 767 / 769 px).
 * Cette lib rend ce que le Bloom ajoutait, en lumiere : trois facteurs qui
 * valent 1 des que le profil porte le post-traitement, et 1 des que le
 * jour s'est leve.
 */
const BUREAU = { postFx: true };
const MOBILE = { postFx: false };

describe("la compensation de la nuit mobile", () => {
  it("vaut 1 partout quand le profil porte le post-traitement, a tout progres", () => {
    for (const p of [0, 0.2, 0.5, 1]) expect(compensationNuit(BUREAU, p)).toEqual({ ambiant: 1, emissif: 1, exposition: 1 });
  });
  it("a l'arc zero sur mobile, rend les valeurs de nuit", () => {
    expect(compensationNuit(MOBILE, 0)).toEqual({ ambiant: COMPENSATION_NUIT.ambiant, emissif: COMPENSATION_NUIT.emissif, exposition: COMPENSATION_NUIT.exposition });
  });
  it("vaut 1 une fois les chemins reveles, et au-dela", () => {
    expect(compensationNuit(MOBILE, PHASE_START["chemins-reveles"])).toEqual({ ambiant: 1, emissif: 1, exposition: 1 });
    expect(compensationNuit(MOBILE, 1)).toEqual({ ambiant: 1, emissif: 1, exposition: 1 });
  });
  it("decroit de facon monotone entre la penombre et les chemins reveles", () => {
    let precedent = compensationNuit(MOBILE, 0).ambiant;
    for (let p = 0.05; p <= 1; p += 0.05) {
      const c = compensationNuit(MOBILE, p);
      expect(c.ambiant).toBeLessThanOrEqual(precedent + 1e-9);
      expect(c.emissif).toBeGreaterThanOrEqual(1);
      expect(c.exposition).toBeGreaterThanOrEqual(1);
      precedent = c.ambiant;
    }
  });
  it("les valeurs de nuit sont celles du design : au moins 1, l'exposition au plus 1,15", () => {
    expect(COMPENSATION_NUIT.ambiant).toBeGreaterThanOrEqual(1);
    expect(COMPENSATION_NUIT.emissif).toBeGreaterThanOrEqual(1);
    expect(COMPENSATION_NUIT.exposition).toBeGreaterThanOrEqual(1);
    expect(COMPENSATION_NUIT.exposition).toBeLessThanOrEqual(1.15);
  });
  it("borne le progres : un progres negatif vaut zero, un progres au-dela de 1 vaut 1", () => {
    expect(compensationNuit(MOBILE, -1)).toEqual(compensationNuit(MOBILE, 0));
    expect(compensationNuit(MOBILE, 2)).toEqual(compensationNuit(MOBILE, 1));
  });
});
