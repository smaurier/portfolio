/* eslint-disable react-hooks/immutability, react-hooks/purity -- pattern gamedev r3f useFrame : mutation d objets three et d uniforms a 60 fps, graines aleatoires des flammes a l init (meme precedent que cihuateteo, spirit-particles). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import { AdditiveBlending, Bone, BoxGeometry, BufferAttribute, BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, Euler, ExtrudeGeometry, Group, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, Points, PointsMaterial, Quaternion, Shape, SkinnedMesh, Sprite, SpriteMaterial, TorusGeometry, Vector3 } from "three";
import { initShard, stepShard, type Shard } from "@/lib/shards";
import { beamAxis, eastSunDirection, morningStarDirection } from "@/lib/est-arc";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { isMorningStar } from "@/lib/venus";
import { decideSpawn } from "@/lib/xolotl-spawn";
import { FROST } from "@/lib/frost";
import { terrainHeightWorld } from "./cardinal-orientation";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { createFrostState, frostStep } from "@/lib/frost";
import { applyFrost, frostStore, frostUniforms } from "./frost-store";
import { addShaderModifier } from "./shader-patch";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * FrostWorld (06/09, Est / Tlahuizcalpan, etape A « le monde gele ») :
 *  - avance la machine d'etat du gel (lib/frost) et pousse uFrost a tous
 *    les materiaux de la scene (frost-store.applyFrost) ;
 *  - la COQUE DE GLACE du cerf : un clone du squelette (SkeletonUtils) qui
 *    recopie chaque image la pose des os du vrai cerf, gonfle le long des
 *    normales dans le vertex, matiere glace (bleu pale, fresnel blanc) ;
 *  - la coque de la Piedra : un disque de glace pose dessus ;
 *  - la BUEE du cerf : il respire sous la glace (trois bouffees).
 * Est seulement ; hors de l'Est l'etat revient a « gele » pour la
 * prochaine arrivee, uFrost retombe a 0.
 */

const STAG_PATH = "/models/stag.glb";
const SMOKE_SPRITE = "/img/particles/smoke_07.png";
const PIEDRA_RADIUS = 3;
const BREATHS = 3;
const BREATH_PERIOD = 4.2;
/** Les eclats (etape B) : coque du cerf + glace de la Piedra. */
const SHARDS_STAG = 420;
const SHARDS_DISC = 220;
const SHARD_COUNT = SHARDS_STAG + SHARDS_DISC;
const POWDER = 360;
/** Les dards de l'aube (etape C2) : la volee de Venus vers le soleil, puis
 * le dard du soleil vers le cerf. Les astres sont a 80 u, derriere les
 * montagnes du decor (~30 u) : les dards volent dans les MEMES directions
 * mais a 18 u, devant les montagnes, sinon on ne les voit jamais
 * (constate en captures). */
const SKY_RADIUS = 18;
const VOLLEY = 7;
const DARTS_KEY = "nahual-dawn-darts-v1";
const FLAMES = 8;
/** D'ou part la lance sur l'axe du rayon (u) : le sommet du rayon (18 u) est
 * hors cadre, on la lance de plus bas pour la voir voler. */
const SPEAR_LAUNCH = 5.5;
/** Flammes qui lechent la lance elle-meme (en plus de la trainee). */
const SPEAR_FLAMES = 14;

useGLTF.preload(STAG_PATH);
useTexture.preload(SMOKE_SPRITE);

const ICE_COLOR = new Color("#c9dcf2");

function makeIceMaterial(inflate: number): MeshStandardMaterial {
  const mat = new MeshStandardMaterial({ color: ICE_COLOR, roughness: 0.22, metalness: 0.05, transparent: true, opacity: 0.55, depthWrite: false, fog: false });
  addShaderModifier(mat, (shader) => {
    shader.uniforms.uIceInflate = { value: inflate };
    shader.uniforms.uIceAlpha = frostUniforms.uFrost;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\n uniform float uIceInflate;\n varying vec3 vIceN;\n varying vec3 vIceV;")
      .replace("#include <skinning_vertex>", "#include <skinning_vertex>\n transformed += objectNormal * uIceInflate;")
      .replace("#include <fog_vertex>", "#include <fog_vertex>\n vIceN = normalize(transformedNormal);\n vIceV = normalize(-mvPosition.xyz);");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n uniform float uIceAlpha;\n varying vec3 vIceN;\n varying vec3 vIceV;")
      .replace(
        "#include <dithering_fragment>",
        `float iceFresnel = pow(1.0 - abs(dot(normalize(vIceN), normalize(vIceV))), 2.5);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.92, 0.97, 1.0), iceFresnel * 0.85);
         gl_FragColor.a = gl_FragColor.a * uIceAlpha * (0.55 + 0.45 * iceFresnel);
         #include <dithering_fragment>`,
      );
  });
  return mat;
}

type Breath = { sprite: Sprite; born: number };

