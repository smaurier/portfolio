# Le passage du colibri : plan d'execution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** une fois par arrivee au Sud, un colibri vient en stationnaire a 1,3 u devant l'objectif, tient 2,5 s, puis file sur une etoile qui tombe ; le visiteur l'a VU.

**Architecture:** une lib pure `passage-colibri` decide QUAND (4 s apres l'arrivee, p < 0,5, une fois), QUI (l'oiseau le plus proche de la camera) et OU (le point devant la camera, repere camera -> monde) ; la lib `huitzilin` gagne un etat de visite (`visite`) qui impose l'ancre du stationnaire hors boite avec une vibration reduite ; le composant `huitzilin-birds` branche les deux et monte un eclat emissif (uniform `uEclat`, pas de recompilation). Aucun mesh ni appel de rendu en plus.

**Tech Stack:** TypeScript, vitest (lib pure), react-three-fiber / three (composant), Playwright en script `.scratch` pour la capture.

Spec : `docs/superpowers/specs/2026-10-10-passage-colibri-design.md`.

---

## Fichiers

- Create `src/lib/passage-colibri.ts` : le quand, le qui, le point, l'avancement de l'etat, la cible d'eclat. Pur.
- Create `src/lib/passage-colibri.test.ts`.
- Modify `src/lib/huitzilin.ts` : `BirdState.visite`, `commencerVisite`, `suivreVisite`, et `stepBird` qui respecte la visite.
- Modify `src/lib/huitzilin.test.ts` : les tests de la visite.
- Modify `src/app/components/stag-scene/huitzilin-birds.tsx` : branchement, `uEclat`, `window.__huitzilinPassage`.
- Create `.scratch/passage-colibri.mjs` : capture bureau + Pixel, stationnaire et prise.
- Modify `docs/da/plans/sud.md` : la ligne du passage.

Conventions du depot a respecter : commentaires en francais sans accents dans le code (comme les fichiers voisins), pas de tiret cadratin, pas d'allocation d'objet ni d'etat React dans `useFrame` (regle eslint `no-restricted-syntax` ; les allocations faites DANS les libs pures, comme `stepBird`, sont hors de sa portee et deja le motif), `pnpm` partout.

---

### Task 1 : la lib pure `passage-colibri` (quand, qui, point)

**Files:**
- Create: `src/lib/passage-colibri.ts`
- Test: `src/lib/passage-colibri.test.ts`

- [x] **Step 1 : ecrire les tests, rouges**

```ts
// src/lib/passage-colibri.test.ts
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
  it("camera a l'identite : devant = -z, a droite = +x, en haut = +y", () => {
    const pt = pointDevantLaCamera({ x: 0, y: 3, z: 11 }, { x: 0, y: 0, z: 0, w: 1 });
    expect(pt.x).toBeCloseTo(PASSAGE.droite, 6);
    expect(pt.y).toBeCloseTo(3 + PASSAGE.haut, 6);
    expect(pt.z).toBeCloseTo(11 - PASSAGE.distance, 6);
  });
  it("camera tournee d'un demi-tour autour de Y : devant = +z, a droite = -x", () => {
    // Quaternion d'une rotation de PI autour de Y : (0, sin(PI/2), 0, cos(PI/2)) = (0, 1, 0, 0).
    const pt = pointDevantLaCamera({ x: 0, y: 3, z: -11 }, { x: 0, y: 1, z: 0, w: 0 });
    expect(pt.x).toBeCloseTo(-PASSAGE.droite, 6);
    expect(pt.y).toBeCloseTo(3 + PASSAGE.haut, 6);
    expect(pt.z).toBeCloseTo(-11 + PASSAGE.distance, 6);
  });
  it("le point est toujours a la distance voulue de la camera", () => {
    const d = Math.hypot(PASSAGE.droite, PASSAGE.haut, PASSAGE.distance);
    // Rotation quelconque (normalisee) autour d'un axe oblique.
    const a = 0.7;
    const ax = { x: 0.267, y: 0.535, z: 0.802 };
    const q = { x: ax.x * Math.sin(a / 2), y: ax.y * Math.sin(a / 2), z: ax.z * Math.sin(a / 2), w: Math.cos(a / 2) };
    const cam = { x: 1, y: 2, z: 3 };
    const pt = pointDevantLaCamera(cam, q);
    expect(Math.hypot(pt.x - cam.x, pt.y - cam.y, pt.z - cam.z)).toBeCloseTo(d, 5);
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
```

- [x] **Step 2 : verifier le rouge**

Run: `pnpm exec vitest run src/lib/passage-colibri.test.ts`
Expected: FAIL, « Failed to resolve import "./passage-colibri" ».

- [x] **Step 3 : ecrire la lib**

