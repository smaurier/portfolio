/**
 * La frappe du xiuhcoatl sur l'anneau (05/09, retour Sylvain : « l'impact
 * n'est pas assez fort, ca devrait soulever l'anneau et faire trembler le
 * sol et la camera, faire sortir le feu, le serpent devrait changer de
 * forme, un bref flash turquoise tres fort »).
 *
 * Une enveloppe PURE du temps : `strikeState(t)` rend, pour t secondes
 * apres le declenchement de la charge, l'intensite 0..1 de chaque
 * composante. Les composants ne font que lire ces nombres. Attestation :
 * le coup du xiuhcoatl est dans le Codex de Florence (livre III) ; le
 * serpent qui se raidit en trait est la lecture de Seler (le xiuhcoatl
 * comme rayon du soleil) ; la montagne qui tremble, l'anneau qui se
 * souleve et le flash sont notre mise en scene.
 *
 * Reduced-motion : ni raideur, ni flash, ni secousse, ni soulevement ; le
 * feu, et une montee turquoise LENTE a la place de l'eclair (pas un
 * flash pour un lecteur photosensible ou vestibulaire).
 */

export type StrikeSpec = {
  /** Instant de l'impact, s apres le declenchement (STRIKE_MS / 2 du companion). */
  hitAt: number;
  /** Raideur : monte sur `stiffIn` s avant l'impact, tenue `stiffHold` s apres, relachee sur `stiffRelease` s. */
  stiffIn: number;
  stiffHold: number;
  stiffRelease: number;
  /** Duree du flash (s), decroissance cubique. */
  flashLen: number;
  /** Constante de temps de la secousse (s) et duree maximale. */
  shakeTau: number;
  shakeLen: number;
  /** Soulevement : montee `liftUp` s, puis retombee amortie (`liftTau`, `liftFreq` Hz). */
  liftUp: number;
  liftTau: number;
  liftFreq: number;
  /** Feu : montee `fireUp` s, decroissance `fireTau` s. */
  fireUp: number;
  fireTau: number;
  /** Teinte lente (reduced-motion) : montee `tintUp` s, decroissance `tintTau` s, plafond `tintMax`. */
  tintUp: number;
  tintTau: number;
  tintMax: number;
};

export const STRIKE_SEQ: StrikeSpec = {
  hitAt: 1.6,
  stiffIn: 0.2,
  stiffHold: 0.3,
  stiffRelease: 0.6,
  flashLen: 0.28,
  shakeTau: 0.45,
  shakeLen: 1.5,
  liftUp: 0.12,
  liftTau: 0.7,
  liftFreq: 1.6,
  fireUp: 0.05,
  fireTau: 0.72,
  tintUp: 1.0,
  tintTau: 1.2,
  tintMax: 0.35,
};

export type StrikeState = {
  /** 0..1 : le serpent tendu en trait (amplitude d'ondulation = 1 - stiffen). */
  stiffen: number;
  /** 0..1 : eclair turquoise plein cadre. */
  flash: number;
  /** 0..1 : amplitude de la secousse (camera et sol). */
  shake: number;
  /** 0..1 : soulevement de l'anneau (fraction de la hauteur maximale). */
  lift: number;
  /** 0..1 : gerbe de feu qui sort du sillon. */
  fire: number;
  /** 0..1 : montee turquoise lente (reduced-motion seulement). */
  tint: number;
};

const ZERO: StrikeState = { stiffen: 0, flash: 0, shake: 0, lift: 0, fire: 0, tint: 0 };

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smooth(u: number): number {
  const c = clamp01(u);
  return c * c * (3 - 2 * c);
}

export function strikeState(sinceStart: number, reduced: boolean, spec: StrikeSpec = STRIKE_SEQ): StrikeState {
  if (!(sinceStart >= 0)) return ZERO;
  const h = sinceStart - spec.hitAt; // temps depuis l'impact (negatif avant)

  // Le feu, pour tout le monde.
  let fire = 0;
  if (h >= 0) fire = h < spec.fireUp ? smooth(h / spec.fireUp) : Math.exp(-(h - spec.fireUp) / spec.fireTau);

  if (reduced) {
    let tint = 0;
    if (h >= 0) tint = spec.tintMax * (h < spec.tintUp ? smooth(h / spec.tintUp) : Math.exp(-(h - spec.tintUp) / spec.tintTau));
    return { stiffen: 0, flash: 0, shake: 0, lift: 0, fire: clamp01(fire), tint: clamp01(tint) };
  }

  // Raideur : avant l'impact, monte ; tenue ; relachee.
  let stiffen = 0;
  if (h >= -spec.stiffIn && h < 0) stiffen = smooth((h + spec.stiffIn) / spec.stiffIn);
  else if (h >= 0 && h < spec.stiffHold) stiffen = 1;
  else if (h >= spec.stiffHold && h < spec.stiffHold + spec.stiffRelease) stiffen = 1 - smooth((h - spec.stiffHold) / spec.stiffRelease);

  // Flash : 1 a l'impact, decroissance cubique, eteint a flashLen.
  let flash = 0;
  if (h >= 0 && h < spec.flashLen) {
    const u = 1 - h / spec.flashLen;
    flash = u * u * u;
  }

  // Secousse : exponentielle amortie, coupee proprement a shakeLen.
  let shake = 0;
  if (h >= 0 && h < spec.shakeLen) shake = Math.exp(-h / spec.shakeTau) * (1 - smooth((h - spec.shakeLen * 0.7) / (spec.shakeLen * 0.3)));

  // Soulevement : montee rapide, puis oscillation amortie qui se pose.
  let lift = 0;
  if (h >= 0) {
    if (h < spec.liftUp) lift = smooth(h / spec.liftUp);
    else {
      const d = h - spec.liftUp;
      const env = Math.exp(-d / spec.liftTau);
      lift = env * (0.5 + 0.5 * Math.cos(d * spec.liftFreq * Math.PI * 2));
    }
  }

  return { stiffen: clamp01(stiffen), flash: clamp01(flash), shake: clamp01(shake), lift: clamp01(lift), fire: clamp01(fire), tint: 0 };
}
