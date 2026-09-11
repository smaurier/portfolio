import type { Material } from "three";

/**
 * Compose plusieurs modificateurs onBeforeCompile sur un même matériau.
 * Nécessaire dès qu'un matériau reçoit plus d'un traitement custom en même
 * temps (ex. le cerf : rim-light.ts + cursor-reveal.ts, 18/08). Assigner
 * `material.onBeforeCompile` directement plusieurs fois écraserait le
 * précédent plutôt que de composer (constaté en construisant
 * cursor-reveal.ts : le liseré du cerf disparaissait dès que la révélation
 * par curseur se posait sur le même matériau). Ce module centralise
 * l'assignation une seule fois par matériau ; chaque appelant ajoute juste
 * sa fonction à la liste rejouée à la compilation.
 */

type OnBeforeCompileShader = Parameters<NonNullable<Material["onBeforeCompile"]>>[0];
export type ShaderModifier = (shader: OnBeforeCompileShader) => void;

/**
 * CADENCE DES BALAYAGES DE MATERIAUX (11/09).
 *
 * Le fondu de profondeur et la revelation au curseur parcourent leur
 * sous-arbre pour poser leurs modificateurs sur les materiaux qu'ils n'ont
 * pas encore vus (les arrivees par Suspense). Le faire a CHAQUE image, c'est
 * deux parcours complets de la scene par image pour ne rien trouver :
 * mesure sur Contact, CPU x4, `traverse` seul a 19 ms par seconde. Une
 * arrivee attend donc au plus huit images (130 ms a 60 im/s) avant d'etre
 * modifiee ; la chauffe des shaders (shader-warmup) attend plus longtemps
 * que cette cadence pour compiler les variantes modifiees, pas les autres.
 */
export const MATERIAL_SWEEP_EVERY = 8;

const modifiersByMaterial = new WeakMap<Material, ShaderModifier[]>();

export function addShaderModifier(material: Material, modifier: ShaderModifier): void {
  const existing = modifiersByMaterial.get(material);
  if (existing) {
    existing.push(modifier);
    // Recompile : un modificateur ajouté après coup ne prendrait pas effet
    // tant que le programme shader (déjà compilé au premier rendu) n'est
    // pas régénéré.
    material.needsUpdate = true;
    return;
  }

  const modifiers: ShaderModifier[] = [modifier];
  modifiersByMaterial.set(material, modifiers);
  material.onBeforeCompile = (shader) => {
    for (const applyModifier of modifiers) applyModifier(shader);
  };
  // La cle de cache des programmes de three ne voit que la fonction
  // onBeforeCompile (toujours la meme ici) : un modificateur ajoute APRES
  // la premiere compilation retombait sur le programme deja compile et
  // n'avait aucun effet (constate 07/09 : la glace de l'Est n'atteignait
  // pas le decor). Le nombre de modificateurs entre dans la cle.
  material.customProgramCacheKey = () => `mods${modifiers.length}`;
  material.needsUpdate = true;
}