```ts
// src/lib/passage-colibri.ts
/**
 * LE PASSAGE DU COLIBRI (10/10/2026, le Sud). Brainstorm du 21/09 : les
 * colibris sont « la chose a avoir vue en quittant Projets », et quatre
 * leviers (proximite, geste lisible, isolement, son) a sequencer, pas a
 * sacrifier. Mesure : la camera du Sud est a ~11 u du cerf, la boite des
 * oiseaux s'arrete a 8 u devant elle ; a l'echelle 0,06 (choix de Sylvain,
 * realiste) un colibri fait trois pixels et le geste du mythe (une etoile
 * tombe parce qu'un colibri l'a prise) se joue sans que personne le voie.
 *
 * Le passage reunit trois leviers en un moment : UN oiseau (isolement)
 * vient a 1,3 u de l'objectif (proximite : c'est la distance qui le rend
 * lisible, jamais l'echelle), tient, puis file sur une etoile qui tombe
 * (geste lisible : l'oeil est pose dessus). Une fois par arrivee au Sud.
 *
 * Cette lib decide QUAND, QUI et OU, et fait avancer l'etat du passage a
 * partir de ce que fait l'oiseau. Pure. La mecanique de vol (l'ancre
 * imposee, la vibration reduite) est dans huitzilin.ts ; le branchement
 * dans huitzilin-birds.tsx.
 */
import type { Vec3 } from "./huitzilin";

export const PASSAGE = {
  /** Secondes apres l'arrivee (la meme horloge que les etoiles jetees). */
  delai: 4,
  /** Au-dela, le visiteur a file : la bataille disperse les etoiles, rien a chasser. */
  pMax: 0.5,
  /** Distance devant l'objectif (u). */
  distance: 1.3,
  /** Decalage dans le repere camera : a droite (+x) et en haut (+y), en u.
   * Le cerf est au centre (telephone) ou aux deux tiers (bureau, colonne de
   * texte a gauche) : en haut a droite on ne le couvre jamais. */
  droite: 0.35,
  haut: 0.15,
  /** Duree du stationnaire devant l'objectif (s). */
  tenue: 2.5,
  /** Facteur de la vibration en visite (0,12 u a 1,3 u serait un saut). */
  vibration: 0.4,
  /** Intensite de l'eclat emissif pendant la visite ; dosage a la capture. */
  eclat: 0.4,
} as const;

export type EtatPassage = "attente" | "approche" | "stationnaire" | "chasse" | "fini";

export type Passage = { etat: EtatPassage; oiseau: number | null };

export type Quat = { x: number; y: number; z: number; w: number };

export function passageInitial(): Passage {
  return { etat: "attente", oiseau: null };
}

/** Une fois, au delai, tant que la nuit dure. `sinceArrival` < 0 = pas arrive. */
export function doitDeclencher(passage: Passage, sinceArrival: number, p: number): boolean {
  return passage.etat === "attente" && sinceArrival >= PASSAGE.delai && p < PASSAGE.pMax;
}

/** L'indice de l'oiseau le plus proche de la camera ; -1 sans oiseau. */
export function oiseauLePlusProche(oiseaux: readonly Vec3[], camera: Vec3): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < oiseaux.length; i++) {
    const o = oiseaux[i];
    const d = (o.x - camera.x) ** 2 + (o.y - camera.y) ** 2 + (o.z - camera.z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Le point devant la camera : (droite, haut, -distance) dans le repere
 * camera (three regarde vers -z), tourne par le quaternion de la camera,
 * ajoute a sa position. Rotation d'un vecteur par un quaternion unitaire :
 * v' = v + 2 q.xyz x (q.xyz x v + q.w v). */
export function pointDevantLaCamera(position: Vec3, q: Quat, spec: typeof PASSAGE = PASSAGE): Vec3 {
  const vx = spec.droite, vy = spec.haut, vz = -spec.distance;
  // t = q.xyz x v + q.w v
  const tx = q.y * vz - q.z * vy + q.w * vx;
  const ty = q.z * vx - q.x * vz + q.w * vy;
  const tz = q.x * vy - q.y * vx + q.w * vz;
  // v' = v + 2 (q.xyz x t)
  return {
    x: position.x + vx + 2 * (q.y * tz - q.z * ty),
    y: position.y + vy + 2 * (q.z * tx - q.x * tz),
    z: position.z + vz + 2 * (q.x * ty - q.y * tx),
  };
}

/** Ce que l'on observe de l'oiseau du passage, une image. `declenche` =
 * l'indice choisi a l'image du declenchement (sinon absent). */
export type Observation = {
  declenche?: number;
  mode: "hover" | "dart";
  visite: Vec3 | null;
  justKilled: number | null;
};

/** La sequence : attente -> approche (declenchement) -> stationnaire (pose
 * sur le point) -> chasse (la visite est rendue, la fleche est partie) ->
 * fini (la fleche est arrivee, etoile prise ou non). Rend le MEME objet
 * quand rien ne change (le composant compare par identite). */
export function avancerPassage(passage: Passage, o: Observation): Passage {
  switch (passage.etat) {
    case "attente":
      return o.declenche !== undefined ? { etat: "approche", oiseau: o.declenche } : passage;
    case "approche":
      return o.mode === "hover" && o.visite !== null ? { etat: "stationnaire", oiseau: passage.oiseau } : passage;
    case "stationnaire":
      return o.visite === null ? { etat: "chasse", oiseau: passage.oiseau } : passage;
    case "chasse":
      return o.mode === "hover" ? { etat: "fini", oiseau: passage.oiseau } : passage;
    case "fini":
      return passage;
  }
}

/** L'eclat emissif vise : le guerrier du soleil brille en venant et en
 * tenant ; il s'eteint en partant chasser. Le composant lisse. */
export function cibleEclat(etat: EtatPassage): number {
  return etat === "approche" || etat === "stationnaire" ? PASSAGE.eclat : 0;
}
```

- [x] **Step 4 : verifier le vert**

Run: `pnpm exec vitest run src/lib/passage-colibri.test.ts`
Expected: PASS, 15 tests.

- [x] **Step 5 : commit**

