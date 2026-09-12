import { CanvasTexture, CubeUVReflectionMapping, EquirectangularReflectionMapping, LinearFilter, SRGBColorSpace, TextureLoader, type Texture } from "three";

/**
 * Ciel du Mictlan en equirect procedurale (256x128) : violet froid au
 * zenith, horizon pourpre, sol noir. Reflete par le tezcatl et par les
 * lames d'obsidienne (envMap de materiau, pas de l'environnement de
 * scene : le reste du monde ne change pas). Singleton paresseux, cree
 * cote client seulement.
 */
let sky: CanvasTexture | null = null;
/** La carte PMREM fabriquee a partir du ciel par la chauffe (12/09,
 *  environment-warm) : une fois la, c'est elle que recoivent les
 *  materiaux, et three n'a plus rien a fabriquer au premier rendu. */
let environment: Texture | null = null;

export function setMictlanEnvironment(tex: Texture | null): void {
  environment = tex;
}

export function getMictlanEnvironment(): Texture | null {
  return environment;
}

/** Ou vit la carte cuite (voir environment-warm, `installEnvironmentBake`). */
export const MICTLAN_ENVIRONMENT_URL = "/env/mictlan-pmrem.png";
let chargement: "jamais" | "en-cours" | "fini" | "echec" = "jamais";

/** Lance (une fois) le chargement de la carte cuite. Idempotent ; appele
 *  des la premiere demande du ciel, donc bien avant la chauffe. */
export function ensureMictlanEnvironment(): "en-cours" | "fini" | "echec" {
  if (chargement !== "jamais") return chargement;
  if (typeof window === "undefined") return "echec";
  chargement = "en-cours";
  new TextureLoader().load(
    MICTLAN_ENVIRONMENT_URL,
    (tex) => {
      // La disposition CubeUV de three, telle que PMREMGenerator la
      // produit : pas de retournement, pas de mipmaps, filtrage lineaire,
      // sRGB decode par le GPU (les valeurs cuites sont en sRGB 8 bits).
      tex.mapping = CubeUVReflectionMapping;
      tex.flipY = false;
      tex.generateMipmaps = false;
      tex.minFilter = LinearFilter;
      tex.magFilter = LinearFilter;
      tex.colorSpace = SRGBColorSpace;
      tex.needsUpdate = true;
      if (!environment) environment = tex;
      chargement = "fini";
    },
    undefined,
    () => {
      chargement = "echec";
    },
  );
  return chargement;
}

/** Ce que les materiaux posent en envMap : la carte preparee si elle
 *  existe, sinon le ciel equirectangulaire (three fabriquera la carte
 *  lui-meme, en bloquant). */
export function getMictlanSky(): Texture | null {
  return environment ?? getMictlanSkySource();
}

/** Le ciel lui-meme, pour qui fabrique la carte. */
export function getMictlanSkySource(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (sky) return sky;
  ensureMictlanEnvironment();
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#6a55b8");
  grad.addColorStop(0.42, "#2a1d4a");
  grad.addColorStop(0.5, "#4a2f6e");
  grad.addColorStop(0.56, "#120b1e");
  grad.addColorStop(1, "#030207");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);
  sky = new CanvasTexture(canvas);
  sky.mapping = EquirectangularReflectionMapping;
  sky.colorSpace = SRGBColorSpace;
  return sky;
}
