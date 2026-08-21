"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, ShaderMaterial } from "three";
import type { Particle } from "@/lib/particle-sampling";

// Technique de dissolution par bruit + particules par instance (cf Codrops,
// "Implementing a Dissolve Effect with Shaders and Particles in Three.js",
// tympanus.net/codrops/2025/02/17 — recherché le 20/08, cf memory
// project-nahual-da). Simplifié pour une source 2D (Piedra + texte
// échantillonnés en points, cf particle-sampling.ts) plutôt qu'un maillage
// 3D solide : pas besoin d'un objet séparé qui "émet" les particules,
// chaque particule EST déjà positionnée à son point d'origine dès le
// départ (uProgress=0 reconstitue exactement l'image statique qu'elle
// remplace, pour une transition invisible).
const VERTEX_SHADER = `
  attribute vec2 aDirection;
  attribute float aDelay;
  attribute float aDistance;
  attribute float aSeed;

  uniform float uProgress;
  uniform float uBaseSize;
  uniform float uPixelRatio;

  varying float vAlpha;

  // Bruit de valeur 2D compact — juste assez pour une trajectoire qui
  // n'est pas une ligne droite parfaite, pas un vrai simplex noise (inutile
  // ici, chaque particule ne bouge qu'une fois, brièvement).
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    // Démarrage étalé par particule (aDelay) : évite un décollage
    // synchronisé qui lirait comme un seul bloc qui explose d'un coup.
    float local = clamp((uProgress - aDelay) / (1.0 - aDelay), 0.0, 1.0);
    float eased = local * local * (3.0 - 2.0 * local); // smoothstep

    vec2 turbulence = vec2(
      hash(vec2(aSeed, 0.15)) - 0.5,
      hash(vec2(aSeed, 0.85)) - 0.5
    ) * eased * 6.0;

    vec2 offset = aDirection * aDistance * eased + turbulence;
    offset.y += eased * eased * 14.0; // les braises montent en se dispersant

    vec3 pos = position + vec3(offset, 0.0);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float sizeFalloff = 1.0 - eased * 0.35;
    gl_PointSize = uBaseSize * uPixelRatio * sizeFalloff;

    vAlpha = 1.0 - eased;
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;
    float edge = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(uColor, vAlpha * edge);
  }
`;

/**
 * Champ de particules qui reconstitue exactement la Piedra+texte à
 * `progress=0` (positions = points échantillonnés, cf particle-sampling.ts)
 * puis se disperse en braises jusqu'à `progress=1` — piloté depuis
 * l'extérieur via `progressRef` (même pattern que RevealLighting/
 * CursorRevealScene : useFrame lit une ref, pas un prop qui re-render).
 */
export default function IntroParticles({
  particles,
  progressRef,
  color = "#f0b25c",
  baseSize = 6,
}: {
  particles: Particle[];
  progressRef: MutableRefObject<number>;
  color?: string;
  baseSize?: number;
}) {
  const materialRef = useRef<ShaderMaterial>(null);

  const { positions, directions, delays, distances, seeds } = useMemo(() => {
    const n = particles.length;
    const positions = new Float32Array(n * 3);
    const directions = new Float32Array(n * 2);
    const delays = new Float32Array(n);
    const distances = new Float32Array(n);
    const seeds = new Float32Array(n);
    particles.forEach((p, i) => {
      positions[i * 3] = p.homeX;
      positions[i * 3 + 1] = p.homeY;
      positions[i * 3 + 2] = 0;
      directions[i * 2] = p.dirX;
      directions[i * 2 + 1] = p.dirY;
      delays[i] = p.delay;
      distances[i] = p.distance;
      seeds[i] = i * 0.7137 + 0.1234;
    });
    return { positions, directions, delays, distances, seeds };
  }, [particles]);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uBaseSize: { value: baseSize },
      uPixelRatio: { value: 1 },
      uColor: { value: new Color(color) },
    }),
    [baseSize, color],
  );

  useFrame(({ gl }) => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uProgress.value = progressRef.current;
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aDirection" args={[directions, 2]} />
        <bufferAttribute attach="attributes-aDelay" args={[delays, 1]} />
        <bufferAttribute attach="attributes-aDistance" args={[distances, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
