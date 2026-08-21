import { describe, expect, it } from "vitest";
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  designSpaceToWorld,
  PIEDRA_LEFT,
  PIEDRA_SIZE,
  PIEDRA_TOP,
  piedraPointToDesignSpace,
} from "./intro-layout";

describe("piedraPointToDesignSpace", () => {
  it("place l'origine du tracé au coin de la boîte Piedra", () => {
    const p = piedraPointToDesignSpace(0, 0);
    expect(p.x).toBeCloseTo(PIEDRA_LEFT, 5);
    expect(p.y).toBeCloseTo(PIEDRA_TOP, 5);
  });

  it("place le coin opposé du viewBox au coin opposé de la boîte", () => {
    const p = piedraPointToDesignSpace(554.6, 554.6);
    expect(p.x).toBeCloseTo(PIEDRA_LEFT + PIEDRA_SIZE, 1);
    expect(p.y).toBeCloseTo(PIEDRA_TOP + PIEDRA_SIZE, 1);
  });
});

describe("designSpaceToWorld", () => {
  it("le centre de l'espace de conception devient l'origine monde", () => {
    const p = designSpaceToWorld(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(0, 5);
  });

  it("inverse l'axe Y (SVG vers le bas -> monde vers le haut)", () => {
    const top = designSpaceToWorld(0, 0);
    const bottom = designSpaceToWorld(0, DESIGN_HEIGHT);
    expect(top.y).toBeGreaterThan(bottom.y);
  });
});
