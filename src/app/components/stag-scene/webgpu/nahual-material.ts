import { MeshStandardNodeMaterial, MeshPhysicalNodeMaterial } from "three/webgpu";
import type { Material, MeshPhysicalMaterial, MeshStandardMaterial, Mesh, Object3D } from "three";
import type { Node, NodeBuilder } from "three/webgpu";

/**
 * NahualStandardMaterial (05/09, migration WebGPU). Le remplacant du
 * registre de patches GLSL (shader-patch.ts) : un materiau de noeuds dont
 * la SORTIE (la couleur eclairee, avant brouillard et tone mapping) passe
 * par une liste d'ETAGES composables. Chaque etage est une fonction TSL
 * pure `(color) => color` ; le fondu de profondeur, le revelateur curseur
 * et le lisere du cerf en sont trois. Plus de remplacement de chaines de
 * caracteres, plus d'ordre fragile : on ajoute un etage, il s'applique.
 *
 * `setupOutput` est le point d'extension documente de NodeMaterial pour
 * modifier la couleur finale en respectant l'eclairage.
 */

export type OutputStage = (color: Node<"vec4">) => Node<"vec4">;

type StageHost = { stages: OutputStage[]; needsUpdate: boolean };

function applyStages(stages: OutputStage[], output: Node<"vec4">): Node<"vec4"> {
  // `output` est un vec4 (rgb eclaire, alpha) ; chaque etage recoit et
  // rend un vec4.
  let node = output;
  for (const stage of stages) node = stage(node);
  return node;
}

export class NahualStandardMaterial extends MeshStandardNodeMaterial implements StageHost {
  stages: OutputStage[] = [];
  addStage(stage: OutputStage): void {
    this.stages.push(stage);
    this.needsUpdate = true;
  }
  setupOutput(builder: NodeBuilder, outputNode: Node<"vec4">): Node<"vec4"> {
    // Le brouillard d'abord (super.setupOutput), les etages ensuite :
    // les patches GLSL s'inserent a dithering_fragment, APRES fog_fragment.
    return applyStages(this.stages, super.setupOutput(builder, outputNode) as Node<"vec4">);
  }
}

export class NahualPhysicalMaterial extends MeshPhysicalNodeMaterial implements StageHost {
  stages: OutputStage[] = [];
  addStage(stage: OutputStage): void {
    this.stages.push(stage);
    this.needsUpdate = true;
  }
  setupOutput(builder: NodeBuilder, outputNode: Node<"vec4">): Node<"vec4"> {
    // Le brouillard d'abord (super.setupOutput), les etages ensuite :
    // les patches GLSL s'inserent a dithering_fragment, APRES fog_fragment.
    return applyStages(this.stages, super.setupOutput(builder, outputNode) as Node<"vec4">);
  }
}

export type NahualMaterial = NahualStandardMaterial | NahualPhysicalMaterial;

/** Les proprietes que l'on recopie d'un materiau classique (liste
 * explicite : pas de copie aveugle d'uuid ou d'internes). */
const STANDARD_KEYS = [
  "name",
  "color",
  "map",
  "normalMap",
  "normalScale",
  "roughness",
  "roughnessMap",
  "metalness",
  "metalnessMap",
  "emissive",
  "emissiveIntensity",
  "emissiveMap",
  "aoMap",
  "aoMapIntensity",
  "alphaMap",
  "alphaTest",
  "envMap",
  "envMapIntensity",
  "displacementMap",
  "displacementScale",
  "displacementBias",
  "transparent",
  "opacity",
  "side",
  "depthWrite",
  "depthTest",
  "flatShading",
  "vertexColors",
  "fog",
  "blending",
  "toneMapped",
  "dithering",
  "wireframe",
  "polygonOffset",
  "polygonOffsetFactor",
  "polygonOffsetUnits",
  "userData",
] as const;

const PHYSICAL_KEYS = ["clearcoat", "clearcoatRoughness", "sheen", "sheenRoughness", "sheenColor", "ior", "specularIntensity", "specularColor", "transmission", "iridescence"] as const;

function copyKeys(target: Material, source: Material, keys: readonly string[]): void {
  const t = target as unknown as Record<string, unknown>;
  const s = source as unknown as Record<string, unknown>;
  for (const k of keys) {
    const v = s[k];
    if (v === undefined) continue;
    const cur = t[k];
    if (cur && typeof cur === "object" && "copy" in (cur as object) && v && typeof v === "object" && "copy" in (v as object) && !("isTexture" in (v as object))) {
      (cur as { copy: (o: unknown) => void }).copy(v);
    } else {
      t[k] = v;
    }
  }
}

export function isNahualMaterial(m: Material | undefined | null): m is NahualMaterial {
  return !!m && Array.isArray((m as unknown as { stages?: unknown }).stages);
}

const converted = new WeakMap<Material, NahualMaterial>();

/** Le jumeau « noeuds » d'un materiau classique, cree une fois (les
 * materiaux d'un GLB sont partages par plusieurs meshes : ils le
 * restent). Un materiau deja Nahual est rendu tel quel. */
export function toNahualMaterial(source: Material): NahualMaterial | null {
  if (isNahualMaterial(source)) return source;
  const hit = converted.get(source);
  if (hit) return hit;
  const src = source as MeshStandardMaterial & Partial<MeshPhysicalMaterial>;
  if (!(src as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial) return null;
  const physical = (src as { isMeshPhysicalMaterial?: boolean }).isMeshPhysicalMaterial === true;
  const out = physical ? new NahualPhysicalMaterial() : new NahualStandardMaterial();
  copyKeys(out, src, STANDARD_KEYS);
  if (physical) copyKeys(out, src, PHYSICAL_KEYS);
  converted.set(source, out);
  return out;
}

/** Remplace, sur tous les meshes sous `root`, les materiaux standard par
 * leur jumeau Nahual, et rend la liste (sans doublon). */
export function ensureNahualMaterials(root: Object3D): NahualMaterial[] {
  const out: NahualMaterial[] = [];
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!(mesh as { isMesh?: boolean }).isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const replaced = mats.map((m) => toNahualMaterial(m) ?? m);
    mesh.material = Array.isArray(mesh.material) ? replaced : replaced[0];
    for (const m of replaced) if (isNahualMaterial(m) && !out.includes(m)) out.push(m);
  });
  return out;
}
