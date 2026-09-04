/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'attributs et d'uniforms partages 60 fps (meme precedent que cardinal-ambience). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { BufferAttribute, BufferGeometry, Color, NormalBlending, ShaderMaterial, type Points } from "three";
import {
  isVaporAlive,
  PARTICLES_PER_ARROW,
  spawnVapor,
  stepVapor,
  VAPOR_SHARD,
  vaporAlpha,
  vaporSize,
  type VaporParticle,
} from "@/lib/arrow-vapor";
import { tezcatlStore } from "./tezcatl-store";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * ArrowVapor (04/09). Les fleches de Temiminaloyan, une fois plantees
 * quelques secondes, se vaporisent en fumee noire et en eclats
 * (lib/arrow-vapor, simulation pure). Un seul Points pour tout le bassin :
 * pool borne (autant d'emplacements que de fleches vivantes possibles),
 * sprite de fumee Kenney (le meme que la brume du Nord), blending NORMAL
 * et non additif : une fumee noire n'ajoute pas de lumiere, elle en
 * retire. Les eclats sont des points durs, sans sprite.
 * Nord seulement ; en reduced-motion aucune fleche ne tombe, donc rien
 * a vaporiser.
 */

const SMOKE_SPRITE = "/img/particles/smoke_07.png";
/** Autant de fleches qu'ObsidianArrows peut en avoir plantees a la fois. */
const ARROW_SLOTS = 24;
const POOL = ARROW_SLOTS * PARTICLES_PER_ARROW;
const SMOKE_COLOR = new Color("#0b0810");
const SHARD_COLOR = new Color("#1a1326");
// Famille chaude (04/09, le xiuhcoatl) : braises orange, eclats dores.
const EMBER_COLOR = new Color("#ff7a1a");
const SPARK_COLOR = new Color("#ffd27a");
const SPARK_DYING = new Color("#7a1200");

export default function ArrowVapor() {
  const pointsRef = useRef<Points>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const smokeTexture = useTexture(SMOKE_SPRITE);
  const particlesRef = useRef<VaporParticle[]>([]);
  const seedRef = useRef(1);

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(POOL * 3), 3));
    g.setAttribute("aSize", new BufferAttribute(new Float32Array(POOL), 1));
    g.setAttribute("aAlpha", new BufferAttribute(new Float32Array(POOL), 1));
    g.setAttribute("aKind", new BufferAttribute(new Float32Array(POOL), 1));
    g.setAttribute("aHeat", new BufferAttribute(new Float32Array(POOL), 1));
    // Jamais de culling : les positions changent a chaque frame.
    g.boundingSphere = null;
    return g;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uSprite: { value: smokeTexture },
          uSmoke: { value: SMOKE_COLOR },
          uShard: { value: SHARD_COLOR },
          uEmber: { value: EMBER_COLOR },
          uSpark: { value: SPARK_COLOR },
          uSparkDying: { value: SPARK_DYING },
          uScale: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: NormalBlending,
        vertexShader: `
          attribute float aSize;
          attribute float aAlpha;
          attribute float aKind;
          attribute float aHeat;
          uniform float uScale;
          varying float vAlpha;
          varying float vKind;
          varying float vHeat;
          void main() {
            vAlpha = aAlpha;
            vKind = aKind;
            vHeat = aHeat;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            // Taille en pixels proportionnelle a la taille monde (diametre).
            gl_PointSize = aSize * uScale / max(0.1, -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform sampler2D uSprite;
          uniform vec3 uSmoke;
          uniform vec3 uShard;
          uniform vec3 uEmber;
          uniform vec3 uSpark;
          uniform vec3 uSparkDying;
          varying float vAlpha;
          varying float vKind;
          varying float vHeat;
          void main() {
            if (vAlpha <= 0.001) discard;
            if (vKind < 0.5) {
              float sprite = texture2D(uSprite, gl_PointCoord).a;
              float a = sprite * vAlpha;
              if (a < 0.01) discard;
              // Fumee noire, ou braise chaude, plus lumineuse au coeur.
              vec3 col = mix(uSmoke, uEmber * (1.0 + 0.8 * sprite), vHeat);
              gl_FragColor = vec4(col, a);
            } else {
              // Eclat : petit disque dur, legerement plus clair au centre.
              vec2 d = gl_PointCoord - 0.5;
              float r = length(d);
              if (r > 0.5) discard;
              // Etincelle : jaune vif qui rougit en mourant (vAlpha decroit).
              vec3 spark = mix(uSparkDying, uSpark * (1.0 + 0.6 * (1.0 - r * 2.0)), vAlpha);
              vec3 col = mix(uShard + 0.12 * (1.0 - r * 2.0), spark, vHeat);
              gl_FragColor = vec4(col, vHeat > 0.5 ? 1.0 : vAlpha);
            }
          }
        `,
      }),
    [smokeTexture]
  );
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    // Nord : les fleches qui se vaporisent ; Sud : les braises du xiuhcoatl.
    const active = direction === "obsidienne" || direction === "turquoise";
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const particles = particlesRef.current;
    if (active && !reduced && tezcatlStore.vapors.length > 0) {
      for (const v of tezcatlStore.vapors) {
        const free = POOL - particles.length;
        if (free < PARTICLES_PER_ARROW) break;
        seedRef.current += 1;
        particles.push(...spawnVapor(seedRef.current, { x: v.x, y: v.y, z: v.z }, { x: v.dx, y: v.dy, z: v.dz }, v.length, v.heat ?? 0));
      }
    }
    tezcatlStore.vapors.length = 0;
    if (particles.length === 0) {
      points.visible = false;
      return;
    }
    points.visible = true;
    stepVapor(particles, Math.min(delta, 1 / 30));
    // Purge des mortes (compaction en place).
    let n = 0;
    for (let i = 0; i < particles.length; i++) if (isVaporAlive(particles[i])) particles[n++] = particles[i];
    particles.length = n;

    const pos = geometry.getAttribute("position") as BufferAttribute;
    const size = geometry.getAttribute("aSize") as BufferAttribute;
    const alpha = geometry.getAttribute("aAlpha") as BufferAttribute;
    const kind = geometry.getAttribute("aKind") as BufferAttribute;
    const heat = geometry.getAttribute("aHeat") as BufferAttribute;
    for (let i = 0; i < POOL; i++) {
      if (i < n) {
        const p = particles[i];
        pos.setXYZ(i, p.x, p.y, p.z);
        size.setX(i, vaporSize(p));
        alpha.setX(i, vaporAlpha(p));
        kind.setX(i, p.kind === VAPOR_SHARD ? 1 : 0);
        heat.setX(i, p.heat);
      } else {
        alpha.setX(i, 0);
      }
    }
    pos.needsUpdate = true;
    size.needsUpdate = true;
    alpha.needsUpdate = true;
    kind.needsUpdate = true;
    heat.needsUpdate = true;
    geometry.setDrawRange(0, n);
    // Echelle pixel : hauteur du viewport en pixels physiques / tangente
    // du demi-FOV, comme un PointsMaterial a attenuation.
    const cam = state.camera as { fov?: number };
    const fovRad = ((cam.fov ?? 50) * Math.PI) / 180;
    material.uniforms.uScale.value = (state.size.height * state.viewport.dpr) / (2 * Math.tan(fovRad / 2));
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} raycast={() => null} renderOrder={1001} visible={false} />;
}

useTexture.preload(SMOKE_SPRITE);
