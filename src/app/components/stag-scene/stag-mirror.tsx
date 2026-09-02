/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation des uniforms partages 60 fps legitime en 3D (meme precedent que cardinal-ambience). */
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  AnimationMixer,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  ShaderMaterial,
  SkinnedMesh,
  Vector3,
} from "three";
import { clone as cloneSkinnedScene } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";
import { TEZCATL_EXTENT, tezcatlStore } from "./tezcatl-store";

/**
 * StagMirror (01/09, etage 4 sprint identites : element B de la fiche
 * Mictlampa). Le reflet MENTEUR du cerf dans le tezcatl : le miroir de
 * Tezcatlipoca ne reflete pas, il revele ou il ment (mythe du reflet
 * de Quetzalcoatl ; epithete Necoc Yaotl "l'Ennemi des deux cotes").
 *
 * Implementation : silhouette STATIQUE en bind pose, geometries des
 * SkinnedMesh CUITES en espace racine (applyMatrix4 du transform
 * relatif de chaque mesh) puis normalisees a la main. Genese douloureuse
 * du 01/09, 6 tentatives : le skinning ne survit qu'aux transforms
 * rigides d'ancetres (scale negatif ou non-uniforme = glitch), et la
 * chirurgie de hierarchie clonee (SkeletonUtils/clone+remplacement)
 * laissait des transforms fantomes inexplicables. Geometrie cuite =
 * zero hierarchie, zero surprise. ShaderMaterial dedie plutot que
 * onBeforeCompile : pas d'anchors de chunks qui echouent en silence.
 *
 * Et le mensonge y gagne : LE VIVANT RESPIRE, SON REFLET NE RESPIRE
 * PAS. Le miroir des morts montre une version figee du cerf : ce que
 * le tezcatl revele (ce que tu seras), pas ce que tu es. Seule une
 * lente pulsation d'opacite le fait "exister".
 *
 * Visible uniquement dans le disque du miroir (masque radial world-
 * space, rayon PiedraGround=3, bord doux, jamais de smoothstep
 * inverse : comportement indefini GLSL). depthTest off : le sol ne le
 * cache pas, c'est le miroir qui laisse voir a travers. Actif au Nord
 * seulement, pulsation gelee si prefers-reduced-motion.
 */

const MODEL_PATH = "/models/stag.glb";
const TARGET_HEIGHT = 2; // meme normalisation que StagModel
/** Opacite PAR COUCHE de triangles. Blending NORMAL et pas additif :
 * en additif, les dizaines de couches du modele compresse s'empilaient
 * en boule blanche que le bloom embrasait (constate le 01/09, meme a
 * 0.055). En normal, l'alpha converge (1-(1-a)^n) : jamais de white-out.
 * 0.22 -> 0.15 (retour Sylvain "un chouilla trop fort"). */
const MIRROR_OPACITY = 0.15;
/** Le reflet se decouvre en DESCENDANT la page (axe systemique 3 du
 * Codex : scroller = descendre les niveaux du Mictlan). En haut de
 * page il affleure a peine, plein bas il est entier. */
const SCROLL_GATE_FLOOR = 0.3;
const MIRROR_COLOR = new Color("#8a7fb0"); // la lueur froide du puits
const MIRROR_RADIUS = 3.0; // = GROUND_RADIUS de PiedraGround
/** Compression de la profondeur du reflet (02/09, retour Sylvain "le
 * reflet n'a pas ses bois, on doit les voir"). A l'echelle 1, le cerf
 * inverse s'enfonce de 2 unites sous le plan du miroir : avec la camera
 * du site, la tete et les bois du reflet sortaient sous le bord bas du
 * viewport (constate a la capture, seul le corps se lisait). Le
 * tezcatl ment, il n'est pas tenu a l'optique : on tasse la profondeur
 * pour que le cerf inverse ENTIER, bois compris, tienne dans le disque
 * visible. Le fade de contact suit la meme echelle (sinon il mangeait
 * tout le corps compresse). */
const MIRROR_DEPTH_SCALE = 0.5;
/** Plan du miroir = le sol (Ground/PiedraGround a y~0, cerf normalise
 * pieds a y=0 par centerAndScale). L'ancien 0.38 compensait la
 * normalisation faussee par les bois debordes : une fois la cuisson
 * corrigee, les jambes inversees remontaient DANS les vraies jambes
 * (retour Sylvain 02/09 "le reflet est fusionne avec le cerf au niveau
 * des jambes"). */
const MIRROR_PLANE_Y = -0.2; // 02/09 "tu peux encore decaler" : un vrai ecart entre pieds et reflet
/** Deformation "air chaud" (02/09, idee notee le 01/09 "comme l'air au
 * dessus de l'asphalte en ete") : chaque vertex du reflet est decale dans
 * le plan par le champ de vitesse de la fumee (tezcatl-fluid-sim, via
 * tezcatlStore), en unites monde par unite de vitesse de grille. */
