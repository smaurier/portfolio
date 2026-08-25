import { Box3, Vector3, type Object3D } from "three";

/**
 * Recadre un modèle sur son propre bounding box : hauteur fixée à
 * `targetHeight`, posé au sol (y=0), centré en X/Z. Mutation directe de
 * `scene` (pas de clone).
 */
export function centerAndScale(scene: Object3D, targetHeight: number): void {
  const box = new Box3().setFromObject(scene);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const scale = size.y > 0 ? targetHeight / size.y : 1;

  scene.scale.setScalar(scale);
  scene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
}
