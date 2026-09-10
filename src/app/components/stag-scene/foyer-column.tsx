/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d uniforms a 60 fps (meme precedent que sun-beam). */
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, CylinderGeometry, DoubleSide, Mesh, ShaderMaterial } from "three";
import { columnRise } from "@/lib/zenith-arc";
import { copalIntensity } from "@/lib/copal";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * LA COLONNE DU FOYER (E2, 10/09).
 *
 * Le Centre est Tlalxicco, le nombril du monde, et Xiuhtecuhtli y tient le
 * feu. Cinq braseros brulent deja au bord de la Piedra (copal-braziers,
 * remontes ici le 08/09 parce qu'au Centre le feu n'est plus un ornement
 * mais le sujet) ; leur fumee monte a 2,6 u et s'arrete la.
 *
 * Ce qui manquait est ce que ces cinq offrandes deviennent ensemble : UNE
 * colonne, qui prend au-dessus de la tete du cerf et monte jusqu'au ciel.
 * C'est elle que le regard suit quand la camera se leve vers le zenith
 * (zenith-arc) : la colonne part AVANT le regard, pour qu'il ait quelque
 * chose a suivre plutot que de decouvrir un cadre vide.
 *
 * Elle commence a 2,6 u, exactement la ou la fumee des braseros s'eteint,
 * et jamais plus bas : la silhouette du cerf ne doit pas etre traversee
 * par un voile additif.
 *
 * Rendu : un cylindre ouvert en volume additif, plus dense la ou il prend
 * et dilue en montant. Le shader est celui du puits de lumiere de l'Est
 * (sun-beam), avec deux differences qui font toute la lecture : la densite
 * part de zero a la base au lieu d'y etre maximale (une fumee nait, un
 * rayon tombe), et la couleur passe de la braise au gris du copalli en
 * montant.
 */

/** La fumee des braseros s'arrete a COPAL.riseHeight = 2,6. */
const BASE_Y = 2.6;
const HEIGHT = 24;
const BOTTOM_RADIUS = 1.1;
const TOP_RADIUS = 3.4;
/** La braise, en bas, et le copalli qui refroidit en montant. */
const EMBER = new Color("#ff9a44");
const ASH = new Color("#cfc7bd");

const VERTEX = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec2 vUv2;
  void main() {
    vUv2 = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uEmber;
  uniform vec3 uAsh;
  varying vec3 vN;
  varying vec3 vV;
  varying vec2 vUv2;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    // Epaisseur traversee : pleine au milieu du cylindre, nulle sur les bords.
    float thick = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
    // Volutes qui MONTENT (le signe du temps) : deux echelles incommensurables.
    float v1 = 0.5 + 0.5 * noise(vec2(vUv2.x * 7.0, vUv2.y * 2.6 - uTime * 0.05));
    float v2 = 0.65 + 0.35 * noise(vec2(vUv2.x * 17.0 + 3.0, vUv2.y * 6.0 - uTime * 0.085));
    // Elle NAIT a la base (au contraire d'un rayon, qui y est maximal) et
    // se dilue en montant.
    float along = smoothstep(0.0, 0.16, vUv2.y) * mix(1.0, 0.16, vUv2.y);
    float a = 0.5 * thick * v1 * v2 * along * uIntensity;
    gl_FragColor = vec4(mix(uEmber, uAsh, smoothstep(0.0, 0.35, vUv2.y)) * a, a);
  }
`;

export default function FoyerColumn() {
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const meshRef = useRef<Mesh>(null);
  const geometry = useMemo(
    () => new CylinderGeometry(TOP_RADIUS, BOTTOM_RADIUS, HEIGHT, 24, 1, true),
    [],
  );
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uEmber: { value: EMBER.clone() },
          uAsh: { value: ASH.clone() },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    [],
  );

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const jade = direction === "jade";
    const p = sceneRefs?.progressRef.current ?? 0;
    // L'offrande (copal) porte la colonne : si le feu est bas, la colonne
    // l'est aussi. Une seule verite sur l'intensite du foyer.
    const force = jade ? columnRise(p) * copalIntensity(p, 0) : 0;
    mesh.visible = force > 0.002;
    material.uniforms.uIntensity.value = force;
    // En mouvement reduit, les volutes se figent (la colonne reste).
    if (!sceneRefs?.reducedMotionRef.current) material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} position={[0, BASE_Y + HEIGHT / 2, 0]} visible={false} />
  );
}
