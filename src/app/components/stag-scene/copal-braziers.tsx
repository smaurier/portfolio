"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { AdditiveBlending, Color, CylinderGeometry, Group, Mesh, MeshStandardMaterial, NormalBlending, Sprite, SpriteMaterial } from "three";
import { brazierPositions, COPAL, copalIntensity, copalShows, puffPose } from "@/lib/copal";
import { brazierGlow } from "@/lib/foyer";
import { foyerStore } from "./foyer-store";
import { DIRECTION_COLOR_VIVID } from "./direction-colors";
import { frostStore } from "./frost-store";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * CopalBraziers (07/09) : cinq braseros au bord de la Piedra. Le copalli
 * brule ; sa fumee monte plus haut a mesure qu'on descend la page (lib
 * copal : l'offrande monte avec le jour), teintee par direction.
 *
 * ⚠️ DEMONTE DES SCENES le 07/09 (Sylvain : « je trouve que le copal est de
 * trop sur les scenes »), et il avait raison : une offrande qui monte avec
 * le jour ne dit rien de la direction ou elle se trouve, alors que la regle
 * du site est UNE idee forte par scene ; cinq colonnes de fumee posees sur
 * la bordure de la Piedra ajoutaient du bruit autour du cerf et des
 * gravures ; et le feu est deja pris ailleurs, avec une raison a chaque
 * fois (l'anneau du Sud, les braises des porteuses a l'Ouest, la braise de
 * Xolotl au Nord).
 *
 * GARDE EN RESERVE pour le chantier du CENTRE (Xiuhtecuhtli, le dieu du
 * feu) : la, des braseros autour du foyer ne sont plus un ornement mais le
 * sujet, et le Codex Fejervary-Mayer place justement le feu au milieu des
 * quatre arbres. Pour le remonter : <CopalBraziers /> dans scene-content, a
 * l'interieur de CardinalOrientation, et restreindre copalShows a jade.
 *
 * Vit dans le repere du decor tourne (CardinalOrientation) : les braseros
 * sont poses sur le sol, comme les pierres de l'annee.
 */

const SMOKE_SPRITE = "/img/particles/smoke_07.png";
const BOWL_HEIGHT = 0.14;
/** La fumee du copal est blanche-grise ; la direction ne fait que la teinter. */
const SMOKE_BASE = new Color("#cfc7bd");

useTexture.preload(SMOKE_SPRITE);

export default function CopalBraziers() {
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const smokeTexture = useTexture(SMOKE_SPRITE);
  const rootRef = useRef<Group>(null);

  const bowlMaterial = useMemo(() => new MeshStandardMaterial({ color: new Color("#2a2118"), roughness: 0.85, metalness: 0.05 }), []);
  const emberMaterial = useMemo(() => new SpriteMaterial({ map: smokeTexture, color: new Color("#ff7a2a"), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }), [smokeTexture]);
  const smokeMaterial = useMemo(() => new SpriteMaterial({ map: smokeTexture, color: SMOKE_BASE.clone(), transparent: true, opacity: 0, depthWrite: false, blending: NormalBlending, fog: true }), [smokeTexture]);

  const braziers = useMemo(() => {
    const bowlGeo = new CylinderGeometry(0.16, 0.1, BOWL_HEIGHT, 10, 1, false);
    return brazierPositions().map((b, i) => {
      const group = new Group();
      group.position.set(b.x, 0, b.z);
      const bowl = new Mesh(bowlGeo, bowlMaterial);
      bowl.position.y = BOWL_HEIGHT / 2;
      bowl.raycast = () => null;
      group.add(bowl);
      const ember = new Sprite(emberMaterial.clone());
      ember.position.y = BOWL_HEIGHT + 0.02;
      ember.scale.setScalar(0.26);
      ember.raycast = () => null;
      group.add(ember);
      const puffs = Array.from({ length: COPAL.puffs }, (_, k) => {
        const s = new Sprite(smokeMaterial.clone());
        s.raycast = () => null;
        s.renderOrder = 900;
        group.add(s);
        // Chaque bouffee part a son tour, etalees sur la duree de vie.
        return { sprite: s, seed: i * COPAL.puffs + k, offset: (k / COPAL.puffs) * COPAL.puffLife };
      });
      return { group, ember, puffs, bowlGeo };
    });
  }, [bowlMaterial, emberMaterial, smokeMaterial]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    for (const b of braziers) root.add(b.group);
    return () => {
      for (const b of braziers) root.remove(b.group);
    };
  }, [braziers]);
  useEffect(() => () => {
    bowlMaterial.dispose();
    emberMaterial.dispose();
    smokeMaterial.dispose();
    if (braziers[0]) braziers[0].bowlGeo.dispose();
  }, [bowlMaterial, emberMaterial, smokeMaterial, braziers]);

  const tint = useMemo(() => new Color(), []);
  const cardinalScratch = useMemo(() => new Color(), []);

  useFrame((state) => {
    const root = rootRef.current;
    if (!root) return;
    const p = sceneRefs?.progressRef.current ?? 0;
    const frost = frostStore.active ? frostStore.state.frost : 0;
    const intensity = copalShows(direction) ? copalIntensity(p, frost) : 0;
    root.visible = intensity > 0.01;
    if (!root.visible) return;
    // La fumee prend un peu la teinte de la direction, sans la trahir.
    tint.copy(SMOKE_BASE).lerp(cardinalScratch.set(DIRECTION_COLOR_VIVID[direction]), 0.3);
    smokeMaterial.color.lerp(tint, 0.05);
    const t = state.clock.elapsedTime;
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    for (const [i, b] of braziers.entries()) {
      // LES COUREURS DU RITE (08/09, chantier du foyer). A l'arrivee sur le
      // site, la flamme ne saisit pas les cinq braseros d'un coup : elle
      // fait le tour, l'un apres l'autre, comme les porteurs de torche qui
      // vont rallumer les quartiers. Meme horloge que la camera et la
      // flamme du voile (foyerStore.arrival). Hors arrivee, arrival vaut 1
      // et brazierGlow rend 1 : aucun effet, aucun cout.
      const lit = intensity * brazierGlow(i, foyerStore.arrival);
      // La braise palpite.
      const flicker = reduced ? 0.7 : 0.55 + 0.45 * Math.abs(Math.sin(t * 3.1 + b.puffs[0].seed));
      b.ember.material.opacity = 0.55 * lit * flicker;
      for (const puff of b.puffs) {
        const age = reduced ? COPAL.puffLife * 0.5 : (t + puff.offset) % COPAL.puffLife;
        const pose = puffPose(puff.seed, age, lit);
        puff.sprite.position.set(pose.x, BOWL_HEIGHT + pose.y, pose.z);
        puff.sprite.scale.setScalar(pose.size);
        puff.sprite.material.rotation = puff.seed + age * 0.25;
        puff.sprite.material.opacity = pose.opacity * 0.5;
      }
    }
  });

  return <group ref={rootRef} visible={false} />;
}