```bash
git add src/lib/passage-colibri.ts src/lib/passage-colibri.test.ts
git commit -m "feat(sud): le passage du colibri, la lib pure (quand, qui, le point devant la camera, la sequence, l'eclat)"
```

---

### Task 2 : la visite dans `huitzilin` (l'ancre imposee, hors boite, vibration reduite)

**Files:**
- Modify: `src/lib/huitzilin.ts`
- Test: `src/lib/huitzilin.test.ts`

- [x] **Step 1 : ecrire les tests, rouges** (a la fin de `src/lib/huitzilin.test.ts`)

```ts
import { commencerVisite, suivreVisite } from "./huitzilin";

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
    expect(maxEcart).toBeLessThanOrEqual(SPEC.jitter * 0.4 * Math.sqrt(3) + 1e-6); // mais quatre fois moins
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
```

- [x] **Step 2 : verifier le rouge**

Run: `pnpm exec vitest run src/lib/huitzilin.test.ts`
Expected: FAIL, « does not provide an export named 'commencerVisite' ».

- [x] **Step 3 : modifier la lib**

Dans `src/lib/huitzilin.ts`, ajouter a `BirdState` (apres `justKilled`) :

```ts
  /** Le passage (10/10, lib/passage-colibri) : le point devant la camera
   * ou l'oiseau tient son stationnaire, hors boite, vibration reduite ;
   * null hors visite. */
  visite: Vec3 | null;
  /** Duree du stationnaire de visite (s), posee a l'arrivee sur le point. */
  visiteTenue: number;
```

Dans `initialBird`, ajouter a l'objet rendu : `visite: null, visiteTenue: 0,`.

Ajouter les deux fonctions avant `stepBird` :

```ts
/** Le passage commence : une fleche droit vers le point devant la camera,
 * et la visite est posee (l'arrivee donnera un stationnaire de `tenue` s). */
export function commencerVisite(s: BirdState, point: Vec3, tenue: number): BirdState {
  return { ...s, mode: "dart", target: point, visite: point, visiteTenue: tenue, preyIndex: null };
}

/** Le point suit la camera (parallaxe, scroll) : l'ancre de la visite est
 * remise a jour chaque image ; sans effet hors visite. */
export function suivreVisite(s: BirdState, point: Vec3): BirdState {
  if (s.visite === null) return s;
  return { ...s, visite: point, anchor: s.mode === "hover" ? point : s.anchor, target: s.mode === "dart" ? point : s.target };
}
```

Dans `stepBird`, branche `hover`, remplacer le calcul de `anchor`, `x`, `y`, `z` :

```ts
    // L'ancre glisse vers l'altitude du moment (le jour descend l'oiseau).
    const yMin = spec.yMinNight + (spec.yMinNoon - spec.yMinNight) * pp;
    const yMax = spec.yMaxNight + (spec.yMaxNoon - spec.yMaxNight) * pp;
    // En visite (le passage) : l'ancre est le point devant la camera, hors
    // boite, et la vibration est reduite (a 1,3 u, 12 cm serait un saut).
    const pointVisite = s.visite;
    const visite = pointVisite !== null;
    const anchor = pointVisite !== null ? pointVisite : { x: s.anchor.x, y: clamp(s.anchor.y, yMin, yMax), z: s.anchor.z };
    const jit = visite ? spec.jitter * VISITE_VIBRATION : spec.jitter;
    const x = visite ? anchor.x + jx * jit : clamp(anchor.x + jx * jit, -spec.xHalf, spec.xHalf);
    const y = visite ? anchor.y + jy * jit : clamp(anchor.y + jy * jit, spec.yMinNoon, spec.yMaxNight);
    const z = visite ? anchor.z + jz * jit : clamp(anchor.z + jz * jit, spec.zMin, spec.zMax);
```

et, a la fin du stationnaire, rendre la visite sur les deux retours de fleche : dans le retour avec proie, ajouter `visite: null` ; dans le retour sans proie, ajouter `visite: null`. Les cibles sont deja bornees a la boite (`clamp` et `pickAnchor`).

Dans la branche `dart`, a l'arrivee (`dist <= step`), remplacer `remaining:` par :

```ts
      remaining: s.visite !== null ? s.visiteTenue : spec.hoverMin + (spec.hoverMax - spec.hoverMin) * hash(s.seed, s.darts, 4),
```

Ajouter la constante en haut du fichier, apres `HUITZILIN_SPEC` :

```ts
/** Facteur de la vibration en stationnaire de visite (lib/passage-colibri). */
export const VISITE_VIBRATION = 0.4;
```

- [x] **Step 4 : verifier le vert, et que l'ancien reste vert**

Run: `pnpm exec vitest run src/lib/huitzilin.test.ts src/lib/passage-colibri.test.ts`
Expected: PASS (les anciens tests de la boite restent verts : sans visite, rien ne change).

Note : le test « reste dans la boite » existant borne `y` par `yMinNoon..yMaxNight` ; la visite n'y passe pas (pas de `commencerVisite` dans `run`).

- [x] **Step 5 : commit**

```bash
git add src/lib/huitzilin.ts src/lib/huitzilin.test.ts
git commit -m "feat(sud): la visite du colibri dans la lib de vol (ancre imposee hors boite, vibration x0,4, tenue, retour a la vie normale)"
```

---

### Task 3 : le branchement dans `huitzilin-birds.tsx` (passage, eclat, sonde)

**Files:**
- Modify: `src/app/components/stag-scene/huitzilin-birds.tsx`

- [x] **Step 1 : les imports**

