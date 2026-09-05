/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d uniformes a 60 fps (meme precedent que post-fx.tsx). */
"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RenderPipeline, type WebGPURenderer, type Node } from "three/webgpu";
import { NoToneMapping, Vector4, type PerspectiveCamera } from "three";
import { Fn, pass, uniform, vec2, vec3, vec4, float, mix, smoothstep, dot, length, screenUV, clamp, select, convertToTexture } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { chromaticAberration } from "three/addons/tsl/display/ChromaticAberrationNode.js";
import { dof } from "three/addons/tsl/display/DepthOfFieldNode.js";
import { useSceneRefs } from "../scene-refs-context";
import { BLOOM_BASE, CA_BASE, usePostFxDrive } from "../post-fx-drive";
import { xiuhcoatlStore, HEAT_TRAIL_MAX } from "../xiuhcoatl-store";
import { projectHeatPoints } from "../heat-projection";
import { useOllinWave } from "../ollin-wave";
import { useNepantlaStrength } from "../nepantla-strength";
import { createOllinUniforms, nepantlaNode, ollinNode } from "./post-fx-extras-tsl";

/**
 * PostFxWebgpu (05/09, migration WebGPU) : la chaine de post-traitement
 * de post-fx.tsx reecrite avec le pipeline de rendu de three (TSL). Meme
 * ordre et memes reglages : chaleur du xiuhcoatl (deformation des UV),
 * bloom, aberration chromatique, saturation par direction, vignette qui
 * respire avec l'arc, eclair turquoise et teinte lente de la frappe. Le
 * pipeline prend la main sur la boucle de rendu (useFrame priorite 1).
 *
 * Meme ordre que la chaine pmndrs : onde d'Ollin, flou de file Nepantla,
 * chaleur, profondeur de champ du burst, bloom, aberration, grade.
 */

const HEAT_AMPLITUDE = 0.012;
/** Le bloom TSL (Unreal : cinq niveaux ponderes puis sommes) est bien plus
 * fort que le bloom mipmap de pmndrs a intensite egale : la force du
 * pilotage commun est ramenee a l'echelle de l'ancienne chaine. */
const BLOOM_TSL_SCALE = 0.125;
/** Decalage de la vignette pmndrs (offset 0.25, eskil = false). */
const VIGNETTE_OFFSET = 0.25;

/** Sonde de dev : reglages surchargeables depuis Playwright (jamais en
 * production). Un singleton de module, pas un objet du useMemo : en
 * StrictMode React joue le memo deux fois et jette le premier resultat. */
type PostFxProbe = { bloomScale: number; vignette: boolean; saturation: boolean };
const probe: PostFxProbe = { bloomScale: 1, vignette: true, saturation: true };
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") (window as unknown as { __nahualPostFx?: PostFxProbe }).__nahualPostFx = probe;
/** Mise au point sur le cerf : pmndrs (0.03, 0.06) en profondeur normalisee
 * sur far = 100, soit ~3 et ~6 unites en distance de vue. */
const DOF_FOCUS = 3;
const DOF_FOCAL = 6;

