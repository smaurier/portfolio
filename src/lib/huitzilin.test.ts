import { describe, expect, it } from "vitest";
import { birdTangent, commencerVisite, HUITZILIN_SPECIES, HUITZILIN_SPEC, initialBird, stepBird, suivreVisite, VISITE_VIBRATION, type BirdState } from "./huitzilin";

const SPEC = HUITZILIN_SPEC;

function run(seed: number, seconds: number, p: number, dt = 1 / 60): BirdState[] {
  const out: BirdState[] = [];
  let s = initialBird(seed, SPEC);
  for (let i = 0; i < seconds / dt; i++) {
    s = stepBird(s, dt, p, SPEC);
    out.push(s);
  }
  return out;
}

describe("HUITZILIN_SPECIES (les especes, une couleur chacune)", () => {
  it("au moins quatre especes, teintes toutes differentes, noms nahuatl et francais", () => {
    expect(HUITZILIN_SPECIES.length).toBeGreaterThanOrEqual(4);
    const hues = new Set(HUITZILIN_SPECIES.map((s) => s.hueShift));
    expect(hues.size).toBe(HUITZILIN_SPECIES.length);
    for (const s of HUITZILIN_SPECIES) {
      expect(s.fr.length).toBeGreaterThan(3);
      expect(s.name.length).toBeGreaterThan(3);
    }
  });
});

describe("stepBird (vol stationnaire, fleche, vol stationnaire)", () => {
  it("reste dans la boite de ciel des colibris, de nuit comme a midi", () => {
    for (const p of [0, 0.5, 1]) {
      for (const seed of [1, 5]) {
        let violations = 0;
        for (const s of run(seed, 120, p)) {
          if (Math.abs(s.x) > SPEC.xHalf + 1e-6 || s.z < SPEC.zMin - 1e-6 || s.z > SPEC.zMax + 1e-6) violations++;
          if (s.y < SPEC.yMinNoon - 1e-6 || s.y > SPEC.yMaxNight + 1e-6) violations++;
        }
        expect(violations).toBe(0);
      }
    }
  });

  it("alterne des phases stationnaires (lent, vibrant) et des fleches (rapide)", () => {
    const states = run(3, 60, 0);
    let hover = 0, dart = 0, fast = 0;
    for (let i = 1; i < states.length; i++) {
      const a = states[i - 1], b = states[i];
      const v = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) * 60;
      if (b.mode === "hover") hover++;
      else dart++;
      if (v > SPEC.dartSpeed * 0.5) fast++;
    }
    expect(hover).toBeGreaterThan(0);
    expect(dart).toBeGreaterThan(0);
    expect(fast).toBeGreaterThan(0);
    expect(hover / (hover + dart)).toBeGreaterThan(0.5); // il plane plus qu'il ne file
  });

  it("de nuit il vole haut (vers les etoiles), a midi il descend vers les fleurs", () => {
    const night = run(4, 90, 0).slice(1800);
    const noon = run(4, 90, 1).slice(1800);
    const mean = (xs: BirdState[]) => xs.reduce((a, s) => a + s.y, 0) / xs.length;
    expect(mean(night)).toBeGreaterThan(mean(noon) + 1);
  });

  it("deterministe par graine, graines differentes = vols differents", () => {
    const a = run(9, 10, 0.3), b = run(9, 10, 0.3), c = run(10, 10, 0.3);
    expect(a[a.length - 1]).toEqual(b[b.length - 1]);
    expect(a[a.length - 1]).not.toEqual(c[c.length - 1]);
  });

  it("birdTangent : unitaire, et pendant une fleche oriente comme le deplacement", () => {
    const states = run(2, 40, 0);
    for (let i = 1; i < states.length; i++) {
      const b = states[i];
      const t = birdTangent(b);
      expect(Math.hypot(t.x, t.y, t.z)).toBeCloseTo(1, 9);
      const a = states[i - 1];
      if (b.mode === "dart" && a.mode === "dart") {
        const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
        if (l > 1e-4) expect(t.x * dx + t.z * dz).toBeGreaterThan(0);
      }
    }
  });
});

describe("la chasse (pickPrey : une fleche vers une etoile, qu'elle eteint a l'arrivee)", () => {
  it("avec une proie, la fleche part dans la direction de l'etoile et la tue a l'arrivee", () => {
    const prey = { index: 42, dir: { x: 0.6, y: 0.2, z: -0.77 } };
    let s = initialBird(21, SPEC);
    let killed: number | null = null;
    let dartStart: BirdState | null = null;
    for (let i = 0; i < 60 * 20; i++) {
      const prevMode = s.mode;
      s = stepBird(s, 1 / 60, 0, SPEC, () => prey);
      if (prevMode === "hover" && s.mode === "dart") dartStart = s;
      if (s.justKilled !== null) {
        killed = s.justKilled;
        break;
      }
    }
    expect(killed).toBe(42);
    expect(dartStart).not.toBeNull();
    const d = dartStart!;
    const dx = d.target.x - d.x, dz = d.target.z - d.z;
    expect(dx * prey.dir.x + dz * prey.dir.z).toBeGreaterThan(0);
    expect(d.preyIndex).toBe(42);
    // justKilled ne dure qu'un pas
    s = stepBird(s, 1 / 60, 0, SPEC, () => prey);
    expect(s.justKilled).toBeNull();
  });

  it("sans proie, aucune mise a mort et la fleche va vers une ancre", () => {
    let s = initialBird(22, SPEC);
    for (let i = 0; i < 60 * 20; i++) {
      s = stepBird(s, 1 / 60, 0, SPEC, () => null);
      expect(s.justKilled).toBeNull();
      expect(s.preyIndex).toBeNull();
    }
  });
});

