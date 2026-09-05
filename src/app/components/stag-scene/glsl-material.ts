import { ShaderMaterial, type IUniform, type ShaderMaterialParameters } from "three";

/**
 * Un ShaderMaterial dont `uniforms` garde le TYPE de l'objet passe (three
 * le declare en `Record<string, IUniform>`) : les composants ecrivent
 * `material.uniforms.uTime.value` sans cast, exactement comme avec le
 * jumeau TSL qui expose le meme objet.
 */
export function glslMaterial<U extends Record<string, IUniform>>(params: ShaderMaterialParameters & { uniforms: U }): ShaderMaterial & { uniforms: U } {
  return new ShaderMaterial(params) as ShaderMaterial & { uniforms: U };
}
