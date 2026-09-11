/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d uniforms et de la pose du dome a 60 fps (meme precedent que centzon-stars). */
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial } from "three";
import { makeMilkyWay } from "@/lib/milky-way";
import { columnRise } from "@/lib/zenith-arc";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * LA VOIE LACTEE AU CENTRE (E2, 10/09).
 *
 * L'arche de Mixcoatl, le serpent de nuages : elle passe par le zenith,
 * la ou la camera arrive au bout de l'arc (zenith-arc), au bout de la
 * colonne de fumee du foyer.
 *
 * Ce n'est pas un evenement, c'est un ETAT : elle est la des l'arrivee,
 * discrete, et se renforce a mesure que le regard monte -- comme un oeil
 * qui s'habitue a la nuit. Elle ne s'allume jamais et ne s'eteint jamais.
 *
 * Elle n'appartient qu'au Centre. Le Sud a ses quatre cents etoiles (les
 * Centzon Huitznahua, que Huitzilopochtli tue a Coatepec) : ce sont deux
 * ciels differents et ils ne doivent pas se melanger.
 *
 * Le dome suit la camera, comme celui du Sud : les etoiles sont a
 * l'infini, elles ne doivent pas defiler quand on orbite.
 */

const STAR_COLOR = new Color("#dfe8ff");
/** Present des l'arrivee, jamais eteint. */
const BASE_OPACITY = 0.42;

export default function MilkyWay() {
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const pointsRef = useRef<Points>(null);
  const champ = useMemo(() => makeMilkyWay(), []);

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(champ.positions, 3));
    // Deux familles, deux echelles. Les etoiles font moins de deux pixels :
    // au-dela elles deviennent des billes floues et on lit un semis, pas un
    // ciel. Les grains font une quarantaine de pixels a trois pour cent
    // d'eclat : pris un a un on ne les voit pas, c'est leur recouvrement au
    // coeur de la bande qui fait le laiteux.
    const tailles = new Float32Array(champ.kept);
    for (let i = 0; i < champ.kept; i++) {
      tailles[i] = champ.dust[i] === 1 ? 1100 + 700 * champ.sizes[i] : 62 + 105 * champ.sizes[i];
    }
    g.setAttribute("aSize", new BufferAttribute(tailles, 1));
    g.setAttribute("aAlpha", new BufferAttribute(champ.brightness, 1));
    return g;
  }, [champ]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: STAR_COLOR.clone() }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute float aSize;
          attribute float aAlpha;
          uniform float uPixelRatio;
          varying float vAlpha;
          void main() {
            vAlpha = aAlpha;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            // En pixels CSS, pas d'appareil (11/09) : sur un ecran a densite 2,
            // les etoiles faisaient un demi-pixel, des points durs, « pixelises »
            // (retour Sylvain). Le facteur remet la meme taille apparente partout.
            gl_PointSize = aSize * uPixelRatio / max(1.0, -mv.z);
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
            // Un coeur, et un halo bien plus large que celui d'une etoile
            // isolee : c'est ce halo qui, mis bout a bout, fait la poussiere
            // laiteuse de la bande.
            float core = smoothstep(1.0, 0.0, r);
            float halo = smoothstep(1.0, 0.15, r);
            float a = (core * core * 0.92 + halo * 0.08) * vAlpha * uOpacity;
            if (a < 0.003) discard;
            gl_FragColor = vec4(uColor, a);
          }
        `,
      }),
    [],
  );

  useFrame((state) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const jade = direction === "jade";
    if (!jade) {
      pts.visible = false;
      return;
    }
    pts.visible = true;
    // A l'infini : le dome suit la camera.
    pts.position.copy(state.camera.position);
    const p = sceneRefs?.progressRef.current ?? 0;
    material.uniforms.uOpacity.value = BASE_OPACITY + (1 - BASE_OPACITY) * columnRise(p);
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} visible={false} />;
}
