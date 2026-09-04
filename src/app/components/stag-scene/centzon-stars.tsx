/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'attributs et d'uniforms a 60 fps (meme precedent que arrow-vapor). */
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, LineSegments, Points, ShaderMaterial, type Group } from "three";
import { CENTZON_COUNT, makeStarField, starState } from "@/lib/centzon-stars";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * CentzonStars (04/09, le LEAD du Sud). Les 400 etoiles des Centzon
 * Huitznahua sur le dome de nuit (lib/centzon-stars decide qui vit, qui
 * scintille, qui meurt, qui tombe ; ici on ne fait que copier dans les
 * attributs). Un Points pour les etoiles, un LineSegments pour les traits
 * de chute. Le groupe suit la camera comme le dome (sud-sky). Sud
 * seulement, fondu par direction ; en reduced-motion les etoiles restent
 * mais ne scintillent ni ne tombent (leur etat suit le scroll, sans
 * mouvement propre).
 */

const RADIUS = 83; // juste devant le dome (85)
const STAR_COLOR = new Color("#eaf4ff");
const STREAK_COLOR = new Color("#fff1c8");
const SEED = 400;

export default function CentzonStars() {
  const groupRef = useRef<Group>(null);
  const pointsRef = useRef<Points>(null);
  const linesRef = useRef<LineSegments>(null);
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const blendRef = useRef(direction === "turquoise" ? 1 : 0);
  const stars = useMemo(() => makeStarField(SEED), []);

  const pointsGeometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(CENTZON_COUNT * 3), 3));
    g.setAttribute("aSize", new BufferAttribute(new Float32Array(CENTZON_COUNT), 1));
    g.setAttribute("aAlpha", new BufferAttribute(new Float32Array(CENTZON_COUNT), 1));
    return g;
  }, []);
  const linesGeometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(CENTZON_COUNT * 6), 3));
    g.setAttribute("aAlpha", new BufferAttribute(new Float32Array(CENTZON_COUNT * 2), 1));
    return g;
  }, []);

  const pointsMaterial = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: STAR_COLOR }, uScale: { value: 1 }, uOpacity: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float aSize;
          attribute float aAlpha;
          uniform float uScale;
          varying float vAlpha;
          void main() {
            vAlpha = aAlpha;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = aSize * uScale / max(1.0, -mv.z);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying float vAlpha;
          void main() {
            vec2 d = gl_PointCoord - 0.5;
            float r = length(d) * 2.0;
            if (r > 1.0) discard;
            // Coeur net, halo doux : une etoile, pas un disque.
            float core = smoothstep(1.0, 0.0, r);
            float a = core * core * vAlpha * uOpacity;
            if (a < 0.003) discard;
            gl_FragColor = vec4(uColor, a);
          }
        `,
      }),
    []
  );
  const linesMaterial = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: STREAK_COLOR }, uOpacity: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float aAlpha;
          varying float vAlpha;
          void main() {
            vAlpha = aAlpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying float vAlpha;
          void main() {
            float a = vAlpha * uOpacity;
            if (a < 0.003) discard;
            gl_FragColor = vec4(uColor, a);
          }
        `,
      }),
    []
  );

  useFrame((state) => {
    const south = direction === "turquoise";
    blendRef.current += ((south ? 1 : 0) - blendRef.current) * 0.06;
    const blend = blendRef.current;
    const g = groupRef.current;
    if (!g) return;
    g.visible = blend > 0.01;
    if (!g.visible) return;
    g.position.copy(state.camera.position);
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const p = sceneRefs?.progressRef.current ?? 0;
    const t = reduced ? 0 : state.clock.elapsedTime;

    const pos = pointsGeometry.getAttribute("position") as BufferAttribute;
    const size = pointsGeometry.getAttribute("aSize") as BufferAttribute;
    const alpha = pointsGeometry.getAttribute("aAlpha") as BufferAttribute;
    const lpos = linesGeometry.getAttribute("position") as BufferAttribute;
    const lalpha = linesGeometry.getAttribute("aAlpha") as BufferAttribute;
    for (let i = 0; i < CENTZON_COUNT; i++) {
      const s = stars[i];
      const st = starState(s, p, t);
      const x = (s.dir.x + st.offset.x) * RADIUS;
      const y = (s.dir.y + st.offset.y) * RADIUS;
      const z = (s.dir.z + st.offset.z) * RADIUS;
      pos.setXYZ(i, x, y, z);
      size.setX(i, s.size * (1 + 0.6 * st.streak));
      alpha.setX(i, st.alpha);
      // Trait de chute : de la tete vers l'arriere, le long de la chute.
      const len = st.streak * RADIUS * 0.045;
      lpos.setXYZ(i * 2, x, y, z);
      lpos.setXYZ(i * 2 + 1, x - s.fall.x * len, y - s.fall.y * len, z - s.fall.z * len);
      lalpha.setX(i * 2, st.alpha * st.streak);
      lalpha.setX(i * 2 + 1, 0);
    }
    pos.needsUpdate = true;
    size.needsUpdate = true;
    alpha.needsUpdate = true;
    lpos.needsUpdate = true;
    lalpha.needsUpdate = true;
    pointsMaterial.uniforms.uOpacity.value = blend;
    linesMaterial.uniforms.uOpacity.value = blend;
    // Taille en pixels : proportionnelle a la hauteur du viewport.
    pointsMaterial.uniforms.uScale.value = state.size.height * state.viewport.dpr * 0.3;
  });

  return (
    <group ref={groupRef} visible={false}>
      <points ref={pointsRef} geometry={pointsGeometry} material={pointsMaterial} frustumCulled={false} raycast={() => null} renderOrder={-99} />
      <lineSegments ref={linesRef} geometry={linesGeometry} material={linesMaterial} frustumCulled={false} raycast={() => null} renderOrder={-98} />
    </group>
  );
}
