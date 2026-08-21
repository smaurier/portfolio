// Échantillonnage de points pour la dissolution en particules (Piedra del
// Sol + texte du hero, cf memory project-nahual-da — retour de Sylvain le
// 20/08). Fonctions pures et testables ici ; tout ce qui touche au DOM
// (getPointAtLength sur un vrai <path>, getImageData sur un vrai canvas)
// vit dans intro-sequence.tsx, qui appelle celles-ci pour le calcul pur.

/** Longueurs auxquelles échantillonner le long d'un tracé de longueur
 * `totalLength`, réparties uniformément (pas aux deux bouts + un pas
 * régulier, plutôt qu'un pas qui inclurait la fin ET le début identiques). */
export function evenSampleLengths(totalLength: number, count: number): number[] {
  if (count <= 0 || totalLength <= 0) return [];
  const lengths: number[] = [];
  for (let i = 0; i < count; i++) {
    lengths.push((totalLength * i) / count);
  }
  return lengths;
}

/** Nombre de points à échantillonner pour un segment donné, proportionnel
 * à sa longueur — sinon un tout petit détail du tracé recevrait autant de
 * particules qu'un grand arc, et la densité visuelle du champ de points ne
 * respecterait plus celle du dessin d'origine. Minimum 1 : ne jamais
 * perdre un petit segment entièrement. */
export function samplesForLength(length: number, density: number): number {
  return Math.max(1, Math.round(length * density));
}

/**
 * PRNG déterministe (mulberry32) — utilisé pour la direction de dispersion
 * et le délai de chaque particule. Déterministe plutôt que Math.random() :
 * reproductible en test, et évite d'introduire une dépendance externe pour
 * un besoin aussi simple.
 */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Particle = {
  homeX: number;
  homeY: number;
  /** Direction de dispersion, déjà normalisée. */
  dirX: number;
  dirY: number;
  /** Délai de démarrage individuel dans [0, 1[ — étale le déclenchement de
   * chaque particule dans le temps plutôt qu'un décollage synchronisé qui
   * lirait comme un seul bloc qui explose d'un coup. */
  delay: number;
  /** Distance de dispersion individuelle (variation autour d'une base). */
  distance: number;
};

/**
 * Assemble un point 2D échantillonné en particule complète (direction,
 * délai, distance), en tirant depuis un PRNG partagé — permet de générer
 * un champ de particules complet de façon déterministe à partir d'une
 * seule graine (reproductible, testable).
 */
export function buildParticle(x: number, y: number, rng: () => number, baseDistance: number): Particle {
  const angle = rng() * Math.PI * 2;
  return {
    homeX: x,
    homeY: y,
    dirX: Math.cos(angle),
    dirY: Math.sin(angle),
    delay: rng() * 0.6, // laisse toujours au moins 40% de la fenêtre pour l'animation, même pour la particule la plus tardive
    distance: baseDistance * (0.6 + rng() * 0.8),
  };
}
