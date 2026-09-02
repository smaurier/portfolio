import { describe, expect, it } from "vitest";
import { arrowVolley, bladeHit, bladeState, BLADE_AVOID_RADIUS, DEER_VOLUME } from "./obsidian-wind";

describe("bladeState (Itzehecayan : le vent porte les lames a l'horizontale, Est -> Ouest)", () => {
  it("traverse le disque de +x vers -x, jamais en tombant : y reste dans sa bande", () => {
    const a = bladeState(0, 0.3, 12);
    const b = bladeState(5, 0.3, 12);
    expect(b.x).toBeLessThan(a.x);
    for (const t of [0, 3, 7, 11]) {
      const s = bladeState(t, 0.3, 12);
      expect(s.y).toBeGreaterThan(0.25);
      expect(s.y).toBeLessThan(2.6);
      expect(Math.abs(s.x)).toBeLessThanOrEqual(6.5);
    }
  });

  it("chaque graine a sa propre hauteur, sa propre voie et sa propre vitesse", () => {
    const a = bladeState(2, 0.1, 12);
    const b = bladeState(2, 0.8, 12);
    expect(a.y).not.toBeCloseTo(b.y, 2);
    expect(a.z).not.toBeCloseTo(b.z, 2);
    expect(a.speed).not.toBeCloseTo(b.speed, 3);
  });

  it("tourne en vol (le roulis avance avec le temps)", () => {
    expect(bladeState(1, 0.5, 12).roll).not.toBeCloseTo(bladeState(2, 0.5, 12).roll, 3);
  });

  it("contourne le cerf : aucune lame ne passe a moins du rayon d'evitement (retour Sylvain 02/09)", () => {
    for (let i = 0; i < 40; i++) {
      const seed = (i + 0.5) / 40;
      for (let t = 0; t < 30; t += 0.05) {
        const s = bladeState(t, seed, 12);
        if (Math.abs(s.x) < 0.6) {
          expect(Math.hypot(s.x, s.z)).toBeGreaterThan(BLADE_AVOID_RADIUS * 0.9);
        }
      }
    }
  });

  it("boucle : la lame reapparait a l'Est apres la traversee (position continue modulo)", () => {
    const s = bladeState(0, 0.5, 12);
    const period = 12 / s.speed;
    const again = bladeState(period, 0.5, 12);
    expect(again.x).toBeCloseTo(s.x, 3);
  });
});

describe("bladeHit (la lame entaille le cerf quand elle traverse son volume)", () => {
  it("le volume du cerf est autour de l'origine, a hauteur du corps", () => {
    expect(DEER_VOLUME.center.y).toBeGreaterThan(0.5);
    expect(DEER_VOLUME.center.y).toBeLessThan(1.6);
  });

  it("une lame loin du cerf ne touche pas", () => {
    expect(bladeHit({ x: 4, y: 1, z: 0 }, { x: 3.7, y: 1, z: 0 })).toBeNull();
  });

  it("une lame qui passe par le corps entaille, avec un cote (gauche/droite) et une force", () => {
    const hit = bladeHit({ x: 0.5, y: 1.1, z: 0.3 }, { x: 0.2, y: 1.1, z: 0.3 });
    expect(hit).not.toBeNull();
    expect(hit!.strength).toBeGreaterThan(0);
    expect(hit!.strength).toBeLessThanOrEqual(1);
    expect(hit!.side).toBe(1);
    const left = bladeHit({ x: 0.5, y: 1.1, z: -0.3 }, { x: 0.2, y: 1.1, z: -0.3 });
    expect(left!.side).toBe(-1);
  });

  it("n'entaille qu'a l'ENTREE dans le volume (pas a chaque frame dedans)", () => {
    const inside = bladeHit({ x: 0.2, y: 1.1, z: 0 }, { x: 0.1, y: 1.1, z: 0 });
    expect(inside).toBeNull();
  });
});

describe("arrowVolley (Temiminaloyan : des fleches, mais seulement en profondeur)", () => {
  it("rien en haut de page", () => {
    expect(arrowVolley(0.2, 10)).toBeNull();
    expect(arrowVolley(0.59, 10)).toBeNull();
  });

  it("en profondeur, une volee de temps en temps, deterministe pour un meme temps", () => {
    const hits: number[] = [];
    for (let t = 0; t < 120; t += 0.5) {
      const v = arrowVolley(0.9, t);
      if (v) hits.push(t);
    }
    expect(hits.length).toBeGreaterThan(2);
    expect(hits.length).toBeLessThan(40);
    expect(arrowVolley(0.9, hits[0])).toEqual(arrowVolley(0.9, hits[0]));
  });

  it("une volee tombe dans le bassin, autour du cerf, jamais sur lui", () => {
    for (let t = 0; t < 120; t += 0.5) {
      const v = arrowVolley(0.9, t);
      if (!v) continue;
      for (const a of v.arrows) {
        const r = Math.hypot(a.x, a.z);
        expect(r).toBeGreaterThan(1.2);
        expect(r).toBeLessThan(5.5);
      }
    }
  });
});
