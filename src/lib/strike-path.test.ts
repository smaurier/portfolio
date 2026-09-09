import { describe, expect, it } from "vitest";
import { STRIKE_PATH, strikePathAt, type Pt } from "./strike-path";

/**
 * LA TRAJECTOIRE DE LA FRAPPE, en trois temps.
 *
 * Ce qu'on remplace (mesure du 09/09, film image par image) : une seule
 * courbe de Bezier quadratique, du point ou le serpent errait jusqu'au
 * ciel, en passant par le point d'impact a la moitie du parametre. Trois
 * defauts, une seule cause -- le parametre avance uniformement, donc le
 * seul moment qui compte est traverse au plus vite :
 *
 *  - « trop court » : le serpent partait a 33 unites du centre et les
 *    avalait en 0,6 s, soit 55 unites par seconde pour un cerf de 2 unites.
 *    A t+0,32 il n'est pas au cadre, a t+0,48 il en remplit la moitie.
 *  - « il devrait presque se poser au sol » : l'impact etait pose a
 *    y = 0,55 sur une courbe symetrique, donc il RASAIT sans jamais
 *    approcher la pierre, a l'horizontale.
 *  - « trop rigide » : la raideur montait de 0 a 1 en 0,2 s et retombait a
 *    0,04 en 0,16 s. Un tic, pas un geste.
 *
 * La forme voulue : il PLONGE de loin, il RASE l'anneau en le suivant, au
 * ras du sol, assez longtemps pour qu'on le voie, puis il REPART vers le
 * ciel. Le rasement suit l'arc de l'anneau qu'il embrase : ce n'est pas
 * une ligne droite mais la courbe du cercle grave.
 *
 * Les invariants testes ici sont ceux qu'une image ne montre qu'une fois
 * cassee : la continuite de la position ET de la tangente aux raccords
 * (sans quoi le corps se retourne d'un coup), et le fait que la tangente ne
 * s'annule jamais (le quaternion d'orientation en depend, et un NaN dans
 * un squelette est un bug qu'on a deja eu ici).
 */

const DEPART: Pt = { x: 16.9, y: 9, z: -26.4 };

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function norme(p: Pt): number {
  return Math.hypot(p.x, p.y, p.z);
}

