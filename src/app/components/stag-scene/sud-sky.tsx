/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'uniforms a 60 fps (meme precedent que xolotl-companion). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Color, LinearFilter, RepeatWrapping, ShaderMaterial, SRGBColorSpace, Texture, TextureLoader, type Fog, type Mesh } from "three";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";
import { horizonLuminance, skyDaylight, zenithInto, zenithSpread, ZENITH_SPREAD_DAY } from "@/lib/sky-zenith";
import { skyPhotoNeeded, type SkyPhotoDirection } from "@/lib/sky-photo";
import { whenRevealed } from "@/lib/apres-le-voile";
import { getRevealFloor } from "@/lib/reveal-arc";
import { dayAtArc } from "@/lib/arc-day";
import { remapWestArc } from "@/lib/ouest-arc";
import { dawnAtArc, eastDay } from "@/lib/est-arc";
import type { DirectionKey } from "./direction-colors";
import { xiuhcoatlStore } from "./xiuhcoatl-store";

/**
 * SudSky (04/09, tissu du Sud). Le ciel de midi. Jusqu'ici le fond de la
 * scene est le noir du canvas : le brouillard teinte les objets lointains,
 * jamais le vide derriere eux. Au Sud, le go de Sylvain (« le fond de
 * page en plein midi, franchement clair ») exige un vrai ciel : un dome
 * (sphere vue de l'interieur, hors fog) dont l'HORIZON prend chaque frame
 * la couleur du brouillard (continuite parfaite avec les montagnes qui
 * se fondent dedans) et dont le ZENITH est plus profond, comme un ciel
 * reel. En haut de page le fog est noir : au Sud le dome est noir, c'est la
 * nuit des 400 etoiles (qui viennent s'y poser) ; a l'Est il prend l'indigo
 * d'avant-aube, parce que rien ne s'y pose. Il s'eclaircit avec l'arc.
 * Sud seulement, en fondu ; ailleurs le fond reste noir.
 */

const RADIUS = 85; // camera far = 100
const ZENITH_DEEP = new Color("#0b3f6e");
/**
 * L'AVANT-JOUR DE L'EST (09/09). Le zenith de l'Est quand l'horizon est
 * encore noir. Sans lui, la bande haute du cadre d'arrivee de la page
 * Services valait 12/15/18 : un trou, et non un ciel. Un ciel d'avant-aube
 * est indigo, et c'est sur lui seulement que les montagnes de glace se
 * detachent.
 *
 * Pourquoi l'Est et pas le Sud : la nuit du Sud est celle des 400 etoiles,
 * qui viennent s'y poser, et un fond noir la sert. A l'Est rien ne s'y pose
 * -- l'etoile du matin n'est allumee que si Venus est REELLEMENT du matin
 * (lib/venus), ce qui n'est pas le cas de tout l'automne : au 09/09 son
 * elongation vaut +42,9 deg, elle est du soir, et elle ne repasse du matin
 * que vers le 08/11. Le ciel, lui, doit tenir dans les deux cas.
 */
/*
 * La valeur est CALCULEE et non tatonnee (09/09). Premier essai #101a3a :
 * le haut du cadre passait de 10 a 21 sur 255 de bleu, soit un indice de
 * ciel et non un ciel. La chaine vignette + tone mapping ne laisse passer
 * que 19 % de la couleur du shader a cet endroit du cadre (mesure : 0,038
 * en sortie de shader pour 0,0074 lineaire a l ecran) ; pour lire 42 sur
 * 255, il faut donc 0,14 en lineaire, soit #1e3069 en sRGB, a teinte
 * constante. L horizon, lui, reste noir : le brouillard garde la
 * continuite avec les montagnes qui s y fondent.
 */
const PREDAWN_ZENITH = new Color("#1e3069");
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
/** Le dome par direction (06/09) : le Sud (midi turquoise, soleil a l'est,
 * azimut 300 deg) et l'Ouest (fin d'apres-midi, la photo tiree vers le
 * corail, soleil en miroir a l'ouest). Ailleurs, pas de dome. */
