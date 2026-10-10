import { describe, expect, it } from "vitest";
import {
  PASSAGE,
  avancerPassage,
  cibleEclat,
  doitDeclencher,
  oiseauLePlusProche,
  passageInitial,
  pointDevantLaCamera,
} from "./passage-colibri";

describe("le passage du colibri : quand", () => {
  it("ne se declenche pas avant le delai, ni sans arrivee", () => {
    const p0 = passageInitial();
    expect(doitDeclencher(p0, -1, 0)).toBe(false);
    expect(doitDeclencher(p0, PASSAGE.delai - 0.01, 0)).toBe(false);
  });
  it("se declenche au delai, dans la nuit", () => {
    expect(doitDeclencher(passageInitial(), PASSAGE.delai, 0)).toBe(true);
    expect(doitDeclencher(passageInitial(), PASSAGE.delai + 30, PASSAGE.pMax - 0.01)).toBe(true);
  });
  it("ne force rien si le visiteur a deja file plus bas (p >= pMax)", () => {
    expect(doitDeclencher(passageInitial(), PASSAGE.delai, PASSAGE.pMax)).toBe(false);
    expect(doitDeclencher(passageInitial(), PASSAGE.delai, 0.9)).toBe(false);
  });
  it("ne joue qu'une fois : tout etat autre que l'attente refuse", () => {
    for (const etat of ["approche", "stationnaire", "chasse", "fini"] as const) {
      expect(doitDeclencher({ etat, oiseau: 0 }, PASSAGE.delai + 10, 0)).toBe(false);
    }
  });
});

describe("le passage du colibri : qui", () => {
  it("choisit l'oiseau le plus proche de la camera", () => {
    const camera = { x: 0, y: 3, z: 11 };
    const oiseaux = [
      { x: -8, y: 5, z: -8 },
      { x: 1, y: 3, z: 2 },
      { x: 7, y: 2, z: -2 },
    ];
    expect(oiseauLePlusProche(oiseaux, camera)).toBe(1);
  });
  it("rend 0 s'il n'y a qu'un oiseau, -1 s'il n'y en a aucun", () => {
    expect(oiseauLePlusProche([{ x: 0, y: 0, z: 0 }], { x: 9, y: 9, z: 9 })).toBe(0);
    expect(oiseauLePlusProche([], { x: 0, y: 0, z: 0 })).toBe(-1);
  });
});

