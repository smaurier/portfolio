import type { Color, IUniform, Material, WebGLProgramParametersWithUniforms } from "three";

/**
 * LE DEPART PAR DISSOLUTION (16/09).
 *
 * Le decor propre a une direction sortait EN UNE IMAGE au commit de la
 * route : mesure du 16/09, il restait une marche de 0,49 de l'ecart de
 * luminance sur Sud vers Ouest apres que la lumiere, le brouillard et
 * l'arc eurent tous ete rendus continus. Les objets ne partaient pas, ils
 * etaient supprimes, et ce que `year-stones` faisait de mieux etait de
 * rapetisser jusqu'a zero, ce qui se lit comme une suppression.
 *
 * La technique est celle documentee par Codrops (17/02/2025) : un bruit
 * evalue en espace objet, un seuil qui monte, un `discard` sous le seuil,
 * et une bande allumee juste au-dessus. C'est le lisere qui fait la
 * difference entre une dissolution et un objet qui clignote : le bord qui
 * vient de ceder s'allume.
 *
 * ESPACE OBJET, ET PAS ESPACE ECRAN : notre camera fait un tour complet
 * autour du cerf pendant le passage. Un bruit en espace ecran nagerait sur
 * la matiere pendant ce tour.
 *
 * ============================================================
 * LE PIEGE, ET POURQUOI CE MODULE EST BATI COMME CA
 * ============================================================
 *
 * 1. JAMAIS UNE VARIANTE QU'ON DECOUVRE EN PLEIN PASSAGE. Le depot porte
 *    deja la cicatrice : `year-stones` met `m.sheen = 0.001` et non zero,
 *    parce que three met `USE_SHEEN` dans la cle du programme des que le
 *    lustre depasse zero, et que les pierres recompilaient en plein arc.
 *    Une variante de dissolution decouverte au moment du depart ferait
 *    exactement ca, au pire moment : celui qu'on vient de rendre continu.
 *    On accepte donc UNE recompilation, mais la premiere seulement, et
 *    l'oracle `transitions.spec.ts` (aucune image au-dessus de 300 ms
 *    pendant un voyage) est la pour dire si elle se voit.
 *
 * 2. MAIS PAS DE `discard` AU REPOS NON PLUS. La documentation Arm est
 *    sans ambiguite : un fragment shader qui PEUT appeler `discard`
 *    empeche le rejet de profondeur anticipe, parce que le test a deja
 *    ecrit une valeur qu'il ne pourrait plus annuler. Sur les GPU a
 *    tuiles, c'est-a-dire tous les telephones, l'effet deborde du dessin
 *    concerne. Une dissolution toujours presente couterait l'Early-Z sur
 *    toutes les pages, tout le temps, pour deux secondes de passage.
 *
 * D'ou le compromis : le code n'existe QUE quand le depart joue, la cle de
 * programme le dit a three, et le reste du temps le materiau est celui
 * qu'il a toujours ete. Le premier depart paie une compilation ; les
 * suivants retombent sur le programme en cache.
 *
 * `attacherDissolution` est IDEMPOTENT et garde l'`onBeforeCompile`
 * existant : nos materiaux sont deja injectes ailleurs (xiuhcoatl, reflet)
 * et les ecraser les casserait en silence.
 */
export const DISSOLUTION = {
  /** Finesse du bruit, en unites monde. Plus haut, plus fin. */
  frequence: 6.5,
  /** Largeur de la bande allumee au bord de ce qui vient de ceder. */
  lisere: 0.09,
} as const;

/**
 * De la presence (1 = entier, 0 = parti) au seuil du bruit.
 *
 * A presence nulle le seuil DEPASSE le bruit maximal, lisere compris :
 * sans ce depassement il resterait une derniere plaque de matiere et un
 * lisere allume au moment ou l'objet est cense etre parti.
 */
export function seuilDepart(presence: number): number {
  const p = Math.min(1, Math.max(0, presence));
  return (1 - p) * (1 + DISSOLUTION.lisere * 2);
}

export type Depart = {
  /** Le seuil courant, a ecrire par le composant (voir `seuilDepart`). */
  seuil: IUniform<number>;
  /**
   * Fait exister (ou disparaitre) le code de dissolution dans le
   * programme. A n'activer que pendant un depart ou une arrivee : hors de
   * la, le materiau ne doit porter aucun `discard`.
   */
  activer(actif: boolean): void;
  /** L'etat courant, pour eviter les appels inutiles. */
  readonly actif: boolean;
};

type MateriauDissous = Material & { __depart?: Depart };

/** Le bruit, deux octaves de bruit de valeur. Declare une seule fois. */
const BRUIT = /* glsl */ `
float hashDepart(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float octaveDepart(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hashDepart(i), hashDepart(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hashDepart(i + vec3(0.0, 1.0, 0.0)), hashDepart(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hashDepart(i + vec3(0.0, 0.0, 1.0)), hashDepart(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hashDepart(i + vec3(0.0, 1.0, 1.0)), hashDepart(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
float bruitDepart(vec3 x) {
  return octaveDepart(x) * 0.65 + octaveDepart(x * 2.7 + 11.3) * 0.35;
}
`;

export function attacherDissolution(materiau: Material, couleurLisere: Color): Depart {
  const cible = materiau as MateriauDissous;
  if (cible.__depart) return cible.__depart;

  const seuil: IUniform<number> = { value: 0 };
  const lisere: IUniform<number> = { value: DISSOLUTION.lisere };
  const frequence: IUniform<number> = { value: DISSOLUTION.frequence };
  const couleur: IUniform<Color> = { value: couleurLisere };
  let actif = false;

  const precedent = materiau.onBeforeCompile;
  const cleDOrigine = materiau.customProgramCacheKey;

  materiau.onBeforeCompile = (sources: WebGLProgramParametersWithUniforms, renderer) => {
    precedent?.call(materiau, sources, renderer);
    if (!actif) return;

    sources.uniforms.uDepartSeuil = seuil;
    sources.uniforms.uDepartLisere = lisere;
    sources.uniforms.uDepartFreq = frequence;
    sources.uniforms.uDepartCouleur = couleur;

    sources.vertexShader = sources.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vDepartPos;")
      // `begin_vertex` et pas l'attribut brut : `transformed` est la
      // position apres morph et peau, donc le bruit tient sur un maillage
      // anime comme sur une pierre.
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDepartPos = transformed;");

    sources.fragmentShader = sources.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vDepartPos;
uniform float uDepartSeuil;
uniform float uDepartLisere;
uniform float uDepartFreq;
uniform vec3 uDepartCouleur;
${BRUIT}`,
      )
      // Apres le tramage : on agit sur la couleur finale, comme Codrops.
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
  float nDepart = bruitDepart(vDepartPos * uDepartFreq);
  if (nDepart < uDepartSeuil) discard;
  if (nDepart < uDepartSeuil + uDepartLisere) {
    float bord = 1.0 - (nDepart - uDepartSeuil) / max(uDepartLisere, 1e-4);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, uDepartCouleur, bord * 0.9);
  }`,
      );
  };

  materiau.customProgramCacheKey = function cle(this: Material) {
    return `${cleDOrigine ? cleDOrigine.call(this) : ""}|depart:${actif ? "1" : "0"}`;
  };

  const depart: Depart = {
    seuil,
    activer(vouluActif: boolean) {
      if (vouluActif === actif) return;
      actif = vouluActif;
      materiau.needsUpdate = true;
    },
    get actif() {
      return actif;
    },
  };
  cible.__depart = depart;
  return depart;
}
