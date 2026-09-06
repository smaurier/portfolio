/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'objets three, d'os, d'uniforms et de buffers a 60 fps (meme precedent que xolotl-companion). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import {
  AdditiveBlending,
  Bone,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  Points,
  Quaternion,
  ShaderMaterial,
  SkinnedMesh,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Object3D,
} from "three";
import { clone as cloneSkinnedScene } from "three/examples/jsm/utils/SkeletonUtils.js";
import { bearerHair, bearerOpacity, bearerPose, CIHUATETEO, descentBlend, litterPose, wispRate, type HairStrand } from "@/lib/cihuateteo";
import { createStrip, stepStrip, type Strip } from "@/lib/paper-strip";
import { remapWestArc } from "@/lib/ouest-arc";
import { dayAtArc } from "@/lib/arc-day";
import { sunDirection } from "@/lib/direction-light";
import { createChalkMaterial, createCihuateotlMaterial, createCihuateotlUniforms, type CihuateotlUniforms } from "./cihuateotl-material";
import { createRibbonGeometry, updateRibbon } from "./ribbon-geometry";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * Les Cihuateteo (06/09, Ouest / Cihuatlampa ; sources et garde-fous dans
 * docs/da/ouest-sources.md). Quatre femmes fantomatiques qui portent le
 * soleil vers l'ouest « dans une litiere de plumes de quetzal » (Codex de
 * Florence, livre VI), puis, quand il est entre dans la terre, se posent en
 * arc au carrefour, face au cerf, comme les sculptures : sur les talons,
 * bras leves aux cotes de la poitrine, mains en griffes. Visage peint a la
 * chaux (Primeros Memoriales), sans trait, un bandeau sur les yeux (Codex
 * Borgia). Cheveux defaits qui ondulent au vent, chacune a sa maniere.
 * Au carrefour, les papiers (amatetehuitl) des autels flottent a leurs
 * pieds ; ce qui s'echappe d'elles, ce sont des papillons (livre III : les
 * ames des femmes mortes en couches).
 *
 * Modele : « Animated Woman » de Quaternius (Ultimate Modular Women Pack,
 * CC0). Pose PROCEDURALE sur les os (pas d'animation figee : Sylvain « super
 * rigides »), corps en brume (cihuateotl-material), meches, plumes et
 * papiers sur des chaines Verlet (lib/paper-strip + ribbon-geometry).
 */

const MODEL_PATH = "/models/cihuateotl.glb";
const SMOKE_SPRITE = "/img/particles/smoke_07.png";
/** Hauteur d'une porteuse (u) : un peu plus haute que le garrot du cerf. */
const BEARER_HEIGHT = 1.9;
const BUTTERFLIES_PER_BEARER = 30;
const BUTTERFLY_POOL = CIHUATETEO.count * BUTTERFLIES_PER_BEARER;
const BUTTERFLY_COLOR = new Color("#e3c6f2");
const HAIR_POINTS = 9;
const HAIR_COLOR = new Color("#1e1426");
/** Le bandeau : corail, la couleur de l'Ouest du Codex. */
const BLINDFOLD_COLOR = "#d76464";
const FEATHERS = 14;
const FEATHER_POINTS = 8;
const FEATHER_LENGTH = 1.1;
const QUETZAL = new Color("#16a06b");
const QUETZAL_TIP = new Color("#8ee0b8");
const PAPERS_PER_BEARER = 3;
const PAPER_POINTS = 6;
const SMOKES_PER_BEARER = 3;
/** Vent de l'ouest (+x = l'ouest du decor) ressenti par les meches et les plumes. */
const WIND_BASE = { x: 1.1, y: 0.35, z: -0.2 };
/** Les poses (radians sur les os, ajoutes au repos) : bras ecartes « comme
 * si elles dansaient » tant qu'elles portent, leves aux cotes de la
 * poitrine et griffes au carrefour ; genoux plies sur les talons. */
const POSE = {
  escort: { upperArm: 1.0, lowerArm: -0.6, upperLeg: 0.25, lowerLeg: -0.5, fingers: 0.2 },
  crossroads: { upperArm: 1.6, lowerArm: -1.5, upperLeg: 1.5, lowerLeg: -2.5, fingers: 1.1 },
};