describe("le passage du colibri : le point devant la camera", () => {
  // Bureau : focale 45, ratio 1280/800. Demi-hauteur a 1,3 u = 1,3 tan(22,5).
  const FOV = 45;
  const ASPECT = 1.6;
  const demiH = PASSAGE.distance * Math.tan((FOV * Math.PI) / 360);
  const demiL = demiH * ASPECT;

  it("camera a l'identite : devant = -z, a droite = +x, en haut = +y, en fraction du cadre", () => {
    const pt = pointDevantLaCamera({ x: 0, y: 3, z: 11 }, { x: 0, y: 0, z: 0, w: 1 }, FOV, ASPECT);
    expect(pt.x).toBeCloseTo(PASSAGE.droite * demiL, 6);
    expect(pt.y).toBeCloseTo(3 + PASSAGE.haut * demiH, 6);
    expect(pt.z).toBeCloseTo(11 - PASSAGE.distance, 6);
  });
  it("camera tournee d'un demi-tour autour de Y : devant = +z, a droite = -x", () => {
    // Quaternion d'une rotation de PI autour de Y : (0, sin(PI/2), 0, cos(PI/2)) = (0, 1, 0, 0).
    const pt = pointDevantLaCamera({ x: 0, y: 3, z: -11 }, { x: 0, y: 1, z: 0, w: 0 }, FOV, ASPECT);
    expect(pt.x).toBeCloseTo(-PASSAGE.droite * demiL, 6);
    expect(pt.y).toBeCloseTo(3 + PASSAGE.haut * demiH, 6);
    expect(pt.z).toBeCloseTo(-11 + PASSAGE.distance, 6);
  });
  it("le point est toujours a la distance voulue de la camera", () => {
    const d = Math.hypot(PASSAGE.droite * demiL, PASSAGE.haut * demiH, PASSAGE.distance);
    // Rotation quelconque (normalisee) autour d'un axe oblique.
    const a = 0.7;
    const n = Math.hypot(1, 2, 3);
    const ax = { x: 1 / n, y: 2 / n, z: 3 / n };
    const q = { x: ax.x * Math.sin(a / 2), y: ax.y * Math.sin(a / 2), z: ax.z * Math.sin(a / 2), w: Math.cos(a / 2) };
    const cam = { x: 1, y: 2, z: 3 };
    const pt = pointDevantLaCamera(cam, q, FOV, ASPECT);
    expect(Math.hypot(pt.x - cam.x, pt.y - cam.y, pt.z - cam.z)).toBeCloseTo(d, 5);
  });
  it("sur un telephone (focale 58, ratio 412/839) le point reste DANS le cadre", () => {
    const fov = 58;
    const aspect = 412 / 839;
    const pt = pointDevantLaCamera({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0, w: 1 }, fov, aspect);
    const dh = PASSAGE.distance * Math.tan((fov * Math.PI) / 360);
    const dl = dh * aspect;
    expect(Math.abs(pt.x)).toBeLessThan(dl * 0.75); // marge pour le corps de l'oiseau
    expect(Math.abs(pt.y)).toBeLessThan(dh * 0.75);
    expect(pt.x).toBeGreaterThan(0);
    expect(pt.y).toBeGreaterThan(0);
  });
});

describe("le passage du colibri : la sequence", () => {
  it("attente -> approche au declenchement, avec l'oiseau choisi", () => {
    const p = avancerPassage(passageInitial(), { declenche: 2, mode: "hover", visite: null, justKilled: null });
    expect(p).toEqual({ etat: "approche", oiseau: 2 });
  });
  it("approche -> stationnaire quand l'oiseau se pose sur le point", () => {
    const p = avancerPassage({ etat: "approche", oiseau: 2 }, { mode: "hover", visite: { x: 0, y: 0, z: 0 }, justKilled: null });
    expect(p.etat).toBe("stationnaire");
  });
  it("stationnaire -> chasse quand la visite est rendue (fleche partie)", () => {
    const p = avancerPassage({ etat: "stationnaire", oiseau: 2 }, { mode: "dart", visite: null, justKilled: null });
    expect(p.etat).toBe("chasse");
  });
  it("chasse -> fini a l'arrivee de la fleche (prise ou non)", () => {
    expect(avancerPassage({ etat: "chasse", oiseau: 2 }, { mode: "hover", visite: null, justKilled: 17 }).etat).toBe("fini");
    expect(avancerPassage({ etat: "chasse", oiseau: 2 }, { mode: "hover", visite: null, justKilled: null }).etat).toBe("fini");
  });
  it("fini reste fini, et un etat sans changement rend le meme objet", () => {
    const fini = { etat: "fini" as const, oiseau: 2 };
    expect(avancerPassage(fini, { mode: "dart", visite: null, justKilled: 3 })).toBe(fini);
    const st = { etat: "stationnaire" as const, oiseau: 2 };
    expect(avancerPassage(st, { mode: "hover", visite: { x: 1, y: 1, z: 1 }, justKilled: null })).toBe(st);
  });
});

describe("le passage du colibri : l'eclat", () => {
  it("brille a l'approche et au stationnaire, rien avant ni apres", () => {
    expect(cibleEclat("attente")).toBe(0);
    expect(cibleEclat("approche")).toBe(PASSAGE.eclat);
    expect(cibleEclat("stationnaire")).toBe(PASSAGE.eclat);
    expect(cibleEclat("chasse")).toBe(0);
    expect(cibleEclat("fini")).toBe(0);
  });
});
