import { Color, Vector2 } from "three";
import { Fn, float, vec2, vec3, vec4, mix, smoothstep, dot, length, pow, saturate, max, screenCoordinate, screenSize, positionView, normalView, positionGeometry, modelScale, fwidth, floor, fract, uniform } from "three/tsl";
import type { Node } from "three/webgpu";
import type { OutputStage } from "./nahual-material";

/**
 * Les etages de sortie en TSL (05/09, migration WebGPU) : la traduction
 * noeud a noeud des trois patches GLSL transversaux. Chaque fabrique rend
 * un etage `(color vec4) => vec4` a brancher sur NahualStandardMaterial,
 * et les uniformes qui le pilotent restent les objets que les composants
 * mutent deja a 60 fps (`{ value }`), ce qui garde intacts StagModel,
 * CursorRevealScene et EnvironmentDepthFade.
 */

const LUMA = vec3(0.299, 0.587, 0.114);

/** Perspective atmospherique : desaturation vers le gris de luminance avec
 * la distance camera <-> fragment (cf depth-fade.ts). */
export function depthFadeStage(near: number, far: number): OutputStage {
  const uNear = uniform(near);
  const uFar = uniform(far);
  return (color) =>
    Fn(() => {
      const c = vec4(color).toVar();
      const t = smoothstep(uNear, uFar, length(positionView));
      const grey = dot(c.rgb, LUMA);
      c.rgb.assign(mix(c.rgb, vec3(grey), t));
      return c;
    })();
}

export type CursorRevealValues = {
  uMouse: { value: Vector2 };
  uMouse2: { value: Vector2 };
  uMirror: { value: number };
  uResolution: { value: Vector2 };
  uRevealRadius: { value: number };
  uMinOpacity: { value: number };
  uMinSaturation: { value: number };
};

/** Le revelateur curseur (cf cursor-reveal.ts) : plancher d'opacite et de
 * saturation, leve dans un halo autour de la souris (et de son reflet au
 * Nord). Les uniformes sont en pixels, origine BAS-gauche (convention
 * gl_FragCoord, que le composant continue d'ecrire) ; TSL donne les
 * coordonnees d'ecran en origine HAUT-gauche sur les deux backends, d'ou
 * le retournement de y ici, une fois pour toutes. */
export function cursorRevealStage(v: CursorRevealValues): OutputStage {
  const uMouse = uniform(v.uMouse.value);
  const uMouse2 = uniform(v.uMouse2.value);
  const uMirror = uniform(v.uMirror.value);
  const uRadius = uniform(v.uRevealRadius.value);
  const uMinOpacity = uniform(v.uMinOpacity.value);
  const uMinSaturation = uniform(v.uMinSaturation.value);
  // Les uniformes TSL sont relies aux memes objets : `uniform(vector)`
  // garde la reference, les scalaires sont relus par onUpdate.
  uMirror.onFrameUpdate(() => v.uMirror.value);
  uRadius.onFrameUpdate(() => v.uRevealRadius.value);
  uMinOpacity.onFrameUpdate(() => v.uMinOpacity.value);
  uMinSaturation.onFrameUpdate(() => v.uMinSaturation.value);
  return (color) =>
    Fn(() => {
      const c = vec4(color).toVar();
      const frag = vec2(screenCoordinate.x, screenSize.y.sub(screenCoordinate.y));
      const reveal1 = float(1).sub(smoothstep(0, uRadius, length(frag.sub(uMouse))));
      const reveal2 = float(1).sub(smoothstep(0, uRadius, length(frag.sub(uMouse2)))).mul(uMirror);
      const reveal = max(reveal1, reveal2);
      const grey = dot(c.rgb, LUMA);
      const floored = mix(vec3(grey), c.rgb, uMinSaturation);
      c.rgb.assign(mix(floored, c.rgb, reveal));
      c.a.assign(c.a.mul(mix(uMinOpacity, 1, reveal)));
      return c;
    })();
}

