import { describe, expect, it } from "vitest";
import { bodyPose, headStabilize, legCompression, spineArch, stepSpring, type SpringState } from "./xolotl-body";

const LEGS = { stiffness: 220, damping: 18 };

function run(target: number, steps: number, dt = 1 / 60, from: SpringState = { value: 0, velocity: 0 }) {
  const trace: number[] = [];
  let s = from;
  for (let i = 0; i < steps; i++) {
    s = stepSpring(s, target, dt, LEGS);
    trace.push(s.value);
  }
  return { state: s, trace };
}

describe("bodyPose (l'assiette vient des appuis, pas de la vitesse du centre)", () => {
  it("sur du plat, le corps est de niveau", () => {
    const p = bodyPose(0.4, 0.4, 0.9);
    expect(p.pitch).toBe(0);
    expect(p.y).toBeCloseTo(0.4, 10);
  });

  it("appui avant plus haut : museau haut (montee sur la margelle)", () => {
    expect(bodyPose(0.5, 0, 0.9).pitch).toBeGreaterThan(0);
  });

  it("appui avant plus bas : museau pique (descente dans le bassin)", () => {
    expect(bodyPose(0, 0.5, 0.9).pitch).toBeLessThan(0);
  });

  it("l'assiette est l'angle reel de la pente sous le corps", () => {
    // Denivele egal a l'empattement : 45 degres, quelle que soit la vitesse.
    expect(bodyPose(0.9, 0, 0.9).pitch).toBeCloseTo(Math.PI / 4, 10);
  });

  it("la hauteur du corps est la moyenne des deux appuis", () => {
    expect(bodyPose(0.6, 0.2, 0.9).y).toBeCloseTo(0.4, 10);
  });

  it("symetrique : monter une pente et la descendre donnent des assiettes opposees", () => {
    expect(bodyPose(0.5, 0.1, 0.9).pitch).toBeCloseTo(-bodyPose(0.1, 0.5, 0.9).pitch, 12);
  });
});

describe("stepSpring (les pattes sont un ressort amorti, c'est ce qui donne du poids)", () => {
  it("converge vers sa cible et s'immobilise", () => {
    const { state } = run(1, 400);
    expect(state.value).toBeCloseTo(1, 3);
    expect(Math.abs(state.velocity)).toBeLessThan(0.01);
  });

  it("sous-amorti : le corps depasse sa cible puis revient (rebond d'atterrissage)", () => {
    const { trace } = run(1, 400);
    expect(Math.max(...trace)).toBeGreaterThan(1.02);
    expect(Math.max(...trace)).toBeLessThan(1.3);
  });

  it("il tombe progressivement, jamais d'un coup", () => {
    const { trace } = run(1, 400);
    expect(trace[0]).toBeLessThan(0.1);
    expect(trace.findIndex((v) => v > 0.9)).toBeGreaterThan(5);
  });

  it("reste stable a 30 fps (frame lente)", () => {
    const { state, trace } = run(1, 200, 1 / 30);
    expect(Number.isFinite(state.value)).toBe(true);
    expect(Math.max(...trace.map(Math.abs))).toBeLessThan(3);
  });

  it("deja a la cible et au repos : rien ne bouge", () => {
    const s = stepSpring({ value: 1, velocity: 0 }, 1, 1 / 60, LEGS);
    expect(s.value).toBe(1);
    expect(s.velocity).toBe(0);
  });
});

describe("legCompression (le tassement se lit sur les pattes)", () => {
  it("corps a la hauteur d'appui : pose normale", () => {
    expect(legCompression(0.4, 0.4)).toBe(1);
  });

  it("corps sous son appui : les pattes se tassent", () => {
    expect(legCompression(0.3, 0.4)).toBeLessThan(1);
  });

  it("corps au-dessus de son appui : les pattes s'etendent", () => {
    expect(legCompression(0.5, 0.4)).toBeGreaterThan(1);
  });

  it("borne : jamais de corps ecrase ni etire a l'infini", () => {
    expect(legCompression(-10, 0.4)).toBeCloseTo(0.78, 10);
    expect(legCompression(10, 0.4)).toBeCloseTo(1.22, 10);
  });
});

describe("spineArch (la cambrure de l'echine)", () => {
  it("a plat et sans choc, l'echine est neutre", () => {
    expect(spineArch(0, 1)).toBe(0);
  });

  it("il grimpe : le dos se creuse", () => {
    expect(spineArch(0.4, 1)).toBeGreaterThan(0);
  });

  it("il descend : le dos s'arrondit", () => {
    expect(spineArch(-0.4, 1)).toBeLessThan(0);
  });

  it("il encaisse : le dos s'arrondit meme a plat", () => {
    expect(spineArch(0, 0.85)).toBeLessThan(0);
  });

  it("le rebond redresse l'echine", () => {
    expect(spineArch(0, 1.1)).toBeGreaterThan(0);
  });

  it("bornee : jamais de chien plie en deux", () => {
    expect(spineArch(5, 0.5)).toBeCloseTo(0.45, 10);
    expect(spineArch(-5, 0.5)).toBeCloseTo(-0.45, 10);
  });
});

describe("headStabilize (le regard reste de niveau)", () => {
  it("corps de niveau et echine neutre : la nuque ne fait rien", () => {
    expect(headStabilize(0, 0)).toBeCloseTo(0, 12);
  });

  it("le corps pique : la nuque releve la tete", () => {
    expect(headStabilize(-0.4, 0)).toBeGreaterThan(0);
  });

  it("le corps cabre : la nuque baisse la tete", () => {
    expect(headStabilize(0.4, 0)).toBeLessThan(0);
  });

  it("elle contre aussi la cambrure du dos", () => {
    expect(headStabilize(0, -0.4)).toBeGreaterThan(0);
  });

  it("elle ne compense jamais plus que le corps ne penche", () => {
    const pitch = -0.5;
    expect(Math.abs(headStabilize(pitch, 0))).toBeLessThan(Math.abs(pitch));
  });

  it("bornee", () => {
    expect(headStabilize(-5, -5)).toBeCloseTo(0.6, 10);
    expect(headStabilize(5, 5)).toBeCloseTo(-0.6, 10);
  });
});
