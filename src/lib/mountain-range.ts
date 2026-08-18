// Placement de la chaîne de montagnes de fond — palier 3+ de la DA Nahual
// (cf memory project-nahual-da). Retour de Sylvain le 18/08 : Popocatépetl
// et Iztaccíhuatl ne doivent apparaître qu'une fois (pas répétés en anneau
// identique — ça lisait comme un motif dupliqué, pas un horizon), et pour
// avoir des montagnes "tout autour" il faut une vraie ligne de crêtes
// irrégulière, à distance NON homogène — pas un anneau à rayon constant
// comme background-flora.tsx/ocotillo.tsx (ceux-là sont de la végétation
// éparse, une chaîne de montagnes doit se lire comme une ligne continue,
// pas des touffes isolées).

export type MountainPeakPlacement = {
  azimuth: number;
  radius: number;
  heightScale: number;
  widthScale: number;
};

export type MountainRangeOptions = {
  minRadius: number;
  maxRadius: number;
  minHeightScale: number;
  maxHeightScale: number;
  seed: number;
};

const DEFAULT_OPTIONS: MountainRangeOptions = {
  minRadius: 18,
  maxRadius: 30,
  minHeightScale: 0.5,
  maxHeightScale: 1.1,
  seed: 0,
};

/**
 * Répartit `count` pics sur un tour complet — azimuth régulier perturbé
 * d'un bruit déterministe (pas un anneau parfait), rayon et hauteur variés
 * par pic (pseudo-déterministe sur l'index, même principe que
 * flora-placement.ts) pour une ligne de crêtes irrégulière plutôt qu'un
 * motif répété visible.
 */
export function generateMountainRangePlacements(
  count: number,
  options: Partial<MountainRangeOptions> = {},
): MountainPeakPlacement[] {
  const { minRadius, maxRadius, minHeightScale, maxHeightScale, seed } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const placements: MountainPeakPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const baseAngle = (i / count) * Math.PI * 2;
    const jitter = Math.sin(i * 3.71 + seed) * ((Math.PI / count) * 0.6);
    const azimuth = baseAngle + jitter;

    const radiusT = (Math.sin(i * 0.83 + seed) + 1) / 2;
    const radius = minRadius + (maxRadius - minRadius) * radiusT;

    const heightT = (Math.cos(i * 0.57 + seed) + 1) / 2;
    const heightScale = minHeightScale + (maxHeightScale - minHeightScale) * heightT;

    const widthT = (Math.sin(i * 1.31 + seed * 1.7) + 1) / 2;
    const widthScale = 0.8 + 0.5 * widthT;

    placements.push({ azimuth, radius, heightScale, widthScale });
  }
  return placements;
}

export type PeakProfilePoint = { x: number; y: number };

/**
 * Silhouette d'un pic générique (pas Popo/Izta, qui gardent leur profil
 * dessiné à la main dans mountains.tsx) — quelques points intermédiaires à
 * hauteur variée déterministe (enveloppe sinusoïdale + bruit par seed) pour
 * un contour irrégulier, jamais un triangle parfait. Part et finit à y=0
 * (le sol), point x=0 toujours présent pour garder un profil asymétrique
 * lisible même avec peu de points.
 */
export function generateGenericPeakProfile(seed: number, pointCount: number = 6): PeakProfilePoint[] {
  const halfWidth = 3;
  const points: PeakProfilePoint[] = [{ x: -halfWidth, y: 0 }];

  for (let i = 1; i < pointCount - 1; i++) {
    const t = i / (pointCount - 1);
    const x = -halfWidth + t * halfWidth * 2;
    const peakEnvelope = Math.sin(t * Math.PI); // 0 aux bords, 1 au centre
    const noise = (Math.sin(seed + i * 2.7) + 1) / 2; // 0..1 déterministe
    const y = peakEnvelope * (1.5 + noise * 2.5);
    points.push({ x, y });
  }

  points.push({ x: halfWidth, y: 0 });
  return points;
}
