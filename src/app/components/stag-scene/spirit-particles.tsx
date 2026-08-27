"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Points,
  type ShaderMaterial,
} from "three";
import { getRimColorBlend } from "@/lib/reveal-arc";

/**
 * Particules d'esprit autour du cerf (26/08, Phase 3 mytho du plan
 * couleurs post-audit — cf memory project-nahual-da). Motes de lumière
 * cardinale qui gravitent en dérive lente autour du sujet, respirent
 * avec le pulse cardiaque partagé (rim / edge / halo).
 *
 * Alternative retenue après abandon de la Piedra billboardée (tentée
 * puis retirée sans commit — le mesh disque billboardé était sujet
 * aux clipping de frustum + occlusion selon l'angle d'orbite). Les
 * particules Points additives contournent tous ces problèmes : rendues
 * quel que soit l'angle caméra, pas d'orientation à maintenir, pas de
 * risque de disparaître selon la position.
 *
 * Iconographie : "esprits qui accompagnent le nahual" — le cerf ne se
 * révèle pas seul, il porte sa direction cardinale avec des motes de
 * la teinte associée qui flottent dans son sillage.
 *
 * BufferGeometry statique avec vertex attribute `aOffset` (temps de
 * phase par particule) : la dérive est calculée dans le vertex shader
 * plutôt que muter le buffer côté CPU chaque frame — GPU-friendly,
 * pas de re-upload par tick.
 */
const PARTICLE_COUNT = 80;

// Rayon du nuage autour du cerf. Le cerf est normalisé à hauteur 2,
// centré au sol. Nuage 2.5 unités = enveloppe le corps sans devenir
// une brume dense qui masquerait la silhouette.
const CLOUD_RADIUS = 2.5;

export default function SpiritParticles({
  progressRef,
  climaxRimColor,
}: {
  progressRef: MutableRefObject<number>;
  climaxRimColor: string;
}) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const offsets = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribution sphérique uniforme (Marsaglia) — pas juste des
      // gaussiennes qui concentreraient au centre, ni un cube qui
      // ferait des coins.
      let x, y, z, s;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        s = x * x + y * y + z * z;
      } while (s >= 1 || s === 0);
      const r = Math.cbrt(Math.random()) * CLOUD_RADIUS;
      const norm = Math.sqrt(s);
      positions[i * 3] = (x / norm) * r;
      // Baisse le y pour centrer autour du corps du cerf (hauteur 2
      // total → milieu à 1) plutôt qu'autour de l'origine sol.
      positions[i * 3 + 1] = (y / norm) * r + 1.0;
      positions[i * 3 + 2] = (z / norm) * r;
      // Phase aléatoire par particule pour dephaser la dérive.
      offsets[i] = Math.random() * Math.PI * 2;
    }
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aOffset", new BufferAttribute(offsets, 1));

    return {
      geometry: geo,
      uniforms: {
        uColor: { value: new Color(climaxRimColor) },
        uIntensity: { value: 0 },
        uTime: { value: 0 },
      },
    };
  }, [climaxRimColor]);

  useFrame((state) => {
    if (!materialRef.current) return;
    const p = progressRef.current;
    const blend = getRimColorBlend(p);
    const pulse = 0.65 + 0.35 * Math.pow(Math.sin(state.clock.elapsedTime * Math.PI * 0.25), 4);
    uniforms.uIntensity.value = blend * pulse;
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points ref={pointsRef} geometry={geometry} raycast={() => null}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        vertexShader={`
          attribute float aOffset;
          uniform float uTime;
          varying float vTwinkle;
          void main() {
            // Dérive : oscillation locale par particule, amplitude
            // faible (0.15) — les motes flottent sans partir, comme
            // suspendues dans un champ énergétique autour du cerf.
            vec3 pos = position;
            pos.x += sin(uTime * 0.4 + aOffset) * 0.15;
            pos.y += cos(uTime * 0.35 + aOffset * 1.3) * 0.12;
            pos.z += sin(uTime * 0.45 + aOffset * 0.7) * 0.15;

            // Scintillement individuel : chaque mote pulse à sa propre
            // fréquence légèrement décalée du rythme cardiaque global,
            // ce qui évite l'effet clignotement synchrone (peu naturel).
            vTwinkle = 0.5 + 0.5 * sin(uTime * 1.2 + aOffset * 2.0);

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            // Taille en pixels : diminue avec la distance (perspective).
            // ×220 ajusté à l'œil pour rester lisible sans dominer.
            gl_PointSize = 220.0 / -mvPosition.z;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uIntensity;
          varying float vTwinkle;
          void main() {
            // Chaque point est carré en gl_PointCoord (0..1). Un fondu
            // radial depuis le centre donne un disque doux.
            vec2 uv = gl_PointCoord - 0.5;
            float d = length(uv);
            float alpha = smoothstep(0.5, 0.0, d);
            alpha *= vTwinkle;
            alpha *= uIntensity;
            // Prémultiplié + alpha=1 pour AdditiveBlending (cf
            // stag-aura.tsx : le srcFactor SrcAlpha default squasherait
            // uColor*alpha*alpha au lieu de uColor*alpha).
            gl_FragColor = vec4(uColor * alpha, 1.0);
          }
        `}
      />
    </points>
  );
}
