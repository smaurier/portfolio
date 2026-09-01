import { Box3, Vector3, type Object3D } from "three";

/**
 * Recadre un modèle sur son propre bounding box : hauteur fixée à
 * `targetHeight`, posé au sol (y=0), centré en X/Z. Mutation directe de
 * `scene` (pas de clone).
 *
 * Idempotente : reset de scale/position avant mesure. Sans ce reset,
 * appelée deux fois sur la même instance (ex. useGLTF met en cache la
 * scene ; un remount ou un React strict-mode double-invoke rejoue la
 * fonction sur une scene déjà scalée), la mesure `Box3().setFromObject`
 * retourne la taille *finale* (~targetHeight), le facteur calculé vaut
 * ~1, et `setScalar(1)` efface l'échelle précédente. Le modèle
 * réapparaît à sa taille native (bug reload/remount trouvé le 25/08).
 */
export function centerAndScale(scene: Object3D, targetHeight: number): void {
  scene.scale.setScalar(1);
  scene.position.set(0, 0, 0);
  const box = new Box3().setFromObject(scene);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const scale = size.y > 0 ? targetHeight / size.y : 1;

  scene.scale.setScalar(scale);
  scene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
}