useGLTF.preload(MODEL_PATH);
useTexture.preload(SMOKE_SPRITE);

type BoneSet = { bone: Bone; rest: Quaternion; axis: Vector3 };
type Bearer = {
  root: Group;
  uniforms: CihuateotlUniforms;
  bones: Record<string, BoneSet | null>;
  hair: { strand: HairStrand; strip: Strip; geometry: BufferGeometry }[];
  papers: { strip: Strip; geometry: BufferGeometry; peg: { x: number; z: number }; phase: number }[];
  smokes: Sprite[];
  blindfold: Mesh;
  headBone: Object3D | null;
};
type Butterfly = { alive: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number; life: number };

function hash(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233 + 5.1) * 43758.5453;
  return v - Math.floor(v);
}

const BONE_NAMES = ["UpperArm.L", "UpperArm.R", "LowerArm.L", "LowerArm.R", "UpperLeg.L", "UpperLeg.R", "LowerLeg.L", "LowerLeg.R", "Abdomen", "Chest"] as const;
const FINGER_ROOTS = ["Index1", "Middle1", "Ring1", "Pinky1"];
const SIDES = ["L", "R"] as const;
const tmpQuat = new Quaternion();

/** Une rotation autour de l'axe X local de l'os, ajoutee a son repos. */
function poseBone(set: BoneSet | null, angle: number): void {
  if (!set) return;
  set.bone.quaternion.copy(set.rest).multiply(tmpQuat.setFromAxisAngle(set.axis, angle));
}

function collectBones(root: Object3D): Record<string, BoneSet | null> {
  const out: Record<string, BoneSet | null> = {};
  const names: string[] = [...BONE_NAMES];
  for (const side of SIDES) for (const f of FINGER_ROOTS) names.push(`${f}.${side}`);
  for (const name of names) {
    const bone = root.getObjectByName(name) as Bone | undefined;
    out[name] = bone ? { bone, rest: bone.quaternion.clone(), axis: new Vector3(1, 0, 0) } : null;
  }
  return out;
}

/** Habille un clone : brume sur le corps, chaux sur la peau du visage, le
 * reste de la tete (cheveux modelises, yeux) cache ; echelle normalisee a
 * BEARER_HEIGHT, pieds a y = 0. */
