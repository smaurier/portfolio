import { describe, expect, it } from "vitest";
import {
  DOT_FLIGHT_ORDER,
  FOYER_TIMING,
  HEARTH_STORAGE_KEY,
  HEARTH_TTL_MS,
  HEARTH_WORLD,
  apertureRadius,
  arrivalCamera,
  brazierGlow,
  dotFlightDelay,
  farthestCornerDistance,
  hearthFlare,
  initialArrival,
  projectToScreen,
  shouldPerformCeremony,
  type FlyingDirection,
} from "./foyer";

const VIEWPORT = { width: 1440, height: 900 };
// Camera au repos, progress 0 (cf lib/camera-path : startRadius 7, startHeight 2.6).
const REST_CAMERA = {
  position: { x: 0, y: 2.6, z: 7 },
  target: { x: 0, y: 1, z: 0 },
  fovDeg: 45,
};

describe("foyer : projection du foyer sur l'ecran", () => {
  it("un point sur la cible de la camera tombe pile au centre de l'ecran", () => {
    const p = projectToScreen(REST_CAMERA.target, REST_CAMERA, VIEWPORT);
    expect(p).not.toBeNull();
    expect(p!.x).toBeCloseTo(VIEWPORT.width / 2, 6);
    expect(p!.y).toBeCloseTo(VIEWPORT.height / 2, 6);
  });

  it("le foyer est sous la cible : il se projette SOUS le centre de l'ecran", () => {
    const p = projectToScreen(HEARTH_WORLD, REST_CAMERA, VIEWPORT);
    expect(p).not.toBeNull();
    // Axe ecran : y croit vers le bas.
    expect(p!.y).toBeGreaterThan(VIEWPORT.height / 2);
    // Sur l'axe du monde : reste horizontalement centre.
    expect(p!.x).toBeCloseTo(VIEWPORT.width / 2, 6);
  });

  it("deux points symetriques par rapport a l'axe se projettent symetriquement", () => {
    const left = projectToScreen({ x: -1, y: 1, z: 0 }, REST_CAMERA, VIEWPORT);
    const right = projectToScreen({ x: 1, y: 1, z: 0 }, REST_CAMERA, VIEWPORT);
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    expect(left!.x - VIEWPORT.width / 2).toBeCloseTo(-(right!.x - VIEWPORT.width / 2), 6);
    expect(left!.y).toBeCloseTo(right!.y, 6);
  });

  it("une focale plus large ramene un point hors-axe vers le centre", () => {
    const narrow = projectToScreen({ x: 1, y: 1, z: 0 }, REST_CAMERA, VIEWPORT);
    const wide = projectToScreen({ x: 1, y: 1, z: 0 }, { ...REST_CAMERA, fovDeg: 58 }, VIEWPORT);
    expect(narrow).not.toBeNull();
    expect(wide).not.toBeNull();
    const dNarrow = Math.abs(narrow!.x - VIEWPORT.width / 2);
    const dWide = Math.abs(wide!.x - VIEWPORT.width / 2);
    expect(dWide).toBeLessThan(dNarrow);
  });

  it("un point derriere la camera n'a pas de projection", () => {
    expect(projectToScreen({ x: 0, y: 1, z: 20 }, REST_CAMERA, VIEWPORT)).toBeNull();
  });

  it("le foyer est sur l'axe du monde, juste au-dessus du sol", () => {
    expect(HEARTH_WORLD.x).toBe(0);
    expect(HEARTH_WORLD.z).toBe(0);
    expect(HEARTH_WORLD.y).toBeGreaterThan(0);
    expect(HEARTH_WORLD.y).toBeLessThan(1);
  });
});

describe("foyer : la fumee qui se retire", () => {
  const center = { x: 720, y: 520 };

  it("le rayon part de zero", () => {
    expect(apertureRadius(0, center, VIEWPORT)).toBe(0);
  });

  it("a la fin, le trou couvre le coin le plus eloigne : plus aucun voile", () => {
    expect(apertureRadius(1, center, VIEWPORT)).toBeCloseTo(
      farthestCornerDistance(center, VIEWPORT),
      6,
    );
  });

  it("le rayon ne recule jamais", () => {
    let previous = -1;
    for (let i = 0; i <= 20; i++) {
      const r = apertureRadius(i / 20, center, VIEWPORT);
      expect(r).toBeGreaterThanOrEqual(previous);
      previous = r;
    }
  });

  it("un centre decale demande un rayon final plus grand qu'un centre parfait", () => {
    const centered = { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 };
    const offset = { x: 200, y: 160 };
    expect(farthestCornerDistance(offset, VIEWPORT)).toBeGreaterThan(
      farthestCornerDistance(centered, VIEWPORT),
    );
  });

  it("t hors bornes est ramene dans [0,1]", () => {
    expect(apertureRadius(-3, center, VIEWPORT)).toBe(0);
    expect(apertureRadius(4, center, VIEWPORT)).toBeCloseTo(
      apertureRadius(1, center, VIEWPORT),
      6,
    );
  });
});

