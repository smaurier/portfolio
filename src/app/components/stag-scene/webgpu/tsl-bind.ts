import { uniform, vec3 } from "three/tsl";
import type { Color, Vector2, Vector3, Vector4, Texture } from "three";
import { texture as textureNode } from "three/tsl";

/**
 * Liaison des uniformes « { value } » a TSL (05/09, migration WebGPU).
 * Tout le site pilote ses shaders en mutant des objets `{ value }` a
 * 60 fps (ShaderMaterial, onBeforeCompile). Pour ne pas reecrire cette
 * plomberie, chaque uniforme TSL est relie a l'objet existant : les
 * vecteurs et couleurs par REFERENCE (TSL garde l'objet), les scalaires
 * par relecture a chaque frame (onFrameUpdate). Les composants ne voient
 * aucune difference entre WebGL et WebGPU.
 */

export type Ref<T> = { value: T };

export function boundFloat(ref: Ref<number>) {
  const u = uniform(ref.value);
  u.onFrameUpdate(() => ref.value);
  return u;
}

export function boundColor(ref: Ref<Color>) {
  return uniform(ref.value);
}

/** La couleur liee, en vec3 : le noeud `uniform(Color)` n'est pas un vec3
 * pour le typage TSL, on le recompose. */
export function boundRgb(ref: Ref<Color>) {
  const c = boundColor(ref);
  return vec3(c.r, c.g, c.b);
}

export function boundVec2(ref: Ref<Vector2>) {
  return uniform(ref.value);
}

export function boundVec3(ref: Ref<Vector3>) {
  return uniform(ref.value);
}

export function boundVec4(ref: Ref<Vector4>) {
  return uniform(ref.value);
}

/** Un noeud texture dont la texture peut arriver plus tard (chargement) :
 * le composant assigne `ref.value`, le noeud est relu a chaque frame. */
export function boundTexture(ref: Ref<Texture | null>, placeholder: Texture) {
  const node = textureNode(ref.value ?? placeholder);
  node.onFrameUpdate(() => {
    const t = ref.value ?? placeholder;
    if (node.value !== t) node.value = t;
  });
  return node;
}
