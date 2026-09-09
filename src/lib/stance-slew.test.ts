import { describe, expect, it } from "vitest";
import { slewLimit, STANCE_SLEW } from "./stance-slew";

/**
 * LA LIMITE DE VITESSE D'ASSIETTE.
 *
 * Mesure du 09/09 sur l'entree de Xolotl dans le bassin (retour Sylvain :
 * « ce qui n'allait pas c'etait surtout comment il entrait et sortait du
 * bassin »). En exposant l'assiette calculee par image :
 *
 *   r=6,73  tangage  33,5   roulis  19,8
 *   r=6,60  tangage  34,3   roulis   8,8
 *   r=6,48  tangage   4,4   roulis  18,8   <- saut de 29,9 deg
 *   r=6,36  tangage -18,0   roulis  20,0
 *   r=6,24  tangage -30,9   roulis  20,1
 *
 * Le tangage bute a MAX_PITCH (0,6 rad = 34,4 deg), change de SIGNE en
 * traversant la margelle de 34 cm -- l'avant est sur la pierre, puis dans
 * l'eau pendant que l'arriere y est encore -- et le roulis reste colle a
 * MAX_ROLL (20 deg) tout du long. Un chien qui franchit une bordure de
 * face ne se vrille pas a 20 degres et ne bascule pas de 30 degres en
 * deux dixiemes de seconde.
 *
 * Le lissage exponentiel existant (STANCE_FOLLOW_RATE = 12/s) ne suffit
 * pas : il converge a 91 % en 200 ms, donc il SUIT fidelement une cible qui
 * s'inverse. Ce qu'il faut est une borne sur la VITESSE, pas sur l'ecart :
 * aucune articulation d'animal ne tourne a 150 deg/s en marchant.
 */

describe("stance-slew : borner la vitesse de l'assiette", () => {
  it("laisse passer un changement lent sans le toucher", () => {
    // Ma premiere version demandait 0,1 rad en une image a 1 rad/s, ce qui
    // fait 344 deg/s : un changement RAPIDE, pas lent. La borne avait
    // raison de mordre. Ici 0,01 rad par image a 1 rad/s reste sous le pas
    // permis de 0,0167.
    const r = slewLimit(0, 0.01, 1 / 60, 1.0);
    expect(r).toBeCloseTo(0.01, 6);
  });

  it("borne un saut brutal a la vitesse permise", () => {
    // Cible a 30 degres d'un coup, sur une image de 1/60 s, a 60 deg/s :
    // on ne doit avancer que d'un degre.
    const max = (60 * Math.PI) / 180;
    const r = slewLimit(0, (30 * Math.PI) / 180, 1 / 60, max);
    expect((r * 180) / Math.PI).toBeCloseTo(1, 6);
  });

  it("borne dans les deux sens", () => {
    const max = 1;
    expect(slewLimit(0, -5, 0.1, max)).toBeCloseTo(-0.1, 6);
    expect(slewLimit(0, 5, 0.1, max)).toBeCloseTo(0.1, 6);
  });

  it("converge, et sans depasser", () => {
    // Une cible fixe doit etre atteinte, jamais franchie : un depassement
    // ferait osciller le corps autour de son assiette.
    let v = 0;
    const cible = 0.5;
    for (let i = 0; i < 400; i += 1) v = slewLimit(v, cible, 1 / 60, 1.0);
    expect(v).toBeCloseTo(cible, 6);
    expect(v).toBeLessThanOrEqual(cible + 1e-9);
  });

  it("tient l'inversion de signe de la margelle en un temps humain", () => {
    // Le cas reel : la cible passe de +34 a -34 degres. A la vitesse
    // retenue, la traversee doit prendre au moins un tiers de seconde --
    // le temps qu'un corps met a basculer -- et jamais deux images.
    const de = (34 * Math.PI) / 180;
    const vers = (-34 * Math.PI) / 180;
    let v = de;
    let images = 0;
    while (Math.abs(v - vers) > 1e-3 && images < 10000) {
      v = slewLimit(v, vers, 1 / 60, STANCE_SLEW);
      images += 1;
    }
    const secondes = images / 60;
    expect(secondes).toBeGreaterThan(0.33);
    expect(secondes, "et ca ne doit pas non plus traîner").toBeLessThan(2);
  });

  it("tolere un pas de temps nul ou aberrant", () => {
    expect(slewLimit(0.2, 1, 0, 1)).toBe(0.2);
    expect(slewLimit(0.2, 1, Number.NaN, 1)).toBe(0.2);
    expect(slewLimit(0.2, Number.NaN, 1 / 60, 1)).toBe(0.2);
  });

  it("garde une vitesse plausible pour un animal", () => {
    // Garde-fou sur la constante elle-meme : au-dela de 120 deg/s on
    // retomberait dans le defaut, en dessous de 30 le corps flotterait.
    const degParSec = (STANCE_SLEW * 180) / Math.PI;
    expect(degParSec).toBeGreaterThan(30);
    expect(degParSec).toBeLessThan(120);
  });
});
