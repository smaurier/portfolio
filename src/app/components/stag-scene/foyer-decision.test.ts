import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HEARTH_STORAGE_KEY, HEARTH_TTL_MS } from "../../../lib/foyer";
import { decideCeremony, resetCeremonyDecisionForTests } from "./foyer-decision";

/**
 * Le defaut du 12/09 : deux appels dans le meme chargement (StrictMode joue
 * chaque effet deux fois) et la ceremonie sautait, parce que le premier
 * appel notait la visite que le second relisait.
 *
 * Pas de jsdom dans le projet : un `window` et un `document` minimaux,
 * juste ce que le module touche (localStorage, l'attribut sur <html>).
 */
function fauxNavigateur() {
  const store = new Map<string, string>();
  const attrs = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
  });
  vi.stubGlobal("document", {
    documentElement: {
      getAttribute: (k: string) => attrs.get(k) ?? null,
      hasAttribute: (k: string) => attrs.has(k),
      setAttribute: (k: string, v: string) => void attrs.set(k, v),
      removeAttribute: (k: string) => void attrs.delete(k),
    },
  });
  return { store, attrs };
}

describe("la decision du foyer (12/09)", () => {
  beforeEach(() => resetCeremonyDecisionForTests());
  afterEach(() => {
    resetCeremonyDecisionForTests();
    vi.unstubAllGlobals();
  });

  it("premiere visite : ceremonie, et la meme reponse au second appel du meme chargement", () => {
    const { store, attrs } = fauxNavigateur();
    const now = 1_700_000_000_000;
    expect(decideCeremony(now)).toBe(true);
    expect(decideCeremony(now + 5)).toBe(true);
    expect(attrs.has("data-hearth")).toBe(false);
    expect(store.get(HEARTH_STORAGE_KEY)).toBe(String(now));
  });

  it("retour dans les quatre jours : foyer allume, attribut pose", () => {
    const { store, attrs } = fauxNavigateur();
    const now = 1_700_000_000_000;
    store.set(HEARTH_STORAGE_KEY, String(now - 60_000));
    expect(decideCeremony(now)).toBe(false);
    expect(attrs.get("data-hearth")).toBe("lit");
  });

  it("retour apres quatre jours : la ceremonie rejoue", () => {
    const { store } = fauxNavigateur();
    const now = 1_700_000_000_000;
    store.set(HEARTH_STORAGE_KEY, String(now - HEARTH_TTL_MS - 1));
    expect(decideCeremony(now)).toBe(true);
  });
});