// Le type est bati sur SKY_PHOTO_DIRECTIONS (lib/sky-photo) : la decision
// d'AFFICHER et la decision de CHARGER ne peuvent plus divorcer. Ajouter une
// direction ici sans l'ajouter la-bas, ou l'inverse, ne compile pas.
const SKY_LOOK: Record<SkyPhotoDirection, { tint: Color; tintMix: number; sunAzimuthDeg: number; dusk: Color; night?: Color }> = {
  turquoise: { tint: SKY_TINT, tintMix: SKY_TINT_MIX, sunAzimuthDeg: 300, dusk: new Color("#000000") },
  cendre: { tint: new Color(1.0, 0.86, 0.8), tintMix: 0.55, sunAzimuthDeg: 60, dusk: new Color("#6a2e4f") },
  // L'Est (06/09) : l'aube, la photo tiree vers l'or, soleil face au regard
  // de p 0,55 (azimut 18), bande rouge de l'aube a l'horizon.
  dore: { tint: new Color(1.0, 0.9, 0.72), tintMix: 0.5, sunAzimuthDeg: 18, dusk: new Color("#8a2a24"), night: PREDAWN_ZENITH },
};

export default function SudSky() {
  const meshRef = useRef<Mesh>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const blendRef = useRef(skyPhotoNeeded(direction) ? 1 : 0);
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
          uZenithSpread: { value: ZENITH_SPREAD_DAY },
          uOpacity: { value: 0 },
          uSky: { value: null as Texture | null },
          uHasSky: { value: 0 },
          uDay: { value: 0 },
          uTint: { value: SKY_TINT.clone() },
          uTintMix: { value: SKY_TINT_MIX },
          uSkyOffset: { value: 0 },
          uDusk: { value: 0 },
          uDuskColor: { value: new Color("#000000") },
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
          uniform float uZenithSpread;
          uniform float uOpacity;
          uniform sampler2D uSky;
          uniform float uHasSky;
          uniform float uDay;
          uniform vec3 uTint;
          uniform float uTintMix;
          uniform float uSkyOffset;
          uniform float uDusk;
          uniform vec3 uDuskColor;
          varying vec3 vDir;
          void main() {
            // Elevation 0 a l'horizon, 1 au zenith ; sous l'horizon on garde
            // la couleur d'horizon (le sol est devant de toute facon).
            float e = clamp(vDir.y, 0.0, 1.0);
            // Jusqu'ou monte le degrade (09/09). De jour, 0,85 : le zenith
            // est la couleur du ciel tout en haut. La nuit, beaucoup plus
            // bas, pour que le ciel d'avant-jour occupe la bande REELLEMENT
            // vue -- le regard de l'Est est pique, le haut du cadre n'est
            // qu'a 14 degres au-dessus de l'horizon. Mesure avant : 2/255
            // de bleu dans la colonne de ciel pur, malgre un zenith indigo.
            float t = smoothstep(0.0, uZenithSpread, e);
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
              // Le melange DECROIT avec l'elevation (09/09). Avant,
              // mix(col, day, uDay) remplacait ENTIEREMENT le degrade des
              // que uDay atteignait 1 : la photo etant echantillonnee sur une
              // tranche d'elevation etroite (champ de 45 degres), le ciel du
              // Sud devenait un aplat. Mesure a l'ecart-type sur la bande de
              // ciel : 30/31/42 par canal au Sud contre 40/40/40 a l'Est.
              // Desormais la photo apporte la brume et les nuages pres de
              // l'horizon, la ou ils comptent, et le degrade garde sa
              // profondeur au zenith.
              float dayWeight = uDay * mix(1.0, 0.4, t);
              col = mix(col, day, dayWeight);
            }
            // Le crepuscule de l'Ouest : une bande mauve-corail posee sur
            // l'horizon, qui monte quand le soleil est tombe.
            col += uDuskColor * (1.0 - smoothstep(0.0, 0.32, e)) * uDusk;
            gl_FragColor = vec4(col, uOpacity);
          }
        `,
      }),
    []
  );

  // Lecture externe (verifications Playwright, console) : meme motif que
  // frostUniforms. Une couleur de ciel calculee par image est indebogable
  // depuis l'image seule -- le 09/09, la bande haute de l'Est n'a pas bouge
  // d'un poil apres un correctif du zenith, et seuls les uniformes ont pu
  // dire pourquoi : le degrade n'atteint pas le haut du cadre.
  useEffect(() => {
    (window as unknown as { __nahualSky?: unknown }).__nahualSky = material.uniforms;
  }, [material]);

  // La photographie de ciel, chargee une fois ; le dome reste en degrade
  // tant qu'elle n'est pas la.
  //
  // QUAND (10/09) : tout de suite si cette page l'affiche, APRES LE VOILE
  // sinon. Mesure : le voile se leve 1,1 s apres le dernier octet recu, donc
  // 120 Ko charges pendant le chargement retardent l'ouverture, et au Centre
  // comme au Nord cette texture ne sera jamais affichee. On ne l'abandonne
  // pas pour autant : elle part des que le voile est leve, pour qu'un voyage
  // cardinal vers le Sud la trouve deja en cache.
  useEffect(() => {
    let disposed = false;
    const loader = new TextureLoader();
    const charger = () => {
      if (disposed) return;
      loader.load(SKY_URL, (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = SRGBColorSpace;
        // La jointure (retour Sylvain) : en ClampToEdge le bord u = 0 / u = 1
        // ne se referme pas, et les mipmaps choisissent un niveau minuscule
        // sur la discontinuite de fract() : on boucle la texture et on coupe
        // les mipmaps.
        tex.wrapS = RepeatWrapping;
        tex.wrapT = RepeatWrapping;
        tex.minFilter = LinearFilter;
        tex.magFilter = LinearFilter;
        tex.generateMipmaps = false;
        tex.needsUpdate = true;
        material.uniforms.uSky.value = tex;
        material.uniforms.uHasSky.value = 1;
      });
    };

    let arret: (() => void) | undefined;
    if (skyPhotoNeeded(direction)) {
      charger();
    } else {
      arret = whenRevealed(charger);
    }
    return () => {
      disposed = true;
      arret?.();
      const tex = material.uniforms.uSky.value as Texture | null;
      if (tex) tex.dispose();
    };
  }, [material, direction]);

  useFrame((state) => {
    const south = direction === "turquoise";
    const look = skyPhotoNeeded(direction) ? SKY_LOOK[direction] : undefined;
    blendRef.current += ((look ? 1 : 0) - blendRef.current) * 0.06;
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
    // luminosite de l'horizon. La nuit, le zenith prend la couleur
    // d'avant-jour de la page s'il y en a une, l'horizon sinon : sans
    // couleur de nuit, la regle est exactement celle d'origine (identite
    // verifiee dans lib/sky-zenith.test.ts, pour que le Sud et l'Ouest ne
    // bougent pas d'un poil).
    const pNow = sceneRefs?.progressRef.current ?? 0;
    // La part de JOUR qui dose tout ca. Au Sud et a l'Ouest, la luminosite
    // du brouillard la dit tres bien. A l'Est, NON, et la mesure a corrige
    // mon premier branchement : a p = 0,62 le soleil est leve depuis
    // longtemps et le brouillard de l'Est vaut encore [0,0003 0,0003 0]
    // -- il ne s'eclaircit jamais, parce que le monde de glace tient sa
    // clarte de lui-meme et non du ciel. Branche sur cette luminosite,
    // l'avant-jour ne s'eteignait donc jamais. C'est l'arc de la page qui
    // le sait : eastDay vaut 0 tant que le monde est gele, 0,3 quand le
    // soleil parait, 1 a la fin.
    const daylight = direction === "dore" ? eastDay(pNow) : skyDaylight(horizonLuminance(horizon));
    zenithInto(material.uniforms.uZenith.value as Color, horizon, ZENITH_DEEP, look?.night ?? null, daylight);
    material.uniforms.uZenithSpread.value = zenithSpread(Boolean(look?.night), daylight);
    material.uniforms.uOpacity.value = blend;
    if (look) {
      (material.uniforms.uTint.value as Color).copy(look.tint);
      material.uniforms.uTintMix.value = look.tintMix;
      (material.uniforms.uDuskColor.value as Color).copy(look.dusk);
      // Azimut monde du soleil de la page : angle du shader = atan(z, x),
      // u = angle / 2pi + 0.5 ; on aligne le soleil de la photo dessus.
      const sunAz = (look.sunAzimuthDeg * Math.PI) / 180;
      const uSun = Math.atan2(Math.cos(sunAz), Math.sin(sunAz)) / (Math.PI * 2) + 0.5;
      material.uniforms.uSkyOffset.value = SKY_SUN_U - uSun;
    }
    // Le jour (la photo) apparait avec le soleil, pas avant : la nuit reste
    // le degrade noir des 400 etoiles. A l'Ouest, le jour de l'arc inverse.
    const day = dayAtArc(direction, sceneRefs?.progressRef.current ?? 0);
    const d = Math.min(1, Math.max(0, (day - 0.3) / 0.45));
    material.uniforms.uDay.value = d * d * (3 - 2 * d);
    material.uniforms.uDusk.value = direction === "cendre" ? remapWestArc(pNow).dusk : direction === "dore" ? dawnAtArc(pNow) : 0;
    // Le dome suit la camera : toujours centre sur elle.
    mesh.position.copy(state.camera.position);
  });

  return (
    <mesh ref={meshRef} material={material} frustumCulled={false} renderOrder={-100} raycast={() => null}>
      <sphereGeometry args={[RADIUS, 32, 16]} />
    </mesh>
  );
}