export type RimLightValues = {
  uRimColor: { value: Color };
  uRimIntensity: { value: number };
  uRimPower: { value: number };
  uBodyTintAmount: { value: number };
  uNorthDark: { value: number };
  uEdgeIntensity: { value: number };
  uEdgePulse: { value: number };
};

/** Le lisere du cerf (cf rim-light.ts) : teinte du corps en screen,
 * obsidienne velours au Nord (grain de poil ancre en bind pose), fresnel
 * de bord, lignes claires sur les aretes low-poly qui respirent. */
export function rimLightStage(v: RimLightValues): OutputStage {
  const uRimColorU = uniform(v.uRimColor.value);
  const uRimColor = vec3(uRimColorU.r, uRimColorU.g, uRimColorU.b);
  const uRimIntensity = uniform(v.uRimIntensity.value);
  const uRimPower = uniform(v.uRimPower.value);
  const uBodyTint = uniform(v.uBodyTintAmount.value);
  const uNorthDark = uniform(v.uNorthDark.value);
  const uEdgeIntensity = uniform(v.uEdgeIntensity.value);
  const uEdgePulse = uniform(v.uEdgePulse.value);
  uRimIntensity.onFrameUpdate(() => v.uRimIntensity.value);
  uRimPower.onFrameUpdate(() => v.uRimPower.value);
  uBodyTint.onFrameUpdate(() => v.uBodyTintAmount.value);
  uNorthDark.onFrameUpdate(() => v.uNorthDark.value);
  uEdgeIntensity.onFrameUpdate(() => v.uEdgeIntensity.value);
  uEdgePulse.onFrameUpdate(() => v.uEdgePulse.value);

  const furHash = Fn(([p]: [Node<"vec3">]) => {
    const q = fract(vec3(p).mul(0.3183099).add(vec3(0.1, 0.2, 0.3))).mul(17).toVar();
    return fract(q.x.mul(q.y).mul(q.z).mul(q.x.add(q.y).add(q.z)));
  });

  return (color) =>
    Fn(() => {
      const c = vec4(color).toVar();
      // Teinte du corps en screen (garde les hautes lumieres).
      const bodyTinted = vec3(1).sub(vec3(1).sub(c.rgb).mul(vec3(1).sub(uRimColor)));
      c.rgb.assign(mix(c.rgb, bodyTinted, uBodyTint.mul(0.06)));
      const viewDir = positionView.negate().normalize();
      const n = normalView.normalize();
      const facing = saturate(dot(n, viewDir));
      const rimFresnel = pow(float(1).sub(facing), uRimPower);
      // Obsidienne velours du Nord : grain de poil en bind pose.
      const furPos = positionGeometry.mul(modelScale.x);
      const grain = float(0.7).add(furHash(floor(furPos.mul(260))).mul(0.3));
      const grain2 = float(0.85).add(furHash(floor(furPos.mul(60).add(3))).mul(0.15));
      const velvet = pow(float(1).sub(facing), 1.6);
      const darkBody = c.rgb.mul(0.16).add(uRimColor.mul(velvet).mul(0.6).mul(grain).mul(grain2)).add(vec3(0.014, 0.01, 0.024));
      c.rgb.assign(mix(c.rgb, darkBody, uNorthDark));
      c.rgb.addAssign(uRimColor.mul(rimFresnel).mul(uRimIntensity));
      // Lignes claires sur les aretes (discontinuite de normale).
      const edgeThreshold = mix(6, 16, uEdgePulse);
      const edge = saturate(length(fwidth(normalView)).mul(edgeThreshold));
      const flash = saturate(uEdgePulse.sub(0.85).div(0.15));
      const edgeColor = mix(uRimColor, vec3(1), flash.mul(0.7));
      c.rgb.addAssign(edgeColor.mul(edge).mul(uEdgeIntensity).mul(uEdgePulse));
      return c;
    })();
}
