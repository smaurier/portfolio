import { CanvasTexture, EquirectangularReflectionMapping, SRGBColorSpace } from "three";

/**
 * Ciel du Mictlan en equirect procedurale (256x128) : violet froid au
 * zenith, horizon pourpre, sol noir. Reflete par le tezcatl et par les
 * lames d'obsidienne (envMap de materiau, pas de l'environnement de
 * scene : le reste du monde ne change pas). Singleton paresseux, cree
 * cote client seulement.
 */
let sky: CanvasTexture | null = null;

export function getMictlanSky(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (sky) return sky;
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