export default function PostFxWebgpu() {
  const { gl, scene, camera, size } = useThree();
  const refs = useSceneRefs();
  // Le pilotage (grade, vignette, bloom, aberration, bokeh) est partage
  // avec la chaine pmndrs : post-fx-drive.ts.
  const drive = usePostFxDrive();
  const ollinWave = useOllinWave();
  const nepantla = useNepantlaStrength();

  const rig = useMemo(() => {
    const renderer = gl as unknown as WebGPURenderer;
    // Comme la chaine pmndrs en WebGL : le rendu sort sans tone mapping
    // (ACES, le defaut r3f, assombrirait et desaturerait la scene).
    renderer.toneMapping = NoToneMapping;
    const pipeline = new RenderPipeline(renderer);
    const scenePass = pass(scene, camera);
    const color = scenePass.getTextureNode("output");
    const viewZ = scenePass.getViewZNode();

    const uBloom = uniform(BLOOM_BASE);
    const uCa = uniform(CA_BASE);
    const uSaturation = uniform(0);
    const uVignette = uniform(0.85);
    const uFlash = uniform(0);
    const uTint = uniform(0);
    const uGroundHeat = uniform(0);
    const uAspect = uniform(1.6);
    const uTime = uniform(0);
    const uOllin = createOllinUniforms();
    const uNepantla = uniform(0);
    const uBokeh = uniform(0);
    const heatPoints = Array.from({ length: HEAT_TRAIL_MAX }, () => uniform(new Vector4(0, 0, 0, 0)));

    // 0. L'onde d'Ollin (deformation + aberration au point touche), puis le
    //    flou de file du voyage cardinal (8 taps sur le rendu deja deforme).
    const shaken = convertToTexture(ollinNode(color, uOllin));
    const filed = convertToTexture(nepantlaNode(shaken, uNepantla));

    // 1. Chaleur : deformation fine des UV, au ras du sol (bande) et
    //    derriere le serpent (points).
    const heated = Fn(() => {
      const uv = screenUV.toVar();
      // screenUV est en origine haut-gauche : la bande « au ras du sol »
      // est donc en BAS de l'image, uv.y grand.
      const yUp = float(1).sub(uv.y);
      const weight = uGroundHeat.mul(smoothstep(0.62, 0.38, yUp)).mul(smoothstep(0.02, 0.22, yUp)).mul(0.55).toVar();
      for (const p of heatPoints) {
        const d = uv.sub(p.xy).mul(vec2(uAspect, 1));
        const r = p.z.max(1e-4);
        weight.addAssign(p.w.mul(dot(d, d).div(r.mul(r)).negate().exp()));
      }
      const q = uv.mul(vec2(uAspect, 1)).mul(38).add(vec2(0, uTime.mul(-2.2)));
      const q2 = uv.mul(vec2(uAspect, 1)).mul(90).add(vec2(uTime.mul(0.7), uTime.mul(-4)));
      const n = vec2(q.x.sin().mul(q.y.cos()), q.y.add(1.7).sin().mul(q.x.cos())).add(vec2(q2.x.sin().mul(q2.y.sin()), q2.y.cos().mul(q2.x.sin())).mul(0.5));
      const disp = n.mul(HEAT_AMPLITUDE).mul(weight.min(1));
      return filed.sample(uv.add(disp));
    })();

    // 2. Profondeur de champ du burst (bokeh 0 au repos), bloom, aberration.
    const focused = dof(heated, viewZ, DOF_FOCUS, DOF_FOCAL, uBokeh) as unknown as Node<"vec4">;
    const bloomPass = bloom(focused, BLOOM_BASE, 0.5, 0.35);
    const bloomed = focused.add(bloomPass);
    const ca = chromaticAberration(bloomed, uCa.mul(60), vec2(0.5, 0.5), float(1.1)) as unknown as Node<"vec4">;

    // 3. Saturation, vignette, eclair et teinte de la frappe.
    const graded = Fn(() => {
      const c = vec4(ca).toVar();
      // HueSaturation pmndrs : ecart a la moyenne des canaux, pondere par
      // -s (desaturation) ou 1 - 1/(1.001 - s) (saturation).
      const average = c.r.add(c.g).add(c.b).div(3);
      const diff = vec3(average).sub(c.rgb);
      const satGain = select(uSaturation.greaterThan(0), float(1).sub(float(1).div(float(1.001).sub(uSaturation))), uSaturation.negate());
      c.rgb.addAssign(diff.mul(satGain));
      // Vignette pmndrs (eskil = false) : smoothstep(0.8, offset * 0.799, d * (darkness + offset)).
      const d = length(screenUV.sub(0.5));
      const v = float(1).sub(smoothstep(VIGNETTE_OFFSET * 0.799, 0.8, d.mul(uVignette.add(VIGNETTE_OFFSET))));
      c.rgb.mulAssign(clamp(v, 0, 1));
      const turq = vec3(0.25, 0.95, 0.9);
      c.rgb.assign(mix(c.rgb, c.rgb.mul(0.6).add(turq.mul(0.7)), uTint));
      c.rgb.assign(mix(c.rgb, turq.mul(1.15), uFlash.mul(0.85)).add(turq.mul(uFlash).mul(0.5)));
      return c;
    })();

    pipeline.outputNode = graded;
    return { pipeline, bloomPass, uBloom, uCa, uSaturation, uVignette, uFlash, uTint, uGroundHeat, uAspect, uTime, heatPoints, uOllin, uNepantla, uBokeh };
  }, [gl, scene, camera]);

  useEffect(() => {
    return () => {
      rig.pipeline.dispose?.();
    };
  }, [rig]);

  useFrame((state) => {
    rig.uSaturation.value = probe.saturation ? drive.saturation : 0;
    rig.uVignette.value = probe.vignette ? drive.vignette : -VIGNETTE_OFFSET;
    rig.bloomPass.strength.value = drive.bloom * BLOOM_TSL_SCALE * probe.bloomScale;
    rig.uCa.value = drive.chromaticAberration;
    rig.uBokeh.value = drive.bokeh;
    rig.uOllin.progress.value = ollinWave.progress;
    rig.uOllin.amplitude.value = ollinWave.amplitude;
    rig.uOllin.center.value.copy(ollinWave.center);
    rig.uNepantla.value = nepantla.value;
    rig.uTime.value = state.clock.elapsedTime;
    rig.uAspect.value = size.width / Math.max(1, size.height);
    rig.uGroundHeat.value = xiuhcoatlStore.groundHeat;
    rig.uFlash.value = xiuhcoatlStore.strike.flash;
    rig.uTint.value = xiuhcoatlStore.strike.tint;
    projectHeatPoints(state.camera as PerspectiveCamera, performance.now(), true, (i, x, y, z, w) => {
      (rig.heatPoints[i].value as Vector4).set(x, y, z, w);
    });

    rig.pipeline.render();
  }, 1);

  return null;
}
