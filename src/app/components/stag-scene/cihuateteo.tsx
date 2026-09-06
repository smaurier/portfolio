/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'objets three, d'uniforms et de buffers a 60 fps (meme precedent que xolotl-companion). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AdditiveBlending, AnimationMixer, Box3, BufferAttribute, BufferGeometry, CanvasTexture, Color, Group, Points, ShaderMaterial, SkinnedMesh, Vector3, type Object3D } from "three";
import { clone as cloneSkinnedScene } from "three/examples/jsm/utils/SkeletonUtils.js";
import { bearerOpacity, bearerPose, CIHUATETEO, wispRate } from "@/lib/cihuateteo";
import { remapWestArc } from "@/lib/ouest-arc";
import { dayAtArc } from "@/lib/arc-day";
import { sunDirection } from "@/lib/direction-light";
import { createCihuateotlMaterial, createCihuateotlUniforms, type CihuateotlUniforms } from "./cihuateotl-material";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * Les Cihuateteo (06/09, Ouest / Cihuatlampa). Quatre silhouettes de
 * femmes, fantomatiques, qui portent le soleil vers l'ouest (elles
 * flottent en eventail de son cote, a peine visibles), puis, quand il est
 * entre dans la terre, se posent aux quatre coins de la Piedra, le
 * carrefour, tournees vers le cerf. Modele : « Animated Woman » de
 * Quaternius (Ultimate Modular Women Pack, CC0), rendu en silhouette
 * (cihuateotl-material : fresnel, dissolution par le haut), animation
 * Idle_Neutral au ralenti, un flottement vertical par-dessus. Des
 * particules s'echappent d'elles (un seul Points pour les quatre).
 * Sources et garde-fous : docs/da/ouest-sources.md (jamais de visage, on
 * evoque par la lumiere et le mouvement).
 */

const MODEL_PATH = "/models/cihuateotl.glb";
const CLIP = "CharacterArmature|Idle_Neutral";
/** Hauteur d'une porteuse (u) : un peu plus haute que le garrot du cerf. */
const BEARER_HEIGHT = 1.9;
const ANIM_TIME_SCALE = 0.45;
const WISPS_PER_BEARER = 40;
const WISP_POOL = CIHUATETEO.count * WISPS_PER_BEARER;
const WISP_COLOR = new Color("#e6cff0");

useGLTF.preload(MODEL_PATH);

type Bearer = { root: Group; mixer: AnimationMixer; uniforms: CihuateotlUniforms };
type Wisp = { alive: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number; life: number };

function wispTexture(): CanvasTexture {
  const size = 32;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.4)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(c);
}

function hash(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233 + 5.1) * 43758.5453;
  return v - Math.floor(v);
}

/** Habille un clone : silhouette fantomatique sur chaque partie skinnee,
 * echelle normalisee a BEARER_HEIGHT, pieds a y = 0. */
