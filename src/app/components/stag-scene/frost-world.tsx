/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'objets three et d'uniforms a 60 fps (meme precedent que cihuateteo). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import { AdditiveBlending, Bone, CircleGeometry, Color, Group, Mesh, MeshStandardMaterial, Object3D, Sprite, SpriteMaterial, Vector3 } from "three";
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

export default function FrostWorld() {
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const { scene: stagScene } = useGLTF(STAG_PATH);
  const smokeTexture = useTexture(SMOKE_SPRITE);
  const rootRef = useRef<Group>(null);

  const iceMaterial = useMemo(() => makeIceMaterial(0.06), []);
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
        mesh.material = iceMaterial;
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
  }, [stagScene, iceMaterial]);

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
    discMaterial.dispose();
    disc.geometry.dispose();
    breathMaterial.dispose();
  }, [iceMaterial, discMaterial, disc, breathMaterial]);

  const headPos = useMemo(() => new Vector3(), []);
  const headDir = useMemo(() => new Vector3(), []);

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
    applyFrost(state.scene);

    const root = rootRef.current;
    if (!root) return;
    const frost = frostUniforms.uFrost.value;
    root.visible = frost > 0.01;
    if (!root.visible) return;

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
    const t = state.clock.elapsedTime;
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