/** La LANCE de feu (07/09, Sylvain : « qu'elle ressemble a une lance azteque
 * mais de feu ») : un dard de propulseur, le long de +Z : hampe fine,
 * pointe plate en feuille (obsidienne) a l'avant, trois plumes a l'arriere.
 * Couleurs de feu par partie en couleurs de sommets : pointe blanc-jaune
 * (le plus chaud), hampe orange, plumes rouges. Une seule geometrie. */
function colorize(geo: BufferGeometry, color: Color): BufferGeometry {
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = color.r; c[i * 3 + 1] = color.g; c[i * 3 + 2] = color.b; }
  geo.setAttribute("color", new BufferAttribute(c, 3));
  return geo;
}
function makeSpearGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  // La hampe : 2 u, un peu plus fine vers l'arriere.
  const shaft = new CylinderGeometry(0.028, 0.02, 2.0, 8);
  shaft.rotateX(Math.PI / 2);
  parts.push(colorize(shaft, new Color(0.95, 0.5, 0.12)));
  // La pointe : cone a 4 faces aplati (une feuille d'obsidienne), 0,5 u.
  const blade = new ConeGeometry(0.11, 0.5, 4);
  blade.rotateX(Math.PI / 2);
  blade.scale(1, 0.35, 1);
  blade.translate(0, 0, 1.25);
  parts.push(colorize(blade, new Color(1.0, 0.82, 0.42)));
  // Les plumes : trois lames plates a l'arriere, a 120 deg.
  for (let k = 0; k < 3; k++) {
    const fin = new PlaneGeometry(0.075, 0.34);
    fin.translate(0.045, 0, 0);
    fin.rotateY(Math.PI / 2);
    fin.rotateZ((k * Math.PI * 2) / 3);
    fin.translate(0, 0, -0.82);
    parts.push(colorize(fin, new Color(0.95, 0.28, 0.06)));
  }
  const merged = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  return merged ?? new BufferGeometry();
}

/** Le TEPOZTOPILLI de feu (07/09, Sylvain : « une arme historique de feu,
 * pas une fleche ») : la lance de guerre mexica, longue hampe et large
 * tete plate en feuille bordee de lames d'obsidienne enchassees (Codex
 * Mendoza ; cf docs/da/est-sources.md). Le long de +Z. Le bois et la tete
 * sont de braise (orange, plus chaud au coeur de la tete), les lames
 * d'obsidienne restent NOIRES : c'est ce contraste qui fait l'arme. Les
 * flammes sont des sprites accroches a la lance (flamesOn) plus la trainee.
 * Licence dite : la Leyenda parle de dards au propulseur ; la lance est
 * plus lisible a l'ecran. */
function makeTepoztopilli(): { group: Group; flames: Sprite[] } {
  const group = new Group();
  const ember = new MeshBasicMaterial({ color: new Color("#ff7a1c"), fog: false, toneMapped: false });
  const emberHot = new MeshBasicMaterial({ color: new Color("#ffd27a"), fog: false, toneMapped: false });
  const obsidian = new MeshBasicMaterial({ color: new Color("#0a0608"), fog: false });
  const binding = new MeshBasicMaterial({ color: new Color("#3a1408"), fog: false });
  const add = (geo: BufferGeometry, mat: MeshBasicMaterial) => {
    const m = new Mesh(geo, mat);
    m.raycast = () => null;
    m.renderOrder = 11;
    group.add(m);
    return m;
  };
  // La hampe : 2,6 u, un peu plus epaisse vers la tete.
  const shaft = new CylinderGeometry(0.03, 0.024, 2.6, 10);
  shaft.rotateX(Math.PI / 2);
  add(shaft, ember);
  // La tete : une feuille large et plate (0,85 u de long, 0,3 de large),
  // extrudee, dans le plan XZ (on la voit de face quand elle descend).
  const leaf = new Shape();
  leaf.moveTo(0, 0.85);
  leaf.quadraticCurveTo(0.16, 0.55, 0.15, 0.3);
  leaf.lineTo(0.12, 0.02);
  leaf.lineTo(0.05, -0.06);
  leaf.lineTo(-0.05, -0.06);
  leaf.lineTo(-0.12, 0.02);
  leaf.lineTo(-0.15, 0.3);
  leaf.quadraticCurveTo(-0.16, 0.55, 0, 0.85);
  const head = new ExtrudeGeometry(leaf, { depth: 0.04, bevelEnabled: false });
  head.translate(0, 0, -0.02);
  head.rotateX(Math.PI / 2); // la feuille (plan XY) couchee dans le plan XZ, la pointe (y) vers +Z
  head.translate(0, 0, 1.25);
  add(head, ember);
  // Le coeur de la tete, plus chaud : la meme feuille plus etroite, posee dessus.
  const core = new ExtrudeGeometry(leaf, { depth: 0.01, bevelEnabled: false });
  core.scale(0.55, 0.8, 1);
  core.translate(0, 0.08, 0.03);
  core.rotateX(Math.PI / 2);
  core.translate(0, 0, 1.25);
  add(core, emberHot);
  // Les lames d'obsidienne : des dents noires enchassees le long des deux
  // bords, en losange, du pied de la tete jusqu'a la pointe.
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 7; i++) {
      const u = 0.06 + i * 0.1; // le long de la tete (0..0,85)
      // Largeur du bord a cette hauteur (approximation de la feuille).
      const half = u < 0.3 ? 0.12 + (u / 0.3) * 0.03 : 0.15 * (1 - ((u - 0.3) / 0.55) ** 1.4);
      const tooth = new BoxGeometry(0.1, 0.05, 0.1);
      tooth.rotateY(Math.PI / 4);
      tooth.translate(side * (half + 0.05), 0, 1.25 + u);
      add(tooth, obsidian);
    }
  }
  // Les ligatures sous la tete : trois anneaux sombres.
  for (let i = 0; i < 3; i++) {
    const ring = new TorusGeometry(0.04, 0.012, 6, 14);
    ring.translate(0, 0, 1.05 - i * 0.07);
    add(ring, binding);
  }
  // Un pommeau de plumes courtes a l'arriere (bandes sombres).
  const cap = new CylinderGeometry(0.045, 0.03, 0.18, 8);
  cap.rotateX(Math.PI / 2);
  cap.translate(0, 0, -1.25);
  add(cap, binding);
  const flames: Sprite[] = [];
  return { group, flames };
}

