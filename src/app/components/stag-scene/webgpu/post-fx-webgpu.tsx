/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d uniformes a 60 fps (meme precedent que post-fx.tsx). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RenderPipeline, type WebGPURenderer, type Node } from "three/webgpu";
import { NoToneMapping, Vector4, type PerspectiveCamera } from "three";
import { Fn, pass, uniform, vec2, vec3, vec4, float, mix, smoothstep, dot, length, screenUV, clamp, convertToTexture } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { chromaticAberration } from "three/addons/tsl/display/ChromaticAberrationNode.js";
import { dof } from "three/addons/tsl/display/DepthOfFieldNode.js";
import { approachGrade, getGradeRig, type GradeRig } from "@/lib/direction-grade";
import { useCardinalTransition } from "../cardinal-transition-context";
import { useAtmosphereHour } from "../use-atmosphere-hour";
import { useSceneRefs } from "../scene-refs-context";
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

const BLOOM_BASE = 0.6;
const BLOOM_BURST_ADD = 0.8;
const CA_BASE = 0.0006;
const CA_BURST_ADD = 0.0012;
const HEAT_AMPLITUDE = 0.012;
/** Bokeh au pic du burst cardinal (0 au repos : passe quasi neutre). */
const DOF_BURST_BOKEH = 3.0;
/** Mise au point sur le cerf : pmndrs (0.03, 0.06) en profondeur normalisee
 * sur far = 100, soit ~3 et ~6 unites en distance de vue. */
const DOF_FOCUS = 3;
const DOF_FOCAL = 6;

export default function PostFxWebgpu() {
  const { gl, scene, camera, size } = useThree();
  const transition = useCardinalTransition();
  const refs = useSceneRefs();
  const hour = useAtmosphereHour();
  const gradeRef = useRef<GradeRig>({ ...getGradeRig(hour) });
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
      const grey = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb.assign(mix(vec3(grey), c.rgb, float(1).add(uSaturation)));
      const d = length(screenUV.sub(0.5));
      const v = clamp(float(1).sub(smoothstep(0.25, 0.95, d).mul(uVignette)), 0, 1);
      c.rgb.mulAssign(v);
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
    const gradeTarget = getGradeRig(hour);
    gradeRef.current = refs?.reducedMotionRef.current ? { ...gradeTarget } : approachGrade(gradeRef.current, gradeTarget, 0.06);
    const grade = gradeRef.current;
    rig.uSaturation.value = grade.saturation;
    const p = refs?.progressRef.current ?? 0;
    rig.uVignette.value = 0.9 - p * 0.25 + grade.vignetteAdd;

    const tp = transition?.transitionProgressRef.current ?? 0;
    const active = !!transition && transition.transitionDirection !== null && tp > 0;
    const bell = active ? Math.sin(tp * Math.PI) : 0;
    const audioLevel = (window as unknown as { __nahualAudioLevel?: { current: number } }).__nahualAudioLevel?.current ?? 0;
    const pinLevel = refs?.pinProgressRef.current ?? 0;
    rig.bloomPass.strength.value = (BLOOM_BASE + bell * BLOOM_BURST_ADD + audioLevel * 0.6 + pinLevel * 1.5) * grade.bloomScale;
    rig.uCa.value = CA_BASE + bell * CA_BURST_ADD;
    rig.uBokeh.value = bell * DOF_BURST_BOKEH;
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
