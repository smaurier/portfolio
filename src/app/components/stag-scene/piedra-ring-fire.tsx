/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation de buffers three a 60 fps (meme precedent que arrow-vapor). */
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, Points, ShaderMaterial } from "three";
import { xiuhcoatlStore } from "./xiuhcoatl-store";
import { useCurrentDirection } from "./use-current-direction";

/**
 * PiedraRingFire (05/09, la frappe). La GERBE DE FEU qui sort du sillon
 * des deux xiuhcoatl graves quand le serpent frappe l'anneau : des
 * braises et des flammes jaillissent de la bande gravee (r 0.82..0.99 de
 * la Piedra), montent, derivent vers l'exterieur et s'eteignent. Emission
 * proportionnelle a `xiuhcoatlStore.strike.fire` (lib strike-sequence),
 * donc rien avant l'impact et une trainee qui dure ~2 s apres. Couleur :
 * blanc-turquoise a la naissance (le flash), braise orange en vieillissant.
 * Un seul Points, pool borne, simulation CPU triviale. Sud seulement.
 */

const POOL = 700;
const PIEDRA_RADIUS = 3;
const RING_INNER = 0.82;
const RING_OUTER = 0.99;
const RING_Y = 0.03;
/** Emission maximale (particules / s) a fire = 1. */
const RATE_MAX = 900;

function spriteTexture(): CanvasTexture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(c);
}

function hash(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233 + 3.7) * 43758.5453;
  return v - Math.floor(v);
}

type Particle = { alive: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number; life: number; size: number };

export default function PiedraRingFire() {
  const pointsRef = useRef<Points>(null);
  const direction = useCurrentDirection();
  const particles = useMemo<Particle[]>(
    () => Array.from({ length: POOL }, () => ({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, size: 1 })),
    []
  );
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(new Float32Array(POOL * 3), 3));
    g.setAttribute("aColor", new Float32BufferAttribute(new Float32Array(POOL * 3), 3));
    g.setAttribute("aSize", new Float32BufferAttribute(new Float32Array(POOL), 1));
    return g;
  }, []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uMap: { value: spriteTexture() }, uScale: { value: 300 } },
        vertexShader: /* glsl */ `
          attribute vec3 aColor;
          attribute float aSize;
          uniform float uScale;
          varying vec3 vColor;
          void main() {
            vColor = aColor;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * uScale / max(1.0, -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap;
          varying vec3 vColor;
          void main() {
            float a = texture2D(uMap, gl_PointCoord).a;
            gl_FragColor = vec4(vColor * a, a);
          }
        `,
      }),
    []
  );
  const spawnAcc = useRef(0);
  const seed = useRef(0);
  const colorScratch = useMemo(() => new Color(), []);

  useFrame((state, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const south = direction === "turquoise";
    const fire = south ? xiuhcoatlStore.strike.fire : 0;
    const dt = Math.min(delta, 1 / 30);
    material.uniforms.uScale.value = state.size.height * 0.35;
    // Emission.
    spawnAcc.current += fire * RATE_MAX * dt;
    let toSpawn = Math.floor(spawnAcc.current);
    spawnAcc.current -= toSpawn;
    for (let i = 0; i < POOL && toSpawn > 0; i++) {
      const p = particles[i];
      if (p.alive) continue;
      const s = seed.current++;
      const r = PIEDRA_RADIUS * (RING_INNER + (RING_OUTER - RING_INNER) * hash(s, 1));
      const a = hash(s, 2) * Math.PI * 2;
      p.alive = true;
      p.x = Math.cos(a) * r;
      p.z = Math.sin(a) * r;
      p.y = RING_Y + 0.02;
      const up = 1.2 + 2.6 * hash(s, 3) * (0.5 + 0.5 * fire);
      const out = 0.2 + 0.6 * hash(s, 4);
      p.vx = Math.cos(a) * out + (hash(s, 5) - 0.5) * 0.4;
      p.vz = Math.sin(a) * out + (hash(s, 6) - 0.5) * 0.4;
      p.vy = up;
      p.age = 0;
      p.life = 0.5 + 0.9 * hash(s, 7);
      p.size = 0.05 + 0.09 * hash(s, 8);
      toSpawn--;
    }
    // Integration + ecriture des buffers.
    const pos = geometry.getAttribute("position") as Float32BufferAttribute;
    const col = geometry.getAttribute("aColor") as Float32BufferAttribute;
    const siz = geometry.getAttribute("aSize") as Float32BufferAttribute;
    let visible = 0;
    for (let i = 0; i < POOL; i++) {
      const p = particles[i];
      if (!p.alive) {
        siz.setX(i, 0);
        continue;
      }
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        siz.setX(i, 0);
        continue;
      }
      visible++;
      const u = p.age / p.life;
      p.vy -= 1.4 * dt; // les braises retombent un peu
      p.vx *= 1 - 0.8 * dt;
      p.vz *= 1 - 0.8 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      pos.setXYZ(i, p.x, p.y, p.z);
      // Blanc-turquoise a la naissance, braise orange puis rouge sombre.
      if (u < 0.2) colorScratch.setRGB(0.7 + 0.3 * (1 - u / 0.2), 1.0, 0.95);
      else colorScratch.setRGB(1.0, 0.55 * (1 - (u - 0.2) / 0.8) + 0.15, 0.08);
      const fade = u < 0.1 ? u / 0.1 : 1 - (u - 0.1) / 0.9;
      col.setXYZ(i, colorScratch.r * fade, colorScratch.g * fade, colorScratch.b * fade);
      siz.setX(i, p.size * (0.6 + 0.8 * Math.sin(u * Math.PI)));
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    siz.needsUpdate = true;
    pts.visible = visible > 0;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} raycast={() => null} renderOrder={3} />;
}
