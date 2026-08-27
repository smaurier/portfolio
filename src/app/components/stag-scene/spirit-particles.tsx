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
 * Pétales de cempasúchil qui accompagnent le cerf (26/08, Phase 3
 * mytho — cf memory project-nahual-da). Signature nahua directe :
 * la fleur emblématique du Día de los Muertos, qui guide les âmes
 * dans la cosmologie mésoaméricaine. Ici déclinée dans la teinte
 * cardinale de la direction (pas juste orange fixe) : la palette
 * assume le mytho fondateur ET la variation Codex Nahual section 03.
 *
 * Trois choix techniques qui poussent au-dessus du "point additif
 * générique" :
 *  1. **Curl-ish flow field** — dérive fluide dans le vertex shader
 *     (pas un sinus par axe), les pétales suivent des lignes de
 *     courant naturelles plutôt qu'un tremblement isotrope.
 *  2. **Cycle de vie** — chaque pétale a une durée, fade in-out sur
 *     sa lifespan, ré-injection au début quand elle expire. Densité
 *     visuelle stable sans motion clichée "particules statiques qui
 *     tremblent".
 *  3. **Forme pétale procédurale + rotation individuelle** —
 *     gl_PointCoord tourné en fragment, shape ellipse pointue
 *     asymétrique (pas un disque parfait). Chaque pétale a son
 *     orientation propre.
 *
 * Points cloud plutôt que instanced planes billboardés : le screen-
 * alignment natif de gl_PointSize suffit ici (les pétales tombent
 * face caméra à toute distance), on gagne le coût d'un attribut
 * quaternion par instance. gl_PointSize atrophie en périphérie du
 * canvas selon certains drivers — acceptable pour ce cas d'usage,
 * les pétales sur les bords ne sont pas la lecture centrale.
 */
const PETAL_COUNT = 140;

// Rayon d'émission autour du corps du cerf (normalisé à hauteur 2,
// centré au sol). Volume enveloppant plutôt qu'une seule couche.
const EMISSION_RADIUS = 2.0;
const EMISSION_HEIGHT_CENTER = 1.0;

// Fraction des pétales qui portent la teinte accent (Phase 4, 27/08 —
// palette accent complémentaire). 15% : assez pour créer un dialogue
// chromatique, trop peu pour concurrencer la cardinale dominante.
const ACCENT_RATIO = 0.15;

