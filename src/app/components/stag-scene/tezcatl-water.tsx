/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation des uniforms et de la sim 60 fps legitime en 3D (meme precedent que stag-mirror). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, DoubleSide, MeshPhysicalMaterial, Plane, ShaderMaterial, Vector2, Vector3, type Mesh, type Object3D } from "three";
import { getMictlanSky } from "./mictlan-sky";
import { hoofDrop, pointerSplat, smokeGate, worldToSimUv, type SimUv } from "@/lib/tezcatl-fluid";
import { TezcatlRippleSim } from "./tezcatl-ripple-sim";
import { TEZCATL_EXTENT, WATER_LEVEL, ZERO_TEXTURE, tezcatlStore } from "./tezcatl-store";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * TezcatlWater (02/09, Nord). Une nappe d'eau CALME de ~20 cm sur toute la
 * surface, sur un simulateur d'EAU (equation des ondes,
 * tezcatl-ripple-sim.ts). Arbitrages Sylvain 02/09 : "20 cm d'eau et
 * lorsqu'on bougerait la souris, ca ferait des ondes dedans", "l'eau doit
 * etre calme", "moi je voulais un simulateur d'eau". Le fleuve
 * Chiconahuapan de la fiche Mictlampa : le cerf a les pattes dedans, son
 * reflet est dessous.
 *
 * Rendu : plan translucide sombre, miroir noir au repos, normale inclinee
 * par le gradient du champ de hauteur : des ANNEAUX qui partent de la
 * souris, se propagent et s'amortissent. Lisible par le speculaire de la
 * top light froide du puits sur les cretes et le Fresnel. Le reflet
 * menteur, sous l'eau, est refracte par les memes ondes (via
 * tezcatlStore).
 *
 * Les sabots du cerf aussi (retour Sylvain 02/09 "lorsque le cerf bouge
 * la patte ca doit faire une onde") : les os du bas des pattes sont
 * suivis en position monde, un sabot qui glisse dans l'eau ou qui y
 * entre depose une goutte (regle pure hoofDrop, testee).
 *
 * Et le reflet menteur du tonalli (element D, 02/09) : la souris a un
 * double, symetrique par rapport au cerf, qui marche sur l'eau de
 * l'autre cote et y fait ses propres ondes (un peu plus faibles). Le
 * halo de revelation miroir du shader cursor-reveal existe aussi, mais
 * le Nord etant expose il ne se voit presque pas : c'est l'eau qui rend
 * le double visible ("je ne vois pas le second halo", retour Sylvain).
 *
 * Nord seulement, meme gate que le reflet. Reduced-motion : eau plate
 * (pas de gouttes), toujours visible. Mobile : grille divisee par deux.
 */

const EXTENT = TEZCATL_EXTENT;
const WATER_OPACITY = 0.22; // 0.3 -> 0.22 (02/09, sous-exposition : la nappe ne doit pas boucher le sol)
/** La nappe est un BASSIN circulaire (retour Sylvain 02/09 "bizarre
 * d'avoir une surface carree, plutot une sorte de cercle") : rayon monde
 * du bassin, bord doux sur les derniers 12%. La grille de simulation
 * reste carree (EXTENT), seul l'affichage est rond. */
const WATER_RADIUS = 6.4;
/** Margelle d'obsidienne (03/09, retour Sylvain "on a du mal a voir la
 * limite de l'eau, c'est le gros defaut de la scene, on doit mettre une
 * vraie delimitation") : un anneau noir poli qui borde le bassin, et
 * dans le shader de la nappe une bande de rive plus claire contre lui.
 * Le tezcatl devient une vasque : le cerf a les pattes DANS une eau qui
 * a un bord, les lames volent AU-DESSUS d'un bassin. */
const RIM_INNER = WATER_RADIUS - 0.12;
const RIM_OUTER = WATER_RADIUS + 0.38;
const RIM_HEIGHT = 0.09;
const MARGELLE_COLOR = new Color("#0d0a16");
const WATER_COLOR = new Color("#0b0714");
const SPEC_COLOR = new Color("#cfc6f2");
const RIM_COLOR = new Color("#5a4a8a");
const LIGHT_DIR = new Vector3(0.25, 1, 0.35).normalize(); // la top light froide du puits
const WATER_PLANE = new Plane(new Vector3(0, 1, 0), -WATER_LEVEL);
/** Amplitude des gouttes en fonction de la vitesse de la souris. */
// 0.3/0.12 -> 0.45/0.18 (02/09, retour Sylvain "je ne le vois pas") :
// plus lisible en live, toujours fin.
const DROP_GAIN = 0.45;
const DROP_MAX = 0.18;
/** Le double du visiteur (reflet menteur) fait des ondes un peu plus
 * faibles, symetriques par rapport au cerf (origine). */
const MIRROR_DROP_SCALE = 0.75;
/** Pente de la surface par unite de gradient de hauteur (plus haut :
 * les ondes fines restent lisibles malgre leur faible amplitude). */
const NORMAL_GAIN = 7.0;
/** Os du bas des pattes du stag Quaternius (cf inspection GLB 02/09,
 * "FrontLowerLeg.L" etc.) : leur position monde vaut pour le sabot.
 * GLTFLoader retire les points des noms (PropertyBinding.sanitizeNodeName),
 * d'ou les noms sans point ici. */
const HOOF_BONES = ["FrontLowerLegL", "FrontLowerLegR", "BackLowerLegL", "BackLowerLegR"];
/** Le cerf arrive par Suspense : on recherche ses os toutes les N frames
 * tant qu'ils ne sont pas la, jamais a chaque frame. */
const HOOF_LOOKUP_EVERY = 60;
/** Le bout du sabot est sous l'os du bas de patte (mesure 02/09 : os avant
 * a y=0.42, arriere a y=0.52 pour des sabots au sol a y~0). */
const HOOF_TIP_OFFSET = 0.45;

export default function TezcatlWater() {
  const meshRef = useRef<Mesh>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const { gl } = useThree();
  const opacityRef = useRef(0);
  const prevPointerRef = useRef<SimUv | null>(null);
  const hitRef = useRef(new Vector3());
  const accRef = useRef(0);
  const hoovesRef = useRef<{ bone: Object3D; prev: Vector3 | null }[] | null>(null);
  // Souris lue au niveau FENETRE (02/09, retour Sylvain "je ne vois ces
  // ondes que lorsque je tourne la camera") : le contenu de la page
  // recouvre le canvas et lui vole les pointermove, state.pointer de r3f
  // ne bougeait que dans les trous. Meme approche que cursor-reveal.
  const pointerNdcRef = useRef<Vector2 | null>(null);
  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      if (!pointerNdcRef.current) pointerNdcRef.current = new Vector2();
      pointerNdcRef.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);
  const hoofLookupRef = useRef(0);
  const hoofPosRef = useRef(new Vector3());

  const lowPerf = sceneRefs ? !sceneRefs.perfProfile.postFx : false;
  const sim = useMemo(() => new TezcatlRippleSim(gl, lowPerf ? 256 : 512), [gl, lowPerf]);
  const rimRef = useRef<Mesh>(null);
  const rimTopRef = useRef<Mesh>(null);
  const rimMaterial = useMemo(() => {
    const m = new MeshPhysicalMaterial({
      color: MARGELLE_COLOR,
      metalness: 0.75,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.4,
      transparent: true,
      opacity: 0,
    });
    const sky = getMictlanSky();
    if (sky) m.envMap = sky;
    return m;
  }, []);
  useEffect(() => () => rimMaterial.dispose(), [rimMaterial]);
  useEffect(
    () => () => {
      sim.dispose();
      tezcatlStore.ripple = ZERO_TEXTURE;
      tezcatlStore.rippleTexel = 1;
    },
    [sim]
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uHeight: { value: sim.heightTexture },
          uTexel: { value: sim.texel },
          uOpacity: { value: 0 },
          uColor: { value: WATER_COLOR },
          uSpec: { value: SPEC_COLOR },
          uRim: { value: RIM_COLOR },
          uLightDir: { value: LIGHT_DIR },
          uNormalGain: { value: NORMAL_GAIN },
          // Reflet de la braise de Xolotl (03/09) : position monde + force.
          uEmberPos: { value: new Vector3(0, 0, 0) },
          uEmberStrength: { value: 0 },
          uEmberColor: { value: new Color("#ff8a1a") },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        vertexShader: `
          varying vec3 vWorldPos;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorldPos = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          uniform sampler2D uHeight;
          uniform float uTexel;
          uniform float uOpacity;
          uniform vec3 uColor;
          uniform vec3 uSpec;
          uniform vec3 uRim;
          uniform vec3 uLightDir;
          uniform float uNormalGain;
          uniform vec3 uEmberPos;
          uniform float uEmberStrength;
          uniform vec3 uEmberColor;
          varying vec3 vWorldPos;
          const float EXTENT = ${EXTENT.toFixed(1)};
          const float RADIUS = ${WATER_RADIUS.toFixed(1)};
          void main() {
            vec2 uv = vWorldPos.xz / (2.0 * EXTENT) + 0.5;
            float hL = texture2D(uHeight, uv - vec2(uTexel, 0.0)).x;
            float hR = texture2D(uHeight, uv + vec2(uTexel, 0.0)).x;
            float hB = texture2D(uHeight, uv - vec2(0.0, uTexel)).x;
            float hT = texture2D(uHeight, uv + vec2(0.0, uTexel)).x;
            vec3 n = normalize(vec3(-(hR - hL) * uNormalGain, 1.0, -(hT - hB) * uNormalGain));
            vec3 view = normalize(cameraPosition - vWorldPos);
            float fresnel = pow(1.0 - max(dot(n, view), 0.0), 3.0);
            vec3 h = normalize(uLightDir + view);
            float spec = pow(max(dot(n, h), 0.0), 90.0);
            // Les cretes accrochent un peu de lumiere diffuse : l'anneau
            // reste lisible hors du reflet speculaire, sans white-out.
            float slope = clamp((1.0 - n.y) * 4.0, 0.0, 1.0);
            float d = length(vWorldPos.xz) / RADIUS;
            // Bassin net (03/09) : l'eau s'arrete contre la margelle (coupe
            // franche, plus de fondu), et une bande de RIVE plus claire et
            // plus opaque longe le bord : la limite de l'eau se lit.
            float mask = 1.0 - smoothstep(0.985, 1.0, d);
            float shore = smoothstep(0.9, 0.985, d);
            // Reflet de la braise (03/09, retour Sylvain "un reflet de
            // braises") : speculaire chaud de la lumiere portee par Xolotl,
            // deforme par les ondes, plus une lueur qui tombe a ses pieds.
            vec3 toEmber = uEmberPos - vWorldPos;
            float emberDist = length(toEmber);
            vec3 hEmber = normalize(normalize(toEmber) + view);
            // 3.0 -> 1.0 (03/09) : le reflet de Xolotl est desormais un corps de
            // braise (xolotl-companion), la trainee speculaire ne fait que l'accompagner.
            float emberSpec = pow(max(dot(n, hEmber), 0.0), 40.0) * uEmberStrength * 1.0 / (1.0 + emberDist * emberDist * 0.15);
            float emberGlow = uEmberStrength * 0.35 / (1.0 + emberDist * emberDist * 0.6);
            vec3 col = uColor + uRim * fresnel * 0.35 + uSpec * (spec * 0.5 + slope * 0.18) + uRim * shore * 0.55 + uEmberColor * (emberSpec + emberGlow);
            float a = (uOpacity + fresnel * 0.15 + spec * 0.3 + slope * 0.15 + shore * 0.35 + emberSpec * 0.8 + emberGlow * 0.6) * mask;
            gl_FragColor = vec4(col, clamp(a, 0.0, 0.9));
          }
        `,
      }),
    [sim]
  );

  useFrame((state, delta) => {
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const doc = typeof document !== "undefined" ? document.documentElement : null;
    const denom = doc ? doc.scrollHeight - window.innerHeight : 0;
    const depth = denom > 0 ? Math.min(1, window.scrollY / denom) : 1;
    const target = smokeGate({ direction, scrollDepth: depth, reducedMotion: reduced }) * WATER_OPACITY;
    opacityRef.current = reduced ? target : opacityRef.current + (target - opacityRef.current) * 0.05;
    const visible = opacityRef.current > 0.003;
    if (meshRef.current) meshRef.current.visible = visible;
    if (rimRef.current) rimRef.current.visible = visible;
    if (rimTopRef.current) rimTopRef.current.visible = visible;
    rimMaterial.opacity = Math.min(1, opacityRef.current / WATER_OPACITY);
    if (!visible) {
      prevPointerRef.current = null;
      return;
    }

    // Gouttes : la souris projetee sur la nappe, amplitude selon sa
    // vitesse. Pas de gouttes en reduced-motion (eau plate).
    const drops: { u: number; v: number; amount: number }[] = [];
    const dt = Math.min(delta, 1 / 30);
    if (!reduced && pointerNdcRef.current) {
      state.raycaster.setFromCamera(pointerNdcRef.current, state.camera);
      const hit = state.raycaster.ray.intersectPlane(WATER_PLANE, hitRef.current);
      if (hit) {
        const { u, v, inside } = worldToSimUv(hit.x, hit.z, EXTENT);
        const uv = { u, v };
        if (inside && prevPointerRef.current) {
          const s = pointerSplat(prevPointerRef.current, uv, dt);
          if (s) {
            const amount = Math.min(DROP_MAX, Math.hypot(s.du, s.dv) * DROP_GAIN);
            drops.push({ u, v, amount });
            // Le reflet menteur du tonalli : le double marche de l'autre
            // cote du cerf (symetrie centrale en espace sol).
            const m = worldToSimUv(-hit.x, -hit.z, EXTENT);
            if (m.inside) drops.push({ u: m.u, v: m.v, amount: amount * MIRROR_DROP_SCALE });
          }
        }
        prevPointerRef.current = uv;
      }

      // Sabots : chaque os de patte qui bouge dans l'eau fait une onde.
      if (!hoovesRef.current && hoofLookupRef.current++ % HOOF_LOOKUP_EVERY === 0) {
        const found = HOOF_BONES.map((name) => state.scene.getObjectByName(name)).filter((b): b is Object3D => !!b);
        if (found.length === HOOF_BONES.length) hoovesRef.current = found.map((bone) => ({ bone, prev: null }));
      }
      if (hoovesRef.current) {
        const pos = hoofPosRef.current;
        for (const hoof of hoovesRef.current) {
          hoof.bone.getWorldPosition(pos);
          pos.y -= HOOF_TIP_OFFSET;
          if (hoof.prev) {
            const amount = hoofDrop(hoof.prev, pos, dt, WATER_LEVEL);
            if (amount > 0) {
              const { u, v, inside } = worldToSimUv(pos.x, pos.z, EXTENT);
              if (inside) drops.push({ u, v, amount });
            }
            hoof.prev.copy(pos);
          } else {
            hoof.prev = pos.clone();
          }
        }
      }
    }
    // Impacts externes (fleches de Temiminaloyan) : une goutte par impact.
    if (tezcatlStore.impacts.length > 0) {
      for (const imp of tezcatlStore.impacts) {
        const { u, v, inside } = worldToSimUv(imp.x, imp.z, EXTENT);
        if (inside) drops.push({ u, v, amount: imp.amount });
      }
      tezcatlStore.impacts.length = 0;
    }
    // Pas de temps fixe (schema calibre 60 fps) : on accumule le temps
    // reel et on joue autant de sous-pas que necessaire, plafonne.
    accRef.current += dt;
    const substeps = Math.min(3, Math.floor(accRef.current * 60));
    accRef.current -= substeps / 60;
    sim.step(drops, substeps);

    tezcatlStore.ripple = sim.heightTexture;
    tezcatlStore.rippleTexel = sim.texel;
    material.uniforms.uHeight.value = sim.heightTexture;
    material.uniforms.uOpacity.value = opacityRef.current;
    const ember = tezcatlStore.ember;
    (material.uniforms.uEmberPos.value as Vector3).set(ember.x, ember.y, ember.z);
    material.uniforms.uEmberStrength.value = ember.intensity;
  });

  return (
    <>
      <mesh
        ref={meshRef}
        material={material}
        position={[0, WATER_LEVEL, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1000}
        frustumCulled={false}
        raycast={() => null}
        visible={false}
      >
        <planeGeometry args={[EXTENT * 2, EXTENT * 2]} />
      </mesh>
      {/* Margelle : anneau d'obsidienne polie qui affleure au-dessus de la
        * nappe (flanc + dessus), reflete le ciel du Mictlan. */}
      <mesh ref={rimRef} material={rimMaterial} position={[0, WATER_LEVEL + RIM_HEIGHT * 0.5, 0]} frustumCulled={false} raycast={() => null} visible={false}>
        <cylinderGeometry args={[RIM_OUTER, RIM_OUTER, RIM_HEIGHT, 96, 1, true]} />
      </mesh>
      <mesh ref={rimTopRef} material={rimMaterial} position={[0, WATER_LEVEL + RIM_HEIGHT, 0]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false} raycast={() => null} visible={false}>
        <ringGeometry args={[RIM_INNER, RIM_OUTER, 96]} />
      </mesh>
    </>
  );
}
