import { BufferAttribute, BufferGeometry, Sphere, Vector3 } from "three";

/** Les rubans ne sont jamais frustum-culles : une sphere fixe, jamais
 * recalculee (06/09, profil : computeBoundingSphere par image = 3 %). */
const BIG_SPHERE = new Sphere(new Vector3(0, 0, 0), 1e3);
import type { Strip } from "@/lib/paper-strip";

/**
 * Un RUBAN sur une chaine Verlet (06/09, factorise depuis amate-strips) :
 * deux sommets par point de la chaine, largeur perpendiculaire a la
 * tangente, normale du ruban. Sert aux bandelettes d'amate du Nord, aux
 * cheveux et aux plumes de quetzal des Cihuateteo, aux papiers du
 * carrefour. `vBand` (0..1) place le ruban dans une bande de texture.
 */

export function createRibbonGeometry(points: number, vBand: [number, number] = [0, 1]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(points * 2 * 3), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(points * 2 * 3), 3));
  const uv = new Float32Array(points * 2 * 2);
  for (let p = 0; p < points; p++) {
    const u = p / (points - 1);
    uv[p * 4] = u;
    uv[p * 4 + 1] = vBand[0];
    uv[p * 4 + 2] = u;
    uv[p * 4 + 3] = vBand[1];
  }
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  const index: number[] = [];
  for (let p = 0; p < points - 1; p++) {
    const a = p * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geometry.setIndex(index);
  geometry.boundingSphere = BIG_SPHERE.clone();
  return geometry;
}

const tangent = new Vector3();
const side = new Vector3();
const up = new Vector3(0, 1, 0);

/** Recopie la chaine dans le ruban. `width` peut varier le long du ruban
 * (fonction de u, 0 a l'ancre .. 1 au bout) : une plume s'effile. */
export function updateRibbon(geometry: BufferGeometry, strip: Strip, width: number | ((u: number) => number)): void {
  const pos = geometry.attributes.position as BufferAttribute;
  const nor = geometry.attributes.normal as BufferAttribute;
  const pts = strip.points;
  const last = pts.length - 1;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(last, i + 1)];
    tangent.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
    side.crossVectors(tangent, up);
    if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
    const w = typeof width === "number" ? width : width(i / last);
    side.normalize().multiplyScalar(w * 0.5);
    const p = pts[i];
    pos.setXYZ(i * 2, p.x - side.x, p.y - side.y, p.z - side.z);
    pos.setXYZ(i * 2 + 1, p.x + side.x, p.y + side.y, p.z + side.z);
    const nx = tangent.y * side.z - tangent.z * side.y;
    const ny = tangent.z * side.x - tangent.x * side.z;
    const nz = tangent.x * side.y - tangent.y * side.x;
    nor.setXYZ(i * 2, nx, ny, nz);
    nor.setXYZ(i * 2 + 1, nx, ny, nz);
  }
  pos.needsUpdate = true;
  nor.needsUpdate = true;
}

/**
 * Un FAISCEAU de rubans dans une seule geometrie (06/09, les chevelures des
 * Cihuateteo : 90 meches par tete, un seul appel de rendu). Chaque ruban
 * occupe une tranche de `points * 2` sommets.
 */
export function createRibbonBundleGeometry(ribbons: number, points: number): BufferGeometry {
  const verts = ribbons * points * 2;
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(verts * 3), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(verts * 3), 3));
  const uv = new Float32Array(verts * 2);
  const index: number[] = [];
  for (let r = 0; r < ribbons; r++) {
    const base = r * points * 2;
    for (let p = 0; p < points; p++) {
      const u = p / (points - 1);
      const v = base + p * 2;
      uv[v * 2] = u;
      uv[v * 2 + 1] = 0;
      uv[(v + 1) * 2] = u;
      uv[(v + 1) * 2 + 1] = 1;
      if (p < points - 1) index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.boundingSphere = BIG_SPHERE.clone();
  return geometry;
}

/** Recopie la chaine `strip` dans la tranche `slot` du faisceau. Appeler
 * `finishRibbonBundle` une fois toutes les tranches ecrites. */
export function writeRibbonSlot(geometry: BufferGeometry, slot: number, strip: Strip, width: number | ((u: number) => number)): void {
  const pos = geometry.attributes.position as BufferAttribute;
  const nor = geometry.attributes.normal as BufferAttribute;
  const pts = strip.points;
  const last = pts.length - 1;
  const base = slot * pts.length * 2;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(last, i + 1)];
    tangent.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
    side.crossVectors(tangent, up);
    if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
    const w = typeof width === "number" ? width : width(i / last);
    side.normalize().multiplyScalar(w * 0.5);
    const p = pts[i];
    const v = base + i * 2;
    pos.setXYZ(v, p.x - side.x, p.y - side.y, p.z - side.z);
    pos.setXYZ(v + 1, p.x + side.x, p.y + side.y, p.z + side.z);
    const nx = tangent.y * side.z - tangent.z * side.y;
    const ny = tangent.z * side.x - tangent.x * side.z;
    const nz = tangent.x * side.y - tangent.y * side.x;
    nor.setXYZ(v, nx, ny, nz);
    nor.setXYZ(v + 1, nx, ny, nz);
  }
}

export function finishRibbonBundle(geometry: BufferGeometry): void {
  (geometry.attributes.position as BufferAttribute).needsUpdate = true;
  (geometry.attributes.normal as BufferAttribute).needsUpdate = true;
}
