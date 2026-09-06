import { BufferAttribute, BufferGeometry, Vector3 } from "three";
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
  geometry.computeBoundingSphere();
}