export default function SpiritParticles({
  progressRef,
  climaxRimColor,
  climaxAccentColor,
}: {
  progressRef: MutableRefObject<number>;
  climaxRimColor: string;
  climaxAccentColor: string;
}) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(PETAL_COUNT * 3);
    const seeds = new Float32Array(PETAL_COUNT);      // phase de vie + rotation
    const lifespans = new Float32Array(PETAL_COUNT);  // durée de vie individuelle
    const accents = new Float32Array(PETAL_COUNT);    // 0 = cardinal, 1 = accent

    for (let i = 0; i < PETAL_COUNT; i++) {
      // Distribution uniforme sphérique (rejection sampling) autour
      // du corps du cerf — sphère de radius EMISSION_RADIUS centrée
      // sur (0, EMISSION_HEIGHT_CENTER, 0). Répartition cube-rootée
      // pour homogénéiser la densité (pas concentrée au centre).
      let x, y, z, s;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        s = x * x + y * y + z * z;
      } while (s >= 1 || s === 0);
      const r = Math.cbrt(Math.random()) * EMISSION_RADIUS;
      const norm = Math.sqrt(s);
      positions[i * 3] = (x / norm) * r;
      positions[i * 3 + 1] = (y / norm) * r + EMISSION_HEIGHT_CENTER;
      positions[i * 3 + 2] = (z / norm) * r;
      seeds[i] = Math.random();
      // Lifespan entre 4 et 8 secondes — pas d'harmonique
      // synchronisée qui ferait "vagues" collectives.
      lifespans[i] = 4.0 + Math.random() * 4.0;
      // 15% des pétales portent la teinte accent complémentaire
      // (Phase 4). Marquage binaire par pétale, résolu dans le
      // fragment shader via mix(uColor, uAccentColor, aAccent).
      accents[i] = Math.random() < ACCENT_RATIO ? 1.0 : 0.0;
    }
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    geo.setAttribute("aLifespan", new BufferAttribute(lifespans, 1));
    geo.setAttribute("aAccent", new BufferAttribute(accents, 1));

    return {
      geometry: geo,
      uniforms: {
        uColor: { value: new Color(climaxRimColor) },
        uAccentColor: { value: new Color(climaxAccentColor) },
        uIntensity: { value: 0 },
        uTime: { value: 0 },
      },
    };
  }, [climaxRimColor, climaxAccentColor]);

  useFrame((state) => {
    if (!materialRef.current) return;
    const p = progressRef.current;
    const blend = getRimColorBlend(p);
    // Pulse partagé avec rim/edge/aura — les pétales respirent en
    // phase avec le battement cardiaque (formule sin^4 période 4s).
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
          attribute float aSeed;
          attribute float aLifespan;
          attribute float aAccent;
          uniform float uTime;
          varying float vAlpha;
          varying float vRotation;
          varying float vAccent;

          // Curl-ish flow field : trois sinus croisés sur des axes
          // couplés. Pas divergence-free au sens strict d'un vrai
          // curl noise, mais donne des lignes de courant visuellement
          // fluides à peu de coût (contre un simplex noise à 6+
          // iterations dans le shader).
          vec3 flow(vec3 p) {
            return vec3(
              sin(p.y * 1.3 + p.z * 0.7),
              cos(p.z * 1.1 + p.x * 0.9),
              sin(p.x * 1.5 + p.y * 0.5)
            );
          }

          void main() {
            // Cycle de vie normalisé sur [0, 1) via mod. Chaque
            // pétale démarre à sa propre phase (aSeed) pour éviter
            // un "reset collectif" toutes les N secondes.
            float phaseOffset = aSeed * aLifespan;
            float t = mod(uTime + phaseOffset, aLifespan) / aLifespan;

            vec3 pos = position;
            // Dérive : le flow field échantillonné à la position
            // initiale + une lente évolution du champ dans le temps
            // (uTime * 0.05) — le champ "respire" doucement, les
            // trajectoires ne sont pas rigidement fixes.
            vec3 drift = flow(pos * 0.5 + uTime * 0.05);
            pos += drift * t * 0.9;
            // Montée légère (les pétales tombent lentement vers le
            // haut, comme aspirés — signal "esprit qui s'élève").
            pos.y += t * 0.6;

            // Fade in-out sur la lifespan : rampe rapide au début
            // (0→0.15 de la vie), plateau, rampe descendante en fin
            // (0.7→1.0). smoothstep pour dérivées nulles aux bornes.
            float fadeIn = smoothstep(0.0, 0.15, t);
            float fadeOut = 1.0 - smoothstep(0.7, 1.0, t);
            vAlpha = fadeIn * fadeOut;

            // Rotation individuelle : orientation fixe par pétale
            // (aSeed) — chaque pétale garde son angle pendant sa vie
            // (pas de spin frénétique). Suffit à casser l'uniformité
            // d'un disque radial.
            vRotation = aSeed * 6.2831853;
            // Marquage cardinal/accent transmis au fragment.
            vAccent = aAccent;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            // Taille en pixels : décroît avec la distance
            // (perspective réaliste). ×90 ajusté à l'œil pour rester
            // lisible sans envahir.
            gl_PointSize = 90.0 / -mvPosition.z;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform vec3 uAccentColor;
          uniform float uIntensity;
          varying float vAlpha;
          varying float vRotation;
          varying float vAccent;

          void main() {
            // Rotation du gl_PointCoord autour du centre (0.5, 0.5).
            vec2 uv = gl_PointCoord - 0.5;
            float c = cos(vRotation);
            float s = sin(vRotation);
            uv = mat2(c, -s, s, c) * uv;

            // Forme pétale : ellipse allongée verticalement +
            // pointue en haut (y positif), plus large en bas. Une
            // décentrage de l'origine en Y donne l'asymétrie
            // caractéristique cempasúchil.
            uv.y *= 1.8;
            uv.y -= 0.08;
            float r = length(uv);
            // Bord doux ; rayon max 0.45 (garde une marge dans le
            // point 32×32 pour éviter le clip du bord de sprite).
            float shape = 1.0 - smoothstep(0.15, 0.42, r);

            // 15% des pétales portent la teinte accent complémentaire
            // (Phase 4, cf direction-colors.ts DIRECTION_ACCENT_
            // COMPLEMENTARY). Duo chromatique cardinal ↔ accent pour
            // rompre le monochrome.
            vec3 petalColor = mix(uColor, uAccentColor, vAccent);

            float alpha = shape * vAlpha * uIntensity;
            // Prémultiplié + alpha=1 pour AdditiveBlending (le
            // srcFactor SrcAlpha default squasherait uColor*alpha²
            // au lieu de uColor*alpha — même correction que
            // stag-aura.tsx).
            gl_FragColor = vec4(petalColor * alpha, 1.0);
          }
        `}
      />
    </points>
  );
}