/** La lame d'obsidienne courbe (Itztlacoliuhqui) : une section en losange
 * balayee le long d'une courbe, effilee vers la pointe. */
function makeBladeGeometry(): BufferGeometry {
  const segs = 24;
  const positions: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    // Courbe : monte en s'incurvant (une lame recourbee).
    const x = 0.28 * u * u;
    const y = 0.72 * u;
    const w = 0.06 * (1 - u * 0.85) * (0.3 + 0.7 * Math.sin(Math.min(1, u * 4) * Math.PI * 0.5));
    const t = 0.014 * (1 - u * 0.7);
    // Section losange autour de (x, y) : largeur selon x, epaisseur selon z.
    positions.push(x - w, y, 0, x, y, t, x + w, y, 0, x, y, -t);
    if (i < segs) {
      const b = i * 4, n = b + 4;
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        index.push(b + k, n + k, b + k2, b + k2, n + k, n + k2);
      }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** Un eclat de glace : icosaedre aplati et deforme, une seule geometrie. */
function makeShardGeometry(): IcosahedronGeometry {
  const geo = new IcosahedronGeometry(0.09, 0);
  const pos = geo.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const j = 1 + (Math.sin(i * 7.3) * 0.5) * 0.5;
    pos.setXYZ(i, x * j * 1.3, y * 0.35 * j, z * j);
  }
  geo.computeVertexNormals();
  return geo;
}