const HAZE_STRENGTH = 0.18;
/** Refraction par la surface de l'eau : le gradient de PRESSION du meme
 * fluide (un seul simulateur pour tout, arbitrage Sylvain 02/09) decale
 * le reflet, en unites monde par unite de gradient. */
const PRESSURE_REFRACT = 1.2;
/** Bande du fade de contact, en unites de cerf non compresse (jambes
 * inversees noyees dans la fumee du plan de contact). */
const CONTACT_FADE_DEPTH = 0.9;
const CONTACT_FADE_EDGE = 0.08;

export default function StagMirror() {
  const groupRef = useRef<Group>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const opacityRef = useRef(0);

  const gltf = useGLTF(MODEL_PATH);

  const geometries = useMemo(() => {
    // Cuisson de la POSE SKINNEE en CPU (applyBoneTransform vertex par
    // vertex) : les attributs position bruts de ce GLB ne sont PAS un
    // cerf (bloc difforme constate le 01/09 apres N tentatives), seul
    // le squelette reconstitue la forme. On echantillonne donc chaque
    // vertex a travers les bones au repos, en espace monde du clone,
    // puis normalisation commune (hauteur TARGET_HEIGHT, pieds y=0).
    const skinnedClone = cloneSkinnedScene(gltf.scene);
    // Pose IDLE frame 0 et pas la rest pose du rig : le vrai cerf joue
    // Idle, la rest pose avait la tete/les bois ailleurs (retour
    // Sylvain 01/09 "les bois sont mal places").
    const idleClip = gltf.animations.find((c) => c.name === "Idle");
    if (idleClip) {
      const mixer = new AnimationMixer(skinnedClone);
      mixer.clipAction(idleClip).play();
      mixer.update(0);
    }
    skinnedClone.updateMatrixWorld(true);
    const baked: BufferGeometry[] = [];
    const v = new Vector3();
    skinnedClone.traverse((obj) => {
      if (obj instanceof SkinnedMesh) {
        obj.skeleton.update();
        const src = obj.geometry as BufferGeometry;
        const pos = src.attributes.position;
        const arr = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          obj.applyBoneTransform(i, v);
          v.applyMatrix4(obj.matrixWorld);
          arr[i * 3] = v.x;
          arr[i * 3 + 1] = v.y;
          arr[i * 3 + 2] = v.z;
        }
        const geo = new BufferGeometry();
        geo.setAttribute("position", new BufferAttribute(arr, 3));
        if (src.index) geo.setIndex(src.index.clone());
        baked.push(geo);
      } else if (obj instanceof Mesh) {
        // Bois (Stag_Horns : Mesh rigide, enfant de l'os Head). Meme
        // chemin que le corps : lecture vertex par vertex vers un
        // Float32 NEUF, jamais applyMatrix4 sur l'attribut source. Ce
        // GLB est quantifie (KHR_mesh_quantization : positions Int16
        // normalisees, d'ou le scale 0.0127 du noeud) : ecrire une
        // coordonnee monde (y=1.7) dans un Int16 normalise deborde et
        // boucle (1.708 -> -0.292, soit exactement -2.0 = 65536/32767).
        // Constate le 02/09 : les bois du reflet atterrissaient sous
        // les pieds, noyes par le fade de contact, et faussaient la
        // normalisation de tout le reflet (corps tasse a 1.47).
        const src = obj.geometry as BufferGeometry;
        const pos = src.attributes.position;
        const arr = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
          arr[i * 3] = v.x;
          arr[i * 3 + 1] = v.y;
          arr[i * 3 + 2] = v.z;
        }
        const geo = new BufferGeometry();
        geo.setAttribute("position", new BufferAttribute(arr, 3));
        if (src.index) geo.setIndex(src.index.clone());
        baked.push(geo);
      }
    });
    // Normalisation commune sur la boite englobante de l'ensemble.
    const box = new Box3();
    for (const geo of baked) {
      geo.computeBoundingBox();
      if (geo.boundingBox) box.union(geo.boundingBox);
    }
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
    const normalize = new Matrix4()
      .makeScale(scale, scale, scale)
      .setPosition(-center.x * scale, -box.min.y * scale, -center.z * scale);
    for (const geo of baked) geo.applyMatrix4(normalize);
    return baked;
  }, [gltf]);

  // UN SEUL ShaderMaterial cree imperativement et partage par tous les
  // meshes via material={} : r3f wrappe/clone l'objet `uniforms` passe
  // en prop JSX <shaderMaterial> (constate le 01/09 : les ecritures sur
  // l'objet source n'atteignaient jamais le GPU). Reference unique =
  // ecriture directe garantie, un seul programme.
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uColor: { value: MIRROR_COLOR },
          uOpacity: { value: 0 },
          uRadiusInner: { value: MIRROR_RADIUS * 0.55 },
          uRadiusOuter: { value: MIRROR_RADIUS },
          uContactY: { value: MIRROR_PLANE_Y }, // = position Y du groupe (plan du miroir)
          uFadeDepth: { value: CONTACT_FADE_DEPTH * MIRROR_DEPTH_SCALE },
          uFadeEdge: { value: CONTACT_FADE_EDGE * MIRROR_DEPTH_SCALE },
          uVelocity: { value: tezcatlStore.velocity },
          uPressure: { value: tezcatlStore.pressure },
          uTexel: { value: tezcatlStore.texel },
          uExtent: { value: TEZCATL_EXTENT },
          uHaze: { value: HAZE_STRENGTH },
          uRefract: { value: PRESSURE_REFRACT },
        },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: DoubleSide,
        vertexShader: `
          uniform sampler2D uVelocity;
          uniform sampler2D uPressure;
          uniform float uTexel;
          uniform float uExtent;
          uniform float uHaze;
          uniform float uRefract;
          varying vec3 vWorldPos;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            // Air chaud : la fumee qui passe deforme le reflet (champ de
            // vitesse du fluide, echantillonne en espace sol).
            vec2 suv = world.xz / (2.0 * uExtent) + 0.5;
            vec2 vel = texture2D(uVelocity, suv).xy;
            // Surface de l'eau : le gradient de pression refracte le reflet.
            float hL = texture2D(uPressure, suv - vec2(uTexel, 0.0)).x;
            float hR = texture2D(uPressure, suv + vec2(uTexel, 0.0)).x;
            float hB = texture2D(uPressure, suv - vec2(0.0, uTexel)).x;
            float hT = texture2D(uPressure, suv + vec2(0.0, uTexel)).x;
            world.xz += vel * uHaze + vec2(hR - hL, hT - hB) * uRefract;
            vWorldPos = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uRadiusInner;
          uniform float uRadiusOuter;
          uniform float uContactY;
          uniform float uFadeDepth;
          uniform float uFadeEdge;
          varying vec3 vWorldPos;
          void main() {
            float mask = 1.0 - smoothstep(uRadiusInner, uRadiusOuter, length(vWorldPos.xz));
            // Fade de contact (retour Sylvain 01/09) : pres du plan du
            // miroir, les jambes inversees se lisaient comme des bois
            // incoherents. La fumee du tezcatl brouille la ligne de
            // contact : le reflet emerge en s'eloignant du plan. Bande
            // exprimee a l'echelle compressee (MIRROR_DEPTH_SCALE).
            float contactFade = 1.0 - smoothstep(uContactY - uFadeDepth, uContactY - uFadeEdge, vWorldPos.y);
            float a = uOpacity * mask * contactFade;
            if (a < 0.002) discard;
            gl_FragColor = vec4(uColor, a);
          }
        `,
      }),
    []
  );

  useFrame((state) => {
    // Gate de scroll : profondeur de page 0..1, le Mictlan se revele
    // en descendant. Lecture directe (pas de listener) : trois nombres
    // par frame, negligeable.
    const doc = typeof document !== "undefined" ? document.documentElement : null;
    const denom = doc ? doc.scrollHeight - window.innerHeight : 0;
    const depth = denom > 0 ? Math.min(1, window.scrollY / denom) : 1;
    const gate = SCROLL_GATE_FLOOR + (1 - SCROLL_GATE_FLOOR) * depth;
    const target = direction === "obsidienne" ? MIRROR_OPACITY * gate : 0;
    const reduced = sceneRefs?.reducedMotionRef.current;
    opacityRef.current = reduced
      ? target
      : opacityRef.current + (target - opacityRef.current) * 0.06;
    const visible = opacityRef.current > 0.002;
    if (groupRef.current) groupRef.current.visible = visible;
    if (!visible) return;
    // Seule "vie" du reflet : lente pulsation (~25s). Figee en
    // reduced-motion : reflet statique lisible.
    const pulse = reduced ? 1 : 0.8 + 0.2 * Math.sin(state.clock.elapsedTime * 0.25);
    material.uniforms.uOpacity.value = opacityRef.current * pulse;
    // Champs publies par TezcatlSmoke / TezcatlWater (textures ping-pong :
    // la reference change a chaque frame).
    material.uniforms.uVelocity.value = tezcatlStore.velocity;
    material.uniforms.uPressure.value = tezcatlStore.pressure;
    material.uniforms.uTexel.value = tezcatlStore.texel;
  });

  return (
    // Reflet plan : flip vertical sous le miroir (scale Y negatif, sur
    // sans squelette : geometrie cuite), profondeur tassee par
    // MIRROR_DEPTH_SCALE pour que les bois inverses restent dans le
    // cadre (02/09). Clippe au disque par le masque radial.
    <group ref={groupRef} position={[0, MIRROR_PLANE_Y, 0]} scale={[1, -MIRROR_DEPTH_SCALE, 1]} visible={false}>
      {geometries.map((geo, i) => (
        <mesh key={i} geometry={geo} material={material} renderOrder={998} frustumCulled={false} raycast={() => null} />
      ))}
    </group>
  );
}