```ts
import { birdTangent, commencerVisite, HUITZILIN_SPEC, HUITZILIN_SPECIES, initialBird, stepBird, suivreVisite, type BirdState, type Prey } from "@/lib/huitzilin";
import { avancerPassage, cibleEclat, doitDeclencher, oiseauLePlusProche, PASSAGE, passageInitial, pointDevantLaCamera, type Passage } from "@/lib/passage-colibri";
```

- [x] **Step 2 : l'uniform `uEclat` (pas de recompilation : un uniform de plus a la creation, jamais une cle de programme)**

Dans le type :

```ts
type BirdUniforms = { uTime: { value: number }; uFlap: { value: number }; uHue: { value: number }; uSat: { value: number }; uPhase: { value: number }; uEclat: { value: number } };
```

Dans `makeMaterial`, ajouter apres `shader.uniforms.uPhase = uniforms.uPhase;` :

```ts
    shader.uniforms.uEclat = uniforms.uEclat;
```

Dans le `fragmentShader`, ajouter la declaration a cote de `uSat` :

```glsl
uniform float uEclat;
```

et apres le `.replace("#include <map_fragment>", ...)` existant, enchainer :

```ts
      .replace(
        "#include <emissivemap_fragment>",
        // Le passage (10/10) : la texture elle-meme s'allume (pas une couleur
        // plate par-dessus) ; le guerrier du soleil brille en venant.
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uEclat;"
      );
```

Dans `useMemo(birds)`, ajouter `uEclat: { value: 0 }` a l'objet `uniforms`.

- [x] **Step 3 : l'etat du passage et le branchement dans `useFrame`**

Apres `const preyPick = useRef(0);` :

```ts
  // Le passage (10/10, lib/passage-colibri) : une fois par montage au Sud.
  const passageRef = useRef<Passage>(passageInitial());
  const eclatRef = useRef(0);
```