describe("foyer : la descente de la camera par l'axe", () => {
  it("a l'arrivee (t=1) la camera est EXACTEMENT au repos : aucun residu", () => {
    expect(arrivalCamera(1)).toEqual({ radiusScale: 1, lift: 0, fovOffset: 0 });
  });

  it("au depart la camera est plus haute et plus pres : on descend l'axe", () => {
    const start = arrivalCamera(0);
    expect(start.lift).toBeGreaterThan(0);
    expect(start.radiusScale).toBeLessThan(1);
  });

  it("la descente est monotone : la hauteur ne remonte jamais", () => {
    let previous = Infinity;
    for (let i = 0; i <= 20; i++) {
      const { lift } = arrivalCamera(i / 20);
      expect(lift).toBeLessThanOrEqual(previous + 1e-9);
      previous = lift;
    }
  });

  it("apres l'arrivee, rien ne bouge plus (t > 1 reste au repos)", () => {
    expect(arrivalCamera(1.7)).toEqual({ radiusScale: 1, lift: 0, fovOffset: 0 });
  });
});

describe("foyer : la flamme qui se pose", () => {
  it("pleine au moment ou le voile s'ouvre, nulle une fois arrive", () => {
    expect(hearthFlare(0)).toBe(1);
    expect(hearthFlare(1)).toBe(0);
  });

  it("elle decroit sans jamais repartir", () => {
    let previous = Infinity;
    for (let i = 0; i <= 20; i++) {
      const f = hearthFlare(i / 20);
      expect(f).toBeLessThanOrEqual(previous + 1e-9);
      previous = f;
    }
  });

  it("hors bornes : bornee a [0,1]", () => {
    expect(hearthFlare(-1)).toBe(1);
    expect(hearthFlare(9)).toBe(0);
  });
});

describe("foyer : les quatre dots qui rejoignent la boussole", () => {
  it("l'ordre de depart est l'onde du jour : Est, Sud, Ouest, Nord", () => {
    expect(DOT_FLIGHT_ORDER).toEqual(["dore", "turquoise", "cendre", "obsidienne"]);
  });

  it("le Centre ne part pas : il n'est pas dans l'ordre de vol", () => {
    expect(DOT_FLIGHT_ORDER).not.toContain("jade");
  });

  it("l'Est part le premier, sans attendre", () => {
    expect(dotFlightDelay("dore")).toBe(0);
  });

  it("les departs se suivent, jamais deux au meme instant", () => {
    const delays = DOT_FLIGHT_ORDER.map((d: FlyingDirection) => dotFlightDelay(d));
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });

  it("le halo se dissout apres l'atterrissage, pas pendant le vol", () => {
    expect(FOYER_TIMING.landingFadeDuration).toBeGreaterThan(0);
    expect(FOYER_TIMING.landingFadeDuration).toBeLessThan(FOYER_TIMING.flightDuration / 2);
  });

  it("le dernier parti a le temps d'arriver dans le tempo annonce", () => {
    const last = dotFlightDelay("obsidienne");
    expect(last + FOYER_TIMING.flightDuration).toBeLessThanOrEqual(
      FOYER_TIMING.descentDelay + FOYER_TIMING.descentDuration,
    );
  });
});

describe("foyer : les cinq braseros qui prennent", () => {
  const INDICES = [0, 1, 2, 3, 4];

  it("au debut de l'arrivee, aucun n'a encore pris", () => {
    for (const i of INDICES) expect(brazierGlow(i, 0)).toBe(0);
  });

  it("l'arrivee finie, les cinq brulent pleinement", () => {
    for (const i of INDICES) expect(brazierGlow(i, 1)).toBe(1);
  });

  it("ils prennent l'un apres l'autre : le premier devance toujours le dernier", () => {
    for (let k = 1; k <= 9; k++) {
      const arrival = k / 10;
      expect(brazierGlow(0, arrival)).toBeGreaterThan(brazierGlow(4, arrival));
    }
  });

  it("un brasero qui a pris ne s'eteint jamais", () => {
    for (const i of INDICES) {
      let previous = -1;
      for (let k = 0; k <= 20; k++) {
        const glow = brazierGlow(i, k / 20);
        expect(glow).toBeGreaterThanOrEqual(previous);
        previous = glow;
      }
    }
  });

  it("hors bornes : borne a [0,1]", () => {
    expect(brazierGlow(2, -5)).toBe(0);
    expect(brazierGlow(2, 5)).toBe(1);
  });
});

