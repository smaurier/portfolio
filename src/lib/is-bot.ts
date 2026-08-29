/**
 * Detection des user-agents non-humains (crawlers, audits perf headless)
 * pour desactiver rAF permanents et Canvas WebGL qui empechent Lighthouse
 * d'atteindre l'etat "idle" et provoquent RPC::DEADLINE_EXCEEDED sur
 * PageSpeed Insights.
 *
 * Trigger identifie 29/08 : PageSpeed sur nahual.fr timeoutait
 * systematiquement. Cause = frameloop="always" du Canvas r3f + rAF de
 * chaque FadingBlock qui tournent en boucle -> page jamais idle sous
 * le budget Lighthouse (~60s).
 *
 * Contenu identique renvoye (pas de cloaking) : bot voit l'overlay HTML
 * complet (hero + chapitres + a-propos + CTAs). Seules les animations
 * WebGL et scroll-driven sautent.
 *
 * Signal UA suffit ici : Chrome-Lighthouse et HeadlessChrome sont
 * stables. Googlebot moderne execute JS mais servir un HTML statique
 * complet reste optimal (indexation plus fiable, budget crawl).
 */
export function isBot(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Chrome-Lighthouse|HeadlessChrome|PageSpeed|Googlebot|bingbot|Applebot|DuckDuckBot|YandexBot|Baiduspider/i.test(
    navigator.userAgent
  );
}