function dressBearer(root: Object3D, uniforms: CihuateotlUniforms): void {
  const body = createCihuateotlMaterial(uniforms);
  const chalk = createChalkMaterial(uniforms);
  const box = new Box3();
  root.updateMatrixWorld(true);
  root.traverse((child) => {
    const mesh = child as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const isHead = (mesh.parent?.name ?? "").includes("Head") || mesh.name.includes("Head");
    const matName = (mesh.material as { name?: string }).name ?? "";
    if (isHead) {
      if (matName === "Skin") mesh.material = chalk;
      else mesh.visible = false; // cheveux modelises, yeux : remplaces par les meches et le bandeau
    } else {
      mesh.material = body;
    }
    mesh.frustumCulled = false;
    mesh.renderOrder = 996;
    mesh.raycast = () => null;
    mesh.computeBoundingBox();
    if (mesh.boundingBox) box.union(mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
  });
  const size = box.getSize(new Vector3());
  const scale = size.y > 0 ? BEARER_HEIGHT / size.y : 1;
  root.scale.setScalar(scale);
  root.position.y = -box.min.y * scale;
  uniforms.uHeight.value = BEARER_HEIGHT;
}

function glowTexture(): CanvasTexture {
  const size = 32;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.6, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(c);
}

export default function Cihuateteo() {
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const { scene } = useGLTF(MODEL_PATH);
  const smokeTexture = useTexture(SMOKE_SPRITE);
  const groupRef = useRef<Group>(null);
  const blendRef = useRef(direction === "cendre" ? 1 : 0);
  const scratch = useMemo(() => new Vector3(), []);

  const hairMaterial = useMemo(() => new MeshBasicMaterial({ color: HAIR_COLOR, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, fog: false, blending: NormalBlending }), []);
  const paperMaterial = useMemo(() => new MeshBasicMaterial({ color: new Color("#efe6d6"), transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, fog: true, blending: NormalBlending }), []);
  const featherMaterial = useMemo(() => new MeshBasicMaterial({ color: QUETZAL, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, fog: false, blending: NormalBlending }), []);
  const featherTipMaterial = useMemo(() => new MeshBasicMaterial({ color: QUETZAL_TIP, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, fog: false, blending: AdditiveBlending }), []);
  const blindfoldMaterial = useMemo(() => new MeshBasicMaterial({ color: new Color(BLINDFOLD_COLOR), transparent: true, opacity: 0, depthWrite: false, fog: false, side: DoubleSide }), []);
  const smokeMaterial = useMemo(() => new SpriteMaterial({ map: smokeTexture, color: new Color("#2b1c33"), transparent: true, opacity: 0, depthWrite: false, blending: NormalBlending, fog: false }), [smokeTexture]);
  const glowMaterial = useMemo(() => new SpriteMaterial({ map: glowTexture(), color: new Color("#ffd2a0"), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }), []);

  const bearers = useMemo<Bearer[]>(() => {
    return Array.from({ length: CIHUATETEO.count }, (_, i) => {
      const inner = cloneSkinnedScene(scene) as Group;
      const uniforms = createCihuateotlUniforms(i * 1.9);
      dressBearer(inner, uniforms);
      const root = new Group();
      root.add(inner);
      const hair = bearerHair(i).map((strand) => ({ strand, strip: createStrip(HAIR_POINTS, strand.length, { x: 0, y: BEARER_HEIGHT, z: 0 }), geometry: createRibbonGeometry(HAIR_POINTS) }));
      const papers = Array.from({ length: PAPERS_PER_BEARER }, (_, k) => ({
        strip: createStrip(PAPER_POINTS, 0.35 + 0.2 * hash(i * 7 + k, 1), { x: 0, y: 0.1, z: 0 }),
        geometry: createRibbonGeometry(PAPER_POINTS),
        peg: { x: (hash(i * 7 + k, 2) - 0.5) * 1.6, z: 0.4 + hash(i * 7 + k, 3) * 0.6 },
        phase: hash(i * 7 + k, 4) * 6.28,
      }));
      const smokes = Array.from({ length: SMOKES_PER_BEARER }, () => {
        const s = new Sprite(smokeMaterial.clone());
        s.raycast = () => null;
        s.renderOrder = 995;
        return s;
      });
      const blindfold = new Mesh(new CylinderGeometry(0.165, 0.165, 0.1, 24, 1, true), blindfoldMaterial);
      blindfold.raycast = () => null;
      blindfold.renderOrder = 997;
      return { root, uniforms, bones: collectBones(inner), hair, papers, smokes, blindfold, headBone: inner.getObjectByName("Head") ?? null };
    });
  }, [scene, smokeMaterial, blindfoldMaterial]);

  // La litiere : deux brancards et des plumes de quetzal en rubans.
  const litter = useMemo(() => {
    const group = new Group();
    const poleGeometry = new CylinderGeometry(0.04, 0.04, 2.6, 8);
    const poleMaterial = new MeshBasicMaterial({ color: new Color("#6b4a35"), transparent: true, opacity: 0, fog: false });
    for (const z of [-0.45, 0.45]) {
      const pole = new Mesh(poleGeometry, poleMaterial);
      pole.rotation.z = Math.PI / 2;
      pole.position.z = z;
      pole.raycast = () => null;
      group.add(pole);
    }
    const feathers = Array.from({ length: FEATHERS }, (_, k) => ({
      strip: createStrip(FEATHER_POINTS, FEATHER_LENGTH * (0.7 + 0.5 * hash(k, 9)), { x: 0, y: 0, z: 0 }),
      geometry: createRibbonGeometry(FEATHER_POINTS),
      anchor: { x: -1.2 + (k % 7) * 0.4, z: k < 7 ? -0.45 : 0.45 },
      phase: hash(k, 8) * 6.28,
    }));
    const glow = new Sprite(glowMaterial);
    glow.scale.setScalar(2.4);
    glow.raycast = () => null;
    group.add(glow);
    return { group, feathers, poleMaterial, glow };
  }, [glowMaterial]);

  // Les papillons : un seul nuage pour les quatre.
  const butterflies = useMemo<Butterfly[]>(() => Array.from({ length: BUTTERFLY_POOL }, () => ({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1 })), []);
  const butterflyGeometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(BUTTERFLY_POOL * 3), 3));
    g.setAttribute("aAlpha", new BufferAttribute(new Float32Array(BUTTERFLY_POOL), 1));
    g.setAttribute("aPhase", new BufferAttribute(new Float32Array(BUTTERFLY_POOL).map((_, i) => hash(i, 11) * 6.28), 1));
    g.boundingSphere = null;
    return g;
  }, []);
  const butterflyUniforms = useMemo(() => ({ uScale: { value: 300 }, uTime: { value: 0 }, uColor: { value: BUTTERFLY_COLOR } }), []);
  const butterflyMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: butterflyUniforms,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        vertexShader: /* glsl */ `
          attribute float aAlpha;
          attribute float aPhase;
          uniform float uScale;
          varying float vAlpha;
          varying float vPhase;
          void main() {
            vAlpha = aAlpha;
            vPhase = aPhase;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 0.11 * uScale / max(1.0, -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uTime;
          varying float vAlpha;
          varying float vPhase;
          void main() {
            if (vAlpha < 0.004) discard;
            vec2 uv = gl_PointCoord - 0.5;
            // Deux ailes qui battent : leur largeur suit un sinus rapide.
            float flap = 0.35 + 0.65 * abs(sin(uTime * 11.0 + vPhase));
            float x = abs(uv.x) / flap;
            float wing = 1.0 - smoothstep(0.18, 0.42, length(vec2(x - 0.18, uv.y * 1.6)));
            float body = 1.0 - smoothstep(0.02, 0.07, abs(uv.x));
            float a = max(wing, body * (1.0 - smoothstep(0.2, 0.35, abs(uv.y)))) * vAlpha;
            if (a < 0.01) discard;
            gl_FragColor = vec4(uColor * a, a);
          }
        `,
      }),
    [butterflyUniforms]
  );
  const butterflyPoints = useMemo(() => {
    const p = new Points(butterflyGeometry, butterflyMaterial);
    p.frustumCulled = false;
    p.renderOrder = 998;
    p.raycast = () => null;
    return p;
  }, [butterflyGeometry, butterflyMaterial]);
  const spawnAcc = useRef(0);
  const seedRef = useRef(0);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    const added: Object3D[] = [];
    const add = (o: Object3D) => {
      g.add(o);
      added.push(o);
    };
    for (const b of bearers) {
      add(b.root);
      add(b.blindfold);
      for (const h of b.hair) {
        const m = new Mesh(h.geometry, hairMaterial);
        m.frustumCulled = false;
        m.raycast = () => null;
        m.renderOrder = 997;
        add(m);
      }
      for (const p of b.papers) {
        const m = new Mesh(p.geometry, paperMaterial);
        m.frustumCulled = false;
        m.raycast = () => null;
        add(m);
      }
      for (const s of b.smokes) add(s);
    }
    add(litter.group);
    litter.feathers.forEach((f, k) => {
      const m = new Mesh(f.geometry, k % 3 === 0 ? featherTipMaterial : featherMaterial);
      m.frustumCulled = false;
      m.raycast = () => null;
      m.renderOrder = 996;
      add(m);
    });
    add(butterflyPoints);
    return () => {
      for (const o of added) g.remove(o);
    };
  }, [bearers, litter, butterflyPoints, hairMaterial, paperMaterial, featherMaterial, featherTipMaterial]);
  useEffect(
    () => () => {
      butterflyGeometry.dispose();
      butterflyMaterial.dispose();
      for (const b of bearers) {
        for (const h of b.hair) h.geometry.dispose();
        for (const p of b.papers) p.geometry.dispose();
      }
      for (const f of litter.feathers) f.geometry.dispose();
    },
    [butterflyGeometry, butterflyMaterial, bearers, litter]
  );

  useFrame((state, delta) => {
    const west = direction === "cendre";
    blendRef.current += ((west ? 1 : 0) - blendRef.current) * 0.05;
    const blend = blendRef.current;
    const g = groupRef.current;
    if (!g) return;
    g.visible = blend > 0.01;
    if (!g.visible) return;
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const progress = sceneRefs?.progressRef.current ?? 0;
    const { dusk } = remapWestArc(progress);
    const sun = sunDirection(dayAtArc("cendre", progress), true);
    const time = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 30);
    const settle = descentBlend(dusk);
    const opacity = bearerOpacity(dusk) * blend;
    const gust = 1 + 0.45 * Math.sin(time * 0.7) + 0.25 * Math.sin(time * 1.9 + 1.3);

    bearers.forEach((b, i) => {
      const pose = bearerPose(i, CIHUATETEO.count, dusk, sun, reduced ? 0 : time);
      // Un pas de cote qui va et vient : la danse deplace aussi le corps.
      const step = reduced ? 0 : Math.sin(time * 0.5 + i * 1.9) * 0.35 * (1 - 0.5 * settle);
      b.root.position.set(pose.x + Math.cos(pose.yaw) * step, pose.y, pose.z - Math.sin(pose.yaw) * step);
      b.uniforms.uOpacity.value = opacity;
      b.uniforms.uTime.value = time;
      b.uniforms.uBaseY.value = pose.y;
      b.uniforms.uErode.value = 0.4 + 0.25 * settle;

      // La pose : une danse lente tant qu'elles portent (bras ecartes, un
      // genou en avant qui alterne), puis, posees, sur les talons, bras
      // leves aux cotes de la poitrine, mains en griffes.
      // Presque une danse (Sylvain) : chaque bras a son balancement, les
      // genoux alternent, le buste ondule et le corps tourne un peu sur
      // lui-meme ; au carrefour la danse ralentit sans s'eteindre.
      const tempo = reduced ? 0 : 1 - 0.55 * settle;
      const sway = Math.sin(time * 0.8 + i * 1.3) * tempo;
      const sway2 = Math.sin(time * 0.55 + i * 2.1) * tempo;
      const beatL = Math.sin(time * 1.1 + i * 0.9) * tempo;
      const beatR = Math.sin(time * 1.1 + i * 0.9 + Math.PI * 0.8) * tempo;
      const lerpPose = (a: number, k: number) => a + (k - a) * settle;
      poseBone(b.bones["UpperArm.L"], lerpPose(POSE.escort.upperArm + 0.55 * beatL, POSE.crossroads.upperArm + 0.15 * beatL));
      poseBone(b.bones["UpperArm.R"], lerpPose(POSE.escort.upperArm + 0.55 * beatR, POSE.crossroads.upperArm + 0.15 * beatR));
      poseBone(b.bones["LowerArm.L"], lerpPose(POSE.escort.lowerArm + 0.35 * sway2, POSE.crossroads.lowerArm + 0.1 * sway2));
      poseBone(b.bones["LowerArm.R"], lerpPose(POSE.escort.lowerArm - 0.35 * sway2, POSE.crossroads.lowerArm - 0.1 * sway2));
      poseBone(b.bones["UpperLeg.L"], lerpPose(POSE.escort.upperLeg * (0.6 + 0.8 * beatL), POSE.crossroads.upperLeg + 0.1 * beatL));
      poseBone(b.bones["UpperLeg.R"], lerpPose(POSE.escort.upperLeg * (0.6 + 0.8 * beatR), POSE.crossroads.upperLeg + 0.1 * beatR));
      poseBone(b.bones["LowerLeg.L"], lerpPose(POSE.escort.lowerLeg * (0.6 + 0.8 * beatL), POSE.crossroads.lowerLeg));
      poseBone(b.bones["LowerLeg.R"], lerpPose(POSE.escort.lowerLeg * (0.6 + 0.8 * beatR), POSE.crossroads.lowerLeg));
      poseBone(b.bones["Abdomen"], 0.16 * sway2);
      poseBone(b.bones["Chest"], 0.12 * sway);
      b.root.rotation.y = pose.yaw + 0.3 * sway2;
      const fingers = lerpPose(POSE.escort.fingers, POSE.crossroads.fingers);
      for (const side of SIDES) for (const f of FINGER_ROOTS) poseBone(b.bones[`${f}.${side}`], fingers);
      b.root.updateMatrixWorld(true);

      // La tete : le bandeau autour des yeux, les meches depuis le sommet.
      const head = b.headBone;
      if (head) head.getWorldPosition(scratch);
      else scratch.set(pose.x, pose.y + BEARER_HEIGHT * 0.9, pose.z);
      b.blindfold.position.set(scratch.x, scratch.y + 0.07, scratch.z);
      b.blindfold.rotation.y = pose.yaw;
      const hx = scratch.x, hy = scratch.y + 0.1, hz = scratch.z;
      const hairWind = reduced ? { x: 0, y: 0, z: 0 } : { x: WIND_BASE.x * gust * 0.6, y: 0.1 * gust, z: WIND_BASE.z * gust * 0.6 };
      for (const h of b.hair) {
        const s = h.strand;
        // Chaque meche a son propre souffle (phase, vitesse, reponse) : jamais
        // deux chevelures pareilles.
        const wind = reduced
          ? hairWind
          : {
              x: hairWind.x + Math.sin(time * s.speed * 1.7 + s.phase) * 0.5,
              y: hairWind.y + Math.sin(time * s.speed * 2.3 + s.phase * 2) * 0.35,
              z: hairWind.z + Math.cos(time * s.speed * 1.3 + s.phase) * 0.5,
            };
        const anchor = { x: hx + Math.sin(pose.yaw + Math.PI / 2) * s.side * 0.12, y: hy - 0.05 * Math.abs(s.side), z: hz + Math.cos(pose.yaw + Math.PI / 2) * s.side * 0.12 };
        stepStrip(h.strip, dt, anchor, wind, { gravity: 1.6, damping: s.damping, windResponse: s.windResponse, iterations: 5 });
        updateRibbon(h.geometry, h.strip, (u) => 0.035 * (1 - u * 0.6));
      }
      // Les papiers du carrefour : plantes au sol devant elle, ils claquent.
      for (const p of b.papers) {
        const px = pose.x + Math.sin(pose.yaw + Math.PI / 2) * p.peg.x + Math.sin(pose.yaw) * p.peg.z;
        const pz = pose.z + Math.cos(pose.yaw + Math.PI / 2) * p.peg.x + Math.cos(pose.yaw) * p.peg.z;
        const wind = reduced ? { x: 0, y: 0, z: 0 } : { x: WIND_BASE.x * gust * 1.4 + Math.sin(time * 2.1 + p.phase) * 0.8, y: 1.6 + Math.sin(time * 3.3 + p.phase) * 0.8, z: WIND_BASE.z + Math.cos(time * 1.6 + p.phase) * 0.6 };
        stepStrip(p.strip, dt, { x: px, y: 0.12, z: pz }, wind, { gravity: 2.5, damping: 0.975, windResponse: 1.6, iterations: 5 });
        updateRibbon(p.geometry, p.strip, 0.09);
      }
      // La brume autour d'elle : trois volutes lentes.
      b.smokes.forEach((s, k) => {
        const a = time * 0.18 + k * 2.1 + i;
        s.position.set(pose.x + Math.cos(a) * 0.45, pose.y + 0.5 + k * 0.45 + Math.sin(time * 0.3 + k) * 0.12, pose.z + Math.sin(a) * 0.45);
        s.scale.setScalar(1.3 + 0.4 * k);
        s.material.rotation = time * 0.12 + k;
        s.material.opacity = 0.4 * opacity;
      });
    });
    blindfoldMaterial.opacity = Math.min(1, opacity * 1.6);
    hairMaterial.opacity = Math.min(1, opacity * 1.1);
    paperMaterial.opacity = 0.9 * blend * settle;

    // La litiere de plumes de quetzal, le soleil dessus.
    const lp = litterPose(CIHUATETEO.count, dusk, sun, reduced ? 0 : time);
    litter.group.position.set(lp.x, lp.y, lp.z);
    litter.group.rotation.y = lp.yaw;
    litter.group.updateMatrixWorld(true);
    litter.poleMaterial.opacity = 0.85 * opacity;
    featherMaterial.opacity = 0.85 * opacity;
    featherTipMaterial.opacity = 0.9 * opacity;
    glowMaterial.opacity = lp.sunGlow * blend * 0.9;
    litter.glow.scale.setScalar(2.2 + 0.4 * Math.sin(time * 1.1));
    for (const f of litter.feathers) {
      scratch.set(f.anchor.x, 0, f.anchor.z).applyMatrix4(litter.group.matrixWorld);
      const wind = reduced ? { x: 0, y: 0, z: 0 } : { x: WIND_BASE.x * gust * 0.7 + Math.sin(time * 1.4 + f.phase) * 0.5, y: 0.3 * (1 - settle) + Math.sin(time * 2.2 + f.phase) * 0.3, z: WIND_BASE.z + Math.cos(time * 1.1 + f.phase) * 0.5 };
      stepStrip(f.strip, dt, { x: scratch.x, y: scratch.y, z: scratch.z }, wind, { gravity: 2.2 + 1.5 * settle, damping: 0.97, windResponse: 1.0, iterations: 5 });
      updateRibbon(f.geometry, f.strip, (u) => 0.06 * (0.5 + 0.5 * Math.sin(u * Math.PI)));
    }

    // Les papillons : naissent d'elles, montent et s'eloignent vers l'ouest.
    if (!reduced) {
      spawnAcc.current += wispRate(dusk) * CIHUATETEO.count * dt * blend;
      let toSpawn = Math.floor(spawnAcc.current);
      spawnAcc.current -= toSpawn;
      for (let i = 0; i < BUTTERFLY_POOL && toSpawn > 0; i++) {
        const w = butterflies[i];
        if (w.alive) continue;
        const s = seedRef.current++;
        const b = bearers[s % bearers.length];
        w.alive = true;
        w.x = b.root.position.x + (hash(s, 1) - 0.5) * 0.4;
        w.y = b.root.position.y + BEARER_HEIGHT * (0.4 + 0.6 * hash(s, 2));
        w.z = b.root.position.z + (hash(s, 3) - 0.5) * 0.4;
        w.vx = 0.2 + 0.3 * hash(s, 4);
        w.vy = 0.15 + 0.3 * hash(s, 5);
        w.vz = (hash(s, 6) - 0.5) * 0.3;
        w.age = 0;
        w.life = 3 + 3 * hash(s, 7);
        toSpawn--;
      }
    }
    const pos = butterflyGeometry.getAttribute("position") as BufferAttribute;
    const alpha = butterflyGeometry.getAttribute("aAlpha") as BufferAttribute;
    let visible = 0;
    for (let i = 0; i < BUTTERFLY_POOL; i++) {
      const w = butterflies[i];
      if (!w.alive) {
        alpha.setX(i, 0);
        continue;
      }
      w.age += dt;
      if (w.age >= w.life) {
        w.alive = false;
        alpha.setX(i, 0);
        continue;
      }
      visible++;
      const u = w.age / w.life;
      w.x += (w.vx + Math.sin(time * 1.7 + i) * 0.25) * dt;
      w.y += (w.vy + Math.sin(time * 2.9 + i * 0.7) * 0.35) * dt;
      w.z += (w.vz + Math.cos(time * 1.3 + i) * 0.25) * dt;
      pos.setXYZ(i, w.x, w.y, w.z);
      alpha.setX(i, Math.sin(u * Math.PI) * opacity);
    }
    pos.needsUpdate = true;
    alpha.needsUpdate = true;
    butterflyPoints.visible = visible > 0;
    butterflyUniforms.uScale.value = state.size.height * 0.3;
    butterflyUniforms.uTime.value = time;
  });

  return <group ref={groupRef} visible={false} />;
}
