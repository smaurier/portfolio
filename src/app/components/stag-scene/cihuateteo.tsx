/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'objets three, d'os, d'uniforms et de buffers a 60 fps (meme precedent que xolotl-companion). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import {
  AdditiveBlending,
  AnimationMixer,
  Bone,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Points,
  Quaternion,
  ShaderMaterial,
  SkinnedMesh,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Object3D,
} from "three";
import { clone as cloneSkinnedScene } from "three/examples/jsm/utils/SkeletonUtils.js";
import { shareSkeletons } from "@/lib/share-skeletons";
import { CIHUATETEO, HAIR_STRANDS, LANDING, LANDING_LATCH, bearerHair, bearerOpacity, bearerPose, descentBlend, landingState, litterPose, type HairStrand, wispRate } from "@/lib/cihuateteo";
import { createStrip, stepStrip, type Strip } from "@/lib/paper-strip";
import { remapWestArc } from "@/lib/ouest-arc";
import { armLatch, stepLatch, type LatchState } from "@/lib/threshold-latch";
import { advanceEnvelope } from "@/lib/envelope-clock";
import { cihuateteoStore } from "./cihuateteo-store";
import { dayAtArc } from "@/lib/arc-day";
import { sunDirection } from "@/lib/direction-light";
import { CHALK_COLOR, createCihuateotlMaterial, createCihuateotlUniforms, type CihuateotlUniforms } from "./cihuateotl-material";
import { createRibbonBundleGeometry, createRibbonGeometry, finishRibbonBundle, updateRibbon, writeRibbonSlot } from "./ribbon-geometry";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * Les Cihuateteo (06/09, Ouest / Cihuatlampa ; sources et garde-fous dans
 * docs/da/ouest-sources.md). Quatre femmes noires qui portent le soleil
 * vers l'ouest « dans une litiere de plumes de quetzal » (Codex de
 * Florence, livre VI), puis, quand il est entre dans la terre, se posent en
 * arc au carrefour, face au cerf. Visage peint a la chaux (Primeros
 * Memoriales) : la tete traitee exactement comme le corps, en blanc mat,
 * sans bandeau (Sylvain, 06/09).
 * Chevelures noires MASSIVES : 90 meches par tete plantees sur le crane,
 * chacune une chaine de points a longueur contrainte (le principe des
 * simulateurs capillaires temps reel : TressFX, Hair Works), gravite,
 * vent, inertie de la danse ; deux chevelures ne bougent jamais pareil.
 * Elles DANSENT : la marche du modele jouee au ralenti donne le rythme des
 * hanches et des jambes, et par-dessus, bras ecartes qui montent et
 * descendent chacun a son tour, buste qui ondule, corps qui tourne et fait
 * un pas de cote. Au carrefour la danse ralentit sans s'eteindre.
 * Papiers (amatetehuitl) a leurs pieds la nuit ; ce qui s'echappe d'elles,
 * ce sont des papillons (livre III).
 *
 * Modele : « Animated Woman » de Quaternius (Ultimate Modular Women Pack,
 * CC0). Corps en fumee noire opaque (cihuateotl-material), meches,
 * plumes et papiers sur des chaines Verlet (lib/paper-strip +
 * ribbon-geometry).
 */

const MODEL_PATH = "/models/cihuateotl.glb";
const SMOKE_SPRITE = "/img/particles/smoke_07.png";
const WALK_CLIP = "CharacterArmature|Walk";
/** Hauteur d'une porteuse (u) : un peu plus haute que le garrot du cerf. */
const BEARER_HEIGHT = 1.9;
/** Rayon du crane (u) ou se plantent les meches, au-dessus de l'os de la tete. */
const SKULL_RADIUS = 0.135;
const SKULL_LIFT = 0.13;
const HAIR_POINTS = 10;
const BUTTERFLIES_PER_BEARER = 30;
const BUTTERFLY_POOL = CIHUATETEO.count * BUTTERFLIES_PER_BEARER;
const BUTTERFLY_COLOR = new Color("#e3c6f2");
const FEATHERS = 14;
const FEATHER_POINTS = 8;
const FEATHER_LENGTH = 1.1;
const QUETZAL = new Color("#16a06b");
const QUETZAL_TIP = new Color("#8ee0b8");
const PAPERS_PER_BEARER = 3;
const PAPER_POINTS = 6;
const SMOKES_PER_BEARER = 3;
/** Les braises de l'offrande au carrefour (06/09, etape 5) : trois braises
 * par porteuse, devant elle, qui rougeoient dans le vent. */
const EMBERS_PER_BEARER = 3;
/** Vent de l'ouest (+x = l'ouest du decor) ressenti par les meches, les pans et les plumes. */
const WIND_BASE = { x: 1.1, y: 0.35, z: -0.2 };
/** La danse (radians sur les os, ajoutes a l'animation) : ecart des bras
 * hors du corps (axe Z de l'os) et balancement avant-arriere (axe X). */