Dans le `scratch` du `useMemo`, ajouter `camPos: { x: 0, y: 0, z: 0 }, camQ: { x: 0, y: 0, z: 0, w: 1 }, obs: { declenche: undefined as number | undefined, mode: "hover" as "hover" | "dart", visite: null as Vec3 | null, justKilled: null as number | null }` (objets plats reutilises : la lib lit des `Vec3`/`Quat` plats, on recopie la camera dedans sans allouer ; `obs` est l'observation passee a `avancerPassage`, remplie champ par champ). Importer `type Vec3` depuis `@/lib/huitzilin`.

Dans `useFrame`, juste AVANT la boucle `for (let i = 0; i < birds.length; i++)` :

```ts
    // LE PASSAGE : quand, qui, ou. La camera est recopiee dans des objets
    // plats du scratch (rien d'alloue ici ; les libs pures allouent, comme
    // stepBird, c'est leur role).
    const cam = state.camera;
    const { camPos, camQ } = scratch;
    camPos.x = cam.position.x; camPos.y = cam.position.y; camPos.z = cam.position.z;
    camQ.x = cam.quaternion.x; camQ.y = cam.quaternion.y; camQ.z = cam.quaternion.z; camQ.w = cam.quaternion.w;
    let declenche: number | undefined;
    if (dt > 0 && doitDeclencher(passageRef.current, sinceArrival, p)) {
      const i = oiseauLePlusProche(statesRef.current, camPos);
      if (i >= 0) {
        statesRef.current[i] = commencerVisite(statesRef.current[i], pointDevantLaCamera(camPos, camQ, PASSAGE), PASSAGE.tenue);
        declenche = i;
      }
    }
    const visiteur = passageRef.current.oiseau;
    if (visiteur !== null && statesRef.current[visiteur].visite !== null) {
      statesRef.current[visiteur] = suivreVisite(statesRef.current[visiteur], pointDevantLaCamera(camPos, camQ, PASSAGE));
    }
```

Dans la boucle, APRES la ligne `const s = (statesRef.current[i] = ...)` et le bloc `justKilled` existant, ajouter :

```ts
      // L'etat du passage avance avec ce que fait l'oiseau du passage.
      if (declenche === i || passageRef.current.oiseau === i) {
        const obs = scratch.obs;
        obs.declenche = declenche === i ? i : undefined;
        obs.mode = s.mode;
        obs.visite = s.visite;
        obs.justKilled = s.justKilled;
        const suivant = avancerPassage(passageRef.current, obs);
        if (suivant !== passageRef.current) {
          passageRef.current = suivant;
          // Sonde pour la capture (.scratch/passage-colibri.mjs), meme motif
          // que __huitzilinForward : une chaine, sans cout.
          if (typeof window !== "undefined") (window as unknown as { __huitzilinPassage?: string }).__huitzilinPassage = suivant.etat;
        }
      }
```

Et dans la mise a jour des uniforms de la boucle (apres `u.uFlap.value = ...`) :

```ts
      // L'eclat ne concerne que l'oiseau du passage ; lisse (0,15 par image
      // a 60 Hz, ~0,5 s), visible en venant et en tenant, eteint en partant.
      if (passageRef.current.oiseau === i) {
        eclatRef.current += (cibleEclat(passageRef.current.etat) - eclatRef.current) * 0.15;
        u.uEclat.value = eclatRef.current;
      }
```

- [x] **Step 4 : verifier types et lint**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src/app/components/stag-scene/huitzilin-birds.tsx src/lib/huitzilin.ts src/lib/passage-colibri.ts`
Expected: aucune erreur. Si eslint signale une allocation dans `useFrame` : c'est un objet litteral ecrit DANS le callback ; le deplacer dans `scratch`.

- [x] **Step 5 : les unitaires complets**

Run: `pnpm test`
Expected: tous verts (1109 + 19 nouveaux).

- [x] **Step 6 : commit**

```bash
git add src/app/components/stag-scene/huitzilin-birds.tsx
git commit -m "feat(sud): le passage du colibri branche (un oiseau vient devant l'objectif, tient, file sur une etoile ; eclat emissif par uniform ; sonde __huitzilinPassage)"
```

---

### Task 4 : la capture, et l'oeil de Sylvain

**Files:**
- Create: `.scratch/passage-colibri.mjs`

- [x] **Step 1 : le script**

```js
// .scratch/passage-colibri.mjs : le passage du colibri (10/10). Bureau 1280
// et Pixel 7, une image au stationnaire devant l'objectif, une a la prise.
// Usage : pnpm run build ; pnpm exec next start -p 3100 ; node .scratch/passage-colibri.mjs 3100
import { chromium, devices } from "@playwright/test";
const { defaultBrowserType: _d, ...PIXEL } = devices["Pixel 7"];
const PORT = process.argv[2] ?? "3100";
const CAS = {
  "bureau-1280": { viewport: { width: 1280, height: 800 } },
  "pixel-412": { ...PIXEL },
};
const b = await chromium.launch({ args: ["--use-angle=d3d11", "--use-gl=angle", "--ignore-gpu-blocklist"] });
for (const [nom, ctxOpts] of Object.entries(CAS)) {
  const ctx = await b.newContext({ ...ctxOpts, colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/fr/projets?shaders-prod&veille=off`, { waitUntil: "commit", timeout: 180_000 });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 180_000 });
  const t0 = Date.now();
  await page.waitForFunction(() => window.__huitzilinPassage === "stationnaire", null, { timeout: 60_000 });
  console.log(`${nom} : stationnaire a +${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `.scratch/passage-${nom}-1-stationnaire.png` });
  await page.waitForFunction(() => window.__huitzilinPassage === "chasse", null, { timeout: 20_000 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `.scratch/passage-${nom}-2-chasse.png` });
  await page.waitForFunction(() => window.__huitzilinPassage === "fini", null, { timeout: 20_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `.scratch/passage-${nom}-3-prise.png` });
  console.log(`${nom} : fini a +${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await ctx.close();
}
await b.close();
```

- [x] **Step 2 : compiler, servir, capturer**

Run (PowerShell) :

```powershell
pnpm run build
$p = Start-Process -FilePath "pnpm" -ArgumentList "exec","next","start","-p","3100" -WindowStyle Hidden -PassThru
# attendre que http://localhost:3100/fr reponde 200, puis :
node .scratch/passage-colibri.mjs 3100
foreach ($f in Get-ChildItem .scratch/passage-*.png) { Copy-Item $f.FullName "C:\Users\sylva\Downloads\nahual-sud-$($f.Name)" -Force }
Stop-Process -Id $p.Id -Force
```

Expected : six images, « stationnaire a +~5 s » et « fini a +~9 s » sur les deux cas.

- [x] **Step 3 : regarder soi-meme AVANT de remettre** — FAIT, et le verdict a change la suite. `1-stationnaire` montrait l'oiseau lisible mais l'eclat en aplat exposait la texture peinte bas-poly (couleurs saturees, zero volume) a cote d'un decor ombre. Pas de recapture a l'identique : voir la revision ci-dessous.

- [x] **Step 4 : remettre a Sylvain** — FAIT (10/10, les six images de `Downloads/nahual-sud-2-passage-*`). Verdict de Sylvain : « le colibri est bien visible mais peut etre assez moche ». Brainstorm (compagnon visuel) : voir `docs/superpowers/specs/2026-10-10-passage-colibri-design.md`, section « Revision du 10/10 (apres-midi) ». Decision : pas un dosage du shader existant, le traitement change (Taches 5-7 ci-dessous).

---

## Revision du 10/10 (apres-midi) : le gros plan repense

Spec : `docs/superpowers/specs/2026-10-10-passage-colibri-design.md`, section
« Revision du 10/10 (apres-midi) ». Trois changements, dans l'ordre : le
corps s'assombrit au lieu de s'eclaircir (Tache 5), un halo flou additif
porte la couleur, meme recette que les braises du foyer (Tache 5), la
vibration de la visite n'est plus reduite (Tache 6). Puis nouvelle capture
et nouveau feu vert de Sylvain (Tache 7) avant docs et poussee (Tache 8,
l'ancienne Tache 5 renumerotee).

### Task 5 : le corps s'assombrit, un halo flou additif porte la couleur

**Files:**
- Modify: `src/lib/passage-colibri.ts` (constante `eclat`)
- Modify: `src/app/components/stag-scene/huitzilin-birds.tsx` (shader + sprite de halo)

Reference technique : `src/app/components/stag-scene/copal-braziers.tsx`,
lignes 60-65 et 76-80 (le sprite `ember` des braseros, deja valide a
l'oeil) — meme texture (`/img/particles/smoke_07.png`), meme materiau
(`SpriteMaterial`, `AdditiveBlending`, `transparent: true`,
`depthWrite: false`). Cette texture est deja chargee sur TOUTES les
directions (pas seulement jade) : `arrow-vapor.tsx`, `cihuateteo.tsx`,
`frost-world.tsx` et `sun-beam.tsx` appellent tous
`useTexture.preload("/img/particles/smoke_07.png")` au niveau module, et
leurs modules sont importes sans condition par `scene-content.tsx` — le
halo ne coute donc aucun chargement de plus au Sud.

- [ ] **Step 1 : monter le dosage de la constante partagee**

Dans `src/lib/passage-colibri.ts`, remplacer :

```ts
  /** Intensite de l'eclat emissif pendant la visite ; dosage a la capture. */
  eclat: 0.4,
```

par :

```ts
  /** Intensite du passage pendant la visite : assombrit le corps (shader,
   * 1 - eclat) ET pilote l'opacite du halo (sprite). Montee de 0,4 a 0,88
   * le 10/10 apres-midi (Sylvain : « c'est moche » sur l'aplat colore) ;
   * dosage a la capture, pas au seuil. */
  eclat: 0.88,
```

- [ ] **Step 2 : verifier que les unitaires de `passage-colibri.test.ts` restent verts**

Run: `pnpm exec vitest run src/lib/passage-colibri.test.ts`
Expected: PASS, 15 tests (le test de `cibleEclat` lit `PASSAGE.eclat`, pas une valeur en dur : rien a changer la).

- [ ] **Step 3 : le corps ne s'eclaircit plus — remplacer l'aplat colore**

Dans `src/app/components/stag-scene/huitzilin-birds.tsx`, la fonction `makeMaterial` (vers la ligne 100), remplacer :

```ts
      .replace(
        "#include <emissivemap_fragment>",
        // Le passage (10/10, lib/passage-colibri) : la texture elle-meme
        // s'allume (pas une couleur plate par-dessus) ; le guerrier du
        // soleil brille en venant. uEclat = 0 hors passage : rien ne change.
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uEclat;"
      );
```

par :

```ts
      .replace(
        "#include <emissivemap_fragment>",
        // Le passage, revise le 10/10 apres-midi (Sylvain : l'aplat
        // colore etait moche en gros plan, texture bas-poly exposee). Le
        // corps s'assombrit au lieu de s'eclaircir : il ne reste qu'une
        // silhouette sombre, jamais la peinture a plat. La couleur et la
        // chaleur viennent du halo (sprite), pas du mesh. uEclat = 0 hors
        // passage : rien ne change.
        "#include <emissivemap_fragment>\ndiffuseColor.rgb *= 1.0 - uEclat;"
      );
```

- [ ] **Step 4 : le halo, memes imports que `copal-braziers.tsx`**

Dans `src/app/components/stag-scene/huitzilin-birds.tsx`, ajouter aux imports existants :

```ts
import { useGLTF, useTexture } from "@react-three/drei";
import { AdditiveBlending, Color, Group, Mesh, MeshStandardMaterial, type PerspectiveCamera, Quaternion, Sprite, SpriteMaterial, Vector3 } from "three";
```

(remplace les lignes 6 et 7 existantes : `useGLTF` seul devient `useGLTF, useTexture` ; `Group, Mesh, MeshStandardMaterial, ...` gagne `AdditiveBlending`, `Color`, `Sprite`, `SpriteMaterial`.)

Ajouter apres la constante `MODEL_PATH` :

```ts
const SMOKE_SPRITE = "/img/particles/smoke_07.png"; // deja preload par d'autres modules (voir Tache 5 ci-dessus) : aucun cout de chargement de plus ici.
const HALO_COLOR = new Color("#ff7a2a"); // meme teinte que les braises (copal-braziers.tsx) : chaude et restreinte, pas l'arc-en-ciel par espece.
const HALO_SCALE = 0.5; // u, billboard carre ; assez grand pour que les ailes en vibration ne depassent jamais net du halo (a doser a la capture).
```

- [ ] **Step 5 : creer le materiau et un sprite par oiseau**

Dans le composant, juste apres `const { scene } = useGLTF(MODEL_PATH);`, ajouter :

```ts
  const smokeTexture = useTexture(SMOKE_SPRITE);
  const haloMaterial = useMemo(
    () => new SpriteMaterial({ map: smokeTexture, color: HALO_COLOR, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }),
    [smokeTexture]
  );
```

Dans `useMemo(birds)`, la fonction qui construit les meshs (vers la ligne 156), le `return HUITZILIN_SPECIES.map((sp, i) => { ... })` cree aujourd'hui un seul `Mesh` par oiseau. Lui adjoindre un sprite de halo stocke a cote (pas dans la scene graph du mesh : un enfant suivrait sa rotation/echelle, alors que le halo doit rester une boule billboard de taille fixe) :

```ts
    return HUITZILIN_SPECIES.map((sp, i) => {
      const uniforms: BirdUniforms = { uTime: { value: 0 }, uFlap: { value: FLAP_AMPLITUDE }, uHue: { value: (sp.hueShift * Math.PI) / 180 }, uSat: { value: sp.saturation }, uPhase: { value: i * 1.3 }, uEclat: { value: 0 } };
      const mesh = new Mesh(src.geometry, makeMaterial(base, uniforms));
      mesh.frustumCulled = false;
      mesh.userData.uniforms = uniforms;
      mesh.userData.scale = BASE_SCALE * sp.scale;
      const halo = new Sprite(haloMaterial.clone());
      halo.scale.setScalar(HALO_SCALE);
      halo.raycast = () => null;
      halo.visible = false;
      mesh.userData.halo = halo;
      return mesh;
    });
```

La ligne de fermeture du `useMemo`, juste apres ce `return`, passe de :

```ts
  }, [scene]);
```

a :

```ts
  }, [scene, haloMaterial]);
```

Dans le `useEffect` qui monte/demonte les oiseaux (`birdsRef.current = birds; ... for (const b of birds) g.add(b);`), ajouter aussi les halos :

```ts
  useEffect(() => {
    birdsRef.current = birds;
    const g = groupRef.current;
    if (!g) return;
    for (const b of birds) {
      g.add(b);
      g.add(b.userData.halo as Sprite);
    }
    return () => {
      for (const b of birds) {
        g.remove(b);
        g.remove(b.userData.halo as Sprite);
      }
    };
  }, [birds]);
```

- [ ] **Step 6 : piloter le halo dans `useFrame`, au meme endroit que `uEclat`**

Dans la boucle `for (let i = 0; i < birds.length; i++)`, remplacer le bloc existant :

```ts
      // L'eclat ne concerne que l'oiseau du passage ; lisse (0,15 par image
      // a 60 Hz, ~0,5 s), visible en venant et en tenant, eteint en partant.
      if (passageRef.current.oiseau === i) {
        eclatRef.current += (cibleEclat(passageRef.current.etat) - eclatRef.current) * 0.15;
        u.uEclat.value = eclatRef.current;
      }
```

par :

```ts
      // L'eclat ne concerne que l'oiseau du passage ; lisse (0,15 par image
      // a 60 Hz, ~0,5 s), visible en venant et en tenant, eteint en partant.
      // Assombrit le corps (uEclat, shader) ET pilote l'opacite du halo
      // (meme courbe : revision du 10/10 apres-midi, docs/superpowers/specs).
      const halo = mesh.userData.halo as Sprite;
      if (passageRef.current.oiseau === i) {
        eclatRef.current += (cibleEclat(passageRef.current.etat) - eclatRef.current) * 0.15;
        u.uEclat.value = eclatRef.current;
        halo.visible = eclatRef.current > 0.01;
        halo.position.copy(mesh.position);
        (halo.material as SpriteMaterial).opacity = eclatRef.current;
      } else if (halo.visible) {
        halo.visible = false;
      }
```

- [ ] **Step 7 : disposer les materiaux de halo au demontage**

A cote du `useEffect` de nettoyage existant (ou dans le meme, apres le `for` de retrait), ajouter la liberation du materiau d'origine :

```ts
  useEffect(() => () => haloMaterial.dispose(), [haloMaterial]);
```

(les clones par oiseau partagent la meme texture — pas de `dispose()` par clone necessaire, `SpriteMaterial.clone()` ne duplique pas la texture GPU.)

- [ ] **Step 8 : types et lint**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src/app/components/stag-scene/huitzilin-birds.tsx`
Expected: aucune nouvelle erreur. Les avertissements deja presents ailleurs dans le depot (`background-flora.tsx`, `frost-world.tsx`, etc., vus au dernier commit) ne sont pas de ce fichier : ne pas les toucher.

- [ ] **Step 9 : les unitaires complets**

Run: `pnpm test`
Expected: tous verts (aucune lib pure modifiee dans cette tache : seuls `huitzilin-birds.tsx` (composant, pas teste a l'unite) et la constante `PASSAGE.eclat` (testee via `cibleEclat`, deja verifiee a l'etape 2) changent).

- [ ] **Step 10 : commit**

```bash
git add src/lib/passage-colibri.ts src/app/components/stag-scene/huitzilin-birds.tsx
git commit -m "feat(sud): le passage du colibri ne s'eclaire plus, il s'assombrit ; un halo flou additif (recette des braises) porte la couleur"
```

---

### Task 6 : la vibration de la visite n'est plus reduite

**Files:**
- Modify: `src/lib/huitzilin.ts`
- Modify: `src/lib/huitzilin.test.ts`

- [ ] **Step 1 : le test actuel nomme encore « vibration reduite » — le corriger AVANT de changer la valeur, pour le voir rouge pour la bonne raison**

Dans `src/lib/huitzilin.test.ts`, remplacer le titre et le commentaire (lignes 154 et 165) :

```ts
  it("en stationnaire de visite : vibration reduite, pas de borne de boite, l'ancre suit le point", () => {
```

par :

```ts
  it("en stationnaire de visite : vibration proche de la normale (10/10 apres-midi, plus de x0,4), pas de borne de boite, l'ancre suit le point", () => {
```

et :

```ts
    expect(maxEcart).toBeLessThanOrEqual(SPEC.jitter * VISITE_VIBRATION * Math.sqrt(3) + 1e-6); // mais quatre fois moins
```

par :

```ts
    expect(maxEcart).toBeLessThanOrEqual(SPEC.jitter * VISITE_VIBRATION * Math.sqrt(3) + 1e-6); // vibration proche de la normale, pas reduite
```

(l'assertion elle-meme lit deja la constante `VISITE_VIBRATION`, pas une valeur en dur : elle reste vraie quelle que soit sa valeur ; seul le commentaire mentait.)

- [ ] **Step 2 : verifier que les unitaires restent verts (rien n'a encore change dans la lib)**

Run: `pnpm exec vitest run src/lib/huitzilin.test.ts`
Expected: PASS (le test ne verifie qu'une borne superieure ; il reste vrai avant comme apres la Step 3).

- [ ] **Step 3 : monter la constante**

Dans `src/lib/huitzilin.ts`, remplacer :

```ts
/** Facteur de la vibration en stationnaire de visite (lib/passage-colibri). */
export const VISITE_VIBRATION = 0.4;
```

par :

```ts
/** Facteur de la vibration en stationnaire de visite (lib/passage-colibri).
 * Montee de 0,4 a 1 le 10/10 apres-midi : a 0,4 la silhouette se figeait
 * assez longtemps pour se lire comme un dessin plat ; a 1 (vibration
 * normale, non reduite) le flou du mouvement reel masque la forme figee.
 * A doser a la capture, pas en dur. */
export const VISITE_VIBRATION = 1;
```

- [ ] **Step 4 : verifier le vert**

Run: `pnpm exec vitest run src/lib/huitzilin.test.ts`
Expected: PASS, memes tests (la borne verifiee est proportionnelle a `VISITE_VIBRATION`, elle monte avec).

- [ ] **Step 5 : les unitaires complets, et tsc/eslint**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm exec eslint src/lib/huitzilin.ts src/lib/huitzilin.test.ts`
Expected: tout vert, zero nouvelle erreur.

- [ ] **Step 6 : commit**

```bash
git add src/lib/huitzilin.ts src/lib/huitzilin.test.ts
git commit -m "fix(sud): la vibration de la visite du colibri n'est plus reduite (x0,4 -> x1) : le mouvement masque la silhouette figee, pas un post-effet"
```

---

### Task 7 : nouvelle capture, et l'oeil de Sylvain

**Files:**
- Modify: (aucun fichier nouveau ; reutilise `.scratch/passage-colibri.mjs` ecrit a la Tache 4)

- [ ] **Step 1 : verifier qu'aucun autre processus Node ne tourne a plein (lecon du 04/10, nuit mobile : un serveur Vite oublie avait fait rougir la barre)**

Run (PowerShell) : `Get-Process node -ErrorAction SilentlyContinue`
Expected : rien, ou uniquement des process attendus. Si un process inattendu tourne a plein CPU : le signaler avant de continuer, ne pas le tuer sans savoir ce que c'est.

- [ ] **Step 2 : compiler, servir, capturer (meme script, meme procedure que la Tache 4)**

Run (PowerShell) :

```powershell
pnpm run build
$p = Start-Process -FilePath "pnpm" -ArgumentList "exec","next","start","-p","3100" -WindowStyle Hidden -PassThru
# attendre que http://localhost:3100/fr reponde 200, puis :
node .scratch/passage-colibri.mjs 3100
foreach ($f in Get-ChildItem .scratch/passage-*.png) { Copy-Item $f.FullName "C:\Users\sylva\Downloads\nahual-sud-3-$($f.Name)" -Force }
Stop-Process -Id $p.Id -Force
```

(prefixe `nahual-sud-3-`, pas `nahual-sud-2-` : la revision precedente garde ses fichiers dans `Downloads`, pour comparer avant/apres si besoin.)

Expected : six images, « stationnaire a +~5 s » et « fini a +~9 s » sur les deux cas.

- [ ] **Step 3 : regarder soi-meme AVANT de remettre** : le corps est-il bien une silhouette sombre (plus de couleur plate lisible) ? le halo a-t-il un bord flou, pas de contour geometrique dur ? les ailes en vibration restent-elles dans le halo ou depassent-elles net ? Si le halo a un bord dur : verifier `HALO_SCALE` (le sprite est peut-etre trop petit, ou la texture de fumee a un bord net a cette echelle — regarder `/public/img/particles/smoke_07.png`).

- [ ] **Step 4 : remettre a Sylvain** les chemins complets des six images (`C:\Users\sylva\Downloads\nahual-sud-3-*`), avec un rappel court de ce qui a change (corps assombri, halo flou, vibration normale). **Rien d'autre ne se fait tant qu'il n'a pas repondu** — ni la Tache 8 (docs, poussee `dev`), ni `main` (regle de `CLAUDE.md` : une session = une chose bornee + une capture regardee).

---

### Task 8 : docs et cloture (seulement apres le feu vert de Sylvain sur la Tache 7)

**Files:**
- Modify: `docs/da/plans/sud.md`
- Modify: `docs/superpowers/plans/2026-10-10-passage-colibri.md` (cases cochees)

- [ ] **Step 1 : la ligne du passage dans le tableau de `docs/da/plans/sud.md`**, entre les lignes 2 et 3 :

```markdown
| 2b | arrivee + 4 s, si p < 0,5 | le passage du colibri (`lib/passage-colibri`) : UN oiseau vient a 1,3 u devant l'objectif, en haut a droite, corps assombri + halo flou (recette des braises), tient 2,5 s, puis file sur une etoile qui tombe ; une fois par arrivee | 2,5 s | (le bourdonnement : a faire) | `huitzilin-birds.tsx`, `lib/huitzilin` (visite) |
```

- [ ] **Step 2 : commit docs, pousser `dev`**

```bash
git add docs/da/plans/sud.md docs/superpowers/plans/2026-10-10-passage-colibri.md
git commit -m "docs(sud): le passage du colibri dans le plan du Sud ; plan d'execution coche"
git push origin dev
```

- [ ] **Step 3 : `main`**, seulement apres le « go » de Sylvain sur les captures, machine libre (serveur 3100 coupe, `Get-Process node` propre), une seule poussee par jour : la poussee du 10/10 est deja consommee par l'accueil mobile (`b7d3944`). Si Sylvain veut quand meme voir le passage en ligne le jour meme, le dire (urgence declaree) ; sinon `main` le 11/10.

```bash
git switch main && git merge --ff-only dev && git push origin main && git switch dev
```
