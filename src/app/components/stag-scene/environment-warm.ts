import {
  BufferGeometry,
  FloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  OrthographicCamera,
  PMREMGenerator,
  RGBAFormat,
  WebGLRenderTarget,
  type Material,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from "three";
import { ensureMictlanEnvironment, getMictlanEnvironment, getMictlanSkySource, setMictlanEnvironment } from "./mictlan-sky";

/**
 * LA CARTE D'ENVIRONNEMENT, PRETE AVANT QU'ON EN AIT BESOIN (12/09).
 *
 * Mesure du 12/09 (sonde `.scratch/voile.mjs`, cache de shaders froid) :
 * la compilation de l'anneau `piedra_xiuhcoatl_ring` (materiau physique,
 * envMap = ciel du Mictlan en equirectangulaire) coutait 636 ms et creait
 * TROIS programmes. Ce n'etait pas l'anneau : c'etait three qui, a la
 * premiere demande d'environnement d'un materiau physique, fabrique la
 * carte PMREM (equirect vers cube, flou, GGX) en bloquant le fil
 * principal. Deuxieme mesure : meme avec les trois programmes lies en
 * asynchrone, la generation bloque encore 600 ms, parce que sous
 * ANGLE/D3D11 c'est le PREMIER TRACE d'un shader qui le compile vraiment,
 * et rien ne rend ce trace asynchrone.
 *
 * Le ciel est un degrade fixe : sa carte l'est aussi. Elle est donc CUITE
 * une fois (`.scratch/bake-pmrem.mjs`, en dev, via `__nahualBakeEnv`) en
 * un PNG sRGB de la disposition CubeUV de three, servi avec le site
 * (`public/env/mictlan-pmrem.png`) et charge des le premier materiau qui
 * demande le ciel (mictlan-sky). Ici, la chauffe attend ce chargement
 * quelques images, pose la carte dans les materiaux deja crees, et ne
 * retombe sur la fabrication a la volee (en trois temps, un element en
 * vol) que si le fichier manque.
 */
type Programme = { isReady?: () => boolean };
type PmremPrive = PMREMGenerator & {
  _setSize?: (cubeSize: number) => void;
  _allocateTargets?: () => WebGLRenderTarget;
  _equirectMaterial?: Material | null;
  _blurMaterial?: Material | null;
  _ggxMaterial?: Material | null;
};

export type EnvironmentWarmState = {
  phase: "a-faire" | "chargement" | "en-vol" | "fini";
  pmrem: PMREMGenerator | null;
  cible: WebGLRenderTarget | null;
  programmes: Programme[];
  frames: number;
};

export function initialEnvironmentWarm(): EnvironmentWarmState {
  return { phase: "a-faire", pmrem: null, cible: null, programmes: [], frames: 0 };
}

/** Le PNG cuit arrive en general bien avant : au-dela, on fabrique. */
const CHARGEMENT_MAX_FRAMES = 90;
/** Au-dela, on genere quand meme (pilote sans extension parallele). */
const ATTENTE_MAX_FRAMES = 240;
const cameraPlate = new OrthographicCamera();

function programmeDe(gl: WebGLRenderer, mat: Material | null | undefined): Programme | null {
  if (!mat) return null;
  return (gl.properties.get(mat) as { currentProgram?: Programme }).currentProgram ?? null;
}

/** Les materiaux deja crees avec le ciel prennent la carte. Ceux qui ont
 *  deja un programme doivent le refaire (la disposition de la carte change
 *  la variante) ; les autres n'ont encore rien compile. */
function poserDansLaScene(gl: WebGLRenderer, scene: Object3D, sky: Texture, env: Texture): void {
  scene.traverse((o) => {
    const m = (o as Object3D & { material?: Material | Material[] }).material;
    const mats = Array.isArray(m) ? m : m ? [m] : [];
    for (const mat of mats) {
      const avecEnv = mat as Material & { envMap?: Texture | null };
      if (avecEnv.envMap !== sky) continue;
      avecEnv.envMap = env;
      if (programmeDe(gl, mat)) mat.needsUpdate = true;
    }
  });
}

/**
 * Une etape par image. Renvoie `encore` tant qu'il faut revenir, `fini`
 * quand la carte est en place (ou qu'il n'y a rien a faire).
 */
export function warmEnvironmentStep(
  gl: WebGLRenderer,
  scene: Object3D,
  state: EnvironmentWarmState,
  journal?: (nom: string, t0: number) => void,
): "encore" | "fini" {
  if (state.phase === "fini") return "fini";
  const sky = getMictlanSkySource();
  if (!sky) {
    state.phase = "fini";
    return "fini";
  }

  // 0. La carte cuite : deja la, ou en route.
  if (state.phase === "a-faire" || state.phase === "chargement") {
    const pret = getMictlanEnvironment();
    if (pret) {
      const t0 = performance.now();
      poserDansLaScene(gl, scene, sky, pret);
      state.phase = "fini";
      journal?.("environnement : carte cuite posee", t0);
      return "fini";
    }
    const chargement = ensureMictlanEnvironment();
    if (chargement === "en-cours" && state.frames < CHARGEMENT_MAX_FRAMES) {
      state.phase = "chargement";
      state.frames += 1;
      return "encore";
    }
    // Pas de fichier (ou trop lent) : on fabrique, en trois temps.
    const t0 = performance.now();
    const pmrem = new PMREMGenerator(gl) as PmremPrive;
    state.pmrem = pmrem;
    pmrem.compileEquirectangularShader();
    const programmes: Programme[] = [];
    const eq = programmeDe(gl, pmrem._equirectMaterial);
    if (eq) programmes.push(eq);
    if (typeof pmrem._setSize === "function" && typeof pmrem._allocateTargets === "function") {
      pmrem._setSize(sky.image.width / 4);
      state.cible = pmrem._allocateTargets();
      for (const mat of [pmrem._blurMaterial, pmrem._ggxMaterial]) {
        if (!mat) continue;
        gl.compile(new Mesh(new BufferGeometry(), mat), cameraPlate);
        const p = programmeDe(gl, mat);
        if (p) programmes.push(p);
      }
    }
    state.programmes = programmes;
    state.frames = 0;
    state.phase = "en-vol";
    journal?.(`environnement : ${programmes.length} programmes lances (secours)`, t0);
    return "encore";
  }

  // en-vol
  state.frames += 1;
  const pret = state.programmes.every((p) => !p.isReady || p.isReady());
  if (!pret && state.frames <= ATTENTE_MAX_FRAMES) return "encore";

  const t0 = performance.now();
  const pmrem = state.pmrem!;
  const cible = pmrem.fromEquirectangular(sky, state.cible);
  pmrem.dispose();
  const env: Texture = cible.texture;
  setMictlanEnvironment(env);
  poserDansLaScene(gl, scene, sky, env);
  state.phase = "fini";
  state.pmrem = null;
  state.cible = null;
  journal?.("environnement : carte generee (secours)", t0);
  return "fini";
}

/**
 * LA CUISSON (dev seulement, `.scratch/bake-pmrem.mjs`). Genere la carte
 * dans une cible flottante, la lit, l'encode en sRGB 8 bits et la rend en
 * PNG (data URL) avec ses dimensions. La ligne 0 du PNG est la ligne 0 de
 * la texture (v = 0) : a charger avec `flipY = false`.
 */
export function installEnvironmentBake(gl: WebGLRenderer): void {
  if (process.env.NODE_ENV === "production") return;
  (window as unknown as { __nahualBakeEnv?: (cubeSize?: number) => { width: number; height: number; png: string } | null }).__nahualBakeEnv = (
    cubeSize = 32,
  ) => {
    const source = getMictlanSkySource();
    if (!source) return null;
    // Le ciel redessine a la taille voulue (cubeSize x 4 de large).
    const canvas = document.createElement("canvas");
    canvas.width = cubeSize * 4;
    canvas.height = cubeSize * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(source.image as HTMLCanvasElement, 0, 0, canvas.width, canvas.height);
    const sky = source.clone();
    sky.image = canvas;
    sky.needsUpdate = true;

    const lodMax = Math.floor(Math.log2(cubeSize));
    const size = Math.pow(2, lodMax);
    const width = 3 * Math.max(size, 16 * 7);
    const height = 4 * size;
    const cible = new WebGLRenderTarget(width, height, {
      magFilter: LinearFilter,
      minFilter: LinearFilter,
      generateMipmaps: false,
      type: FloatType,
      format: RGBAFormat,
      colorSpace: LinearSRGBColorSpace,
      depthBuffer: false,
    });
    const pmrem = new PMREMGenerator(gl) as PmremPrive;
    // Avec une cible fournie, le generateur n'alloue pas ses maillages
    // internes : on les lui fait allouer d'abord (dev seulement).
    pmrem._setSize?.(cubeSize);
    pmrem._allocateTargets?.();
    pmrem.fromEquirectangular(sky, cible);
    pmrem.dispose();
    const pixels = new Float32Array(width * height * 4);
    gl.readRenderTargetPixels(cible, 0, 0, width, height, pixels);
    cible.dispose();
    sky.dispose();

    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const octx = out.getContext("2d")!;
    const img = octx.createImageData(width, height);
    const enc = (v: number) => {
      const c = Math.min(1, Math.max(0, v));
      const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
      return Math.round(s * 255);
    };
    for (let i = 0; i < width * height; i++) {
      img.data[i * 4] = enc(pixels[i * 4]);
      img.data[i * 4 + 1] = enc(pixels[i * 4 + 1]);
      img.data[i * 4 + 2] = enc(pixels[i * 4 + 2]);
      img.data[i * 4 + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    return { width, height, png: out.toDataURL("image/png") };
  };
}