const DANCE = {
  /** Battement de la danse (Hz) : les bras, les hanches, le pas. */
  beatHz: 0.75,
  armSpread: 0.9,
  armSpreadSwing: 0.75,
  armSwing: 0.7,
  forearm: 0.6,
  torsoTilt: 0.22,
  hipSway: 0.28,
  bounce: 0.09,
  turn: 0.6,
  step: 0.45,
  walkTimeScale: 0.85,
};
/** La jupe (cueitl) : la jupe unie a ceinture nouee des sculptures de
 * Cihuateteo (cf docs/da/ouest-sources.md), en bandes de tissu simulees
 * depuis les hanches jusqu'aux chevilles. */
const SKIRT_STRIPS = 52;
const SKIRT_POINTS = 8;
const SKIRT_LENGTH = 0.95;
/** Le tour de taille : une ellipse, plus large sur les cotes que devant. */
const HIP_SIDE = 0.15;
const HIP_FRONT = 0.11;

// Pas de preload au niveau module (08/09) : il partait a l'IMPORT, donc sur
// TOUTES les pages, et telechargeait 1,5 Mo sur l'accueil. Le composant n'est
// monte qu'a l'Ouest (mount-for-direction) et la direction est prechargee au
// survol du lien cardinal (PreloadOnIntent).
useTexture.preload(SMOKE_SPRITE);

type BoneSet = { bone: Bone; rest: Quaternion; animated: boolean };
type Bearer = {
  root: Group;
  mixer: AnimationMixer;
  uniforms: CihuateotlUniforms;
  bones: Record<string, BoneSet | null>;
  hair: { strand: HairStrand; strip: Strip }[];
  hairGeometry: BufferGeometry;
  skirt: Strip[];
  skirtGeometry: BufferGeometry;
  hipsBone: Object3D | null;
  papers: { strip: Strip; slot: number; peg: { x: number; z: number }; phase: number }[];
  smokes: Sprite[];
  embers: { sprite: Sprite; x: number; z: number; phase: number }[];
  headBone: Object3D | null;
};
type Butterfly = { alive: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number; life: number };

function hash(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233 + 5.1) * 43758.5453;
  return v - Math.floor(v);
}

// Noms tels que GLTFLoader les livre (PropertyBinding.sanitizeNodeName : plus de point).
// Constate 06/09 : avec « UpperArm.L » les bras n etaient jamais trouves, d ou
// des porteuses qui ne dansaient pas (seuls Abdomen et Chest bougeaient).
const BONE_NAMES = ["UpperArmL", "UpperArmR", "LowerArmL", "LowerArmR", "Abdomen", "Chest"] as const;
const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Z = new Vector3(0, 0, 1);
const tmpQuat = new Quaternion();

/** Une rotation autour d'un axe local de l'os, ajoutee a ce que l'animation
 * vient d'ecrire (a appeler apres mixer.update). Un os que le clip n'anime
 * pas garde sa valeur d'une image a l'autre : on repart de son repos,
 * sinon les rotations s'accumulent et le buste se plie (constate 06/09). */
function addBoneRotation(set: BoneSet | null, axis: Vector3, angle: number): void {
  if (!set) return;
  set.bone.quaternion.multiply(tmpQuat.setFromAxisAngle(axis, angle));
}

/** A appeler avant les ajouts d'une image : les os hors animation reviennent au repos. */
function resetIdleBones(bones: Record<string, BoneSet | null>): void {
  for (const set of Object.values(bones)) if (set && !set.animated) set.bone.quaternion.copy(set.rest);
}

function collectBones(root: Object3D, animatedNames: Set<string>): Record<string, BoneSet | null> {
  const out: Record<string, BoneSet | null> = {};
  for (const name of BONE_NAMES) {
    const bone = root.getObjectByName(name) as Bone | undefined;
    out[name] = bone ? { bone, rest: bone.quaternion.clone(), animated: animatedNames.has(name) } : null;
  }
  return out;
}

/** Habille un clone : fumee noire sur le corps, la meme matiere en blanc
 * de chaux sur la tete, cheveux modelises caches (remplaces par les
 * meches) ; echelle normalisee a BEARER_HEIGHT, pieds a y = 0. */
