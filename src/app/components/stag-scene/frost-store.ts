import { MeshStandardMaterial, Vector2, type Material, type Object3D } from "three";
import { createFrostState, type FrostState } from "@/lib/frost";
import { addShaderModifier } from "./shader-patch";

/**
 * Le gel de l'Est (06/09) : etat partage (machine d'etat lib/frost, avancee
 * par FrostWorld) lu par le cerf (mixer fige), l'herbe (vent fige), les
 * coques de glace ; et le GIVRE PAR SHADER pose sur tous les materiaux
 * standard de la scene (meme mecanique que depth-fade : traverse
 * idempotent, addShaderModifier). Le givre ne coute rien hors de l'Est :
 * uFrost vaut 0.
 */
export const frostStore: { state: FrostState; active: boolean; impulse: number; impact: { x: number; y: number; z: number }; gold: number; rear: number; beam: number } = {
  state: createFrostState(),
  active: false,
  /** Compteur d'explosions (l'herbe lit, comme xiuhcoatlStore.strikeHit). */
  impulse: 0,
  /** Point d'impact du dard du soleil (monde). */
  impact: { x: 0, y: 1, z: 0 },
  /** L'or dans les gravures de la Piedra apres le lever (0..1). */
  gold: 0,
  /** Le cabre du cerf juste apres l'explosion (0..1). */
  rear: 0,
  /** Le puits de lumiere sur le cerf, une fois le monde degele (0..1). */
  beam: 0,
};

// Lecture externe (verifications Playwright, console) : l'etat du gel.
if (typeof window !== "undefined") (window as unknown as { __nahualFrost?: unknown }).__nahualFrost = frostStore;

export const frostUniforms = {
  uFrost: { value: 0 },
  uFrostTime: { value: 0 },
  /**
   * LE BALAI (09/09). Position du front, en unites monde, projetee sur
   * `uSweepAxis` : le givre reste DEVANT lui et a disparu DERRIERE. Ce qui
   * balaie n'est pas un objet mais la lumiere qui avance, dans l'axe du
   * soleil de l'Est. Attestation du geste : Itztlacoliuhqui porte un balai
   * de paille, « qui nettoie le chemin pour la vie nouvelle ».
   */
  uSweep: { value: -999 },
  /** Direction horizontale du balayage, normalisee. */
  uSweepAxis: { value: new Vector2(1, 0) },
};

// Lecture et pilotage externes (verifications Playwright, console) : sans ca,
// un masque spatial est indebogable.
if (typeof window !== "undefined") (window as unknown as { __nahualFrostUniforms?: unknown }).__nahualFrostUniforms = frostUniforms;

/** Demi-largeur du front, en unites monde : la frontiere est floue, pas une
 * ligne de coupe. */
export const FROST_SWEEP_SOFT = 5;
/** Le front part de la et va jusqu'a l'oppose : couvre tout le champ vu. */
export const FROST_SWEEP_RANGE = 34;

/**
 * LE GIVRE EFFECTIF a une position monde, avec le balai. Meme calcul que le
 * shader, pour que le processeur et la carte graphique racontent la MEME
 * chose : c'est ce qui permet au mais de se relever exactement quand le
 * front lui passe dessus, au lieu de se relever partout a la fois pendant
 * que la glace est encore la a cote.
 */
export function frostAt(x: number, z: number): number {
  const axis = frostUniforms.uSweepAxis.value;
  const along = x * axis.x + z * axis.y;
  const e0 = frostUniforms.uSweep.value - FROST_SWEEP_SOFT;
  const e1 = frostUniforms.uSweep.value + FROST_SWEEP_SOFT;
  const t = Math.min(1, Math.max(0, (along - e0) / (e1 - e0)));
  return frostUniforms.uFrost.value * (t * t * (3 - 2 * t));
}

const FROST_GLSL = /* glsl */ `
  float frostHash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float frostNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(frostHash(i), frostHash(i + vec3(1, 0, 0)), f.x), mix(frostHash(i + vec3(0, 1, 0)), frostHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(frostHash(i + vec3(0, 0, 1)), frostHash(i + vec3(1, 0, 1)), f.x), mix(frostHash(i + vec3(0, 1, 1)), frostHash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
`;

const patched = new WeakSet<Material>();

/** Pose le givre sur chaque MeshStandardMaterial (et Physical) sous `root`.
 * Idempotent, a rappeler chaque image (les enfants sous Suspense montent
 * apres le premier rendu). */
