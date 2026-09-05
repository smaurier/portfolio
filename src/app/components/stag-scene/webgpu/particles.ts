import { BufferAttribute, BufferGeometry, InstancedBufferAttribute, InstancedBufferGeometry, Points, Sprite, type Material, type Object3D } from "three";
import { PointsNodeMaterial, type Node } from "three/webgpu";
import { Fn, vec4, attribute, modelViewMatrix, uv, max } from "three/tsl";
import { isWebGpu } from "./renderer-kind";

/**
 * Particules sur les deux moteurs (05/09, migration WebGPU). En WebGL,
 * un nuage de points est un `Points` + ShaderMaterial avec gl_PointSize.
 * En WebGPU, un point primitif fait 1 pixel : three rend les points
 * dimensionnes comme des SPRITES INSTANCIES (Sprite + PointsNodeMaterial).
 * Ce module cache cette difference : les composants ecrivent les memes
 * tableaux, marquent les memes `needsUpdate`, et recoivent l'objet a mettre
 * dans la scene.
 *
 * Pourquoi une InstancedBufferGeometry et pas `instancedBufferAttribute()`
 * de TSL : ce noeud copie le tableau dans son propre buffer au setup, donc
 * un `needsUpdate` sur l'attribut d'origine n'atteint jamais le GPU. Les
 * attributs poses sur la geometrie suivent le chemin normal de mise a jour
 * (version) sur les deux backends. La position par particule s'appelle
 * `aPosition` en WebGPU parce que `position` est le quad du sprite.
 */

export type ParticleAttributeSpec = { array: Float32Array; itemSize: number };

const POSITION = "position";
const INSTANCE_POSITION = "aPosition";

/** Le nom reel de l'attribut `name` selon le moteur. */
export function particleAttributeName(name: string): string {
  return isWebGpu() && name === POSITION ? INSTANCE_POSITION : name;
}

/** L'attribut a ecrire pour la particule (`position`, `aSize`...). */
export function particleBuffer(geometry: BufferGeometry, name: string): BufferAttribute {
  return geometry.getAttribute(particleAttributeName(name)) as BufferAttribute;
}

/** La geometrie des particules : attributs d'instance sur un quad en
 * WebGPU, de sommet en WebGL (Points). Les tableaux sont partages : le
 * composant les mute. `count` = nombre de particules. */
export function createParticleGeometry(attributes: Record<string, ParticleAttributeSpec>): BufferGeometry {
  if (!isWebGpu()) {
    const g = new BufferGeometry();
    for (const [name, spec] of Object.entries(attributes)) g.setAttribute(name, new BufferAttribute(spec.array, spec.itemSize));
    return g;
  }
  const g = new InstancedBufferGeometry();
  // Le quad du sprite, centre (offset -0.5..0.5 lu par PointsNodeMaterial).
  g.setAttribute(POSITION, new BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  let count = 0;
  for (const [name, spec] of Object.entries(attributes)) {
    const attr = new InstancedBufferAttribute(spec.array, spec.itemSize);
    g.setAttribute(particleAttributeName(name), attr);
    count = attr.count;
  }
  g.instanceCount = count;
  return g;
}

/** Un noeud qui lit l'attribut `name` par particule (WebGPU), type par
 * `kind` ("float" | "vec2" | "vec3" | "vec4"). */
export function particleAttribute<K extends "float" | "vec2" | "vec3" | "vec4">(geometry: BufferGeometry, name: string, kind: K): Node<K> {
  void geometry;
  return attribute(particleAttributeName(name), kind) as unknown as Node<K>;
}

/** Taille en pixels d'une particule comme gl_PointSize = size * scale /
 * max(1, -mv.z) (la perspective a la main, sizeAttenuation a false). */
export function pointSizeNode(position: Node<"vec3">, size: Node<"float">, scale: Node<"float">) {
  return Fn(() => {
    const mv = modelViewMatrix.mul(vec4(position, 1));
    return size.mul(scale).div(max(1, mv.z.negate()));
  })();
}

/** L'equivalent de gl_PointCoord (0..1) sur un sprite instancie. */
export function pointCoord() {
  return uv();
}

export type ParticleMaterialNodes = {
  position: Node<"vec3">;
  size: Node<"float">;
  color: Node<"vec3">;
  opacity: Node<"float">;
  blending?: Material["blending"];
  depthWrite?: boolean;
  toneMapped?: boolean;
};

export function createParticleNodeMaterial(nodes: ParticleMaterialNodes): PointsNodeMaterial {
  const mat = new PointsNodeMaterial();
  mat.positionNode = nodes.position;
  mat.sizeNode = nodes.size;
  mat.colorNode = nodes.color;
  mat.opacityNode = nodes.opacity;
  mat.sizeAttenuation = false;
  mat.transparent = true;
  mat.depthWrite = nodes.depthWrite ?? false;
  if (nodes.blending !== undefined) mat.blending = nodes.blending;
  if (nodes.toneMapped !== undefined) mat.toneMapped = nodes.toneMapped;
  mat.alphaToCoverage = false;
  // Pas de brouillard : un ShaderMaterial l'ignorait, un NodeMaterial
  // l'applique par defaut (les etoiles a 83 unites disparaissaient).
  mat.fog = false;
  return mat;
}

/** L'objet a mettre dans la scene : Sprite instancie (WebGPU) ou Points. */
export function createParticleObject(geometry: BufferGeometry, material: Material, count: number): Object3D {
  if (isWebGpu()) {
    const sprite = new Sprite(material as PointsNodeMaterial);
    sprite.geometry = geometry;
    (geometry as InstancedBufferGeometry).instanceCount = count;
    sprite.frustumCulled = false;
    return sprite;
  }
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
