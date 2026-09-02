import { describe, expect, it } from "vitest";
import { toNahuatlNumeral } from "./nahuatl-numerals";

describe("toNahuatlNumeral (le miroir compte dans la langue des morts, 02/09)", () => {
  it("les unites classiques attestees (1 a 5)", () => {
    expect(toNahuatlNumeral(1)).toBe("cē");
    expect(toNahuatlNumeral(2)).toBe("ōme");
    expect(toNahuatlNumeral(3)).toBe("ēyi");
    expect(toNahuatlNumeral(4)).toBe("nāhui");
    expect(toNahuatlNumeral(5)).toBe("mācuīlli");
  });

  it("de 6 a 9 : chicua-/chic- + unite (base 5)", () => {
    expect(toNahuatlNumeral(6)).toBe("chicuacē");
    expect(toNahuatlNumeral(7)).toBe("chicōme");
    expect(toNahuatlNumeral(8)).toBe("chicuēyi");
    expect(toNahuatlNumeral(9)).toBe("chiucnāhui");
  });

  it("10 et 15, puis les composes avec on-/om- (base 20)", () => {
    expect(toNahuatlNumeral(10)).toBe("mahtlāctli");
    expect(toNahuatlNumeral(11)).toBe("mahtlāctli oncē");
    expect(toNahuatlNumeral(12)).toBe("mahtlāctli omōme");
    expect(toNahuatlNumeral(13)).toBe("mahtlāctli omēyi");
    expect(toNahuatlNumeral(14)).toBe("mahtlāctli onnāhui");
    expect(toNahuatlNumeral(15)).toBe("caxtōlli");
    expect(toNahuatlNumeral(16)).toBe("caxtōlli oncē");
    expect(toNahuatlNumeral(19)).toBe("caxtōlli onnāhui");
    expect(toNahuatlNumeral(20)).toBe("cempōhualli");
  });

  it("hors plage (0, negatif, > 20, non entier) : chaine vide, jamais d'invention", () => {
    expect(toNahuatlNumeral(0)).toBe("");
    expect(toNahuatlNumeral(-3)).toBe("");
    expect(toNahuatlNumeral(21)).toBe("");
    expect(toNahuatlNumeral(2.5)).toBe("");
  });
});