describe("la visite (10/10, le passage du colibri)", () => {
  const POINT = { x: 0.35, y: 3.15, z: 9.7 }; // hors boite (zMax 3)
  const TENUE = 2.5;

  function volerJusquAuPoint(s: BirdState, dt = 1 / 60): { s: BirdState; secondes: number } {
    let secondes = 0;
    while (s.mode === "dart" && secondes < 10) {
      s = stepBird(s, dt, 0, SPEC);
      secondes += dt;
    }
    return { s, secondes };
  }

  it("commencerVisite : une fleche vers le point, la visite posee", () => {
    const s = commencerVisite(initialBird(3, SPEC), POINT, TENUE);
    expect(s.mode).toBe("dart");
    expect(s.target).toEqual(POINT);
    expect(s.visite).toEqual(POINT);
    expect(s.visiteTenue).toBe(TENUE);
  });

  it("l'oiseau arrive SUR le point, hors boite, et tient la duree de la visite", () => {
    const { s, secondes } = volerJusquAuPoint(commencerVisite(initialBird(3, SPEC), POINT, TENUE));
    expect(s.mode).toBe("hover");
    expect(s.x).toBeCloseTo(POINT.x, 6);
    expect(s.y).toBeCloseTo(POINT.y, 6);
    expect(s.z).toBeCloseTo(POINT.z, 6);
    expect(s.z).toBeGreaterThan(SPEC.zMax); // la boite ne borne pas la visite
    expect(s.remaining).toBeCloseTo(TENUE, 6);
    expect(secondes).toBeLessThan(3); // ~1 s depuis la boite a 9 u/s
  });

  it("en stationnaire de visite : vibration reduite, pas de borne de boite, l'ancre suit le point", () => {
    let { s } = volerJusquAuPoint(commencerVisite(initialBird(3, SPEC), POINT, TENUE));
    let maxEcart = 0;
    const suivi = { x: 0.6, y: 3.3, z: 9.9 }; // la camera a bouge (parallaxe)
    for (let i = 0; i < 60; i++) {
      s = stepBird(suivreVisite(s, suivi), 1 / 60, 0, SPEC);
      expect(s.mode).toBe("hover");
      maxEcart = Math.max(maxEcart, Math.hypot(s.x - suivi.x, s.y - suivi.y, s.z - suivi.z));
    }
    expect(maxEcart).toBeGreaterThan(0); // elle vibre
    // Trois composantes bornees a 1 chacune : l'ecart est au plus jit * sqrt(3).
    expect(maxEcart).toBeLessThanOrEqual(SPEC.jitter * VISITE_VIBRATION * Math.sqrt(3) + 1e-6); // mais quatre fois moins
    expect(s.z).toBeGreaterThan(SPEC.zMax);
  });

  it("a la fin de la tenue : la visite est rendue, la fleche vise la proie si on en a une", () => {
    let { s } = volerJusquAuPoint(commencerVisite(initialBird(3, SPEC), POINT, TENUE));
    const prey = { index: 17, dir: { x: 0, y: 0.4, z: -0.92 } };
    let secondes = 0;
    while (s.mode === "hover" && secondes < 5) {
      s = stepBird(s, 1 / 60, 0, SPEC, () => prey);
      secondes += 1 / 60;
    }
    expect(secondes).toBeGreaterThanOrEqual(TENUE - 1 / 30);
    expect(s.mode).toBe("dart");
    expect(s.visite).toBeNull();
    expect(s.preyIndex).toBe(17);
    expect(s.target.z).toBeLessThanOrEqual(SPEC.zMax); // la cible rentre dans la boite
    expect(s.target.z).toBeLessThan(POINT.z); // et part bien vers l'etoile (-z)
  });

  it("sans proie : la fleche part vers une ancre de la boite, et la vie normale reprend", () => {
    let { s } = volerJusquAuPoint(commencerVisite(initialBird(3, SPEC), POINT, TENUE));
    for (let i = 0; i < 60 * 8; i++) s = stepBird(s, 1 / 60, 0, SPEC);
    expect(s.visite).toBeNull();
    expect(Math.abs(s.x)).toBeLessThanOrEqual(SPEC.xHalf + 1e-6);
    expect(s.z).toBeLessThanOrEqual(SPEC.zMax + 1e-6);
  });

  it("stepBird sans visite est inchange (le champ est null)", () => {
    const s = stepBird(initialBird(3, SPEC), 1 / 60, 0, SPEC);
    expect(s.visite).toBeNull();
  });
});