describe("foyer : le feu du foyer ne s'eteint jamais", () => {
  const NOW = 1_757_000_000_000;

  it("premiere visite : la ceremonie a lieu", () => {
    expect(shouldPerformCeremony(null, NOW)).toBe(true);
  });

  it("retour immediat : le foyer brule encore, pas de ceremonie", () => {
    expect(shouldPerformCeremony(NOW - 60_000, NOW)).toBe(false);
  });

  it("juste avant l'extinction : le foyer brule encore", () => {
    expect(shouldPerformCeremony(NOW - HEARTH_TTL_MS + 1000, NOW)).toBe(false);
  });

  it("apres l'extinction : la ceremonie a de nouveau lieu", () => {
    expect(shouldPerformCeremony(NOW - HEARTH_TTL_MS - 1000, NOW)).toBe(true);
  });

  it("horloge incoherente (visite dans le futur) : on rejoue la ceremonie", () => {
    expect(shouldPerformCeremony(NOW + 3_600_000, NOW)).toBe(true);
  });

  it("valeur illisible (stockage corrompu) : on rejoue la ceremonie", () => {
    expect(shouldPerformCeremony(Number.NaN, NOW)).toBe(true);
  });

  it("le foyer garde sa memoire QUATRE JOURS (le rite du nouveau-ne)", () => {
    expect(HEARTH_TTL_MS).toBe(4 * 24 * 60 * 60 * 1000);
  });

  it("la cle de stockage est stable : la changer eteindrait tous les foyers", () => {
    expect(HEARTH_STORAGE_KEY).toBe("nahual-hearth");
  });
});

describe("foyer : la flamme passe la main aux braises 3D", () => {
  it("elle se leve avant que la fumee ne l'atteigne", () => {
    expect(FOYER_TIMING.hearthRiseDelay).toBeGreaterThanOrEqual(FOYER_TIMING.openDelay);
    expect(FOYER_TIMING.hearthRiseDelay).toBeLessThan(FOYER_TIMING.openDuration / 2);
  });

  it("le relais commence une fois la flamme pleinement levee", () => {
    expect(FOYER_TIMING.handoffDelay).toBeGreaterThanOrEqual(
      FOYER_TIMING.hearthRiseDelay + FOYER_TIMING.hearthRiseDuration,
    );
  });

  it("le relais est fini avant la fin de l'arrivee : rien ne traine sur la scene", () => {
    expect(FOYER_TIMING.handoffDelay + FOYER_TIMING.handoffDuration).toBeLessThanOrEqual(
      FOYER_TIMING.descentDelay + FOYER_TIMING.descentDuration,
    );
  });
});

describe("foyer : sous reduced-motion, l'arrivee est deja finie", () => {
  it("mouvement reduit : on demarre a l'etat d'arrivee, pas au depart", () => {
    expect(initialArrival(true)).toBe(1);
  });

  it("mouvement normal : on demarre au depart de l'arrivee", () => {
    expect(initialArrival(false)).toBe(0);
  });

  it("a cet etat de depart, plus rien ne bouge : camera au repos, foyer pose, braseros pris", () => {
    // Le canvas passe en frameloop "demand" sous reduced-motion : il ne rend
    // plus apres les premieres images. Tout ce qui lit l'arrivee doit donc
    // etre DEJA a son etat final des la premiere image, sinon il y reste
    // fige pour toute la visite (bug du 08/09 : camera 1,15 u trop haute,
    // braseros eteints, braises bloquees a fond).
    const t = initialArrival(true);
    expect(arrivalCamera(t)).toEqual({ radiusScale: 1, lift: 0, fovOffset: 0 });
    expect(hearthFlare(t)).toBe(0);
    for (const i of [0, 1, 2, 3, 4]) expect(brazierGlow(i, t)).toBe(1);
  });
});

describe("foyer : le tempo", () => {
  it("la fumee commence a se retirer apres l'ouverture de la flamme, pas avant", () => {
    expect(FOYER_TIMING.openDelay).toBeGreaterThan(0);
    expect(FOYER_TIMING.openDelay).toBeLessThan(FOYER_TIMING.sparkDuration);
  });

  it("le contenu se pose pendant que la camera descend, pas apres", () => {
    expect(FOYER_TIMING.contentDelay).toBeGreaterThanOrEqual(FOYER_TIMING.descentDelay);
    expect(FOYER_TIMING.contentDelay).toBeLessThan(
      FOYER_TIMING.descentDelay + FOYER_TIMING.descentDuration,
    );
  });

  it("tout est fini en moins de deux secondes apres l'ouverture", () => {
    const end = FOYER_TIMING.descentDelay + FOYER_TIMING.descentDuration;
    expect(end).toBeLessThanOrEqual(2);
  });
});

describe("projectToScreen avec le cadre decale (10/09)", () => {
  it("glisse le foyer d'un sixieme de la largeur vers la droite, et de rien en hauteur", () => {
    const centre = projectToScreen(HEARTH_WORLD, REST_CAMERA, VIEWPORT);
    const decale = projectToScreen(HEARTH_WORLD, { ...REST_CAMERA, frameShift: 1 / 6 }, VIEWPORT);
    expect(centre).not.toBeNull();
    expect(decale).not.toBeNull();
    expect(decale!.x - centre!.x).toBeCloseTo(VIEWPORT.width / 6, 6);
    expect(decale!.y).toBeCloseTo(centre!.y, 6);
  });

  it("sans decalage declare, rien ne change", () => {
    const a = projectToScreen(HEARTH_WORLD, REST_CAMERA, VIEWPORT);
    const b = projectToScreen(HEARTH_WORLD, { ...REST_CAMERA, frameShift: 0 }, VIEWPORT);
    expect(a).toEqual(b);
  });
});
