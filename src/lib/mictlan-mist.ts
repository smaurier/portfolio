/**
 * Logique pure des nappes de brouillard du Mictlan (03/09, retour Sylvain
 * "un vrai simulateur de brouillard ou de fumee pour faire des nappes").
 * La simulation elle-meme est le Navier-Stokes GPU (mictlan-fluid-sim.ts,
 * revenu de l'historique git) ; ici : ou et comment le brouillard nait.
 *
 * Il nait aux BORDS du bassin (la couronne contre la margelle) et rampe
 * tres lentement vers l'interieur, sans jamais atteindre le cerf (le
 * composant masque le centre) : il voile la margelle au fond, laisse le
 * sujet net.
 */

export type MistSplat = { u: number; v: number; du: number; dv: number };

function hash(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

export function mistEmitters(time: number, count: number, rMin: number, rMax: number, extent: number): MistSplat[] {
  const out: MistSplat[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const baseAngle = t * Math.PI * 2;
    const angle = baseAngle + Math.sin(time * 0.05 + i * 1.3) * 0.12;
    const r = rMin + (rMax - rMin) * (0.5 + 0.45 * Math.sin(time * 0.07 + i * 2.7 + hash(i, 1) * 6.28));
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const u = x / (2 * extent) + 0.5;
    const v = z / (2 * extent) + 0.5;
    // Vers l'interieur, tres lent, avec une legere composante tangente.
    const nx = -Math.cos(angle);
    const nz = -Math.sin(angle);
    const tangent = 0.4 * Math.sin(time * 0.11 + i);
    const du = (nx - nz * tangent) * 0.03;
    const dv = (nz + nx * tangent) * 0.03;
    out.push({ u, v, du, dv });
  }
  return out;
}
