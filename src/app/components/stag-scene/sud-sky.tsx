/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'uniforms a 60 fps (meme precedent que xolotl-companion). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Color, ShaderMaterial, SRGBColorSpace, Texture, TextureLoader, type Fog, type Mesh } from "three";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";
import { getRevealFloor } from "@/lib/reveal-arc";
import { xiuhcoatlStore } from "./xiuhcoatl-store";

/**
 * SudSky (04/09, tissu du Sud). Le ciel de midi. Jusqu'ici le fond de la
 * scene est le noir du canvas : le brouillard teinte les objets lointains,
 * jamais le vide derriere eux. Au Sud, le go de Sylvain (« le fond de
 * page en plein midi, franchement clair ») exige un vrai ciel : un dome
 * (sphere vue de l'interieur, hors fog) dont l'HORIZON prend chaque frame
 * la couleur du brouillard (continuite parfaite avec les montagnes qui
 * se fondent dedans) et dont le ZENITH est plus profond, comme un ciel
 * reel. En haut de page le fog est noir : le dome est noir, c'est la nuit
 * des 400 etoiles (qui viendront s'y poser). Il s'eclaircit avec l'arc.
 * Sud seulement, en fondu ; ailleurs le fond reste noir.
 */

const RADIUS = 85; // camera far = 100
const ZENITH_DEEP = new Color("#0b3f6e");
/**
 * Le ciel de jour (05/09, Sylvain : « pour les nuages, je verrais plus une
 * texture de ciel bleu appliquee, a laquelle on donnerait une teinte plus
 * turquoise ») : une photographie equirectangulaire, « Kloofendal 48d
 * Partly Cloudy (Pure Sky) » de Greg Zaal et Jarod Guest, Poly Haven, CC0,
 * reduite a 2048 x 1024 (120 Ko). Elle remplace les nuages en sprites. Le
 * soleil de la photo (u = 0.584, 50 deg d'elevation, jamais dans le cadre)
 * est tourne sur l'azimut monde de NOTRE soleil (300 deg) pour qu'il n'y
 * ait qu'une seule source. Teinte turquoise : le sud est bleu-vert
 * (xoxouhqui) dans les sources.
 */
const SKY_URL = "/sky/sud-sky.jpg";
const SKY_SUN_U = 0.584;
const SKY_TINT = new Color(0.78, 1.0, 0.97);
const SKY_TINT_MIX = 0.65;

