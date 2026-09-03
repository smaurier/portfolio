/**
 * La physique du corps de Xolotl (03/09, retour Sylvain : "a la descente
 * et la remontee il y a une vraie physique du corps, on doit le regler
 * tres profondement", puis "cambrure par exemple").
 *
 * La premiere version derivait l'assiette de la VITESSE du centre : un
 * bloc rigide qui pivote. Ce module modelise le corps comme un quadrupede
 * reel, avec trois etages :
 *
 *  1. l'ASSIETTE vient des APPUIS (hauteur du sol sous les pattes avant
 *     contre pattes arriere) et non du mouvement : monter la margelle
 *     leve le museau parce que les pattes avant sont plus haut, pas parce
 *     que le corps monte ;
 *  2. les PATTES sont un ressort amorti sous-amorti : le corps ne se
 *     teleporte pas a la hauteur d'appui, il y tombe, la depasse un peu
 *     et remonte. C'est ce qui donne du poids et le tassement a
 *     l'atterrissage ;
 *  3. l'ECHINE se CAMBRE : un chien qui grimpe creuse le dos, un chien
 *     qui descend l'arrondit, et un choc l'arrondit aussi. La courbure
 *     est repartie sur les vertebres, le corps n'est plus une planche.
 *
 * Tout est pur et deterministe : le composant ne fait que sampler le sol,
 * garder l'etat des ressorts et poser le resultat sur la scene.
 */

export type BodyPose = {
  /** Hauteur d'appui du corps (moyenne des deux appuis). */
  y: number;
  /** Assiette en radians, positif = museau haut. */
  pitch: number;
};

/** L'assiette et la hauteur du corps a partir des deux appuis et de
 * l'empattement (distance entre appui avant et appui arriere). */
export function bodyPose(frontY: number, rearY: number, wheelbase: number): BodyPose {
  const drop = frontY - rearY;
  return {
    y: (frontY + rearY) / 2,
    pitch: drop === 0 ? 0 : Math.atan2(drop, wheelbase),
  };
}

export type SpringState = { value: number; velocity: number };
export type SpringParams = {
  /** Raideur : plus haut = pattes plus fermes, retour plus rapide. */
  stiffness: number;
  /** Amortissement. Sous 2*sqrt(stiffness) le ressort DEPASSE sa cible,
   * c'est le rebond d'atterrissage ; au-dela il s'y colle sans vie. */
  damping: number;
};

/** Un pas de ressort amorti (Euler semi-implicite : la vitesse est mise a
 * jour avant la position, ce qui reste stable meme sur une frame lente).
 * L'appelant plafonne dt. */
export function stepSpring(state: SpringState, target: number, dt: number, p: SpringParams): SpringState {
  const acceleration = p.stiffness * (target - state.value) - p.damping * state.velocity;
  const velocity = state.velocity + acceleration * dt;
  return { value: state.value + velocity * dt, velocity };
}

/** Tassement des pattes : l'ecart entre la hauteur reelle du corps et sa
 * hauteur d'appui, borne. 1 = pose normale, < 1 = tasse, > 1 = extension
 * (le rebond). C'est la compression du ressort qui se voit, pas un
 * minuteur d'animation. */
export function legCompression(bodyY: number, supportY: number, gain = 1.4, maxDeviation = 0.22): number {
  const deviation = (bodyY - supportY) * gain;
  return 1 + Math.max(-maxDeviation, Math.min(maxDeviation, deviation));
}

/** Cambrure TOTALE de l'echine en radians, a repartir sur les vertebres.
 * Positif = dos creuse (extension, il grimpe), negatif = dos arrondi (il
 * descend, ou il encaisse). */
export function spineArch(
  pitch: number,
  compression: number,
  gain = 0.6,
  // 1.6 -> 1.0 et 0.55 -> 0.45 (03/09) : a vitesse reelle le ressort
  // retarde bien plus qu'en ralenti, le terme d'encaissement saturait et
  // le chien plantait le museau dans l'eau (capture). L'assiette reste
  // lisible, la cambrure ne prend plus le dessus sur elle.
  landingGain = 1.0,
  maxRad = 0.45
): number {
  const fromPitch = pitch * gain;
  const fromLanding = (compression - 1) * landingGain;
  const raw = fromPitch + fromLanding;
  return Math.max(-maxRad, Math.min(maxRad, raw));
}

/** Stabilisation du regard (03/09) : un animal qui descend garde la tete
 * a peu pres de NIVEAU pour voir ou il pose les pattes. La nuque
 * contre-braque donc l'assiette du corps ET la cambrure de l'echine,
 * sinon le chien pique du museau des que la marche est haute. Retourne
 * la rotation TOTALE a repartir sur les vertebres cervicales. */
export function headStabilize(
  pitch: number,
  arch: number,
  pitchGain = 0.55,
  archGain = 0.35,
  maxRad = 0.6
): number {
  const raw = -(pitch * pitchGain + arch * archGain);
  return Math.max(-maxRad, Math.min(maxRad, raw));
}