/** Angle entre deux directions, en degres. */
function angle(a: Pt, b: Pt): number {
  const la = norme(a), lb = norme(b);
  const c = (a.x * b.x + a.y * b.y + a.z * b.z) / (la * lb);
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

describe("strike-path : plonger, raser, repartir", () => {
  it("touche l'anneau A l'instant de l'impact, et au ras du sol", () => {
    const e = strikePathAt(STRIKE_PATH.hitAt, DEPART);
    expect(e.phase).toBe("rasement");
    expect(e.pos.y).toBeCloseTo(STRIKE_PATH.groundY, 6);
    // Au point d'impact grave, a la tolerance de l'arc.
    const r = Math.hypot(e.pos.x, e.pos.z);
    expect(r).toBeCloseTo(Math.hypot(STRIKE_PATH.hit.x, STRIKE_PATH.hit.z), 6);
    expect(dist(e.pos, { ...STRIKE_PATH.hit, y: STRIKE_PATH.groundY })).toBeLessThan(0.02);
  });

  it("rase VRAIMENT : la hauteur reste au sol pendant tout le rasement", () => {
    // C'est le defaut que Sylvain a nomme. On verifie sur toute la fenetre,
    // pas seulement a l'instant de l'impact.
    const t0 = STRIKE_PATH.hitAt - STRIKE_PATH.skim / 2;
    for (let i = 0; i <= 20; i += 1) {
      const t = t0 + (STRIKE_PATH.skim * i) / 20;
      const e = strikePathAt(t, DEPART);
      expect(e.phase, `t=${t.toFixed(2)}`).toBe("rasement");
      expect(e.pos.y).toBeCloseTo(STRIKE_PATH.groundY, 6);
    }
  });

  it("epouse la TANGENTE de l'anneau au contact, et son cap tourne", () => {
    // Precision de la specification, avant implementation : le serpent ne
    // peut pas COURIR le long du cercle grave. A l'echelle 2,4 son corps est
    // plus long que le rayon de l'anneau (2,67 unites), donc suivre le
    // cercle le ferait pivoter sur lui-meme au lieu d'avancer. Ce qui doit
    // etre vrai, et qui se lit, c'est qu'au moment du CONTACT il file dans
    // le sens de l'anneau -- comme une meche qu'on allume -- puis que sa
    // course s'incurve au ras du sol au lieu d'etre une droite.
    const H = STRIKE_PATH.hit;
    const r0 = Math.hypot(H.x, H.z);
    const tangenteAnneau = { x: -H.z / r0, z: H.x / r0 };
    const e = strikePathAt(STRIKE_PATH.hitAt, DEPART);
    const cap = { x: e.tan.x, z: e.tan.z };
    const l = Math.hypot(cap.x, cap.z);
    const alignement = Math.abs((cap.x * tangenteAnneau.x + cap.z * tangenteAnneau.z) / l);
    expect(alignement, "aligne sur la tangente de l'anneau au contact").toBeGreaterThan(0.9);

    const t0 = STRIKE_PATH.hitAt - STRIKE_PATH.skim / 2;
    const caps: number[] = [];
    for (let i = 0; i <= 10; i += 1) {
      const p = strikePathAt(t0 + (STRIKE_PATH.skim * i) / 10, DEPART);
      caps.push(Math.atan2(p.tan.z, p.tan.x));
    }
    expect(Math.abs(caps[caps.length - 1] - caps[0]), "le cap tourne").toBeGreaterThan(0.15);
  });

  it("ne casse ni la position ni la tangente aux deux raccords", () => {
    // Sans cette continuite, le corps se retourne d'un coup a l'entree ou
    // a la sortie du rasement, et ca se voit plus que le defaut d'origine.
    for (const t of [STRIKE_PATH.hitAt - STRIKE_PATH.skim / 2, STRIKE_PATH.hitAt + STRIKE_PATH.skim / 2]) {
      const eps = 1e-4;
      const avant = strikePathAt(t - eps, DEPART);
      const apres = strikePathAt(t + eps, DEPART);
      expect(dist(avant.pos, apres.pos), "position continue").toBeLessThan(1e-2);
      expect(angle(avant.tan, apres.tan), "tangente continue (deg)").toBeLessThan(2);
    }
  });

  it("ne passe jamais sous le sol", () => {
    for (let i = 0; i <= 200; i += 1) {
      const e = strikePathAt((STRIKE_PATH.total * i) / 200, DEPART);
      expect(e.pos.y, `t=${((STRIKE_PATH.total * i) / 200).toFixed(2)}`).toBeGreaterThanOrEqual(
        STRIKE_PATH.groundY - 1e-6,
      );
    }
  });

  it("garde une tangente utilisable partout", () => {
    // Un quaternion construit sur une tangente nulle donne NaN, et un NaN
    // dans un squelette se propage a tout le modele : bug deja rencontre
    // ici le 05/09.
    for (let i = 0; i <= 200; i += 1) {
      const e = strikePathAt((STRIKE_PATH.total * i) / 200, DEPART);
      expect(norme(e.tan)).toBeGreaterThan(1e-3);
      expect(Number.isFinite(e.tan.x + e.tan.y + e.tan.z)).toBe(true);
    }
  });

  it("DECELERE en approchant : le rasement se regarde, l'approche se devine", () => {
    // Le coeur du defaut « trop court ». On compare la vitesse moyenne de
    // la plongee a celle du rasement : la plongee doit etre nettement plus
    // rapide, sinon le geste dure sans se lire.
    const mesureVitesse = (a: number, b: number) => {
      let l = 0;
      let prev = strikePathAt(a, DEPART).pos;
      for (let i = 1; i <= 40; i += 1) {
        const p = strikePathAt(a + ((b - a) * i) / 40, DEPART).pos;
        l += dist(prev, p);
        prev = p;
      }
      return l / (b - a);
    };
    const plongee = mesureVitesse(0, STRIKE_PATH.hitAt - STRIKE_PATH.skim / 2);
    const rasement = mesureVitesse(
      STRIKE_PATH.hitAt - STRIKE_PATH.skim / 2,
      STRIKE_PATH.hitAt + STRIKE_PATH.skim / 2,
    );
    expect(plongee).toBeGreaterThan(rasement * 2);
    // Et le rasement reste lisible : ni sur place, ni un eclair.
    expect(rasement).toBeGreaterThan(1);
    expect(rasement).toBeLessThan(12);
  });

  it("borne le temps aux deux bouts", () => {
    const debut = strikePathAt(-5, DEPART);
    expect(dist(debut.pos, DEPART)).toBeLessThan(1e-6);
    const fin = strikePathAt(STRIKE_PATH.total + 5, DEPART);
    const finExacte = strikePathAt(STRIKE_PATH.total, DEPART);
    expect(dist(fin.pos, finExacte.pos)).toBeLessThan(1e-6);
  });

  it("part vraiment du point donne, d'ou qu'il vienne", () => {
    for (const p of [DEPART, { x: -8, y: 3, z: 5 }, { x: 0.5, y: 12, z: -1 }]) {
      expect(dist(strikePathAt(0, p).pos, p)).toBeLessThan(1e-6);
    }
  });

  it("finit en montant, loin et haut", () => {
    const fin = strikePathAt(STRIKE_PATH.total, DEPART);
    expect(fin.phase).toBe("remontee");
    expect(fin.pos.y).toBeGreaterThan(4);
    expect(fin.tan.y, "la tangente monte a la sortie").toBeGreaterThan(0);
  });

  it("tolere un depart degenere (deja sur le point d'impact)", () => {
    // Cas reel : le tirage du vol errant peut le placer juste au-dessus de
    // l'anneau au moment de l'ordre. La trajectoire doit rester finie.
    const e = strikePathAt(0.2, { ...STRIKE_PATH.hit, y: STRIKE_PATH.groundY });
    expect(Number.isFinite(e.pos.x + e.pos.y + e.pos.z)).toBe(true);
    expect(norme(e.tan)).toBeGreaterThan(1e-3);
  });
});
