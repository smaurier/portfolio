// Gestion des raccourcis clavier + manette activables/desactivables
// (RGAA 12.10 : les raccourcis a caractere unique — comme WASD —
// doivent etre desactivables OU reassignables OU actifs uniquement
// sur focus). On implemente l'option desactivation globale.
//
// Persist localStorage. Signal aux composants (KeyboardNav, GamepadNav,
// AccessibilityToggle) via event custom "nahual-shortcuts-changed" +
// event storage natif (autres onglets).

const STORAGE_KEY = "nahual-shortcuts-enabled";
const CHANGE_EVENT = "nahual-shortcuts-changed";

export function isShortcutsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    // Default true : les raccourcis sont actifs sauf si l'user les a
    // explicitement desactives. Cohérent avec la majorite des sites.
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setShortcutsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {}
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { enabled } }));
}

/**
 * S'abonne aux changements de la preference. Retourne un unsubscriber.
 * Ecoute deux events : custom (meme onglet) + storage (autres onglets).
 */
export function subscribeShortcuts(callback: (enabled: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  function onChange() {
    callback(isShortcutsEnabled());
  }
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
