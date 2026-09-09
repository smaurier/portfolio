/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'attributs et d'uniforms a 60 fps (meme precedent que arrow-vapor). */
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, LineSegments, Points, ShaderMaterial, type Group } from "three";
import { CENTZON_COUNT, killedState, makeStarField, starState, starsArmed, throwFactor, thrownDir } from "@/lib/centzon-stars";
import { centzonStore } from "./centzon-store";
import { markTrace } from "../traces-store";
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
  // Le jet des 400 a l'arrivee : chronometre depuis le moment ou le champ
  // devient visible (arrivee au Sud), remis a zero quand on le quitte.
  /** Quand le voile est tombe : base du delai de calage. */
  const veilFellAtRef = useRef<number | null>(null);
  const arrivedAtRef = useRef<number | null>(null);

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
    if (!g.visible) {
      if (arrivedAtRef.current !== null) centzonStore.reset(); // nouvelle nuit au retour
      arrivedAtRef.current = null;
      return;
    }
    g.position.copy(state.camera.position);
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const p = sceneRefs?.progressRef.current ?? 0;
    const t = reduced ? 0 : state.clock.elapsedTime;
    // QUAND JETER LES QUATRE CENTS. La regle est dans lib/centzon-stars
    // (`starsArmed`, pure et testee) : le voile tombe, le fondu a fini, et
    // le visiteur a commence a descendre, donc la camera du Sud a leve les
    // yeux vers le dome. Avec un filet pour qui ne scrolle jamais.
    //
    // Avant le 09/09, l'arme etait une minuterie : 0,5 s apres la chute du
    // voile. Le commentaire d'origine citait deja le retour de Sylvain du
    // 05/09, « je ne vois pas l'apparition des 400 », et la reponse avait ete
    // d'ajouter une demi-seconde. Le probleme n'etait pas le delai : a cet
    // instant l'oeil est sur le chrome de la page, pas sur le ciel. Le geste
    // jouait devant une salle vide.
    if (veilFellAtRef.current === null) {
      const loaded = typeof document !== "undefined" && document.documentElement.getAttribute("data-loaded") === "true";
      if (!loaded) return;
      veilFellAtRef.current = state.clock.elapsedTime;
    }
    if (arrivedAtRef.current === null) {
      const waited = state.clock.elapsedTime - veilFellAtRef.current;
      if (!starsArmed({ loaded: true, progress: p, waited })) {
        // Tant qu'on n'a pas jete, les quatre cents N'EXISTENT PAS. La
        // visibilite est posee plus haut par le fondu de direction, mais les
        // positions ne sont ecrites qu'a partir du jet : sans ce masquage,
        // l'attente montrerait un champ non initialise. Et narrativement
        // c'est juste : elles apparaissent EN ETANT jetees.
        g.visible = false;
        return;
      }
      arrivedAtRef.current = state.clock.elapsedTime;
    }
    // reduced-motion : pas de jet, elles sont en place tout de suite.
    const since = reduced ? 1e9 : state.clock.elapsedTime - arrivedAtRef.current;
    if (since > 2.5) markTrace("centzon-thrown"); // une trace : les 400 ont ete jetees devant vous

    const pos = pointsGeometry.getAttribute("position") as BufferAttribute;
    const size = pointsGeometry.getAttribute("aSize") as BufferAttribute;
    const alpha = pointsGeometry.getAttribute("aAlpha") as BufferAttribute;
    const lpos = linesGeometry.getAttribute("position") as BufferAttribute;
    const lalpha = linesGeometry.getAttribute("aAlpha") as BufferAttribute;
    for (let i = 0; i < CENTZON_COUNT; i++) {
      const s = stars[i];
      // Prise par un colibri (le geste du mythe) : elle tombe a cet instant,
      // sauf si le scroll l'avait deja eteinte.
      const killedAt = centzonStore.killedAt[i];
      const scrollState = starState(s, p, t);
      const st = killedAt >= 0 && scrollState.alpha > 0 ? killedState(s, state.clock.elapsedTime - killedAt) : scrollState;
      const f = throwFactor(s, since);
      const d = f < 1 ? thrownDir(s, f) : s.dir;
      const x = (d.x + st.offset.x) * RADIUS;
      const y = (d.y + st.offset.y) * RADIUS;
      const z = (d.z + st.offset.z) * RADIUS;
      pos.setXYZ(i, x, y, z);
      // Pendant le jet : plus grosse et plus vive (une braise lancee), puis
      // elle se pose a sa taille.
      size.setX(i, s.size * (1 + 0.6 * st.streak) * (f < 1 ? 1 + 1.2 * (1 - f) : 1));
      alpha.setX(i, f <= 0 ? 0 : st.alpha * Math.min(1, 0.4 + f));
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
    <group ref={groupRef} name="CentzonStars" visible={false}>
      <points ref={pointsRef} geometry={pointsGeometry} material={pointsMaterial} frustumCulled={false} raycast={() => null} renderOrder={-99} />
      <lineSegments ref={linesRef} geometry={linesGeometry} material={linesMaterial} frustumCulled={false} raycast={() => null} renderOrder={-98} />
    </group>
  );
}
