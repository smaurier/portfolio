/**
 * APRES LE VOILE (10/09).
 *
 * Le voile de chargement se leve quand `RevealTrigger` pose
 * `data-loaded="true"` sur <html>, et la mesure du 10/09 dit ceci : il se
 * leve 1,1 seconde apres le DERNIER OCTET recu. Chaque octet demande
 * pendant le chargement retarde donc l'ouverture d'autant, meme s'il ne
 * sert a rien sur la page ouverte.
 *
 * D'ou cette fonction : ce qui n'est pas necessaire pour OUVRIR attend
 * l'ouverture. Ce n'est pas un abandon, c'est un ordre -- la ressource
 * part quand la bande passante est libre, et se trouve en cache au moment
 * ou on en a besoin.
 *
 * Le motif existait deja en trois exemplaires (foyer-arrival, centzon-
 * stars, huitzilin-birds lisent tous `data-loaded` a la main) : celui-ci
 * est le seul qui gere aussi le desabonnement, ce qui est le piege du
 * MutationObserver dans un effet React.
 */
export function whenRevealed(callback: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const root = document.documentElement;
  if (root.getAttribute("data-loaded") === "true") {
    callback();
    return () => {};
  }
  const observer = new MutationObserver(() => {
    if (root.getAttribute("data-loaded") !== "true") return;
    observer.disconnect();
    callback();
  });
  observer.observe(root, { attributes: true, attributeFilter: ["data-loaded"] });
  return () => observer.disconnect();
}