function dressBearer(root: Object3D, uniforms: CihuateotlUniforms): void {
  const body = createCihuateotlMaterial(uniforms);
  const chalk = createCihuateotlMaterial(uniforms, CHALK_COLOR);
  const box = new Box3();
  root.updateMatrixWorld(true);
  root.traverse((child) => {
    const mesh = child as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const isHead = (mesh.parent?.name ?? "").includes("Head") || mesh.name.includes("Head");
    const matName = (mesh.material as { name?: string }).name ?? "";
    if (isHead) {
      if (matName === "Skin") mesh.material = chalk;
      else mesh.visible = false;
    } else if ((mesh.parent?.name ?? "").includes("Legs")) {
      mesh.visible = false; // le pantalon du pack : remplace par la jupe (cueitl)
    } else {
      mesh.material = body;
    }
    mesh.frustumCulled = false;
    mesh.renderOrder = 996;
    mesh.raycast = () => null;
    mesh.computeBoundingBox();
    if (mesh.boundingBox) box.union(mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
  });
  const size = box.getSize(new Vector3());
  const scale = size.y > 0 ? BEARER_HEIGHT / size.y : 1;
  root.scale.setScalar(scale);
  root.position.y = -box.min.y * scale;
  uniforms.uHeight.value = BEARER_HEIGHT;
}

function glowTexture(): CanvasTexture {
  const size = 32;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.6, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(c);
}

export default function Cihuateteo() {
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const { scene, animations } = useGLTF(MODEL_PATH);
  const smokeTexture = useTexture(SMOKE_SPRITE);
  const groupRef = useRef<Group>(null);
  const blendRef = useRef(direction === "cendre" ? 1 : 0);
  const scratch = useMemo(() => new Vector3(), []);
  const headForward = useMemo(() => new Vector3(), []);
  const walkClip = useMemo(() => animations.find((a) => a.name === WALK_CLIP) ?? animations[0], [animations]);
  // Les os que le clip ecrit a chaque image (« Nom.quaternion »).
  const animatedBones = useMemo(() => new Set((walkClip?.tracks ?? []).map((t) => t.name.split(".")[0])), [walkClip]);

  // Cheveux : noirs, eclaires (un peu de brillance sur les meches).
  const hairMaterial = useMemo(() => new MeshStandardMaterial({ color: new Color("#07040a"), roughness: 0.55, metalness: 0.05, transparent: true, opacity: 0, side: DoubleSide, depthWrite: true, fog: false, forceSinglePass: true }), []);
  const clothMaterial = useMemo(() => new MeshStandardMaterial({ color: new Color("#0b0710"), roughness: 0.95, metalness: 0, transparent: true, opacity: 0, side: DoubleSide, depthWrite: true, fog: false, forceSinglePass: true }), []);
  const paperMaterial = useMemo(() => new MeshBasicMaterial({ color: new Color("#efe6d6"), transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, fog: true, blending: NormalBlending, forceSinglePass: true }), []);
  const featherMaterial = useMemo(() => new MeshBasicMaterial({ color: QUETZAL, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, fog: false, blending: NormalBlending, forceSinglePass: true }), []);
  const featherTipMaterial = useMemo(() => new MeshBasicMaterial({ color: QUETZAL_TIP, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, fog: false, blending: AdditiveBlending, forceSinglePass: true }), []);
  const emberMaterial = useMemo(() => new SpriteMaterial({ map: smokeTexture, color: new Color("#ff7a3a"), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }), [smokeTexture]);
  const smokeMaterial = useMemo(() => new SpriteMaterial({ map: smokeTexture, color: new Color("#2b1c33"), transparent: true, opacity: 0, depthWrite: false, blending: NormalBlending, fog: false }), [smokeTexture]);
  const glowMaterial = useMemo(() => new SpriteMaterial({ map: glowTexture(), color: new Color("#ffd2a0"), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }), []);

  /**
   * MECHES PAR PORTEUSE, SELON LE PROFIL (10/09).
   *
   * Chaque meche est une chaine de Verlet relachee quatre fois par image, et
   * il y a quatre porteuses : mesure du profil processeur de la page Contact
   * sous CPU x4, `stepStrip` plus `writeRibbonSlot` comptaient 171 ms par
   * seconde, premier poste de la page, sur un budget de 16,7 ms par image.
   * C'est aussi la seule page du site qui n'a jamais tenu la barre du
   * metier.
   *
   * Le telephone en pose donc moins, exactement comme il pose 9 000 brins
   * d'herbe au lieu de 26 000 : c'est le palier de qualite qui existe depuis
   * le 05/09, pas une nouvelle regle. Sur ordinateur, rien ne change.
   */
  const meches = sceneRefs?.perfProfile.hairStrands ?? HAIR_STRANDS;

  const bearers = useMemo<Bearer[]>(() => {
    return Array.from({ length: CIHUATETEO.count }, (_, i) => {
      const inner = cloneSkinnedScene(scene) as Group;
      // Dix parties, un seul squelette (voir lib/share-skeletons) : sinon
      // dix mises a jour de 62 os et dix textures par porteuse et par image.
      shareSkeletons(inner);
      const uniforms = createCihuateotlUniforms(i * 1.9);
      dressBearer(inner, uniforms);
      const root = new Group();
      root.add(inner);
      const mixer = new AnimationMixer(inner);
      if (walkClip) {
        const action = mixer.clipAction(walkClip);
        action.timeScale = DANCE.walkTimeScale;
        action.time = (i / CIHUATETEO.count) * walkClip.duration;
        action.play();
      }
      const hair = bearerHair(i, meches).map((strand) => ({ strand, strip: createStrip(HAIR_POINTS, strand.length, { x: 0, y: BEARER_HEIGHT, z: 0 }) }));
      const skirt = Array.from({ length: SKIRT_STRIPS }, () => createStrip(SKIRT_POINTS, SKIRT_LENGTH, { x: 0, y: 1, z: 0 }));
      // Les papiers vivent dans UN SEUL faisceau partage par les quatre
      // porteuses (09/09) : ils sont simules en espace monde et ajoutes au
      // meme groupe, donc rien n'empeche de les reunir. Avant, chacun avait
      // sa geometrie et son mesh : 12 appels de rendu pour douze rubans, sur
      // la page deja mesuree a 415 appels pour une cible mobile de 100 a 200.
      // Le meme fichier utilisait deja l'API de faisceau pour les cheveux et
      // la jupe, deux blocs plus haut.
      const papers = Array.from({ length: PAPERS_PER_BEARER }, (_, k) => ({
        strip: createStrip(PAPER_POINTS, 0.35 + 0.2 * hash(i * 7 + k, 1), { x: 0, y: 0.1, z: 0 }),
        slot: i * PAPERS_PER_BEARER + k,
        peg: { x: (hash(i * 7 + k, 2) - 0.5) * 1.6, z: 0.4 + hash(i * 7 + k, 3) * 0.6 },
        phase: hash(i * 7 + k, 4) * 6.28,
      }));
      const smokes = Array.from({ length: SMOKES_PER_BEARER }, () => {
        const s = new Sprite(smokeMaterial.clone());
        s.raycast = () => null;
        s.renderOrder = 995;
        return s;
      });
      const embers = Array.from({ length: EMBERS_PER_BEARER }, (_, k) => {
        const sprite = new Sprite(emberMaterial.clone());
        sprite.raycast = () => null;
        sprite.renderOrder = 998;
        // Devant elle, entre les papiers : un petit foyer.
        return { sprite, x: (hash(i * 11 + k, 5) - 0.5) * 0.5, z: 0.55 + hash(i * 11 + k, 6) * 0.35, phase: hash(i * 11 + k, 7) * 6.28 };
      });
      return { root, mixer, uniforms, bones: collectBones(inner, animatedBones), hair, hairGeometry: createRibbonBundleGeometry(meches, HAIR_POINTS), skirt, skirtGeometry: createRibbonBundleGeometry(SKIRT_STRIPS, SKIRT_POINTS), hipsBone: inner.getObjectByName("Hips") ?? null, papers, smokes, embers, headBone: inner.getObjectByName("Head") ?? null };
    });
    // `meches` est dans les dependances : sans lui, un passage du seuil
    // mobile laisserait des chaines de 90 meches ecrire dans un faisceau
    // dimensionne pour 40.
  }, [scene, walkClip, animatedBones, smokeMaterial, emberMaterial, meches]);

  /** Le faisceau UNIQUE des papiers des quatre porteuses (09/09). */
  const paperGeometry = useMemo(
    () => createRibbonBundleGeometry(CIHUATETEO.count * PAPERS_PER_BEARER, PAPER_POINTS),
    [],
  );

  // La litiere : deux brancards et des plumes de quetzal en rubans.
  const litter = useMemo(() => {
    const group = new Group();
    const poleGeometry = new CylinderGeometry(0.04, 0.04, 2.6, 8);
    const poleMaterial = new MeshBasicMaterial({ color: new Color("#6b4a35"), transparent: true, opacity: 0, fog: false });
    for (const z of [-0.45, 0.45]) {
      const pole = new Mesh(poleGeometry, poleMaterial);
      pole.rotation.z = Math.PI / 2;
      pole.position.z = z;
      pole.raycast = () => null;
      group.add(pole);
    }
    // Deux faisceaux et non quatorze meshes (09/09) : un par materiau, la
    // pointe etant en fusion additive et le corps en fusion normale. On ne
    // peut donc pas tout reunir, mais 14 appels tombent a 2.
    let tips = 0;
    let bodies = 0;
    const feathers = Array.from({ length: FEATHERS }, (_, k) => {
      const tip = k % 3 === 0;
      return {
        strip: createStrip(FEATHER_POINTS, FEATHER_LENGTH * (0.7 + 0.5 * hash(k, 9)), { x: 0, y: 0, z: 0 }),
        tip,
        slot: tip ? tips++ : bodies++,
        anchor: { x: -1.2 + (k % 7) * 0.4, z: k < 7 ? -0.45 : 0.45 },
        phase: hash(k, 8) * 6.28,
      };
    });
    const tipCount = tips;
    const bodyCount = bodies;
    const glow = new Sprite(glowMaterial);
    glow.scale.setScalar(2.4);
    glow.raycast = () => null;
    group.add(glow);
    return {
      group,
      feathers,
      tipGeometry: createRibbonBundleGeometry(tipCount, FEATHER_POINTS),
      bodyGeometry: createRibbonBundleGeometry(bodyCount, FEATHER_POINTS),
      poleMaterial,
      glow,
    };
  }, [glowMaterial]);

  // Les papillons : un seul nuage pour les quatre.
  const butterflies = useMemo<Butterfly[]>(() => Array.from({ length: BUTTERFLY_POOL }, () => ({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1 })), []);
  const butterflyGeometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(BUTTERFLY_POOL * 3), 3));
    g.setAttribute("aAlpha", new BufferAttribute(new Float32Array(BUTTERFLY_POOL), 1));
    g.setAttribute("aPhase", new BufferAttribute(new Float32Array(BUTTERFLY_POOL).map((_, i) => hash(i, 11) * 6.28), 1));
    g.boundingSphere = null;
    return g;
  }, []);
  const butterflyUniforms = useMemo(() => ({ uScale: { value: 300 }, uTime: { value: 0 }, uColor: { value: BUTTERFLY_COLOR } }), []);
  const butterflyMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: butterflyUniforms,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        vertexShader: /* glsl */ `
          attribute float aAlpha;
          attribute float aPhase;
          uniform float uScale;
          varying float vAlpha;
          varying float vPhase;
          void main() {
            vAlpha = aAlpha;
            vPhase = aPhase;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 0.11 * uScale / max(1.0, -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uTime;
          varying float vAlpha;
          varying float vPhase;
          void main() {
            if (vAlpha < 0.004) discard;
            vec2 uv = gl_PointCoord - 0.5;
            float flap = 0.35 + 0.65 * abs(sin(uTime * 11.0 + vPhase));
            float x = abs(uv.x) / flap;
            float wing = 1.0 - smoothstep(0.18, 0.42, length(vec2(x - 0.18, uv.y * 1.6)));
            float body = 1.0 - smoothstep(0.02, 0.07, abs(uv.x));
            float a = max(wing, body * (1.0 - smoothstep(0.2, 0.35, abs(uv.y)))) * vAlpha;
            if (a < 0.01) discard;
            gl_FragColor = vec4(uColor * a, a);
          }
        `,
      }),
    [butterflyUniforms]
  );
  const butterflyPoints = useMemo(() => {
    const p = new Points(butterflyGeometry, butterflyMaterial);
    p.frustumCulled = false;
    p.renderOrder = 998;
    p.raycast = () => null;
    return p;
  }, [butterflyGeometry, butterflyMaterial]);
  /** Verrou du contact au sol : une date, pas une rampe. */
  const latchRef = useRef<LatchState | null>(null);
  /** Horloge bornee depuis le contact ; null = pas encore touche. */
  const touchClockRef = useRef<number | null>(null);
  const spawnAcc = useRef(0);
  const seedRef = useRef(0);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    const added: Object3D[] = [];
    const add = (o: Object3D) => {
      g.add(o);
      added.push(o);
    };
    for (const b of bearers) {
      add(b.root);
      const hairMesh = new Mesh(b.hairGeometry, hairMaterial);
      hairMesh.frustumCulled = false;
      hairMesh.raycast = () => null;
      hairMesh.renderOrder = 997;
      add(hairMesh);
      const skirtMesh = new Mesh(b.skirtGeometry, clothMaterial);
      skirtMesh.frustumCulled = false;
      skirtMesh.raycast = () => null;
      skirtMesh.renderOrder = 996;
      add(skirtMesh);

      for (const s of b.smokes) add(s);
      for (const e of b.embers) add(e.sprite);
    }
    // Un seul mesh pour les douze papiers, deux pour les quatorze plumes.
    const paperMesh = new Mesh(paperGeometry, paperMaterial);
    paperMesh.frustumCulled = false;
    paperMesh.raycast = () => null;
    add(paperMesh);
    add(litter.group);
    for (const [geometry, material] of [
      [litter.tipGeometry, featherTipMaterial],
      [litter.bodyGeometry, featherMaterial],
    ] as const) {
      const m = new Mesh(geometry, material);
      m.frustumCulled = false;
      m.raycast = () => null;
      m.renderOrder = 996;
      add(m);
    }
    add(butterflyPoints);
    return () => {
      for (const o of added) g.remove(o);
    };
  }, [bearers, litter, butterflyPoints, hairMaterial, clothMaterial, paperGeometry, paperMaterial, featherMaterial, featherTipMaterial]);
  useEffect(
    () => () => {
      butterflyGeometry.dispose();
      butterflyMaterial.dispose();
      for (const b of bearers) {
        b.hairGeometry.dispose();
        b.skirtGeometry.dispose();

      }
      paperGeometry.dispose();
      litter.tipGeometry.dispose();
      litter.bodyGeometry.dispose();
    },
    [butterflyGeometry, butterflyMaterial, bearers, litter, paperGeometry]
  );

  useFrame((state, delta) => {
    const west = direction === "cendre";
    blendRef.current += ((west ? 1 : 0) - blendRef.current) * 0.05;
    const blend = blendRef.current;
    const g = groupRef.current;
    if (!g) return;
    g.visible = blend > 0.01;
    if (!g.visible) return;
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const progress = sceneRefs?.progressRef.current ?? 0;
    const { dusk } = remapWestArc(progress);
    const sun = sunDirection(dayAtArc("cendre", progress), true);
    const time = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 30);
    const settle = descentBlend(dusk);
    // L'ATTERRISSAGE (09/09) : leur descente etait une PRESENCE, un fondu
    // continu ou rien ne se passait jamais vraiment. Le contact au sol
    // devient un evenement, et c'est lui qui enflamme les offrandes deja
    // posees devant le cerf. Verrou a hysteresis (lib/threshold-latch) pour
    // avoir une DATE, et horloge bornee (lib/envelope-clock) pour que le
    // geste ne puisse pas etre enjambe par une saccade.
    if (latchRef.current === null) latchRef.current = armLatch(settle, LANDING_LATCH);
    const landed = stepLatch(latchRef.current, settle, LANDING_LATCH);
    latchRef.current = landed.state;
    let collectSpots = false;
    if (landed.fire && !reduced) {
      touchClockRef.current = 0;
      collectSpots = true;
      cihuateteoStore.spots.length = 0;
    }
    if (touchClockRef.current !== null) {
      touchClockRef.current = advanceEnvelope(touchClockRef.current, delta);
    }
    const landing = landingState(touchClockRef.current ?? -1);
    const opacity = bearerOpacity(dusk) * blend;
    const gust = 1 + 0.45 * Math.sin(time * 0.7) + 0.25 * Math.sin(time * 1.9 + 1.3);
    // Au carrefour la danse ralentit de moitie, sans s'eteindre.
    const tempo = reduced ? 0 : 1 - 0.5 * settle;

    bearers.forEach((b, i) => {
      const pose = bearerPose(i, CIHUATETEO.count, dusk, sun, reduced ? 0 : time);
      // L'herbe a besoin de savoir OU elles ont touche : c'est elle qui
      // possede la grille de simulation.
      if (collectSpots) cihuateteoStore.spots.push({ x: pose.x, z: pose.z });
      // Le battement : chaque porteuse a son decalage, l'ensemble garde le
      // meme tempo (une danse de groupe, pas quatre solos).
      const beat = time * DANCE.beatHz * Math.PI * 2 + i * 0.9;
      const sway = Math.sin(beat * 0.5) * tempo; // lent : buste, rotation
      const sway2 = Math.sin(beat * 0.5 + 1.2) * tempo;
      const beatL = Math.sin(beat) * tempo; // bras gauche
      const beatR = Math.sin(beat + Math.PI * 0.85) * tempo; // bras droit, en decale
      const hips = Math.sin(beat) * tempo; // hanches, au battement
      const bounce = Math.abs(Math.sin(beat)) * DANCE.bounce * tempo; // rebond a chaque temps
      // Le corps danse : hanches qui balancent, rebond, pas de cote, rotation.
      const step = Math.sin(beat * 0.25 + i * 1.9) * DANCE.step * tempo;
      const lateral = hips * DANCE.hipSway + step;
      b.root.position.set(pose.x + Math.cos(pose.yaw) * lateral, pose.y + bounce, pose.z - Math.sin(pose.yaw) * lateral);
      b.root.rotation.y = pose.yaw + DANCE.turn * sway2;
      b.root.rotation.z = -hips * 0.08;
      b.uniforms.uOpacity.value = opacity;
      b.uniforms.uTime.value = time;
      b.uniforms.uBaseY.value = pose.y;
      b.uniforms.uErode.value = 0.5 + 0.4 * settle;

      // La marche au ralenti donne le rythme des hanches et des jambes ;
      // par-dessus, les bras : ecartes du corps, chacun monte et descend a
      // son tour ; le buste ondule.
      b.mixer.timeScale = tempo * (0.7 + 0.3 * (1 - settle));
      b.mixer.update(dt);
      resetIdleBones(b.bones);
      // Axes mesures sur le rig (.scratch/bone-axes.mjs) : +X ecarte le bras
      // du corps (les deux cotes), Z le balance devant/derriere (signes
      // opposes a gauche et a droite), Z plie aussi le coude.
      addBoneRotation(b.bones["UpperArmL"], AXIS_X, DANCE.armSpread + DANCE.armSpreadSwing * beatL);
      addBoneRotation(b.bones["UpperArmR"], AXIS_X, DANCE.armSpread + DANCE.armSpreadSwing * beatR);
      addBoneRotation(b.bones["UpperArmL"], AXIS_Z, -DANCE.armSwing * sway);
      addBoneRotation(b.bones["UpperArmR"], AXIS_Z, DANCE.armSwing * sway);
      addBoneRotation(b.bones["LowerArmL"], AXIS_Z, -DANCE.forearm * (0.5 + 0.5 * beatL));
      addBoneRotation(b.bones["LowerArmR"], AXIS_Z, DANCE.forearm * (0.5 + 0.5 * beatR));
      addBoneRotation(b.bones["Abdomen"], AXIS_Z, DANCE.torsoTilt * hips);
      addBoneRotation(b.bones["Chest"], AXIS_X, DANCE.torsoTilt * 0.5 * sway);
      b.root.updateMatrixWorld(true);

      // La tete : les meches plantees sur le crane.
      const head = b.headBone;
      if (head) head.getWorldPosition(scratch);
      else scratch.set(pose.x, pose.y + BEARER_HEIGHT * 0.9, pose.z);
      const yaw = b.root.rotation.y;
      headForward.set(Math.sin(yaw), 0, Math.cos(yaw));
      const skullX = scratch.x, skullY = scratch.y + SKULL_LIFT, skullZ = scratch.z;
      // Un vent doux sur les cheveux : ils TOMBENT, et ondulent au bout.
      const hairWind = reduced ? { x: 0, y: 0, z: 0 } : { x: WIND_BASE.x * gust * 0.35, y: 0, z: WIND_BASE.z * gust * 0.35 };
      b.hair.forEach((h, k) => {
        const s = h.strand;
        // Racine sur le crane : azimut autour de la nuque, inclinaison de la
        // couronne aux oreilles ; tournee avec la tete.
        const a = yaw + s.azimuth;
        const r = Math.sin(s.tilt) * SKULL_RADIUS;
        const anchor = { x: skullX + Math.sin(a) * r, y: skullY + Math.cos(s.tilt) * SKULL_RADIUS, z: skullZ + Math.cos(a) * r };
        const wind = reduced
          ? hairWind
          : {
              x: hairWind.x + Math.sin(time * s.speed * 1.7 + s.phase) * 0.22,
              y: Math.sin(time * s.speed * 2.3 + s.phase * 2) * 0.12,
              z: hairWind.z + Math.cos(time * s.speed * 1.3 + s.phase) * 0.22,
            };
        stepStrip(h.strip, dt, anchor, wind, { gravity: 9, damping: s.damping, windResponse: s.windResponse, iterations: 4 });
        writeRibbonSlot(b.hairGeometry, k, h.strip, (u) => 0.04 * (1 - u * 0.45));
      });
      finishRibbonBundle(b.hairGeometry);
      // La jupe : bandes de tissu depuis la ceinture, qui suivent les
      // hanches et volent dans la danse.
      const hipsBone = b.hipsBone;
      if (hipsBone) hipsBone.getWorldPosition(scratch);
      else scratch.set(pose.x, pose.y + BEARER_HEIGHT * 0.52, pose.z);
      const waistX = scratch.x, waistY = scratch.y + 0.04, waistZ = scratch.z;
      const skirtWind = reduced ? { x: 0, y: 0, z: 0 } : { x: WIND_BASE.x * gust * 0.5 + hips * 0.35, y: 0.2 * Math.abs(hips), z: WIND_BASE.z * gust * 0.5 };
      b.skirt.forEach((strip, k) => {
        const t = (k / SKIRT_STRIPS) * Math.PI * 2;
        const lx = Math.sin(t) * HIP_SIDE, lz = Math.cos(t) * HIP_FRONT;
        const anchor = { x: waistX + lx * Math.cos(yaw) + lz * Math.sin(yaw), y: waistY, z: waistZ - lx * Math.sin(yaw) + lz * Math.cos(yaw) };
        // Chaque bande a sa souplesse : le tissu ne bouge pas d'un bloc.
        const j = ((k * 7919) % 13) / 13;
        stepStrip(strip, dt, anchor, skirtWind, { gravity: 7, damping: 0.976 + 0.012 * j, windResponse: 0.35 + 0.35 * j, iterations: 3 });
        writeRibbonSlot(b.skirtGeometry, k, strip, (u) => 0.065 * (1 + 0.35 * u));
      });
      finishRibbonBundle(b.skirtGeometry);
      // Les papiers du carrefour : plantes au sol devant elle, ils claquent.
      for (const p of b.papers) {
        const px = pose.x + Math.sin(pose.yaw + Math.PI / 2) * p.peg.x + Math.sin(pose.yaw) * p.peg.z;
        const pz = pose.z + Math.cos(pose.yaw + Math.PI / 2) * p.peg.x + Math.cos(pose.yaw) * p.peg.z;
        const wind = reduced ? { x: 0, y: 0, z: 0 } : { x: WIND_BASE.x * gust * 1.4 + Math.sin(time * 2.1 + p.phase) * 0.8, y: 1.6 + Math.sin(time * 3.3 + p.phase) * 0.8, z: WIND_BASE.z + Math.cos(time * 1.6 + p.phase) * 0.6 };
        stepStrip(p.strip, dt, { x: px, y: 0.12, z: pz }, wind, { gravity: 2.5, damping: 0.975, windResponse: 1.6, iterations: 5 });
        writeRibbonSlot(paperGeometry, p.slot, p.strip, 0.09);
      }
      // Les braises de l'offrande, a ses pieds : elles ne s'allument qu'au
      // carrefour (settle) et rougeoient au gre des rafales.
      b.embers.forEach((e, k) => {
        const ex = pose.x + Math.cos(pose.yaw + Math.PI / 2) * e.x + Math.sin(pose.yaw) * e.z;
        const ez = pose.z - Math.sin(pose.yaw + Math.PI / 2) * e.x + Math.cos(pose.yaw) * e.z;
        const flicker = 0.55 + 0.45 * Math.max(0, Math.sin(time * 5.1 + e.phase) * 0.6 + Math.sin(time * 13.7 + e.phase * 3) * 0.4) * (0.6 + 0.4 * gust);
        e.sprite.position.set(ex, 0.06 + 0.03 * k, ez);
        // Au contact, les offrandes PRENNENT : les braises grossissent le
        // temps de l'embrasement, sinon le geste ne se lit pas (verifie a la
        // capture : a taille constante, on croyait voir le brancard bruler).
        e.sprite.scale.setScalar((0.22 + 0.08 * k) * (1 + 1.4 * landing.flare));
        // L'embrasement de l'atterrissage se pose PAR-DESSUS la braise
        // ordinaire : c'est le contact qui les allume, puis elles retombent.
        e.sprite.material.opacity = Math.min(1, settle * blend * flicker * (1 + 2.2 * landing.flare));
      });
      // La fumee autour d'elle : trois volutes lentes.
      b.smokes.forEach((s, k) => {
        const a = time * 0.18 + k * 2.1 + i;
        s.position.set(pose.x + Math.cos(a) * 0.45, pose.y + 0.5 + k * 0.45 + Math.sin(time * 0.3 + k) * 0.12, pose.z + Math.sin(a) * 0.45);
        s.scale.setScalar(1.3 + 0.4 * k);
        s.material.rotation = time * 0.12 + k;
        s.material.opacity = 0.4 * opacity;
      });
    });
    // Les douze papiers ecrivent dans le MEME faisceau : on ne le referme
    // donc qu'une fois, apres la boucle des porteuses.
    finishRibbonBundle(paperGeometry);
    // Les positions sont prises, l'herbe peut souffler.
    if (collectSpots) cihuateteoStore.landing += 1;
    hairMaterial.opacity = opacity;
    clothMaterial.opacity = opacity;
    paperMaterial.opacity = Math.min(1, 0.9 * blend * settle * (1 + 0.8 * landing.flare));

    // La litiere de plumes de quetzal, le soleil dessus.
    const lp = litterPose(CIHUATETEO.count, dusk, sun, reduced ? 0 : time);
    litter.group.position.set(lp.x, lp.y, lp.z);
    litter.group.rotation.y = lp.yaw;
    litter.group.updateMatrixWorld(true);
    litter.poleMaterial.opacity = 0.85 * opacity;
    featherMaterial.opacity = 0.85 * opacity;
    featherTipMaterial.opacity = 0.9 * opacity;
    glowMaterial.opacity = lp.sunGlow * blend * 0.9;
    litter.glow.scale.setScalar(2.2 + 0.4 * Math.sin(time * 1.1));
    for (const f of litter.feathers) {
      scratch.set(f.anchor.x, 0, f.anchor.z).applyMatrix4(litter.group.matrixWorld);
      const wind = reduced ? { x: 0, y: 0, z: 0 } : { x: WIND_BASE.x * gust * 0.7 + Math.sin(time * 1.4 + f.phase) * 0.5, y: 0.3 * (1 - settle) + Math.sin(time * 2.2 + f.phase) * 0.3, z: WIND_BASE.z + Math.cos(time * 1.1 + f.phase) * 0.5 };
      stepStrip(f.strip, dt, { x: scratch.x, y: scratch.y, z: scratch.z }, wind, { gravity: 2.2 + 1.5 * settle, damping: 0.97, windResponse: 1.0, iterations: 5 });
      writeRibbonSlot(f.tip ? litter.tipGeometry : litter.bodyGeometry, f.slot, f.strip, (u) => 0.06 * (0.5 + 0.5 * Math.sin(u * Math.PI)));
    }
    finishRibbonBundle(litter.tipGeometry);
    finishRibbonBundle(litter.bodyGeometry);

    // Les papillons : naissent d'elles, montent et s'eloignent vers l'ouest.
    if (!reduced) {
      spawnAcc.current += wispRate(dusk) * CIHUATETEO.count * dt * blend;
      let toSpawn = Math.floor(spawnAcc.current);
      spawnAcc.current -= toSpawn;
      for (let i = 0; i < BUTTERFLY_POOL && toSpawn > 0; i++) {
        const w = butterflies[i];
        if (w.alive) continue;
        const s = seedRef.current++;
        const b = bearers[s % bearers.length];
        w.alive = true;
        w.x = b.root.position.x + (hash(s, 1) - 0.5) * 0.4;
        w.y = b.root.position.y + BEARER_HEIGHT * (0.4 + 0.6 * hash(s, 2));
        w.z = b.root.position.z + (hash(s, 3) - 0.5) * 0.4;
        w.vx = 0.2 + 0.3 * hash(s, 4);
        w.vy = 0.15 + 0.3 * hash(s, 5);
        w.vz = (hash(s, 6) - 0.5) * 0.3;
        w.age = 0;
        w.life = 3 + 3 * hash(s, 7);
        toSpawn--;
      }
    }
    const pos = butterflyGeometry.getAttribute("position") as BufferAttribute;
    const alpha = butterflyGeometry.getAttribute("aAlpha") as BufferAttribute;
    let visible = 0;
    for (let i = 0; i < BUTTERFLY_POOL; i++) {
      const w = butterflies[i];
      if (!w.alive) {
        alpha.setX(i, 0);
        continue;
      }
      w.age += dt;
      if (w.age >= w.life) {
        w.alive = false;
        alpha.setX(i, 0);
        continue;
      }
      visible++;
      const u = w.age / w.life;
      w.x += (w.vx + Math.sin(time * 1.7 + i) * 0.25) * dt;
      w.y += (w.vy + Math.sin(time * 2.9 + i * 0.7) * 0.35) * dt;
      w.z += (w.vz + Math.cos(time * 1.3 + i) * 0.25) * dt;
      pos.setXYZ(i, w.x, w.y, w.z);
      alpha.setX(i, Math.sin(u * Math.PI) * opacity);
    }
    pos.needsUpdate = true;
    alpha.needsUpdate = true;
    butterflyPoints.visible = visible > 0;
    butterflyUniforms.uScale.value = state.size.height * 0.3;
    butterflyUniforms.uTime.value = time;
  });

  return <group ref={groupRef} visible={false} />;
}
