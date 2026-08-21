// Géométrie partagée du temps "Piedra del Sol" en préface (cf memory
// project-nahual-da, retour de Sylvain le 20/08) — une seule source de
// vérité pour deux consommateurs qui doivent rester visuellement raccord :
// le CSS de intro-sequence.module.css (positionnement du HTML/SVG statique)
// et l'échantillonnage des particules dans intro-sequence.tsx (position de
// départ de chaque particule). Sans ça, le passage HTML -> particules au
// moment de la dissolution sauterait au lieu d'être invisible.
//
// Unités arbitraires ("espace de conception"), pas des pixels réels : le
// conteneur HTML a un aspect-ratio DESIGN_WIDTH/DESIGN_HEIGHT et se
// redimensionne en CSS (min(90vw, 800px)) ; la caméra orthographique du
// Canvas de particules couvre exactement ce même rectangle en unités
// monde, donc 1 unité de conception = 1 unité monde, quelle que soit la
// taille d'affichage réelle.

export const DESIGN_WIDTH = 800;
export const DESIGN_HEIGHT = 600;

// La Piedra occupe la majorité du cadre, centrée — composition proche de
// l'ancienne home (Piedra en fond, texte centré dessus, cf commentaire de
// stag-scene.tsx sur "l'ancienne home") plutôt qu'empilée au-dessus d'un
// bloc de texte séparé.
export const PIEDRA_SIZE = 480;
export const PIEDRA_LEFT = (DESIGN_WIDTH - PIEDRA_SIZE) / 2;
export const PIEDRA_TOP = (DESIGN_HEIGHT - PIEDRA_SIZE) / 2;

// Viewbox réel du tracé (cf piedra-svg.tsx) — nécessaire pour convertir un
// point échantillonné dans l'espace du <path> (0-554.6 / 0-554.1) vers
// l'espace de conception (0-800 / 0-600).
export const PIEDRA_VIEWBOX = 554.6;

export const TEXT_MAX_WIDTH = DESIGN_WIDTH * 0.6;

/** Convertit un point de l'espace du tracé SVG (viewBox de piedra-svg.tsx)
 * vers l'espace de conception partagé. */
export function piedraPointToDesignSpace(x: number, y: number): { x: number; y: number } {
  const scale = PIEDRA_SIZE / PIEDRA_VIEWBOX;
  return {
    x: PIEDRA_LEFT + x * scale,
    y: PIEDRA_TOP + y * scale,
  };
}

/** Convertit un point de l'espace de conception (origine en haut à gauche,
 * Y vers le bas, comme le CSS/SVG) vers l'espace monde de la caméra
 * orthographique (origine au centre, Y vers le haut, comme Three.js). */
export function designSpaceToWorld(x: number, y: number): { x: number; y: number } {
  return {
    x: x - DESIGN_WIDTH / 2,
    y: -(y - DESIGN_HEIGHT / 2),
  };
}
