import { describe, expect, it } from "vitest";
import { rendererKindFrom } from "./gpu-flag";

describe("rendererKindFrom : quel moteur pour la scene (migration WebGPU sous drapeau)", () => {
  it("par defaut : WebGL, le moteur en production", () => {
    expect(rendererKindFrom("", null)).toBe("webgl");
  });

  it("?gpu=1 dans l'URL : WebGPU (avec repli WebGL 2 automatique cote three)", () => {
    expect(rendererKindFrom("?gpu=1", null)).toBe("webgpu");
    expect(rendererKindFrom("?xiuhcoatl=1&gpu=1", null)).toBe("webgpu");
  });

  it("?gpu=0 force WebGL meme si le stockage dit WebGPU", () => {
    expect(rendererKindFrom("?gpu=0", "1")).toBe("webgl");
  });

  it("le stockage local garde le choix entre deux pages", () => {
    expect(rendererKindFrom("", "1")).toBe("webgpu");
    expect(rendererKindFrom("", "0")).toBe("webgl");
  });
});