function dressBearer(root: Object3D, uniforms: CihuateotlUniforms): void {
  const material = createCihuateotlMaterial(uniforms);
  const box = new Box3();
  root.updateMatrixWorld(true);
  root.traverse((child) => {
    const mesh = child as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.material = material;
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

export default function Cihuateteo() {
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const { scene, animations } = useGLTF(MODEL_PATH);
  const groupRef = useRef<Group>(null);
  const blendRef = useRef(direction === "cendre" ? 1 : 0);
  const clip = useMemo(() => animations.find((a) => a.name === CLIP) ?? animations[0], [animations]);

  const bearers = useMemo<Bearer[]>(() => {
    return Array.from({ length: CIHUATETEO.count }, (_, i) => {
      const inner = cloneSkinnedScene(scene) as Group;
      const uniforms = createCihuateotlUniforms(i * 1.9);
      dressBearer(inner, uniforms);
      const root = new Group();
      root.add(inner);
      const mixer = new AnimationMixer(inner);
      if (clip) {
        const action = mixer.clipAction(clip);
        action.timeScale = ANIM_TIME_SCALE;
        action.time = (i / CIHUATETEO.count) * clip.duration;
        action.play();
      }
      return { root, mixer, uniforms };
    });
  }, [scene, clip]);

  // Les particules qui s'echappent : un seul nuage pour les quatre.
  const wisps = useMemo<Wisp[]>(() => Array.from({ length: WISP_POOL }, () => ({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1 })), []);
  const wispGeometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(WISP_POOL * 3), 3));
    g.setAttribute("aAlpha", new BufferAttribute(new Float32Array(WISP_POOL), 1));
    g.setAttribute("aSize", new BufferAttribute(new Float32Array(WISP_POOL), 1));
    g.boundingSphere = null;
    return g;
  }, []);
  const wispUniforms = useMemo(() => ({ uMap: { value: wispTexture() }, uScale: { value: 300 }, uColor: { value: WISP_COLOR } }), []);
  const wispMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: wispUniforms,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        vertexShader: /* glsl */ `
          attribute float aAlpha;
          attribute float aSize;
          uniform float uScale;
          varying float vAlpha;
          void main() {
            vAlpha = aAlpha;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * uScale / max(1.0, -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap;
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
            if (a < 0.004) discard;
            gl_FragColor = vec4(uColor * a, a);
          }
        `,
      }),
    [wispUniforms]
  );
  const wispPoints = useMemo(() => {
    const p = new Points(wispGeometry, wispMaterial);
    p.frustumCulled = false;
    p.renderOrder = 997;
    p.raycast = () => null;
    return p;
  }, [wispGeometry, wispMaterial]);
  const spawnAcc = useRef(0);
  const seed = useRef(0);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    for (const b of bearers) g.add(b.root);
    g.add(wispPoints);
    return () => {
      for (const b of bearers) g.remove(b.root);
      g.remove(wispPoints);
    };
  }, [bearers, wispPoints]);
  useEffect(
    () => () => {
      wispGeometry.dispose();
      wispMaterial.dispose();
    },
    [wispGeometry, wispMaterial]
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
    const opacity = bearerOpacity(dusk) * blend;

    bearers.forEach((b, i) => {
      const pose = bearerPose(i, CIHUATETEO.count, dusk, sun, reduced ? 0 : time);
      b.root.position.set(pose.x, pose.y, pose.z);
      b.root.rotation.y = pose.yaw;
      b.uniforms.uOpacity.value = opacity;
      b.uniforms.uTime.value = time;
      b.uniforms.uBaseY.value = pose.y;
      // La dissolution monte avec la nuit : au carrefour, elles se defont
      // davantage, la tete part en grains.
      b.uniforms.uDissolve.value = 0.68 - 0.14 * dusk;
      if (!reduced) b.mixer.update(dt);
    });

    // Les particules : naissent dans le haut du corps, montent, derivent
    // sous le vent de l'ouest (+x = l'ouest du decor, vers le soleil parti).
    if (!reduced) {
      spawnAcc.current += wispRate(dusk) * CIHUATETEO.count * dt * blend;
      let toSpawn = Math.floor(spawnAcc.current);
      spawnAcc.current -= toSpawn;
      for (let i = 0; i < WISP_POOL && toSpawn > 0; i++) {
        const w = wisps[i];
        if (w.alive) continue;
        const s = seed.current++;
        const b = bearers[s % bearers.length];
        w.alive = true;
        w.x = b.root.position.x + (hash(s, 1) - 0.5) * 0.35;
        w.y = b.root.position.y + BEARER_HEIGHT * (0.55 + 0.45 * hash(s, 2));
        w.z = b.root.position.z + (hash(s, 3) - 0.5) * 0.35;
        w.vx = 0.15 + 0.25 * hash(s, 4);
        w.vy = 0.25 + 0.35 * hash(s, 5);
        w.vz = (hash(s, 6) - 0.5) * 0.2;
        w.age = 0;
        w.life = 1.8 + 1.6 * hash(s, 7);
        toSpawn--;
      }
    }
    const pos = wispGeometry.getAttribute("position") as BufferAttribute;
    const alpha = wispGeometry.getAttribute("aAlpha") as BufferAttribute;
    const size = wispGeometry.getAttribute("aSize") as BufferAttribute;
    let visible = 0;
    for (let i = 0; i < WISP_POOL; i++) {
      const w = wisps[i];
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
      w.x += (w.vx + Math.sin(time * 1.3 + i) * 0.08) * dt;
      w.y += w.vy * dt;
      w.z += w.vz * dt;
      pos.setXYZ(i, w.x, w.y, w.z);
      alpha.setX(i, Math.sin(u * Math.PI) * 0.9 * opacity);
      size.setX(i, 0.06 + 0.06 * u);
    }
    pos.needsUpdate = true;
    alpha.needsUpdate = true;
    size.needsUpdate = true;
    wispPoints.visible = visible > 0;
    wispUniforms.uScale.value = state.size.height * 0.3;
  });

  return <group ref={groupRef} visible={false} />;
}