export default function SudSky() {
  const meshRef = useRef<Mesh>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const blendRef = useRef(direction === "turquoise" ? 1 : 0);
  const scratch = useMemo(() => new Color(), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        transparent: true,
        uniforms: {
          uHorizon: { value: new Color("#000000") },
          uZenith: { value: new Color("#000000") },
          uOpacity: { value: 0 },
          uSky: { value: null as Texture | null },
          uHasSky: { value: 0 },
          uDay: { value: 0 },
          uTint: { value: SKY_TINT.clone() },
          uTintMix: { value: SKY_TINT_MIX },
          uSkyOffset: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uHorizon;
          uniform vec3 uZenith;
          uniform float uOpacity;
          uniform sampler2D uSky;
          uniform float uHasSky;
          uniform float uDay;
          uniform vec3 uTint;
          uniform float uTintMix;
          uniform float uSkyOffset;
          varying vec3 vDir;
          void main() {
            // Elevation 0 a l'horizon, 1 au zenith ; sous l'horizon on garde
            // la couleur d'horizon (le sol est devant de toute facon).
            float e = clamp(vDir.y, 0.0, 1.0);
            float t = smoothstep(0.0, 0.85, e);
            vec3 col = mix(uHorizon, uZenith, t);
            // Le jour : la photographie de ciel, teintee turquoise, fondue
            // dans la couleur d'horizon (le brouillard) sur les premiers
            // degres pour que les montagnes s'y perdent comme avant.
            if (uHasSky > 0.5) {
              vec2 uv = vec2(fract(atan(vDir.z, vDir.x) / 6.2831853 + 0.5 + uSkyOffset), asin(clamp(vDir.y, -1.0, 1.0)) / 3.1415927 + 0.5);
              vec3 sky = texture2D(uSky, uv).rgb;
              sky = mix(sky, sky * uTint, uTintMix);
              float band = smoothstep(0.0, 0.1, e);
              vec3 day = mix(uHorizon, sky, band);
              col = mix(col, day, uDay);
            }
            gl_FragColor = vec4(col, uOpacity);
          }
        `,
      }),
    []
  );

  // La photographie de ciel, chargee une fois ; le dome reste en degrade
  // tant qu'elle n'est pas la.
  useEffect(() => {
    let disposed = false;
    const loader = new TextureLoader();
    loader.load(SKY_URL, (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      tex.colorSpace = SRGBColorSpace;
      material.uniforms.uSky.value = tex;
      material.uniforms.uHasSky.value = 1;
      // Azimut monde de notre soleil (direction-light, 300 deg) : angle du
      // shader = atan(z, x), u = angle / 2pi + 0.5 ; on aligne le soleil de
      // la photo dessus.
      const sunAz = (300 * Math.PI) / 180;
      const uSun = Math.atan2(Math.cos(sunAz), Math.sin(sunAz)) / (Math.PI * 2) + 0.5;
      material.uniforms.uSkyOffset.value = SKY_SUN_U - uSun;
    });
    return () => {
      disposed = true;
      const tex = material.uniforms.uSky.value as Texture | null;
      if (tex) tex.dispose();
    };
  }, [material]);

  useFrame((state) => {
    const south = direction === "turquoise";
    blendRef.current += ((south ? 1 : 0) - blendRef.current) * 0.06;
    const blend = blendRef.current;
    // Souffle chaud : monte avec le midi, Sud seulement, rien en reduced-motion.
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const ignite = getRevealFloor(sceneRefs?.progressRef.current ?? 0);
    // Porte de chaleur : rien avant l'impact du serpent sur l'anneau.
    const hit = xiuhcoatlStore.strikeHit;
    const gateU = hit >= 0 ? Math.min(1, (state.clock.elapsedTime - hit) / 0.8) : 0;
    xiuhcoatlStore.heatGate = gateU * gateU * (3 - 2 * gateU);
    xiuhcoatlStore.groundHeat = reduced ? 0 : blend * ignite * ignite * xiuhcoatlStore.heatGate;
    // Declencheur de la charge : au premier passage du climax (ignite > 0.7)
    // apres l'arrivee au Sud, une fois. Rearme en quittant le Sud.
    if (!south) {
      xiuhcoatlStore.strikeArmed = true;
      xiuhcoatlStore.strikeAt = -1;
      xiuhcoatlStore.strikeHit = -1;
      xiuhcoatlStore.heatGate = 0;
    } else if (xiuhcoatlStore.strikeArmed && ignite > 0.7 && !reduced) {
      xiuhcoatlStore.strikeArmed = false;
      xiuhcoatlStore.strikeAt = state.clock.elapsedTime;
    }
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.visible = blend > 0.01;
    if (!mesh.visible) return;
    const fog = state.scene.fog as Fog | null;
    const horizon = material.uniforms.uHorizon.value as Color;
    if (fog) horizon.copy(fog.color);
    // Zenith : la couleur d'horizon tiree vers un bleu profond, dosee par la
    // luminosite de l'horizon (nuit = noir partout).
    const lum = horizon.r * 0.3 + horizon.g * 0.59 + horizon.b * 0.11;
    scratch.copy(horizon).lerp(ZENITH_DEEP, 0.7 * Math.min(1, lum * 3));
    (material.uniforms.uZenith.value as Color).copy(scratch);
    material.uniforms.uOpacity.value = blend;
    // Le jour (la photo) apparait avec le soleil, pas avant : la nuit reste
    // le degrade noir des 400 etoiles.
    const d = Math.min(1, Math.max(0, (ignite - 0.3) / 0.45));
    material.uniforms.uDay.value = d * d * (3 - 2 * d);
    // Le dome suit la camera : toujours centre sur elle.
    mesh.position.copy(state.camera.position);
  });

  return (
    <mesh ref={meshRef} material={material} frustumCulled={false} renderOrder={-100} raycast={() => null}>
      <sphereGeometry args={[RADIUS, 32, 16]} />
    </mesh>
  );
}
