import type { Material } from "three";

/**
 * Compose plusieurs modificateurs onBeforeCompile sur un même matériau —
 * nécessaire dès qu'un matériau reçoit plus d'un traitement custom en même
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
  material.needsUpdate = true;
}
