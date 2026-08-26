"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BackSide, Color, type ShaderMaterial } from "three";
import { getRimColorBlend } from "@/lib/reveal-arc";

/**
 * Halo diffus autour du cerf (26/08, cf memory project-nahual-da —
 * retour Sylvain post-audit Playwright : "coque fresnel serrée + halo
 * diffus, les deux"). Le rim-light sur le cerf lui-même fournit la
 * coque serrée (via rim-light.ts). Ce composant ajoute le second
 * étage : une sphère englobante rendue en backside additive avec un
 * fresnel très large, qui se lit comme un halo qui rayonne dans
 * l'ambiance plutôt qu'un bord net sur la silhouette.
 *
 * Pas d'onBeforeCompile ici : matériau shader dédié (pas de PBR à
 * conserver, juste le glow). Position/scale câblés en dur sur le
 * volume approximatif du cerf normalisé par centerAndScale
 * (TARGET_HEIGHT=2, base à y=0) — la sphère est placée par le parent
 * dans le même repère que le primitive scene.
 *
 * Rythme cardiaque ~4s (retour Sylvain) : pulse `0.65 + 0.35 * pow(sin(t * PI/4), 4)`.
 * Choix de la formule : `pow(sin, 4)` donne un pic étroit tenu dans une
 * vallée large — la sensation d'un battement plutôt que d'une onde
 * sinusoïdale continue. `sin(t * PI/4)` a une période de 8 s, mais
 * `pow(., 4)` élève à la puissance paire donc chaque demi-période
 * produit un pic → une pulsation nette toutes les 4 s.
 *
 * Sylvain a explicitement rejeté un pattern hologramme (scanlines
 * animées) le 25/08 (commit `9325b3d` reverted par `b1c06cc`) — ce
 * halo évite ce piège : pas de motif régulier, juste un fresnel avec
 * une opacité qui respire.
 */
export default function StagAura({
  progressRef,
  climaxRimColor,
}: {
  progressRef: MutableRefObject<number>;
  climaxRimColor: string;
}) {
  const materialRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(climaxRimColor) },
      uIntensity: { value: 0 },
    }),
    [climaxRimColor],
  );

  useFrame((state) => {
    if (!materialRef.current) return;
    const p = progressRef.current;
    const blend = getRimColorBlend(p);
    const pulse = 0.65 + 0.35 * Math.pow(Math.sin(state.clock.elapsedTime * Math.PI * 0.25), 4);
    uniforms.uIntensity.value = blend * pulse;
  });

  return (
    <mesh position={[0, 1.0, 0]} scale={[1.6, 2.0, 1.6]} raycast={() => null}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        side={BackSide}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            // BackSide : la normale pointe vers l'intérieur ; on prend abs
            // du dot pour obtenir un fresnel "silhouette" symétrique quel
            // que soit le côté rendu. Power 5.0 = halo doux, très étalé
            // sur les bords, presque nul au centre — pas un cerceau net
            // (ce serait de l'hologramme, rejeté par Sylvain 25/08).
            float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 5.0);
            float alpha = fres * uIntensity;
            gl_FragColor = vec4(uColor * alpha, alpha);
          }
        `}
      />
    </mesh>
  );
}
