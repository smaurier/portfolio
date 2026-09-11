/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'attributs three a 60 fps (meme precedent que cihuateteo). */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Color, NormalBlending, Points, ShaderMaterial } from "three";
import { initLeaf, stepLeaf, WEST_LEAVES, type Leaf } from "@/lib/west-leaves";
import { GRASS_WIND_BY_DIRECTION, windAt } from "@/lib/grass-sim";
import { terrainHeightWorld } from "./cardinal-orientation";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * WestLeaves (06/09, etape 5 de l'Ouest) : Ehecatl « balaie la route »
 * (Sahagun, livre I). Des feuilles seches et des flocons de cendre filent
 * au ras de l'herbe vers le couchant, soulevees par les memes rafales que
 * la prairie (lib/grass-sim, spec cendre), retombent, reviennent par
 * l'amont (lib/west-leaves, pur et teste). Un seul nuage de points, la
 * forme (feuille ou flocon) et la rotation propre dessinees dans le
 * fragment. Ouest seulement, fondu par direction ; reduced-motion = les
 * feuilles restent posees.
 */

/** Le vent de l'herbe (0,4 a 0,8 u) devient une vitesse de feuille (u/s). */
const WIND_TO_SPEED = 3.2;
const LEAF_COLOR = new Color("#2e1a14");
const ASH_COLOR = new Color("#1a1018");

const VERTEX = /* glsl */ `
  attribute float aSpin;
  attribute float aKind;
  attribute float aSize;
  varying float vSpin;
  varying float vKind;
  void main() {
    vSpin = aSpin;
    vKind = aKind;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // Taille bornee : une feuille qui frole la camera ne devient pas un mur.
    float px = aSize * mix(9.0, 18.0, aKind);
    gl_PointSize = clamp(px * (18.0 / max(1.0, -mv.z)), 2.0, 22.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uLeaf;
  uniform vec3 uAsh;
  varying float vSpin;
  varying float vKind;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float c = cos(vSpin), s = sin(vSpin);
    p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
    // Feuille : ellipse pointue asymetrique ; cendre : petit flocon irregulier.
    float leaf = 1.0 - (p.x * p.x) / 0.22 - (p.y * p.y) / 0.045 - 0.6 * p.x * p.y;
    float ash = 1.0 - dot(p, p) / 0.06 - 0.3 * sin(atan(p.y, p.x) * 5.0 + vSpin);
    float shape = mix(ash, leaf, vKind);
    if (shape < 0.0) discard;
    vec3 col = mix(uAsh, uLeaf, vKind);
    // La nervure et le bord un peu plus chauds.
    col += vec3(0.06, 0.02, 0.0) * vKind * smoothstep(0.0, 0.2, shape) * (1.0 - smoothstep(0.2, 0.6, shape));
    gl_FragColor = vec4(col, uOpacity * smoothstep(0.0, 0.15, shape));
  }
`;

export default function WestLeaves() {
  const direction = useCurrentDirection();
  const pointsRef = useRef<Points>(null);
  const sceneRefs = useSceneRefs();
  const blendRef = useRef(direction === "cendre" ? 1 : 0);
  const reducedRef = useRef(false);
  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // L'effectif suit le profil de rendu (11/09) : 240 au bureau, 160 sur
  // telephone, 120 en eco. Meme palier que l'herbe et les meches.
  const leafCount = sceneRefs?.perfProfile.leafCount ?? WEST_LEAVES.count;
  const leaves = useMemo<Leaf[]>(() => Array.from({ length: leafCount }, (_, i) => initLeaf(i)), [leafCount]);
  const { geometry, material } = useMemo(() => {
    const n = leaves.length;
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute("aSpin", new BufferAttribute(new Float32Array(n), 1));
    const kind = new Float32Array(n), size = new Float32Array(n);
    leaves.forEach((l, i) => { kind[i] = l.kind; size[i] = l.size; });
    geo.setAttribute("aKind", new BufferAttribute(kind, 1));
    geo.setAttribute("aSize", new BufferAttribute(size, 1));
    const mat = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { uOpacity: { value: 0 }, uLeaf: { value: LEAF_COLOR }, uAsh: { value: ASH_COLOR } },
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
    return { geometry: geo, material: mat };
  }, [leaves]);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((state, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    blendRef.current += ((direction === "cendre" ? 1 : 0) - blendRef.current) * Math.min(1, delta * 2);
    const blend = blendRef.current;
    pts.visible = blend > 0.01;
    if (!pts.visible) return;
    material.uniforms.uOpacity.value = 0.8 * blend;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 30);
    const pos = geometry.attributes.position as BufferAttribute;
    const spin = geometry.attributes.aSpin as BufferAttribute;
    const spec = GRASS_WIND_BY_DIRECTION.cendre;
    const reduced = reducedRef.current;
    for (let i = 0; i < leaves.length; i++) {
      const l = leaves[i];
      if (!reduced) {
        const w = windAt(l.x, l.z, t, spec);
        stepLeaf(l, dt, { x: w.x * WIND_TO_SPEED, z: w.z * WIND_TO_SPEED }, t, terrainHeightWorld);
      } else if (l.y === 0) {
        l.y = terrainHeightWorld(l.x, l.z);
      }
      pos.setXYZ(i, l.x, l.y + 0.03, l.z);
      spin.setX(i, l.spin);
    }
    pos.needsUpdate = true;
    spin.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} raycast={() => null} renderOrder={990} visible={false} />;
}