export default function FrostWorld() {
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const { scene: stagScene } = useGLTF(STAG_PATH);
  const smokeTexture = useTexture(SMOKE_SPRITE);
  const rootRef = useRef<Group>(null);
  const frameRef = useRef(0);

  const iceMaterial = useMemo(() => {
    const m = makeIceMaterial(0.06);
    m.opacity = 0.3; // le cerf lui-meme est de verre (glassModifier) : la coque n'est qu'un bord
    return m;
  }, []);
  // Un materiau a part pour les bois (maille statique) : partage avec les
  // mailles skinnees, three rechercherait le programme a chaque image.
  const iceMaterialStatic = useMemo(() => {
    const m = makeIceMaterial(0.06);
    m.opacity = 0.3;
    return m;
  }, []);
  // Le cerf de VERRE (Sylvain, 06/09 : « le cerf glace doit etre translucide,
  // texture glace/vitre ») : ses propres materiaux deviennent, sous le gel,
  // une vitre bleu pale translucide a bords blancs (fresnel), le fond se
  // voit a travers. Pose une fois sur les materiaux du vrai cerf, apres
  // le givre generique pour passer par-dessus.
  const glassAppliedRef = useRef(false);
  const discMaterial = useMemo(() => {
    const m = makeIceMaterial(0);
    m.opacity = 0.2; // les gravures de la Piedra se lisent sous la glace
    return m;
  }, []);

  // La coque du cerf : clone du squelette, chaque os recopie du vrai cerf.
  const shell = useMemo(() => {
    const clone = cloneSkeleton(stagScene) as Object3D;
    clone.matrixAutoUpdate = false;
    const pairs: { src: Object3D; dst: Object3D }[] = [];
    clone.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) {
        mesh.material = (mesh as unknown as SkinnedMesh).isSkinnedMesh ? iceMaterial : iceMaterialStatic;
        mesh.raycast = () => null;
        mesh.renderOrder = 6;
        mesh.frustumCulled = false;
      }
      if ((o as Bone).isBone || o.parent === clone) {
        const src = stagScene.getObjectByName(o.name);
        if (src && src !== stagScene) pairs.push({ src, dst: o });
      }
    });
    const head = stagScene.getObjectByName("Head") ?? null;
    return { clone, pairs, head };
  }, [stagScene, iceMaterial, iceMaterialStatic]);

  const disc = useMemo(() => {
    const m = new Mesh(new CircleGeometry(PIEDRA_RADIUS, 96), discMaterial);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.045;
    m.raycast = () => null;
    m.renderOrder = 5;
    return m;
  }, [discMaterial]);

  const breathMaterial = useMemo(() => new SpriteMaterial({ map: smokeTexture, color: new Color("#dfe9f5"), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }), [smokeTexture]);
  const breaths = useMemo<Breath[]>(() => Array.from({ length: BREATHS }, (_, k) => {
    const sprite = new Sprite(breathMaterial.clone());
    sprite.raycast = () => null;
    sprite.renderOrder = 7;
    return { sprite, born: -k * (BREATH_PERIOD / BREATHS) };
  }), [breathMaterial]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.add(shell.clone);
    root.add(disc);
    for (const b of breaths) root.add(b.sprite);
    return () => {
      root.remove(shell.clone);
      root.remove(disc);
      for (const b of breaths) root.remove(b.sprite);
    };
  }, [shell, disc, breaths]);

  useEffect(() => () => {
    iceMaterial.dispose();
    iceMaterialStatic.dispose();
    discMaterial.dispose();
    disc.geometry.dispose();
    breathMaterial.dispose();
  }, [iceMaterial, iceMaterialStatic, discMaterial, disc, breathMaterial]);

  const headPos = useMemo(() => new Vector3(), []);
  const headDir = useMemo(() => new Vector3(), []);

  // ---- L'explosion : eclats instancies, poudre de glace, flash. ----
  const shardMaterial = useMemo(() => {
    const m = new MeshStandardMaterial({ color: new Color("#dbe9ff"), roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.85, fog: false });
    return m;
  }, []);
  const shardMesh = useMemo(() => {
    const mesh = new InstancedMesh(makeShardGeometry(), shardMaterial, SHARD_COUNT);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.raycast = () => null;
    mesh.renderOrder = 8;
    return mesh;
  }, [shardMaterial]);
  const shards = useMemo<Shard[]>(() => [], []);
  const powder = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array(POWDER * 3), 3));
    const mat = new PointsMaterial({ map: smokeTexture, color: new Color("#eaf3ff"), size: 0.16, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false });
    const pts = new Points(geo, mat);
    pts.frustumCulled = false;
    pts.raycast = () => null;
    pts.renderOrder = 9;
    const vel = new Float32Array(POWDER * 3);
    return { pts, geo, mat, vel };
  }, [smokeTexture]);
  const flash = useMemo(() => {
    const s = new Sprite(new SpriteMaterial({ map: smokeTexture, color: new Color("#ffffff"), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }));
    s.raycast = () => null;
    s.renderOrder = 10;
    return s;
  }, [smokeTexture]);
  // Les dards : de fines hampes lumineuses (InstancedMesh), la volee de
  // Venus (si elle est reellement du matin, sinon une fois sur trois) et le
  // dard du soleil, toujours.
  const dartMesh = useMemo(() => {
    const geo = makeSpearGeometry();
    const mat = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
    const mesh = new InstancedMesh(geo, mat, VOLLEY + 1);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.raycast = () => null;
    mesh.renderOrder = 11;
    return mesh;
  }, []);
  const volleyShows = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const cached = sessionStorage.getItem(DARTS_KEY);
      const show = decideSpawn(isMorningStar() ? 1 : 1 / 3, cached);
      sessionStorage.setItem(DARTS_KEY, show ? "1" : "0");
      return show;
    } catch {
      return false;
    }
  }, []);
  const blade = useMemo(() => {
    const m = new Mesh(makeBladeGeometry(), new MeshStandardMaterial({ color: new Color("#07050c"), roughness: 0.18, metalness: 0.35, emissive: new Color("#24103a"), emissiveIntensity: 0.5, fog: false }));
    m.raycast = () => null;
    m.renderOrder = 6;
    m.visible = false;
    return m;
  }, []);
  // Les flammes de la lance du soleil : une trainee de sprites sur ses
  // dernieres positions, du jaune au rouge, qui s'eteint derriere elle.
  const flames = useMemo(() => Array.from({ length: FLAMES }, (_, k) => {
    const u = k / (FLAMES - 1);
    const s = new Sprite(new SpriteMaterial({ map: smokeTexture, color: new Color().setRGB(1, 0.75 - 0.55 * u, 0.25 - 0.2 * u), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }));
    s.raycast = () => null;
    s.renderOrder = 10;
    return s;
  }), [smokeTexture]);
  const flameTrail = useMemo(() => Array.from({ length: FLAMES }, () => new Vector3(0, -100, 0)), []);
  // La lance elle-meme (tepoztopilli) et les flammes qui la lechent.
  const spear = useMemo(() => {
    const { group } = makeTepoztopilli();
    const flamesOn: { sprite: Sprite; z: number; r: number; a: number; seed: number }[] = [];
    for (let i = 0; i < SPEAR_FLAMES; i++) {
      const u = i / (SPEAR_FLAMES - 1);
      const hot = u > 0.7;
      const s = new Sprite(new SpriteMaterial({ map: smokeTexture, color: hot ? new Color(1, 0.85, 0.45) : new Color(1, 0.45 + 0.3 * u, 0.1), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }));
      s.raycast = () => null;
      s.renderOrder = 10;
      group.add(s);
      flamesOn.push({ sprite: s, z: -1.2 + u * 2.9, r: 0.06 + 0.1 * Math.random(), a: Math.random() * Math.PI * 2, seed: Math.random() * 10 });
    }
    group.visible = false;
    return { group, flamesOn };
  }, [smokeTexture]);
  const dartFrom = useMemo(() => new Vector3(), []);
  const spearX = useMemo(() => new Vector3(), []);
  const spearY = useMemo(() => new Vector3(), []);
  const spearZ = useMemo(() => new Vector3(), []);
  const spearBasis = useMemo(() => new Matrix4(), []);
  const dartTo = useMemo(() => new Vector3(), []);
  const dartDir = useMemo(() => new Vector3(), []);
  const explodedRef = useRef(false);
  const explodedAtRef = useRef(0);
  const warmedRef = useRef(false);
  const tmpMatrix = useMemo(() => new Matrix4(), []);
  const tmpQuat = useMemo(() => new Quaternion(), []);
  const tmpEuler = useMemo(() => new Euler(), []);
  const tmpPos = useMemo(() => new Vector3(), []);
  const tmpScale = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.add(shardMesh);
    root.add(powder.pts);
    root.add(flash);
    root.add(dartMesh);
    root.add(blade);
    root.add(spear.group);
    for (const f of flames) root.add(f);
    return () => {
      root.remove(spear.group);
      root.remove(shardMesh);
      root.remove(powder.pts);
      root.remove(flash);
      root.remove(dartMesh);
      root.remove(blade);
      for (const f of flames) root.remove(f);
    };
  }, [shardMesh, powder, flash, dartMesh, blade, flames, spear]);
  useEffect(() => () => {
    dartMesh.geometry.dispose();
    (dartMesh.material as MeshBasicMaterial).dispose();
    blade.geometry.dispose();
    (blade.material as MeshStandardMaterial).dispose();
  }, [dartMesh, blade]);
  useEffect(() => () => {
    shardMesh.geometry.dispose();
    shardMaterial.dispose();
    powder.geo.dispose();
    powder.mat.dispose();
    flash.material.dispose();
  }, [shardMesh, shardMaterial, powder, flash]);

  /** Au premier instant de l'explosion : les eclats naissent la ou etait la
   * glace (sommets skinnes de la coque, points du disque), la poudre et le
   * flash au point d'impact, l'onde pour l'herbe, le son. */
  const explode = (time: number) => {
    const impact = frostStore.impact;
    stagScene.getWorldPosition(tmpPos);
    impact.x = tmpPos.x; impact.y = tmpPos.y + 1.0; impact.z = tmpPos.z;
    shards.length = 0;
    const skinned: SkinnedMesh[] = [];
    shell.clone.traverse((o) => { if ((o as SkinnedMesh).isSkinnedMesh) skinned.push(o as SkinnedMesh); });
    shell.clone.updateMatrixWorld(true);
    let seed = 1;
    for (let i = 0; i < SHARDS_STAG && skinned.length > 0; i++) {
      const mesh = skinned[i % skinned.length];
      const count = mesh.geometry.attributes.position.count;
      const idx = Math.floor(((i * 7919) % count + count) % count);
      mesh.applyBoneTransform(idx, tmpPos);
      mesh.localToWorld(tmpPos);
      shards.push(initShard({ x: tmpPos.x, y: tmpPos.y, z: tmpPos.z }, impact, seed++));
    }
    for (let i = 0; i < SHARDS_DISC; i++) {
      const a = (i / SHARDS_DISC) * Math.PI * 2 * 7.3;
      const r = Math.sqrt(((i * 31) % 100) / 100) * PIEDRA_RADIUS;
      shards.push(initShard({ x: Math.cos(a) * r, y: 0.05, z: Math.sin(a) * r }, impact, seed++));
    }
    const pos = powder.geo.attributes.position as BufferAttribute;
    for (let i = 0; i < POWDER; i++) {
      const u = Math.random(), v = Math.random();
      const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1);
      const sp = 2 + Math.random() * 6;
      powder.vel[i * 3] = Math.sin(ph) * Math.cos(th) * sp;
      powder.vel[i * 3 + 1] = Math.abs(Math.cos(ph)) * sp * 0.8 + 1;
      powder.vel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp;
      pos.setXYZ(i, impact.x, impact.y, impact.z);
    }
    pos.needsUpdate = true;
    flash.position.set(impact.x, impact.y, impact.z);
    frostStore.impulse += 1;
    explodedAtRef.current = time;
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nahual:frost-shatter"));
  };

  useFrame((state, delta) => {
    const east = direction === "dore";
    const dt = Math.min(delta, 1 / 20);
    if (east) {
      frostStore.active = true;
      frostStep(frostStore.state, sceneRefs?.progressRef.current ?? 0, dt, sceneRefs?.reducedMotionRef.current ?? false);
    } else if (frostStore.active) {
      frostStore.active = false;
      frostStore.state = createFrostState();
    }
    const target = east ? frostStore.state.frost : 0;
    frostUniforms.uFrost.value += (target - frostUniforms.uFrost.value) * Math.min(1, dt * 6);
    frostUniforms.uFrostTime.value = state.clock.elapsedTime;
    // Le traverse de toute la scene (1900 objets) ne sert qu'a rattraper les
    // materiaux montes apres coup : une image sur 20 suffit.
    if ((frameRef.current = (frameRef.current + 1) % 20) === 0) applyFrost(state.scene);
    if (!glassAppliedRef.current && frameRef.current >= 1) {
      glassAppliedRef.current = true;
      applyFrost(stagScene);
      stagScene.traverse((o) => {
        const m = (o as Mesh).material as MeshStandardMaterial | undefined;
        if (!m || Array.isArray(m) || !(m as MeshStandardMaterial).isMeshStandardMaterial) return;
        addShaderModifier(m, (shader) => {
          shader.uniforms.uGlass = frostUniforms.uFrost;
          shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", `#include <common>
 uniform float uGlass;`)
            .replace(
              "#include <dithering_fragment>",
              `if (uGlass > 0.001) {
                 vec3 gN = normalize(vNormal);
                 vec3 gV = normalize(vViewPosition);
                 float gNV = abs(dot(gN, gV));
                 float gFres = pow(1.0 - gNV, 2.2);
                 // Verre : le fond passe au centre, les bords se blanchissent.
                 vec3 glassCol = mix(vec3(0.62, 0.78, 0.96), vec3(0.97, 0.99, 1.0), gFres);
                 gl_FragColor.rgb = mix(gl_FragColor.rgb, glassCol * (0.55 + 0.45 * gFres), uGlass);
                 gl_FragColor.a = mix(gl_FragColor.a, 0.22 + 0.7 * gFres, uGlass);
               }
               #include <dithering_fragment>`,
            );
        });
      });
    }

    const root = rootRef.current;
    if (!root) return;
    const frost = frostUniforms.uFrost.value;
    const phase = frostStore.state.phase;
    const t = state.clock.elapsedTime;

    // Prechauffage (07/09) : la lance, les eclats et la poudre compilent
    // leurs shaders a la premiere image ou ils apparaissent, ce qui gelait
    // l'image au milieu du vol de la lance. On les dessine une fois, hors
    // champ, des l'arrivee sur la page.
    if (east && !warmedRef.current) {
      warmedRef.current = true;
      tmpMatrix.compose(tmpPos.set(0, -200, 0), tmpQuat.identity(), tmpScale.set(1, 1, 1));
      dartMesh.setMatrixAt(0, tmpMatrix);
      dartMesh.count = 1;
      dartMesh.instanceMatrix.needsUpdate = true;
      dartMesh.visible = true;
      shardMesh.setMatrixAt(0, tmpMatrix);
      shardMesh.count = 1;
      shardMesh.instanceMatrix.needsUpdate = true;
      shardMesh.visible = true;
      powder.pts.visible = true;
      for (const f of flames) { f.position.set(0, -200, 0); f.material.opacity = 0.01; }
      flash.position.set(0, -200, 0);
      flash.material.opacity = 0.01;
      flash.visible = true;
      blade.position.set(0, -200, 0);
      blade.visible = true;
      spear.group.position.set(0, -200, 0);
      spear.group.visible = true;
      for (const f of spear.flamesOn) f.sprite.material.opacity = 0.01;
      root.visible = true;
      return;
    }
    // L'explosion : armee quand les eclats commencent (apres le prelude des
    // dards), desarmee au regel.
    if (east && phase === "shatter" && frostStore.state.shatter > 0 && !explodedRef.current) {
      explodedRef.current = true;
      explode(t);
    }
    if (!east || phase === "frozen") explodedRef.current = false;
    // Le cabre : le temps d'une seconde (Sylvain, 07/09), puis il retrouve
    // sa posture : 0,1 s apres l'impact, monte en 0,3 s, tient 0,15 s,
    // redescend en 0,5 s. Pas de clip de cabre dans le modele : pose
    // procedurale sur les os, dans stag-model.
    if (explodedRef.current && phase !== "refreeze" && !sceneRefs?.reducedMotionRef.current) {
      const r = t - explodedAtRef.current - 0.1;
      let rear = 0;
      if (r > 0 && r < 0.3) { const u = r / 0.3; rear = 1 - (1 - u) * (1 - u); }
      else if (r >= 0.3 && r < 0.45) rear = 1;
      else if (r >= 0.45 && r < 0.95) { const u = (r - 0.45) / 0.5; rear = 1 - u * u * (3 - 2 * u); }
      frostStore.rear = rear;
    } else {
      frostStore.rear = 0;
    }
    // Le puits de lumiere (sun-beam) : s'ouvre 1 s apres l'impact, en 3 s ; part au regel.
    frostStore.beam = explodedRef.current && phase !== "refreeze" ? Math.min(1, Math.max(0, (t - explodedAtRef.current - 1.0) / 3)) : 0;
    // L'or dans les gravures : monte en 2,5 s apres l'impact, part au regel.
    frostStore.gold = explodedRef.current && phase !== "refreeze" ? Math.min(1, Math.max(0, (t - explodedAtRef.current - 0.6) / 2.5)) : 0;

    // Les dards de l'aube pendant le prelude : la volee de Venus vers le
    // soleil (0 .. 0,55), puis le dard du soleil vers le cerf (0,55 .. 0,95).
    const dartsK = east && phase === "shatter" ? frostStore.state.darts : 0;
    if (dartsK > 0 && dartsK < 1) {
      const cam = state.camera.position;
      const p = sceneRefs?.progressRef.current ?? 0;
      const sun = eastSunDirection(Math.max(p, FROST.shatterAt));
      const venus = morningStarDirection();
      let n = 0;
      if (volleyShows) {
        for (let i = 0; i < VOLLEY; i++) {
          const start = i * 0.045;
          const k = (dartsK - start) / 0.4;
          if (k <= 0 || k >= 1) continue;
          const spread = (i - (VOLLEY - 1) / 2) * 0.03;
          dartFrom.set(cam.x + venus.x * SKY_RADIUS, cam.y + venus.y * SKY_RADIUS + spread * 9, cam.z + venus.z * SKY_RADIUS);
          dartTo.set(cam.x + sun.x * SKY_RADIUS, cam.y + sun.y * SKY_RADIUS + 0.4, cam.z + sun.z * SKY_RADIUS);
          tmpPos.lerpVectors(dartFrom, dartTo, k);
          dartDir.subVectors(dartTo, dartFrom).normalize();
          tmpQuat.setFromUnitVectors(new Vector3(0, 0, 1), dartDir);
          tmpMatrix.compose(tmpPos, tmpQuat, tmpScale.set(1.1, 1.1, 1.1));
          dartMesh.setMatrixAt(n++, tmpMatrix);
        }
      }
      // La reponse du soleil : UNE lance de feu, du sommet du puits de
      // lumiere (meme axe que sun-beam) vers le point d'impact, avec sa
      // trainee de flammes.
      const k = (dartsK - 0.55) / 0.4;
      if (k > 0 && k < 1) {
        stagScene.getWorldPosition(dartTo);
        dartTo.y += 1.0;
        const ax = beamAxis(p);
        dartFrom.set(ax.x * SPEAR_LAUNCH, ax.y * SPEAR_LAUNCH, ax.z * SPEAR_LAUNCH);
        tmpPos.lerpVectors(dartFrom, dartTo, Math.pow(k, 1.3));
        dartDir.subVectors(dartTo, dartFrom).normalize();
        spear.group.position.copy(tmpPos);
        // La face plate de la tete (plan XZ local, normale Y) regarde la
        // camera : base orthonormee z = direction du vol, y = vers la camera.
        spearZ.copy(dartDir);
        spearY.copy(cam).sub(tmpPos);
        spearY.addScaledVector(spearZ, -spearY.dot(spearZ)).normalize();
        spearX.crossVectors(spearY, spearZ).normalize();
        spearBasis.makeBasis(spearX, spearY, spearZ);
        spear.group.quaternion.setFromRotationMatrix(spearBasis);
        spear.group.scale.setScalar(1.5);
        spear.group.visible = true;
        for (const f of spear.flamesOn) {
          const fl = 0.7 + 0.3 * Math.sin(t * 23 + f.seed);
          f.sprite.position.set(Math.cos(f.a + t * 9) * f.r, Math.sin(f.a + t * 9) * f.r, f.z + Math.sin(t * 17 + f.seed) * 0.05);
          f.sprite.scale.setScalar((f.z > 0.9 ? 0.55 : 0.32) * fl);
          f.sprite.material.rotation = t * 4 + f.seed;
          f.sprite.material.opacity = 0.9 * fl;
        }
        // La trainee : on decale l'historique et on pose la position du moment.
        for (let i = FLAMES - 1; i > 0; i--) flameTrail[i].copy(flameTrail[i - 1]);
        flameTrail[0].copy(tmpPos).addScaledVector(dartDir, -0.4);
        flames.forEach((f, i) => {
          const u = i / (FLAMES - 1);
          f.position.copy(flameTrail[i]);
          f.scale.setScalar(2.4 - 1.6 * u);
          f.material.rotation = t * 3 + i;
          f.material.opacity = flameTrail[i].y > -50 ? 1.0 * (1 - u * 0.8) : 0;
        });
      } else {
        spear.group.visible = false;
        for (const f of flames) f.material.opacity = 0;
        if (k >= 1 || dartsK < 0.55) for (const v of flameTrail) v.set(0, -100, 0);
      }
      dartMesh.count = n;
      dartMesh.instanceMatrix.needsUpdate = true;
      dartMesh.visible = n > 0;
    } else {
      dartMesh.visible = false;
      spear.group.visible = false;
      for (const f of flames) f.material.opacity = 0;
    }

    // La lame d'obsidienne courbe : Tlahuizcalpantecuhtli change en
    // Itztlacoliuhqui, plantee la ou le dard a frappe, tant que le monde
    // est degele.
    if (explodedRef.current && phase !== "frozen") {
      const grow = Math.min(1, Math.max(0, (t - explodedAtRef.current) / 0.35));
      blade.visible = grow > 0 && frost < 0.9;
      const impact = frostStore.impact;
      const cam = state.camera.position;
      // Devant le cerf, du cote de la camera, plantee de biais.
      const dx = cam.x - impact.x, dz = cam.z - impact.z;
      const d = Math.hypot(dx, dz) || 1;
      blade.position.set(impact.x + (dx / d) * 1.5, terrainHeightWorld(impact.x + (dx / d) * 1.5, impact.z + (dz / d) * 1.5) - 0.12, impact.z + (dz / d) * 1.5);
      blade.rotation.set(0.35, Math.atan2(dx, dz) + 0.6, -0.25);
      blade.scale.setScalar(0.35 + 0.65 * grow);
    } else {
      blade.visible = false;
    }
    const since = explodedRef.current ? t - explodedAtRef.current : 99;
    const exploding = since < 6 && !sceneRefs?.reducedMotionRef.current;
    root.visible = frost > 0.01 || exploding;
    if (!root.visible) return;

    if (exploding) {
      // Les eclats.
      let alive = 0;
      for (let i = 0; i < shards.length; i++) {
        const s = shards[i];
        stepShard(s, dt, terrainHeightWorld);
        if (s.life <= 0) continue;
        tmpQuat.setFromEuler(tmpEuler.set(s.rx, s.ry, s.rz));
        const sc = s.size * (0.4 + 0.6 * s.life);
        tmpMatrix.compose(tmpPos.set(s.x, s.y + 0.03, s.z), tmpQuat, tmpScale.set(sc, sc, sc));
        shardMesh.setMatrixAt(alive++, tmpMatrix);
      }
      shardMesh.count = alive;
      shardMesh.instanceMatrix.needsUpdate = true;
      shardMesh.visible = alive > 0;
      // La poudre de glace : elle monte, derive, retombe lentement et prend la lumiere.
      const pos = powder.geo.attributes.position as BufferAttribute;
      for (let i = 0; i < POWDER; i++) {
        powder.vel[i * 3 + 1] -= 1.2 * dt;
        powder.vel[i * 3] *= 1 - 0.9 * dt;
        powder.vel[i * 3 + 2] *= 1 - 0.9 * dt;
        pos.setXYZ(i, pos.getX(i) + powder.vel[i * 3] * dt, Math.max(0.02, pos.getY(i) + powder.vel[i * 3 + 1] * dt), pos.getZ(i) + powder.vel[i * 3 + 2] * dt);
      }
      pos.needsUpdate = true;
      powder.mat.opacity = Math.max(0, 0.9 * (1 - since / 4.5));
      powder.pts.visible = powder.mat.opacity > 0.01;
      // Le flash : une lumiere qui claque et s'eteint en un demi-seconde.
      const f = Math.max(0, 1 - since / 0.5);
      flash.scale.setScalar(2 + 14 * (1 - f));
      flash.material.opacity = f * f;
      flash.visible = f > 0;
    } else {
      shardMesh.visible = false;
      powder.pts.visible = false;
      flash.visible = false;
    }

    // La coque suit le vrai cerf : transform monde de la scene du modele,
    // puis chaque os.
    stagScene.updateMatrixWorld();
    shell.clone.matrix.copy(stagScene.matrixWorld);
    shell.clone.matrixWorldNeedsUpdate = true;
    for (const { src, dst } of shell.pairs) {
      dst.position.copy(src.position);
      dst.quaternion.copy(src.quaternion);
      dst.scale.copy(src.scale);
    }
    shell.clone.visible = frost > 0.05;
    disc.visible = frost > 0.05;

    // La buee : le cerf respire sous la glace. Depuis la tete, vers l'avant
    // (axe Y local de l'os, le long du museau), derive et se dissipe.
    const head = shell.head;
    if (head) {
      head.getWorldPosition(headPos);
      headDir.setFromMatrixColumn(head.matrixWorld, 1).normalize();
      for (const b of breaths) {
        let age = (t - b.born) % BREATH_PERIOD;
        if (age < 0) age += BREATH_PERIOD;
        const life = 1.6;
        const k = age / life;
        if (k > 1) { b.sprite.material.opacity = 0; continue; }
        b.sprite.position.copy(headPos).addScaledVector(headDir, 0.32 + k * 0.35);
        b.sprite.position.y += 0.05 + k * 0.28;
        b.sprite.scale.setScalar(0.12 + k * 0.45);
        b.sprite.material.rotation = b.born + k * 0.8;
        b.sprite.material.opacity = 0.32 * frost * Math.sin(k * Math.PI) * (1 - 0.6 * k);
      }
    }
  });

  return <group ref={rootRef} visible={false} />;
}
