"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import {
  buildParticle,
  evenSampleLengths,
  mulberry32,
  samplesForLength,
  type Particle,
} from "@/lib/particle-sampling";
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  designSpaceToWorld,
  piedraPointToDesignSpace,
} from "@/lib/intro-layout";
import IntroParticles from "./intro-particles";
import PiedraSvg from "./piedra-svg";
import styles from "./intro-sequence.module.css";

// Durées choisies à l'œil (à ajuster une fois vu en vrai, comme le reste
// des durées de cette scène — cf MIN_VEIL_DURATION_MS dans loading-veil.ts) :
// assez de tenue pour lire le texte, dissolution ni trop brusque ni trop
// longue pour ne pas retarder l'arrivée sur la scène.
const HOLD_MS = 2200;
const DISSOLVE_MS = 2800;

// Densité d'échantillonnage le long des tracés de la Piedra (points par
// unité de longueur, cf particle-sampling.ts) — assez pour lire comme le
// motif d'origine sans exploser le nombre de particules (le tracé fait
// plusieurs dizaines de milliers d'unités de longueur cumulées sur ~250
// segments).
const PIEDRA_SAMPLE_DENSITY = 0.03;
// Le texte est dispersé dans son rectangle plutôt qu'échantillonné lettre
// par lettre (pas de rendu canvas pixel-perfect du texte réel : trop de
// travail de calage police pour un bénéfice qui ne se verrait pas à la
// vitesse où les particules se dispersent) — densité par unité de surface.
const TEXT_SAMPLE_DENSITY = 0.4;
const BASE_DISPERSAL_DISTANCE = 220;

type Phase = "hold" | "dissolving" | "done";

/**
 * Échantillonne les particules à partir de ce qui est RÉELLEMENT affiché à
 * l'instant où elle est appelée (mise en page responsive selon la taille
 * d'écran), pas d'une valeur calculée trop tôt — d'où les refs passées en
 * paramètres plutôt qu'une fermeture sur des refs de composant (évite aussi
 * l'avertissement react-hooks sur une fonction utilisée avant déclaration
 * dans un useEffect situé plus haut dans le fichier).
 */
function sampleAllParticles(
  svgRef: RefObject<SVGSVGElement | null>,
  stageRef: RefObject<HTMLDivElement | null>,
  textRef: RefObject<HTMLDivElement | null>,
): Particle[] {
  const rng = mulberry32(20260820);
  const result: Particle[] = [];

  const svg = svgRef.current;
  if (svg) {
    const paths = svg.querySelectorAll<SVGPathElement>(".st1");
    paths.forEach((path) => {
      const length = path.getTotalLength();
      const count = samplesForLength(length, PIEDRA_SAMPLE_DENSITY);
      for (const at of evenSampleLengths(length, count)) {
        const pt = path.getPointAtLength(at);
        const design = piedraPointToDesignSpace(pt.x, pt.y);
        const world = designSpaceToWorld(design.x, design.y);
        result.push(buildParticle(world.x, world.y, rng, BASE_DISPERSAL_DISTANCE));
      }
    });
  }

  const stage = stageRef.current;
  const textEl = textRef.current;
  if (stage && textEl) {
    const stageRect = stage.getBoundingClientRect();
    const textRect = textEl.getBoundingClientRect();
    if (stageRect.width > 0 && stageRect.height > 0) {
      const designLeft = ((textRect.left - stageRect.left) / stageRect.width) * DESIGN_WIDTH;
      const designTop = ((textRect.top - stageRect.top) / stageRect.height) * DESIGN_HEIGHT;
      const designW = (textRect.width / stageRect.width) * DESIGN_WIDTH;
      const designH = (textRect.height / stageRect.height) * DESIGN_HEIGHT;
      const count = Math.round(designW * designH * TEXT_SAMPLE_DENSITY * 0.01);
      for (let i = 0; i < count; i++) {
        const x = designLeft + rng() * designW;
        const y = designTop + rng() * designH;
        const world = designSpaceToWorld(x, y);
        result.push(buildParticle(world.x, world.y, rng, BASE_DISPERSAL_DISTANCE));
      }
    }
  }

  return result;
}

/**
 * Temps "Piedra del Sol" en préface de la scène (cf memory
 * project-nahual-da, retour de Sylvain le 20/08) : la Piedra + le hero
 * s'affichent fixes et centrés, tiennent le temps de les lire, puis se
 * dissolvent en particules pendant que la scène 3D (montée en parallèle
 * dessous, cf stag-scene.tsx) apparaît. `onComplete` signale la fin à
 * StagScene, qui peut alors laisser le hero "normal" (bas à gauche,
 * piloté par le scroll) prendre le relais sans dupliquer le texte.
 *
 * Échantillonnage des particules à l'instant précis où la dissolution
 * démarre (pas au montage) : les positions doivent correspondre à ce qui
 * est RÉELLEMENT affiché à cet instant (mise en page responsive selon la
 * taille d'écran), pas à une valeur calculée trop tôt.
 */
export default function IntroSequence({
  heroTitle,
  heroText,
  onComplete,
}: {
  heroTitle: string;
  heroText: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("hold");
  const [particles, setParticles] = useState<Particle[] | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      // Moment cinématique, pas un contenu essentiel — le garde-fou
      // reduced-motion du Codex autorise à sauter directement à la scène
      // (contrairement au hero/à-propos, toujours joignables sans scroll).
      onComplete();
      return;
    }

    const holdTimer = setTimeout(() => {
      setParticles(sampleAllParticles(svgRef, stageRef, textRef));
      setPhase("dissolving");
    }, HOLD_MS);
    return () => clearTimeout(holdTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "dissolving") return;
    let raf: number;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / DISSOLVE_MS);
      progressRef.current = t;
      if (t >= 1) {
        setPhase("done");
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase === "done") onComplete();
  }, [phase, onComplete]);

  return (
    <div className={styles.root}>
      <div className={`${styles.htmlLayer} ${phase !== "hold" ? styles.dissolving : ""}`}>
        <div ref={stageRef} className={styles.stage}>
          <div className={styles.piedraBox}>
            <PiedraSvg ref={svgRef} />
          </div>
          <div ref={textRef} className={styles.textBox}>
            <h1>{heroTitle}</h1>
            <p>{heroText}</p>
          </div>
        </div>
      </div>
      {/* Couche séparée, jamais affectée par le fondu de .htmlLayer — cf
       * commentaire de .particlesLayer dans le CSS module : le shader gère
       * seul la disparition progressive de chaque particule. */}
      {particles && (
        <div className={styles.particlesLayer}>
          <div className={styles.particlesStage}>
            <Canvas className={styles.particlesCanvas} gl={{ alpha: true }} aria-hidden="true">
              <OrthographicCamera
                makeDefault
                left={(-DESIGN_WIDTH / 2) * 1.3}
                right={(DESIGN_WIDTH / 2) * 1.3}
                top={(DESIGN_HEIGHT / 2) * 1.3}
                bottom={(-DESIGN_HEIGHT / 2) * 1.3}
                near={0.1}
                far={10}
                position={[0, 0, 5]}
              />
              <IntroParticles particles={particles} progressRef={progressRef} baseSize={4} />
            </Canvas>
          </div>
        </div>
      )}
    </div>
  );
}