export function applyFrost(root: Object3D): void {
  root.traverse((child) => {
    const mesh = child as unknown as { material?: Material | Material[] };
    if (!mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      if (patched.has(material)) continue;
      patched.add(material);
      // Opacite de la glace : le sol et les montagnes restent presque pleins
      // (sinon on voit le vide dessous), le reste est du verre.
      const name = (child.name || "").toLowerCase();
      const alpha = name.includes("ground") ? 0.8 : name === "piedra" ? 0.66 : 0.4;
      addShaderModifier(material, (shader) => {
        shader.uniforms.uFrost = frostUniforms.uFrost;
        shader.uniforms.uFrostTime = frostUniforms.uFrostTime;
        shader.uniforms.uFrostAlpha = { value: alpha };
        shader.uniforms.uSweep = frostUniforms.uSweep;
        shader.uniforms.uSweepAxis = frostUniforms.uSweepAxis;
        shader.uniforms.uSweepSoft = { value: FROST_SWEEP_SOFT };
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\n varying vec3 vFrostW;\n varying vec3 vFrostN;")
          .replace(
            "#include <fog_vertex>",
            `#include <fog_vertex>
             #ifdef USE_INSTANCING
             vFrostW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
             #else
             vFrostW = (modelMatrix * vec4(transformed, 1.0)).xyz;
             #endif
             vFrostN = normalize((vec4(transformedNormal, 0.0) * viewMatrix).xyz);`,
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
             uniform float uFrost;
             uniform float uFrostTime;
             uniform float uFrostAlpha;
             uniform float uSweep;
             uniform vec2 uSweepAxis;
             uniform float uSweepSoft;
             varying vec3 vFrostW;
             varying vec3 vFrostN;
             ${FROST_GLSL}`,
          )
          .replace(
            "#include <dithering_fragment>",
            // APRES l'inclusion, pas avant (07/09) : les autres modificateurs
            // (desaturation par la profondeur, revelation par curseur)
            // s'inserent AVANT l'inclusion ; en se placant apres, la glace
            // passe toujours en dernier et personne ne la grise.
            `#include <dithering_fragment>
             // LE BALAI (09/09) : le givre reste DEVANT le front et a disparu
             // derriere. Avant, le monde de verre s'effacait partout a la
             // fois, ce qui ne racontait rien ; et la repousse du mais
             // ressemblait a une coincidence au lieu d'etre causee.
             // Le sens compte, et je l'ai eu a l'envers d'abord : le givre
             // reste DEVANT le front (gAlong > uSweep) et disparait derriere.
             // Avec l'autre signe, le front partant de -34, tout le champ
             // etait deja degele a l'arrivee : le monde de verre de l'Est
             // n'existait plus au chargement.
             float gAlong = dot(vFrostW.xz, uSweepAxis);
             float gAhead = smoothstep(uSweep - uSweepSoft, uSweep + uSweepSoft, gAlong);
             float gFrost = uFrost * gAhead;
             if (gFrost > 0.001) {
               // Un monde de GLACE (Sylvain, 07/09 : « tous les objets
               // translucides et bleutes, vitres ») : chaque surface devient
               // du verre bleu, le fond passe au travers, les bords se
               // blanchissent (fresnel), quelques paillettes ; un peu de la
               // couleur d'origine reste visible dans l'epaisseur.
               vec3 gV = normalize(cameraPosition - vFrostW);
               float gNV = abs(dot(normalize(vFrostN), gV));
               // Liseree blanc serre (exposant 4), coeur bleu profond : aux angles
               // rasants (sol, herbe) tout devenait blanc neige (essai 07/09).
               float gFres = pow(1.0 - gNV, 4.0);
               // Paillettes FILTREES (08/09). L'effet est voulu, son
               // implementation aliasait : a la frequence 70 la periode du
               // bruit valait 0,014 unite monde, plus fin qu'un brin
               // d'herbe, donc bien au-dela de la frequence de Nyquist de
               // l'ecran ; l'exposant 16 et le facteur 2 en faisaient des
               // pics durs satures en blanc pur. Resultat au zoom 1:1 sur
               // le sol gele de l'Est : un semis de points isoles lu comme
               // du bruit de capteur, et non comme du givre.
               // Trois corrections : frequence divisee par trois, pics
               // adoucis (exposant 7, plus de saturation), et surtout
               // extinction avec la DISTANCE, parce que c'est au loin que
               // la periode du bruit passe sous le pixel. Au-dela de 20
               // unites il n'y a plus de paillette du tout : les montagnes
               // et le sol lointain cessent de grener.
               float gDist = length(cameraPosition - vFrostW);
               float spark = pow(frostNoise(vFrostW * 24.0), 7.0)
                 * smoothstep(20.0, 5.0, gDist);
               vec3 glass = mix(vec3(0.14, 0.32, 0.6), vec3(0.9, 0.96, 1.0), gFres);
               // La couleur d'origine reste lisible dans l'epaisseur, teintee bleu.
               vec3 through = gl_FragColor.rgb * vec3(0.55, 0.72, 1.0);
               vec3 iced = glass * (0.5 + 0.5 * gFres) + through * 0.45 + vec3(spark);
               gl_FragColor.rgb = mix(gl_FragColor.rgb, iced, gFrost);
               gl_FragColor.a = mix(gl_FragColor.a, uFrostAlpha + (1.0 - uFrostAlpha) * gFres, gFrost);
             }
`,
          );
      });
    }
  });
}
