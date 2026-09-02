/* eslint-disable react-hooks/purity -- pattern gamedev r3f useFrame + init particules Math.random dans useMemo : mutations 60 fps + random init sont legitimes en 3D, les regles React 19 sont trop strictes pour ce contexte. */
"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type Points, type ShaderMaterial } from "three";

/** Sprite de volute Kenney Particle Pack (CC0, kenney.nl) : une vraie
 * fumee organique au lieu de disques procéduraux qui se lisaient comme
 * des flocons (retour Sylvain 01/09). */
const SMOKE_SPRITE = "/img/particles/smoke_07.png";

/**
 * Nord / Mictlantecuhtli (28/08 task #43, refonte 01/09 etage 4 sprint
 * identites : fiche Mictlampa du Codex Nahual). Hierarchie de la scene :
 * le miroir fumant (lead, cf PiedraGround tezcatl) -> le vent
 * d'Itzehecayan (contre-chant) -> fumee, brume, glint (tissu).
 *
 * Trois familles dans un seul Points system (aKind) :
 *  - 0 fumee : monte lentement depuis les BORDS du disque-miroir (la
 *    fumee du tezcatl, plus "dense contemplative" du commit d'origine
 *    83b35a4 : intention accomplie, pas renversee).
 *  - 1 lames d'obsidienne : streaks fins ORIENTES portes par un vent
 *    commun a peine perceptible (arbitrage 01/09 : la derive lente
 *    reconcilie l'apesanteur contemplative d'origine et l'Itzehecayan).
 *    Le seul element aux aretes dures de tout le site.
 *  - 2 brume au sol : nappes larges tres douces pres du sol, le fleuve
 *    Chiconahuapan suggere (celui que Xolotl aide a traverser).
 *
 * Evenement rare : ~2 lames porteuses (seed > 0.96) s'allument
 * fugitivement en dore cempasuchil : la justification etait deja dans
 * direction-colors.ts ("la fleur qui guide les ames garde sa vraie
 * couleur contre le violet nord/mort"). La memoire que le vent porte.
 *
 * Tempo : uTime est ralenti a 0.6 (fiche : le temps s'epaissit chez
 * les morts, le Mictlan se traverse en 4 ans).
 */
// 60 -> 40 fumees (retour Sylvain 01/09 "c'est quoi ces flocons" : en
// points ronds separes la fumee se lisait comme de la neige : moins de
// points, beaucoup plus gros et plus faibles, qui fusionnent en volutes)
// 40 -> 0 (02/09) : la fumee du tezcatl est desormais une vraie simulation
// de fluide (tezcatl-smoke.tsx), les sprites de fumee etaient redondants
// (arbitrage Sylvain "oui redondants, tu peux les retirer"). La famille
// reste cablee (shader, sprite) pour un eventuel retour, a cout nul.
const SMOKE_COUNT = 0;
// 55 -> 70 (02/09, retour Sylvain "je ne vois pas les lames d'obsidienne
// volantes, pourtant tres importantes pour le Mictlan") : plus de lames,
// plus longues, plus claires (en additif sur un Nord desormais expose,
// le violet vif se noyait).
// 70 -> 0 (02/09 soir) : les lames sont desormais de vrais modeles
// (obsidian-blades.tsx, InstancedMesh). La famille sprite reste cablee.
const SHARD_COUNT = 0;
const MIST_COUNT = 36;
const TOTAL = SMOKE_COUNT + SHARD_COUNT + MIST_COUNT;

/** Le temps s'epaissit chez les morts (fiche Mictlampa, etage 5 applique
 * localement : ce composant est le seul concerne pour l'instant). */
const NORTH_TIME_SCALE = 0.6;

