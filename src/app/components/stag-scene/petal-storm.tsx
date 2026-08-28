"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Vector3,
  type Points,
  type ShaderMaterial,
} from "three";
import { CARDINAL_VECTORS, useCardinalTransition } from "./cardinal-transition-context";
import { DIRECTION_ACCENT_COMPLEMENTARY, DIRECTION_COLOR_VIVID } from "./direction-colors";

/**
 * Tempête cempasúchils qui désintègre la scène dans la direction
 * cardinale pendant le burst de transition (Phase B, 28/08).
 *
 * Contrairement à SpiritParticles (nuage ambient permanent autour du
 * cerf), PetalStorm est éphémère : émis massivement au click, éjecté
 * dans le vecteur cardinal cible, disparaît après 800ms. Signature
 * "toute la scène se met à cempasúchils, portées par Ehecatl vers
 * la nouvelle direction".
 *
 * 600 particules distribuées dans une grille 3D large qui couvre le
 * viewport quel que soit l'angle d'orbite caméra (box 16×10×16
 * centrée y=1.5). Chaque particule a un `aOffset` (delay
 * d'émission 0..0.25) — les particules ne partent pas toutes en
 * même temps, la tempête se propage naturellement.
 *
 * Rendu conditionnel : returns null quand pas de transition
 * (progress = 0), aucun coût GPU en repos.
 */

const PARTICLE_COUNT = 600;
const STORM_BOX = { x: 16, y: 10, z: 16 };
const STORM_CENTER_Y = 1.5;
const STORM_LIFE_MS = 800; // Un peu plus long que le burst de nav 500ms
                          // pour que la tempête déborde sur le mount
                          // de la nouvelle page.

export default function PetalStorm() {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const transition = useCardinalTransition();
  const stormStartRef = useRef<number | null>(null);
  const localProgressRef = useRef(0);

  const { geometry, uniforms } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const seeds = new Float32Array(PARTICLE_COUNT);
    const offsets = new Float32Array(PARTICLE_COUNT); // delay 0..0.25

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribution dans la box 3D, position uniforme random.
      positions[i * 3] = (Math.random() - 0.5) * STORM_BOX.x;
      positions[i * 3 + 1] = (Math.random() - 0.5) * STORM_BOX.y + STORM_CENTER_Y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * STORM_BOX.z;
      seeds[i] = Math.random();
      offsets[i] = Math.random() * 0.25;
    }
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    geo.setAttribute("aOffset", new BufferAttribute(offsets, 1));

    return {
      geometry: geo,
      uniforms: {
        uColor: { value: new Color("#f5a623") },
        uAccentColor: { value: new Color("#f97316") },
        uWind: { value: new Vector3(0, 0, 0) },
        uProgress: { value: 0 },
      },
    };
  }, []);

  useFrame(() => {
    if (!materialRef.current || !transition) return;

    const active = transition.transitionDirection !== null;
    if (active && stormStartRef.current === null) {
      // Storm démarre : capture le start time et la direction cible.
      stormStartRef.current = performance.now();
      const dir = transition.transitionDirection!;
      uniforms.uColor.value.set(DIRECTION_COLOR_VIVID[dir]);
      uniforms.uAccentColor.value.set(DIRECTION_ACCENT_COMPLEMENTARY[dir]);
      const vec = CARDINAL_VECTORS[dir];
      uniforms.uWind.value.set(vec[0], vec[1], vec[2]);
    } else if (!active && stormStartRef.current !== null) {
      const elapsed = performance.now() - stormStartRef.current;
      if (elapsed > STORM_LIFE_MS) {
        stormStartRef.current = null;
        localProgressRef.current = 0;
        uniforms.uProgress.value = 0;
      }
    }

    if (stormStartRef.current !== null) {
      const elapsed = performance.now() - stormStartRef.current;
      const p = Math.min(1, elapsed / STORM_LIFE_MS);
      localProgressRef.current = p;
      uniforms.uProgress.value = p;
    }
  });

  // Ne rend rien tant qu'aucune tempête en cours (économie GPU en repos).
  if (localProgressRef.current === 0 && stormStartRef.current === null) return null;

  return (
    <points ref={pointsRef} geometry={geometry} raycast={() => null}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        vertexShader={`
          attribute float aSeed;
          attribute float aOffset;
          uniform vec3 uWind;
          uniform float uProgress;
          varying float vAlpha;
          varying float vRotation;
          varying float vAccent;
          void main() {
            // Progress local par particule = clamp((uProgress - aOffset) / (1 - aOffset)).
            float span = 1.0 - aOffset;
            float p = clamp((uProgress - aOffset) / max(span, 0.001), 0.0, 1.0);

            // Dérive cardinal — courbe ease-out-quart (rapide au début,
            // ralentit vers la fin) × 12 unités monde. Amplitude assez
            // large pour qu'à p=1 les particules soient sorties du champ
            // caméra normal.
            float eased = 1.0 - pow(1.0 - p, 4.0);
            vec3 pos = position + uWind * eased * 12.0;
            // Léger swirl orthogonal via aSeed pour éviter mouvement plaqué.
            pos.y += sin(aSeed * 6.28 + p * 3.0) * 0.6;

            // Fade in rapide (0→0.1) + fade out sur la seconde moitié.
            float fadeIn = smoothstep(0.0, 0.1, p);
            float fadeOut = 1.0 - smoothstep(0.5, 1.0, p);
            vAlpha = fadeIn * fadeOut;

            vRotation = aSeed * 6.28;
            vAccent = step(0.85, aSeed); // ~15% accent complémentaire
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = 130.0 / -mvPosition.z;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform vec3 uAccentColor;
          varying float vAlpha;
          varying float vRotation;
          varying float vAccent;
          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float c = cos(vRotation);
            float s = sin(vRotation);
            uv = mat2(c, -s, s, c) * uv;
            uv.y *= 2.2; // étirée dans direction rotation, motion signature
            uv.y -= 0.08;
            float r = length(uv);
            float shape = 1.0 - smoothstep(0.15, 0.42, r);
            vec3 petalColor = mix(uColor, uAccentColor, vAccent);
            float alpha = shape * vAlpha;
            gl_FragColor = vec4(petalColor * alpha, 1.0);
          }
        `}
      />
    </points>
  );
}