export default function NorthMictlantecuhtli({ alphaRef }: { alphaRef: MutableRefObject<number> }) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const smokeTexture = useTexture(SMOKE_SPRITE);

  const { geometry, uniforms } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(TOTAL * 3);
    const seeds = new Float32Array(TOTAL);
    const lifespans = new Float32Array(TOTAL);
    const kinds = new Float32Array(TOTAL);
    for (let i = 0; i < TOTAL; i++) {
      const isSmoke = i < SMOKE_COUNT;
      const isShard = !isSmoke && i < SMOKE_COUNT + SHARD_COUNT;
      const angle = Math.random() * Math.PI * 2;
      if (isSmoke) {
        // Fumee : nait sur un anneau aux bords du disque-miroir
        // (PiedraGround GROUND_RADIUS=3), pas n'importe ou.
        const radius = 1.9 + Math.random() * 1.5;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = 0.05;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
        lifespans[i] = 9.0 + Math.random() * 5.0;
        kinds[i] = 0;
      } else if (isShard) {
        // Lames : reparties dans le volume, le vertex shader pilote la
        // derive en X (le vent commun), la position stockee donne Y/Z.
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0.4 + Math.random() * 3.4;
        positions[i * 3 + 2] = -2 + Math.random() * 4.5;
        lifespans[i] = 1; // inutilise pour les lames (cycle par le vent)
        kinds[i] = 1;
      } else {
        // Brume : nappes pres du sol, anneau large autour du miroir.
        const radius = 2.0 + Math.random() * 1.8;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = 0.04 + Math.random() * 0.22;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
        lifespans[i] = 14.0 + Math.random() * 8.0;
        kinds[i] = 2;
      }
      seeds[i] = Math.random();
    }
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    geo.setAttribute("aLifespan", new BufferAttribute(lifespans, 1));
    geo.setAttribute("aKind", new BufferAttribute(kinds, 1));
    return {
      geometry: geo,
      uniforms: {
        uAlpha: { value: 0 },
        uTime: { value: 0 },
        uSmokeColor: { value: new Color("#3a2f4a") }, // gris violet dense
        uShardColor: { value: new Color("#cfc2ff") }, // eclat froid de l'obsidienne (02/09, ex #6b3fa8 noye)
        uMistColor: { value: new Color("#4a4060") }, // brume un ton au-dessus de la fumee
        uGlintColor: { value: new Color("#ffb400") }, // cempasuchil (accent documente)
        uSmokeTex: { value: null as unknown },
      },
    };
  }, []);


  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uAlpha.value = alphaRef.current;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime * NORTH_TIME_SCALE;
    // Texture chargee par useTexture (suspend) : injectee ici, jamais
    // pendant le render (react-hooks/immutability).
    if (materialRef.current.uniforms.uSmokeTex.value !== smokeTexture) {
      materialRef.current.uniforms.uSmokeTex.value = smokeTexture;
    }
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
          attribute float aKind;
          uniform float uTime;
          varying float vAlpha;
          varying float vKind;
          varying float vGlint;
          varying float vRot;
          varying float vLife;

          void main() {
            vec3 pos = position;
            vGlint = 0.0;
            vRot = 0.0;
            vLife = 0.0;
            if (aKind < 0.5) {
              // Fumee : monte lente ease-out depuis les bords du miroir,
              // drift lateral doux. La volute tourne lentement sur
              // elle-meme et S'ETALE en montant (vLife pilote la taille
              // et la dilution : comportement de vraie fumee).
              float t = mod(uTime + aSeed * aLifespan, aLifespan) / aLifespan;
              pos.y += pow(t, 0.7) * 4.2;
              pos.x += sin(uTime * 0.2 + aSeed * 6.28) * 0.4 * t;
              pos.z += cos(uTime * 0.15 + aSeed * 6.28) * 0.4 * t;
              vAlpha = smoothstep(0.0, 0.2, t) * (1.0 - smoothstep(0.55, 1.0, t));
              vRot = aSeed * 6.28 + uTime * (0.12 + aSeed * 0.1);
              vLife = t;
            } else if (aKind < 1.5) {
              // Lame : derive commune Est->Ouest lente mais LISIBLE
              // (l'Itzehecayan en contre-chant). 0.08-0.18 etait
              // imperceptible (retour Sylvain 01/09 "je pensais
              // qu'elles allaient bouger") : x3, traverse en ~25-60s.
              float speed = 0.25 + aSeed * 0.30;
              pos.x = 6.0 - mod(uTime * speed + aSeed * 12.0, 12.0);
              pos.y += sin(uTime * 0.25 + aSeed * 6.28) * 0.25;
              pos.z += cos(uTime * 0.2 + aSeed * 5.0) * 0.2;
              // Fade aux bords de la traversee
              vAlpha = smoothstep(0.0, 0.18, 1.0 - abs(pos.x) / 6.0) * 0.9 + 0.1;
              // Glint cempasuchil : ~2 lames porteuses (seed > 0.96),
              // pulse court sur un cycle long (~75s au tempo 0.6).
              if (aSeed > 0.96) {
                float phase = mod(uTime * 0.022 + aSeed * 13.0, 1.0);
                vGlint = smoothstep(0.0, 0.015, phase) * (1.0 - smoothstep(0.03, 0.05, phase));
              }
            } else {
              // Brume : respiration tres lente pres du sol, le fleuve.
              float t = mod(uTime + aSeed * aLifespan, aLifespan) / aLifespan;
              pos.x += sin(uTime * 0.08 + aSeed * 6.28) * 0.5;
              pos.z += cos(uTime * 0.06 + aSeed * 5.2) * 0.5;
              pos.y += sin(uTime * 0.12 + aSeed * 4.1) * 0.05;
              vAlpha = smoothstep(0.0, 0.25, t) * (1.0 - smoothstep(0.7, 1.0, t));
              vRot = aSeed * 6.28 + uTime * 0.05;
              vLife = 0.5;
            }
            vKind = aKind;

            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;
            // Fumee : volute qui s'etale en montant (200 -> 380), lame
            // nette agrandie, brume tres large
            float sz = aKind < 0.5 ? mix(200.0, 380.0, vLife) : (aKind < 1.5 ? 120.0 : 340.0);
            gl_PointSize = sz / -mv.z;
          }
        `}
        fragmentShader={`
          uniform vec3 uSmokeColor;
          uniform vec3 uShardColor;
          uniform vec3 uMistColor;
          uniform vec3 uGlintColor;
          uniform float uAlpha;
          uniform sampler2D uSmokeTex;
          varying float vAlpha;
          varying float vKind;
          varying float vGlint;
          varying float vRot;
          varying float vLife;

          void main() {
            if (uAlpha < 0.01) discard;
            vec2 uv = gl_PointCoord - 0.5;
            float shape;
            vec3 col;
            float aMul = 1.0;
            if (vKind < 0.5) {
              // Fumee : sprite de volute (Kenney CC0) tourne par
              // particule : une vraie fumee organique, pas des disques.
              // La volute se dilue en s'etalant (vLife).
              float c = cos(vRot), s = sin(vRot);
              vec2 ruv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;
              shape = texture2D(uSmokeTex, ruv).a;
              col = uSmokeColor;
              aMul = mix(0.75, 0.35, vLife);
            } else if (vKind < 1.5) {
              // Lame : streak fin ORIENTE le long du vent (rotation fixe
              // -0.12 rad puis ecrasement fort du petit axe). La seule
              // arete dure du site.
              float c = cos(-0.12), s = sin(-0.12);
              vec2 ruv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
              // Lame plus longue et plus fine (02/09) : ecrasement x7,
              // arete nette, coeur brillant.
              float sd = length(vec2(ruv.x, ruv.y * 7.0));
              shape = 1.0 - smoothstep(0.04, 0.42, sd);
              shape += pow(max(shape, 0.0), 3.0) * 0.9;
              col = mix(uShardColor, uGlintColor, vGlint);
              aMul = 1.4 + vGlint * 1.6;
            } else {
              // Brume : meme sprite de volute, quasi immobile, tres
              // dilue : la nappe du fleuve
              float c = cos(vRot), s = sin(vRot);
              vec2 ruv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;
              shape = texture2D(uSmokeTex, ruv).a;
              col = uMistColor;
              aMul = 0.4;
            }
            float a = shape * vAlpha * uAlpha * aMul;
            gl_FragColor = vec4(col * a, 1.0);
          }
        `}
      />
    </points>
  );
}
